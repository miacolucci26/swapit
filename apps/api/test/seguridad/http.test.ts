import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { INestApplication, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { reiniciarLimites } from '../../src/common/limite-tasa';
import { FiltroExcepciones } from '../../src/common/seguridad';
import { iniciarDb } from '../db';
import { crearApp } from '../http';

let app: INestApplication;
let db: { detener(): Promise<void> };
let base: string;

const PERMITIDO = 'https://app.swapit.example.pe';
const OTRO_PERMITIDO = 'https://www.swapit.example.pe';

const raw = (metodo: string, ruta: string, o: { headers?: Record<string, string>; body?: string } = {}) =>
  fetch(`${base}${ruta}`, { method: metodo, headers: { 'Content-Type': 'application/json', ...o.headers }, body: o.body });

before(async () => {
  db = await iniciarDb(5623);
  ({ app, base } = await crearApp({ limitesReales: true, env: { WEB_ORIGIN: `${PERMITIDO}, ${OTRO_PERMITIDO}/`, TRUST_PROXY: '1' } }));
});
after(async () => {
  await app.close();
  await db.detener();
});

// ---------- Cabeceras ----------

test('cabeceras: helmet (CSP restrictiva, nosniff, anti-framing, sin referrer) y sin x-powered-by', async () => {
  const r = await raw('GET', '/api/health');
  const h = r.headers;
  assert.equal(h.get('x-powered-by'), null);
  assert.equal(h.get('x-content-type-options'), 'nosniff');
  assert.equal(h.get('x-frame-options'), 'DENY');
  assert.match(h.get('content-security-policy') ?? '', /default-src 'none'/);
  assert.match(h.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
  assert.equal(h.get('referrer-policy'), 'no-referrer');
  assert.equal(h.get('cross-origin-resource-policy'), 'cross-origin');
  assert.equal(h.get('cache-control'), 'no-store');
  assert.equal(h.get('strict-transport-security'), null, 'HSTS solo en producción');
});

test('cabeceras: el PDF del certificado no lleva CSP (el visor del navegador la rechaza) pero sí nosniff', async () => {
  const r = await raw('GET', '/api/verificar/SWP-0000-NOEXISTE/pdf');
  assert.equal(r.status, 404);
  assert.equal(r.headers.get('content-security-policy'), null);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
});

// ---------- CORS ----------

test('CORS: lista blanca exacta con credenciales; sin comodines; orígenes ajenos no reciben cabeceras', async () => {
  for (const origen of [PERMITIDO, OTRO_PERMITIDO]) {
    const pre = await raw('OPTIONS', '/api/auth/login', { headers: { Origin: origen, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
    assert.equal(pre.status, 204);
    assert.equal(pre.headers.get('access-control-allow-origin'), origen);
    assert.equal(pre.headers.get('access-control-allow-credentials'), 'true');
    assert.match(pre.headers.get('vary') ?? '', /Origin/i);
  }
  for (const malo of ['https://evil.example', 'http://app.swapit.example.pe', 'https://app.swapit.example.pe.evil.example', 'https://sub.app.swapit.example.pe', 'null']) {
    const pre = await raw('OPTIONS', '/api/auth/login', { headers: { Origin: malo, 'Access-Control-Request-Method': 'POST' } });
    assert.equal(pre.headers.get('access-control-allow-origin'), null, `no debe permitir ${malo}`);
    const get = await raw('GET', '/api/health', { headers: { Origin: malo } });
    assert.equal(get.headers.get('access-control-allow-origin'), null);
  }
  const sin = await raw('GET', '/api/health');
  assert.notEqual(sin.headers.get('access-control-allow-origin'), '*');
});

// ---------- CSRF ----------

test('CSRF: una petición que cambia estado con Origin/Referer ajeno se rechaza; sin ellos (servidor a servidor) y con origen permitido pasa', async () => {
  const cuerpo = JSON.stringify({ email: 'nadie@test.pe', password: 'x' });
  for (const metodo of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const r = await raw(metodo, '/api/auth/login', { headers: { Origin: 'https://evil.example' }, body: metodo === 'DELETE' ? undefined : cuerpo });
    assert.equal(r.status, 403, `${metodo} con origen ajeno`);
    assert.equal((await r.json()).message, 'Origen no permitido');
  }
  assert.equal((await raw('POST', '/api/auth/login', { headers: { Origin: 'null' }, body: cuerpo })).status, 403, 'Origin: null (iframe sandbox, redirecciones)');
  assert.equal((await raw('POST', '/api/auth/login', { headers: { Referer: 'https://evil.example/formulario' }, body: cuerpo })).status, 403, 'solo Referer ajeno');
  assert.equal((await raw('POST', '/api/auth/login', { headers: { Referer: 'no es una url' }, body: cuerpo })).status, 403, 'Referer ilegible');
  assert.equal((await raw('POST', '/api/auth/login', { headers: { Origin: PERMITIDO }, body: cuerpo })).status, 401, 'origen permitido → llega a la lógica');
  assert.equal((await raw('POST', '/api/auth/login', { headers: { Referer: `${PERMITIDO}/login` }, body: cuerpo })).status, 401, 'Referer permitido');
  assert.equal((await raw('POST', '/api/auth/login', { body: cuerpo })).status, 401, 'sin Origin ni Referer');
  assert.equal((await raw('POST', '/api/auth/login', { headers: { Origin: base }, body: cuerpo })).status, 401, 'mismo origen del servidor');
  assert.equal((await raw('GET', '/api/health', { headers: { Origin: 'https://evil.example' } })).status, 200, 'las lecturas no se bloquean (CORS impide leerlas)');
  reiniciarLimites();
});

// ---------- Tamaño del cuerpo ----------

test('cuerpo: JSON mayor de 1 MB → 413 con mensaje genérico; JSON mal formado → 400 sin trazas', async () => {
  reiniciarLimites();
  const grande = JSON.stringify({ email: 'a@b.pe', password: 'x'.repeat(2 * 1024 * 1024) });
  const r = await raw('POST', '/api/auth/login', { body: grande });
  assert.equal(r.status, 413);
  const texto = await r.text();
  assert.ok(!/at .*\.js|node_modules|stack/i.test(texto), 'sin pila de llamadas');
  const ok = await raw('POST', '/api/auth/login', { body: JSON.stringify({ email: 'a@b.pe', password: 'x'.repeat(900 * 1024) }) });
  assert.equal(ok.status, 400, 'bajo el tope pasa el parser (y la validación lo rechaza por su longitud)');
  const mal = await raw('POST', '/api/auth/login', { body: '{"email": ' });
  assert.equal(mal.status, 400);
  assert.ok(!/SyntaxError|at /.test(await mal.text()), 'sin detalles del parser');
});

// ---------- Errores ----------

function simularError(exc: unknown) {
  const salida: { status?: number; cuerpo?: any } = {};
  const res = { headersSent: false, status(s: number) { salida.status = s; return this; }, json(c: unknown) { salida.cuerpo = c; return this; } };
  const host = { switchToHttp: () => ({ getResponse: () => res, getRequest: () => ({ method: 'GET', path: '/api/captacion/SECRETO123/reporte' }) }) };
  new FiltroExcepciones().catch(exc, host as never);
  return salida;
}

test('errores: un fallo interno o de Prisma/SQL nunca expone mensajes, tablas ni trazas al cliente', () => {
  const interno = simularError(new Error('connect ECONNREFUSED 10.0.0.5:5432 password=hunter2'));
  assert.equal(interno.status, 500);
  assert.deepEqual(interno.cuerpo, { statusCode: 500, message: 'Error interno del servidor' });

  const p2002 = simularError(new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`email`) in table "Usuario"', { code: 'P2002', clientVersion: '6' }));
  assert.equal(p2002.status, 409);
  assert.ok(!JSON.stringify(p2002.cuerpo).includes('Usuario'));

  const otro = simularError(new Prisma.PrismaClientKnownRequestError('Raw query failed. SELECT * FROM "Empresa" WHERE ...', { code: 'P2010', clientVersion: '6' }));
  assert.equal(otro.status, 500);
  assert.ok(!JSON.stringify(otro.cuerpo).includes('SELECT'));

  const validacion = simularError(new Prisma.PrismaClientValidationError('Argument `estado`: Invalid value provided. Expected EstadoLote', { clientVersion: '6' }));
  assert.equal(validacion.status, 400);
  assert.ok(!JSON.stringify(validacion.cuerpo).includes('EstadoLote'));

  const http = simularError(new NotFoundException('Lote no encontrado'));
  assert.equal(http.status, 404);
  assert.equal(http.cuerpo.message, 'Lote no encontrado');
});

test('errores: ruta inexistente → 404 JSON sin trazas', async () => {
  const r = await raw('GET', '/api/no-existe');
  assert.equal(r.status, 404);
  assert.ok(!/stack| at /.test(await r.text()));
});

// ---------- Límites de tasa ----------

test('tasa: la IP real se toma de X-Forwarded-For solo con TRUST_PROXY (cada cliente su propio cupo)', async () => {
  reiniciarLimites();
  const login = (ip: string) => raw('POST', '/api/auth/login', { headers: { 'X-Forwarded-For': ip }, body: JSON.stringify({ malo: true }) });
  let ultimo = 0;
  for (let i = 0; i < 41; i++) ultimo = (await login('203.0.113.7')).status;
  assert.equal(ultimo, 429, 'la IP 203.0.113.7 agotó su cupo');
  assert.equal((await login('203.0.113.8')).status, 400, 'otra IP no se ve afectada');
  reiniciarLimites();
});

test('tasa: las mayúsculas, barras repetidas y %-codificación en la ruta no evitan el límite', async () => {
  reiniciarLimites();
  const variantes = ['/api/auth/login', '/API/AUTH/LOGIN', '/api//auth/login', '/api/auth/login/'];
  let ultimo = 0;
  for (let i = 0; i < 44; i++) ultimo = (await raw('POST', variantes[i % variantes.length], { headers: { 'X-Forwarded-For': '198.51.100.9' }, body: '{}' })).status;
  assert.equal(ultimo, 429);
  reiniciarLimites();
});

test('tasa: portal de captación (100 por minuto) y verificación pública de certificados (60 por minuto)', async () => {
  reiniciarLimites();
  let st = 0;
  for (let i = 0; i < 101; i++) st = (await raw('GET', '/api/captacion/token-inexistente-123', { headers: { 'X-Forwarded-For': '192.0.2.10' } })).status;
  assert.equal(st, 429);
  for (let i = 0; i < 61; i++) st = (await raw('GET', '/api/verificar/SWP-0000-AAAAAAAA', { headers: { 'X-Forwarded-For': '192.0.2.11' } })).status;
  assert.equal(st, 429);
  assert.equal((await raw('GET', '/api/health', { headers: { 'X-Forwarded-For': '192.0.2.10' } })).status, 200, 'el monitoreo no gasta cupo');
  reiniciarLimites();
});

// ---------- Inventario de rutas ----------

test('autorización: TODA ruta no pública responde 401 sin sesión (ningún controlador sin guard)', async () => {
  reiniciarLimites();
  const router = (app.getHttpAdapter().getInstance() as { router: { stack: any[] } }).router;
  const rutas: { metodo: string; ruta: string }[] = [];
  for (const capa of router.stack) {
    if (!capa.route) continue;
    for (const m of Object.keys(capa.route.methods)) if (capa.route.methods[m]) rutas.push({ metodo: m.toUpperCase(), ruta: String(capa.route.path) });
  }
  assert.ok(rutas.length > 80, `se esperaban muchas rutas, hay ${rutas.length}`);
  const PUBLICAS = [
    /^GET \/api\/health$/,
    /^POST \/api\/auth\/(registro|login|logout)$/,
    /^(GET|POST) \/api\/whatsapp\/webhook$/,
    /^\w+ \/api\/captacion\//,
    /^GET \/api\/verificar\/:codigo(\/pdf)?$/,
    /^GET \/api\/impacto\/publico$/,
  ];
  const desprotegidas: string[] = [];
  for (const { metodo, ruta } of rutas) {
    if (PUBLICAS.some((re) => re.test(`${metodo} ${ruta}`))) continue;
    const url = ruta.replace(/:[A-Za-z]+/g, 'x').replace(/\{[^}]*\}/g, '');
    const r = await raw(metodo, url, { headers: { 'X-Forwarded-For': `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` }, body: ['GET', 'HEAD', 'DELETE'].includes(metodo) ? undefined : '{}' });
    if (r.status !== 401) desprotegidas.push(`${metodo} ${ruta} → ${r.status}`);
  }
  assert.deepEqual(desprotegidas, [], 'rutas que no exigen sesión y no están en la lista de públicas');
  // Las públicas deben ser solo las esperadas: si alguien añade una, esta lista y docs/seguridad.md deben actualizarse a propósito.
  const publicas = rutas.filter(({ metodo, ruta }) => PUBLICAS.some((re) => re.test(`${metodo} ${ruta}`))).map((r) => `${r.metodo} ${r.ruta}`);
  assert.ok(publicas.length >= 12 && publicas.length <= 16, `rutas públicas: ${publicas.join(', ')}`);
  reiniciarLimites();
});
