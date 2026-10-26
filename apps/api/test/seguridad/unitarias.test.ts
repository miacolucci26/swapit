import assert from 'node:assert/strict';
import { test } from 'node:test';
import { avisosEntorno, erroresEntorno, origenesPermitidos, validarEntorno } from '../../src/common/config-env';
import { validarImagen } from '../../src/common/imagen-segura';
import { anotar, excedido, intentar, olvidar, reiniciarLimites } from '../../src/common/limite-tasa';
import { interpretarTrustProxy, rutaParaLog } from '../../src/common/seguridad';
import { jwtSecret, ttlSegundos } from '../../src/auth/auth.config';
import { validarPassword } from '../../src/auth/auth.service';
import { igualesSeguro } from '../../src/whatsapp/whatsapp.controller';

const PROD_OK = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://postgres.abc:Xk29fjs0aLq@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require',
  JWT_SECRET: 'q7Zr3LmV9xT2bKd8WnYp4HsJ6cFgA1eU5oRiB0tXyMk',
  WEB_ORIGIN: 'https://swapit.example.pe',
  TRUST_PROXY: '1',
};

// ---------- validarEntorno ----------

test('entorno: fuera de producción no exige nada', () => {
  assert.deepEqual(erroresEntorno({}), []);
  assert.deepEqual(erroresEntorno({ NODE_ENV: 'development', JWT_SECRET: 'x' }), []);
  assert.doesNotThrow(() => validarEntorno({ NODE_ENV: 'test' }));
});

test('entorno: una configuración de producción correcta no da errores', () => {
  assert.deepEqual(erroresEntorno(PROD_OK), []);
  assert.doesNotThrow(() => validarEntorno(PROD_OK));
});

test('entorno: producción sin variables obligatorias lista TODOS los errores con mensajes claros', () => {
  const e = erroresEntorno({ NODE_ENV: 'production' });
  for (const v of ['DATABASE_URL', 'JWT_SECRET', 'WEB_ORIGIN', 'TRUST_PROXY']) assert.ok(e.some((m) => m.includes(v)), `falta mención de ${v}`);
  assert.throws(() => validarEntorno({ NODE_ENV: 'production' }), /DATABASE_URL[\s\S]*JWT_SECRET[\s\S]*WEB_ORIGIN/);
});

test('entorno: JWT_SECRET débil, corto o de ejemplo se rechaza en producción', () => {
  for (const malo of ['corto', 'dev-secret-inseguro', 'simbio-dev-secret-solo-local', 'swapit-dev-secret-solo-local', 'cambia-esto-por-un-secreto-largo', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'test-secret-test-secret-test-secret-123']) {
    assert.ok(erroresEntorno({ ...PROD_OK, JWT_SECRET: malo }).some((m) => m.startsWith('JWT_SECRET')), `debería rechazar «${malo}»`);
  }
  assert.throws(() => jwtSecret({ NODE_ENV: 'production', JWT_SECRET: 'corto' }), /JWT_SECRET/);
  assert.throws(() => jwtSecret({ NODE_ENV: 'production' }), /JWT_SECRET/);
});

test('entorno: sin JWT_SECRET fuera de producción se usa un secreto aleatorio por proceso (nunca uno conocido)', () => {
  const a = jwtSecret({ NODE_ENV: 'development' });
  assert.ok(a.length >= 32);
  assert.notEqual(a, 'dev-secret-inseguro');
  assert.equal(jwtSecret({ NODE_ENV: 'development' }), a, 'estable durante el proceso');
});

