import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { construirRuc } from '@swapit/shared';
import { reiniciarLimites } from '../../src/common/limite-tasa';
import { PrismaService } from '../../src/prisma/prisma.service';
import { iniciarDb } from '../db';
import { Cliente, crearApp } from '../http';

let app: INestApplication;
let db: { detener(): Promise<void> };
let prisma: PrismaService;
let jwt: JwtService;
let base: string;

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const cuerpo = (n: string, email: string, password = 'clave-segura-1', nombre = 'Gerente Prueba') => ({
  tipo: 'EMPRESA',
  empresa: { ruc: construirRuc(n), razonSocial: `Empresa ${n} SAC`, direccion: 'Zona Industrial, Piura', representanteLegal: 'Rep Legal' },
  usuario: { nombre, email, password },
});

before(async () => {
  db = await iniciarDb(5620);
  // Topes de tasa y coste de bcrypt reales: aquí se prueban de verdad.
  ({ app, base } = await crearApp({ limitesReales: true, costoReal: true, env: { REGISTRO_ABIERTO: undefined } }));
  prisma = app.get(PrismaService);
  jwt = app.get(JwtService);
});
after(async () => {
  delete process.env.NODE_ENV;
  await app.close();
  await db.detener();
});

test('cookie de sesión: HttpOnly, SameSite=Lax, Path=/, vigencia de 12 h; Secure en producción', async () => {
  const c = new Cliente(base);
  const r = await c.post('/auth/registro', cuerpo('2095000001', 'cookie@test.pe'));
  assert.equal(r.status, 201);
  assert.match(r.set ?? '', /swapit_token=[^;]+/);
  assert.match(r.set ?? '', /HttpOnly/i);
  assert.match(r.set ?? '', /SameSite=Lax/i);
  assert.match(r.set ?? '', /Path=\//);
  assert.match(r.set ?? '', /Max-Age=43200/);
  assert.doesNotMatch(r.set ?? '', /Secure/i, 'fuera de producción no es Secure (se usa http://localhost)');
  const prod = new Cliente(base);
  prod.cookie = '';
  process.env.NODE_ENV = 'production';
  try {
    const l = await prod.post('/auth/login', { email: 'cookie@test.pe', password: 'clave-segura-1' });
    assert.equal(l.status, 200);
    assert.match(l.set ?? '', /;\s*Secure/i, 'en producción la cookie es Secure');
    assert.match(l.set ?? '', /HttpOnly/i);
  } finally {
    delete process.env.NODE_ENV;
  }
});

test('contraseñas: se guardan con bcrypt de coste ≥ 12 y nunca salen en las respuestas', async () => {
  const c = new Cliente(base);
  const r = await c.post('/auth/registro', cuerpo('2095000002', 'hash@test.pe'));
  assert.equal(r.status, 201);
  const u = await prisma.usuario.findUniqueOrThrow({ where: { email: 'hash@test.pe' } });
  assert.ok(bcrypt.getRounds(u.passwordHash) >= 12, `coste bcrypt ${bcrypt.getRounds(u.passwordHash)}`);
  for (const resp of [r, await c.post('/auth/login', { email: 'hash@test.pe', password: 'clave-segura-1' }), await c.get('/auth/me')]) {
    const txt = JSON.stringify(resp.data);
    assert.ok(!txt.includes('passwordHash') && !txt.includes(u.passwordHash) && !txt.includes('tokenCaptacion') && !txt.includes('$2'), 'la respuesta no filtra hashes ni tokens');
  }
});

test('contraseñas: política mínima para cuentas nuevas', async () => {
  const intento = async (password: string, email: string, n: string) => (await new Cliente(base).post('/auth/registro', cuerpo(n, email, password))).status;
  assert.equal(await intento('corta1', 'p1@test.pe', '2095000011'), 400);
  assert.equal(await intento('123456789', 'p2@test.pe', '2095000012'), 400, '9 caracteres');
  assert.equal(await intento('1234567890', 'p3@test.pe', '2095000013'), 400, 'común');
  assert.equal(await intento('xxmariaperezxx9', 'mariaperez@test.pe', '2095000014'), 400, 'contiene su correo');
  assert.equal(await intento('a'.repeat(100), 'p5@test.pe', '2095000015'), 400, 'demasiado repetitiva / larga');
  const err = await new Cliente(base).post('/auth/registro', cuerpo('2095000016', 'p6@test.pe', 'corta'));
  assert.ok(err.data.errores.some((e: { campo: string }) => e.campo.includes('password')), 'el error indica el campo');
  assert.equal(await intento('una-clave-larga-y-rara', 'p7@test.pe', '2095000017'), 201);
});

test('correo: no distingue mayúsculas (sin cuentas duplicadas por «Ana@» y «ana@»)', async () => {
  reiniciarLimites();
  const c = new Cliente(base);
  assert.equal((await c.post('/auth/registro', cuerpo('2095000021', 'Mixto@Test.pe'))).status, 201);
  assert.equal((await new Cliente(base).post('/auth/registro', cuerpo('2095000022', 'mixto@test.PE'))).status, 409);
  assert.equal((await new Cliente(base).post('/auth/login', { email: 'MIXTO@test.pe', password: 'clave-segura-1' })).status, 200);
  assert.equal((await prisma.usuario.findFirst({ where: { email: 'mixto@test.pe' } }))?.email, 'mixto@test.pe');
});

test('login: mismo mensaje y estado para correo inexistente y contraseña errónea (sin enumeración)', async () => {
  const a = await new Cliente(base).post('/auth/login', { email: 'hash@test.pe', password: 'incorrecta-123' });
  const b = await new Cliente(base).post('/auth/login', { email: 'no-existe@test.pe', password: 'incorrecta-123' });
  assert.equal(a.status, 401);
  assert.equal(b.status, 401);
  assert.deepEqual(a.data, b.data);
  assert.equal(a.data.message, 'Credenciales incorrectas');
  assert.equal((await new Cliente(base).post('/auth/login', { email: 'x'.repeat(300) + '@a.pe', password: 'x' })).status, 400, 'longitudes acotadas');
});

test('login: tras 8 fallos la cuenta se bloquea (también para correos inexistentes); otra cuenta no se ve afectada', async () => {
  reiniciarLimites();
  const victima = 'hash@test.pe';
  for (let i = 0; i < 8; i++) assert.equal((await new Cliente(base).post('/auth/login', { email: victima, password: `mala-${i}-xxxxx` })).status, 401);
  const bloqueado = await new Cliente(base).post('/auth/login', { email: victima, password: 'clave-segura-1' });
  assert.equal(bloqueado.status, 429, 'ni siquiera la contraseña correcta pasa mientras dura el bloqueo');
  for (let i = 0; i < 8; i++) await new Cliente(base).post('/auth/login', { email: 'fantasma@test.pe', password: `mala-${i}-xxxxx` });
  assert.equal((await new Cliente(base).post('/auth/login', { email: 'fantasma@test.pe', password: 'otra-clave-xx' })).status, 429, 'un correo inexistente se bloquea igual: no revela si existe');
  assert.equal((await new Cliente(base).post('/auth/login', { email: 'cookie@test.pe', password: 'clave-segura-1' })).status, 200, 'otra cuenta sigue entrando');
  reiniciarLimites();
  assert.equal((await new Cliente(base).post('/auth/login', { email: victima, password: 'clave-segura-1' })).status, 200);
});

test('login: un inicio correcto limpia el contador de fallos de la cuenta', async () => {
  reiniciarLimites();
  for (let i = 0; i < 5; i++) await new Cliente(base).post('/auth/login', { email: 'cookie@test.pe', password: `mala-${i}-xxxxx` });
  assert.equal((await new Cliente(base).post('/auth/login', { email: 'cookie@test.pe', password: 'clave-segura-1' })).status, 200);
  for (let i = 0; i < 5; i++) await new Cliente(base).post('/auth/login', { email: 'cookie@test.pe', password: `mala-${i}-xxxxx` });
  assert.equal((await new Cliente(base).post('/auth/login', { email: 'cookie@test.pe', password: 'clave-segura-1' })).status, 200, '5+5 fallos no suman: el acierto reinició la cuenta');
  reiniciarLimites();
});

test('registro: tope por IP (10 por hora) con 429 y Retry-After', async () => {
  reiniciarLimites();
  let ultimo = 0;
  let r;
  for (let i = 0; i < 11; i++) {
    r = await new Cliente(base).req('POST', '/auth/registro', { basura: true });
    ultimo = r.status;
    if (i < 10) assert.equal(ultimo, 400);
  }
  assert.equal(ultimo, 429);
  assert.ok(Number(r!.headers.get('retry-after')) >= 1);
  reiniciarLimites();
});

test('login: tope por IP (40 intentos por 15 minutos)', async () => {
  reiniciarLimites();
  let ultimo = 0;
  for (let i = 0; i < 41; i++) ultimo = (await new Cliente(base).req('POST', '/auth/login', { malo: true })).status;
  assert.equal(ultimo, 429);
  reiniciarLimites();
});

test('JWT: se rechazan tokens sin firma (alg none), con otro algoritmo, con otra clave, manipulados, vencidos y de usuarios inexistentes', async () => {
  reiniciarLimites();
  const c = new Cliente(base);
  await c.post('/auth/login', { email: 'cookie@test.pe', password: 'clave-segura-1' });
  const valido = c.cookie.split('=')[1];
  assert.equal((await new Cliente(base).req('GET', '/auth/me', undefined, { Cookie: `swapit_token=${valido}` })).status, 200);
  const [h, p] = valido.split('.');
  const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
  const usar = async (token: string) => (await new Cliente(base).req('GET', '/auth/me', undefined, { Cookie: `swapit_token=${token}` })).status;

  assert.equal(await usar(`${b64({ alg: 'none', typ: 'JWT' })}.${p}.`), 401, 'alg none');
  assert.equal(await usar(`${b64({ alg: 'none', typ: 'JWT' })}.${b64({ ...payload, rol: 'ADMIN' })}.`), 401, 'alg none escalando a ADMIN');
  assert.equal(await usar(`${h}.${b64({ ...payload, rol: 'ADMIN' })}.${valido.split('.')[2]}`), 401, 'payload manipulado con la firma vieja');
  assert.equal(await usar(valido.slice(0, -3) + 'AAA'), 401, 'firma alterada');
  assert.equal(await usar(await jwt.signAsync({ sub: payload.sub, empresaId: payload.empresaId, rol: payload.rol }, { algorithm: 'HS512' })), 401, 'HS512 con la clave correcta: el algoritmo está fijado a HS256');
  assert.equal(await usar(await new JwtService({ secret: 'otra-clave-distinta-0123456789abcdef' }).signAsync({ sub: payload.sub, empresaId: payload.empresaId, rol: 'EMPRESA' })), 401, 'otra clave');
  assert.equal(await usar(await jwt.signAsync({ sub: payload.sub, empresaId: payload.empresaId, rol: 'EMPRESA' }, { expiresIn: -30 })), 401, 'vencido');
  assert.equal(await usar(await jwt.signAsync({ sub: 'usuario-que-no-existe', empresaId: payload.empresaId, rol: 'EMPRESA' })), 401, 'usuario inexistente');
  assert.equal(await usar(await jwt.signAsync({ sub: payload.sub, empresaId: payload.empresaId, rol: 'ADMIN' })), 401, 'rol que no coincide con el de la base');
  assert.equal(await usar(await jwt.signAsync({ sub: payload.sub, empresaId: 'otra-empresa', rol: 'EMPRESA' })), 401, 'empresa que no coincide con la de la base');
  assert.equal(await usar('basura'), 401);
  assert.equal(await usar(''), 401);
});

test('JWT: un usuario borrado pierde el acceso de inmediato (no cuando caduca el token)', async () => {
  const c = new Cliente(base);
  assert.equal((await c.post('/auth/registro', cuerpo('2095000031', 'borrar@test.pe'))).status, 201);
  assert.equal((await c.get('/auth/me')).status, 200);
  const u = await prisma.usuario.findUniqueOrThrow({ where: { email: 'borrar@test.pe' } });
  await prisma.usuario.delete({ where: { id: u.id } });
  assert.equal((await c.get('/auth/me')).status, 401);
  assert.equal((await c.get('/empresas/mi')).status, 401);
});

test('sesión deslizante: pasada la mitad de su vida se renueva la cookie; recién emitida no', async () => {
  const c = new Cliente(base);
  await c.post('/auth/login', { email: 'cookie@test.pe', password: 'clave-segura-1' });
  const p = JSON.parse(Buffer.from(c.cookie.split('=')[1].split('.')[1], 'base64url').toString());
  const nuevaSesion = await c.get('/auth/me');
  assert.equal(nuevaSesion.set, null, 'sesión recién emitida: no se renueva');
  const vieja = await jwt.signAsync({ sub: p.sub, empresaId: p.empresaId, rol: p.rol, tipo: p.tipo, rolEmpresa: p.rolEmpresa, ini: Math.floor(Date.now() / 1000) - 3600 * 8 }, { expiresIn: 3600 * 2 });
  const r = await new Cliente(base).req('GET', '/auth/me', undefined, { Cookie: `swapit_token=${vieja}` });
  assert.equal(r.status, 200);
  assert.match(r.set ?? '', /swapit_token=[^;]+/, 'cookie renovada');
  // Una sesión que ya cumplió su vida absoluta (7 días desde el inicio) no se renueva más.
  const agotada = await jwt.signAsync({ sub: p.sub, empresaId: p.empresaId, rol: p.rol, tipo: p.tipo, rolEmpresa: p.rolEmpresa, ini: Math.floor(Date.now() / 1000) - 8 * 86400 }, { expiresIn: 3600 });
  const r2 = await new Cliente(base).req('GET', '/auth/me', undefined, { Cookie: `swapit_token=${agotada}` });
  assert.equal(r2.status, 200);
  assert.equal(r2.set, null, 'sin renovación pasado el tope absoluto');
});

test('logout: borra la cookie con los mismos atributos y no requiere sesión', async () => {
  const c = new Cliente(base);
  await c.post('/auth/login', { email: 'cookie@test.pe', password: 'clave-segura-1' });
  const r = await c.post('/auth/logout');
  assert.equal(r.status, 204);
  assert.match(r.set ?? '', /swapit_token=;/);
  assert.match(r.set ?? '', /HttpOnly/i);
  assert.match(r.set ?? '', /Path=\//);
  assert.match(r.set ?? '', /Expires=/);
});

test('hashes antiguos (coste bajo, como el seed de demo) se actualizan al coste vigente en el primer acceso', async () => {
  const viejo = await bcrypt.hash('vieja-clave-segura-9', 4);
  reiniciarLimites();
  assert.equal((await new Cliente(base).post('/auth/registro', cuerpo('2095000041', 'demo@test.pe', 'vieja-clave-segura-9'))).status, 201);
  await prisma.usuario.update({ where: { email: 'demo@test.pe' }, data: { passwordHash: viejo } });
  assert.equal((await new Cliente(base).post('/auth/login', { email: 'demo@test.pe', password: 'vieja-clave-segura-9' })).status, 200);
  const u = await prisma.usuario.findUniqueOrThrow({ where: { email: 'demo@test.pe' } });
  assert.ok(bcrypt.getRounds(u.passwordHash) >= 12);
  assert.equal((await new Cliente(base).post('/auth/login', { email: 'demo@test.pe', password: 'vieja-clave-segura-9' })).status, 200, 'sigue funcionando con el hash nuevo');
});

test('registro cerrado (REGISTRO_ABIERTO=false): 403 sin crear nada', async () => {
  process.env.REGISTRO_ABIERTO = 'false';
  try {
    const r = await new Cliente(base).post('/auth/registro', cuerpo('2095000051', 'cerrado@test.pe'));
    assert.equal(r.status, 403);
    assert.equal(await prisma.usuario.count({ where: { email: 'cerrado@test.pe' } }), 0);
  } finally {
    delete process.env.REGISTRO_ABIERTO;
  }
});