test('entorno: valores de desarrollo prohibidos en producción', () => {
  const con = (cambio: Record<string, string | undefined>) => erroresEntorno({ ...PROD_OK, ...cambio });
  assert.ok(con({ DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5433/postgres' }).some((m) => m.includes('DATABASE_URL')));
  assert.ok(con({ DATABASE_URL: 'postgresql://u:p@db.x.supabase.co:5432/postgres?sslmode=disable' }).some((m) => m.includes('TLS')));
  assert.ok(con({ WEB_ORIGIN: 'http://localhost:3000' }).some((m) => m.includes('WEB_ORIGIN')));
  assert.ok(con({ WEB_ORIGIN: 'http://swapit.pe' }).some((m) => m.includes('https')));
  assert.ok(con({ WEB_ORIGIN: '*' }).some((m) => m.includes('WEB_ORIGIN')));
  assert.ok(con({ WEB_ORIGIN: 'https://a.pe,https://b.pe/ruta' }).some((m) => m.includes('inválidas')));
  assert.ok(con({ TRUST_PROXY: undefined }).some((m) => m.includes('TRUST_PROXY')));
  assert.ok(con({ RATE_LIMIT_FACTOR: '1000' }).some((m) => m.includes('RATE_LIMIT_FACTOR')));
  assert.ok(con({ BCRYPT_COST: '4' }).some((m) => m.includes('BCRYPT_COST')));
  assert.ok(con({ WHATSAPP_VERIFY_TOKEN: 'swapit-demo', WHATSAPP_APP_SECRET: 'x' }).some((m) => m.includes('WHATSAPP_VERIFY_TOKEN')));
  assert.ok(con({ WHATSAPP_VERIFY_TOKEN: 'algo-unico-123' }).some((m) => m.includes('WHATSAPP_APP_SECRET')));
  assert.equal(con({ WEB_ORIGIN: 'https://a.pe, https://www.a.pe' }).length, 0, 'varios orígenes separados por coma');
});

test('entorno: avisos (no bloquean)', () => {
  const a = avisosEntorno(PROD_OK);
  assert.ok(a.some((m) => m.includes('WHATSAPP_APP_SECRET')));
  assert.ok(a.some((m) => m.includes('REGISTRO_ABIERTO')));
  assert.deepEqual(avisosEntorno({}), []);
});

test('origenesPermitidos: exactos, sin comodines, sin barra final', () => {
  assert.deepEqual(origenesPermitidos('https://a.pe/, https://b.pe'), ['https://a.pe', 'https://b.pe']);
  assert.deepEqual(origenesPermitidos('*'), []);
  assert.deepEqual(origenesPermitidos('https://*.vercel.app'), []);
  assert.deepEqual(origenesPermitidos('javascript:alert(1)'), []);
  assert.deepEqual(origenesPermitidos(undefined), []);
});

test('TRUST_PROXY: «true» no significa confiar en todo', () => {
  assert.equal(interpretarTrustProxy(undefined), false);
  assert.equal(interpretarTrustProxy('false'), false);
  assert.equal(interpretarTrustProxy('true'), 1);
  assert.equal(interpretarTrustProxy('2'), 2);
  assert.equal(interpretarTrustProxy('loopback'), 'loopback');
});

test('sesión: la vigencia se limita a 7 días y por defecto es 12 h', () => {
  assert.equal(ttlSegundos(undefined), 12 * 3600);
  assert.equal(ttlSegundos('30d'), 7 * 24 * 3600);
  assert.equal(ttlSegundos('2h'), 7200);
  assert.equal(ttlSegundos('basura'), 12 * 3600);
});

test('logs: el token de captación no se imprime', () => {
  assert.equal(rutaParaLog('/api/captacion/AbC123secreto/reporte'), '/api/captacion/:token/reporte');
});

// ---------- política de contraseñas ----------

test('contraseñas: mínimo 10, sin comunes, sin el correo, sin repeticiones', () => {
  assert.ok(validarPassword('corta1', 'a@b.pe'));
  assert.ok(validarPassword('123456789', 'a@b.pe'));
  assert.ok(validarPassword('1234567890', 'a@b.pe'), 'común');
  assert.ok(validarPassword('aaaaaaaaaaaa', 'a@b.pe'), 'repetitiva');
  assert.ok(validarPassword('xxmariaperezxx1', 'mariaperez@empresa.pe'), 'contiene el correo');
  assert.ok(validarPassword('a'.repeat(80) + 'bcd', 'a@b.pe'), 'más de 72 bytes');
  assert.equal(validarPassword('clave-segura-1', 'a@b.pe'), null);
  assert.equal(validarPassword('Tr3s tristes tigres', 'a@b.pe'), null);
});

// ---------- comparación en tiempo constante ----------

test('igualesSeguro compara textos de distinta longitud sin lanzar', () => {
  assert.equal(igualesSeguro('abc', 'abc'), true);
  assert.equal(igualesSeguro('abc', 'abcd'), false);
  assert.equal(igualesSeguro('', 'x'), false);
});

// ---------- límite de tasa ----------

test('limite-tasa: ventana deslizante, bloqueo por fallos y olvido', () => {
  reiniciarLimites();
  const t0 = 1_000_000;
  for (let i = 0; i < 3; i++) assert.equal(intentar('k', 3, 1000, t0 + i).ok, true);
  const x = intentar('k', 3, 1000, t0 + 10);
  assert.equal(x.ok, false);
  assert.ok(x.reintentarEnSeg >= 1);
  assert.equal(intentar('k', 3, 1000, t0 + 2000).ok, true, 'la ventana expira');
  anotar('f', 1000, t0);
  anotar('f', 1000, t0);
  assert.equal(excedido('f', 2, 1000, t0 + 1), true);
  assert.equal(excedido('f', 2, 1000, t0 + 5000), false);
  olvidar('f');
  assert.equal(excedido('f', 1, 1000, t0 + 1), false);
  reiniciarLimites();
});

// ---------- validarImagen ----------

const rellenar = (cabecera: Buffer, n = 64) => Buffer.concat([cabecera, Buffer.alloc(n, 0x41)]);
const JPG = rellenar(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]));
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]), Buffer.from('IHDR'), Buffer.alloc(40)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([48, 0, 0, 0]), Buffer.from('WEBPVP8 '), Buffer.alloc(40)]);

test('imagen: reconoce JPG, PNG y WEBP por su firma real', () => {
  assert.deepEqual({ ...validarImagen(JPG) }, { ok: true, ext: 'jpg', mime: 'image/jpeg' });
  assert.deepEqual({ ...validarImagen(PNG) }, { ok: true, ext: 'png', mime: 'image/png' });
  assert.deepEqual({ ...validarImagen(WEBP) }, { ok: true, ext: 'webp', mime: 'image/webp' });
});

test('imagen: rechaza texto, HTML, SVG, GIF, PDF, ejecutables, vacíos y truncados', () => {
  const malos: [string, Buffer][] = [
    ['texto', Buffer.from('esto es solo texto renombrado a .png, nada de imagen aquí')],
    ['html', Buffer.from('<!doctype html><html><script>alert(1)</script></html>')],
    ['svg', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')],
    ['svg con xml', Buffer.from('<?xml version="1.0"?><svg onload="alert(1)" xmlns="http://www.w3.org/2000/svg"/>')],
    ['gif', rellenar(Buffer.from('GIF89a'))],
    ['pdf', rellenar(Buffer.from('%PDF-1.7\n'))],
    ['exe', rellenar(Buffer.from('MZ'))],
    ['vacío', Buffer.alloc(0)],
    ['muy corto', Buffer.from([0xff, 0xd8, 0xff])],
    ['PNG sin IHDR', rellenar(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))],
    ['RIFF que no es WEBP', Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVEfmt '), Buffer.alloc(40)])],
  ];
  for (const [nombre, b] of malos) assert.equal(validarImagen(b).ok, false, `debería rechazar: ${nombre}`);
});

test('imagen: rechaza políglotas (imagen válida con HTML/script incrustado)', () => {
  assert.equal(validarImagen(Buffer.concat([JPG, Buffer.from('<script>alert(document.cookie)</script>')])).ok, false);
  assert.equal(validarImagen(Buffer.concat([PNG, Buffer.from('<html><body onload=x>')])).ok, false);
  assert.equal(validarImagen(Buffer.concat([WEBP, Buffer.from('<svg onload=alert(1)>')])).ok, false);
  assert.equal(validarImagen(Buffer.concat([JPG, Buffer.from('javascript:alert(1)')])).ok, false);
});
