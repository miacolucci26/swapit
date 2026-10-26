// Recorrido de humo en MODO PRODUCCIÓN LOCAL (NODE_ENV=production) contra una base PGlite en memoria. No usa cuentas externas.
//   pnpm humo                -> compila (shared + api), levanta BD y API en producción y recorre el flujo
//   node scripts/humo.mjs --sin-build   (reutiliza apps/api/dist)
//
// Recorrido: salud → registro de dos empresas (quedan PENDIENTES: no hay proveedor SUNAT) → login → un ADMIN las verifica a
// mano → publicar con foto subida → la otra empresa propone → aceptar → el contacto es visible SOLO después del acuerdo
// (y nunca para un tercero) → se sirve la foto. Sale con código 0 si todo pasa.
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const api = join(raiz, 'apps/api');
const PUERTO_DB = 5435;
const PUERTO_API = 4015;
const BASE = `http://127.0.0.1:${PUERTO_API}`;
// La validación de producción exige HTTPS en WEB_ORIGIN: es solo el valor que la API espera en la cabecera Origin; no se abre ninguna conexión.
const ORIGEN_WEB = 'https://swapit.humo.test';
const ADMIN = { email: 'admin@humo.test', password: randomBytes(9).toString('base64url') + 'Aa1' };
const CLAVE = 'clave-segura-' + randomBytes(3).toString('hex');
const tmp = mkdtempSync(join(tmpdir(), 'swapit-humo-'));
const hijos = [];

const paso = (t) => console.log(`\n\x1b[32m▸ ${t}\x1b[0m`);
const ok = (t) => console.log(`  \x1b[32m✔\x1b[0m ${t}`);
const limpiar = () => {
  for (const h of hijos) h.kill('SIGTERM');
  try {
    rmSync(tmp, { recursive: true, force: true });
  } catch {
    /* archivo aún abierto en Windows: no importa, es temporal */
  }
};
process.on('exit', limpiar);
process.on('SIGINT', () => process.exit(130));

// Entorno de PRODUCCIÓN para la API. Todo local: base en memoria, disco temporal (por eso PERMITIR_DISCO_LOCAL), sin claves externas.
const ENV = {
  ...process.env,
  NODE_ENV: 'production',
  SWAPIT_MODO: 'MARKETPLACE',
  // Base local en memoria (el validador de producción de la API se trata en scripts/humo-api.cjs).
  DATABASE_URL: `postgresql://postgres:postgres@127.0.0.1:${PUERTO_DB}/postgres?connection_limit=1&pgbouncer=true&sslmode=disable`,
  DIRECT_URL: `postgresql://postgres:postgres@127.0.0.1:${PUERTO_DB}/postgres?sslmode=disable`,
  TRUST_PROXY: 'false',
  JWT_SECRET: randomBytes(32).toString('hex'),
  WEB_ORIGIN: ORIGEN_WEB,
  API_PORT: String(PUERTO_API),
  STORAGE_DRIVER: 'local',
  PERMITIR_DISCO_LOCAL: '1',
  UPLOADS_DIR: join(tmp, 'uploads'),
  ADMIN_EMAIL: ADMIN.email,
  ADMIN_PASSWORD: ADMIN.password,
};
for (const k of ['SUNAT_PROVIDER', 'WHATSAPP_TOKEN', 'WHATSAPP_IA', 'GEMINI_API_KEY', 'OCULTAR_DEMO', 'SUPABASE_URL']) delete ENV[k];

function sh(cmd, cwd = raiz, env = ENV) {
  const r = spawnSync(cmd, { cwd, shell: true, stdio: 'inherit', env });
  if (r.status !== 0) throw new Error(`Falló: ${cmd}`);
}
function lanzar(nombre, args, cwd, env) {
  const p = spawn(process.execPath, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], env });
  const pref = (d) => d.toString().split('\n').filter(Boolean).forEach((l) => process.env.HUMO_VERBOSO && console.log(`[${nombre}] ${l}`));
  p.stdout.on('data', pref);
  p.stderr.on('data', pref);
  hijos.push(p);
  return p;
}
async function esperarHttp(url, seg = 60) {
  for (let i = 0; i < seg; i++) {
    try {
      const r = await fetch(url);
      if (r.status < 500) return;
    } catch {
      /* aún no responde */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`No respondió ${url}`);
}
async function esperarPuerto(puerto, seg = 60) {
  const { createConnection } = await import('node:net');
  for (let i = 0; i < seg; i++) {
    const abierto = await new Promise((res) => {
      const s = createConnection(puerto, '127.0.0.1');
      s.on('connect', () => { s.destroy(); res(true); });
      s.on('error', () => res(false));
    });
    if (abierto) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`No abrió el puerto ${puerto}`);
}

/** Cliente HTTP con jar de cookies manual (la cookie es Secure en producción y Node no la reenviaría por http). */
class Cliente {
  cookie = '';
  async req(metodo, ruta, cuerpo, extra = {}) {
    const res = await fetch(`${BASE}/api${ruta}`, {
      method: metodo,
      headers: { Origin: ORIGEN_WEB, ...(cuerpo !== undefined && !(cuerpo instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}), ...extra },
      body: cuerpo === undefined ? undefined : cuerpo instanceof FormData ? cuerpo : JSON.stringify(cuerpo),
    });
    const set = res.headers.get('set-cookie');
    if (set && /swapit_token=[^;]+/.test(set)) this.cookie = set.match(/swapit_token=[^;]+/)[0];
    const tipo = res.headers.get('content-type') ?? '';
    const data = tipo.includes('json') ? await res.json().catch(() => ({})) : await res.arrayBuffer();
    return { status: res.status, data, tipo };
  }
  get = (r) => this.req('GET', r);
  post = (r, b) => this.req('POST', r, b ?? {});
  put = (r, b) => this.req('PUT', r, b);
  patch = (r, b) => this.req('PATCH', r, b);
}

// RUC válido: 10 dígitos de base + dígito verificador (algoritmo de SUNAT).
function rucDe(base10) {
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const s = [...base10].reduce((a, d, i) => a + Number(d) * pesos[i], 0);
  return base10 + String((11 - (s % 11)) % 10);
}
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const alta = async (c, base, rol, email, extra) => {
  const r = await c.post('/auth/registro', {
    empresa: { ruc: rucDe(base), razonSocial: `Empresa ${email}`, rol, direccion: 'Zona Industrial, Piura', representanteLegal: 'Rep Legal', ...extra },
    usuario: { nombre: 'Usuario Humo', email, password: CLAVE },
  });
  assert.equal(r.status, 201, `registro de ${email}: ${JSON.stringify(r.data)}`);
  return r.data;
};

try {
  if (!process.argv.includes('--sin-build')) {
    paso('Compilando (shared + api)');
    sh('pnpm --filter @swapit/shared build && pnpm --filter @swapit/api build');
  }

  paso(`Base de datos en memoria (PostgreSQL + PostGIS + pgvector) en :${PUERTO_DB}`);
  lanzar('db', ['scripts/dev-db.mjs'], api, { ...ENV, DB_PORT: String(PUERTO_DB), DB_DIR: 'memory://' });
  await esperarPuerto(PUERTO_DB);
  sh('npx prisma migrate deploy', api);

  paso('Primera carga de producción (catálogo + cuenta de administración, SIN datos de demostración)');
  sh('node dist/seed/primera-carga.js', api);

  paso(`API en modo producción (:${PUERTO_API})`);
  lanzar('api', [join(raiz, 'scripts/humo-api.cjs')], raiz, ENV);
  await esperarHttp(`${BASE}/api/health`);

  paso('Recorrido');
  const A = new Cliente(); // ofertante
  const B = new Cliente(); // receptor
  const C = new Cliente(); // tercero
  const ADM = new Cliente();

  const salud = await A.get('/health');
  assert.equal(salud.status, 200);
  assert.equal(salud.data.ok, true);
  assert.equal(salud.data.postgis && salud.data.pgvector, true);
  ok('GET /api/health: base de datos, PostGIS y pgvector');

  const a = await alta(A, '2090000001', 'OFERTANTE', 'a@humo.test', { contactoNombre: 'Ana Humo', telefono: '987 654 321' });
  const b = await alta(B, '2090000002', 'RECEPTOR', 'b@humo.test', { contactoNombre: 'Beto Humo', telefono: '912345678' });
  await alta(C, '2090000003', 'AMBOS', 'c@humo.test');
  assert.equal(a.empresa.estadoKyb, 'PENDIENTE', 'en producción sin SUNAT_PROVIDER nunca queda VERIFICADA sola');
  assert.equal(b.empresa.estadoKyb, 'PENDIENTE');
  ok('registro de dos empresas (+ un tercero): quedan PENDIENTES, no VERIFICADAS');

  const login = new Cliente();
  assert.equal((await login.post('/auth/login', { email: 'a@humo.test', password: CLAVE })).status, 200);
  assert.equal((await login.post('/auth/login', { email: 'a@humo.test', password: 'mala-clave-1234' })).status, 401);
  ok('login correcto y rechazo de contraseña errónea');

  assert.equal((await ADM.post('/auth/login', { email: ADMIN.email, password: ADMIN.password })).status, 200);
  assert.equal((await A.patch(`/admin/empresas/${b.empresa.id}/verificacion`, { estado: 'VERIFICADA' })).status, 403);
  for (const e of [a.empresa.id, b.empresa.id]) {
    const v = await ADM.patch(`/admin/empresas/${e}/verificacion`, { estado: 'VERIFICADA', nota: 'recorrido de humo' });
    assert.equal(v.status, 200, JSON.stringify(v.data));
    assert.equal(v.data.metodoVerificacion, 'MANUAL');
  }
  const perfil = (await B.get(`/empresas/${a.empresa.id}`)).data;
  assert.equal(perfil.estadoKyb, 'VERIFICADA');
  assert.equal(perfil.metodoVerificacion, 'MANUAL');
  assert.equal(perfil.demo, false);
  ok('un ADMIN verifica las dos empresas a mano (método MANUAL, no demo)');

  const fd = new FormData();
  fd.append('file', new Blob([PNG], { type: 'image/png' }), 'foto.png');
  const sub = await A.req('POST', '/uploads', fd);
  assert.equal(sub.status, 201, JSON.stringify(sub.data));
  assert.match(sub.data.url, /^\/api\/uploads\/[0-9a-f]{24}\.png$/);
  const fdMala = new FormData();
  fdMala.append('file', new Blob([Buffer.from('no soy una imagen')], { type: 'image/png' }), 'falsa.png');
  assert.equal((await A.req('POST', '/uploads', fdMala)).status, 400);
  ok(`foto subida (${sub.data.url}) y rechazo de un archivo que no es imagen`);

  const lote = await A.post('/lotes', {
    categoriaCodigo: 'ORGANICO_AGRO', titulo: 'Descarte de uva de mesa', descripcion: 'Uva de mesa descartada por calibre, lista para recojo.',
    keywords: ['uva'], cantidad: 20, modalidad: 'DONACION', imagenes: [sub.data.nombre],
  });
  assert.equal(lote.status, 201, JSON.stringify(lote.data));
  assert.equal(lote.data.imagenes[0], sub.data.url);
  const foto = await fetch(`${BASE}${sub.data.url}`);
  assert.equal(foto.status, 200);
  assert.equal(foto.headers.get('content-type'), 'image/png');
  ok('lote publicado con la foto, y la foto se sirve');

  const visibles = (await B.get('/lotes')).data;
  assert.ok(visibles.some((l) => l.id === lote.data.id && l.demo === false));
  const tx = await B.post('/transacciones', { loteId: lote.data.id, cantidad: 5 });
  assert.equal(tx.status, 201, JSON.stringify(tx.data));
  const id = tx.data.id;
  const detalle = async (c) => (await c.get(`/transacciones/${id}`)).data;
  assert.equal((await detalle(B)).contactoContraparte, null);
  ok('la otra empresa solicita el lote; sin acuerdo no hay contacto');

  await A.post(`/transacciones/${id}/mensajes`, { texto: 'Hola, tenemos disponibilidad' });
  assert.equal((await B.put(`/transacciones/${id}/terminos`, { cantidad: 5 })).status, 200);
  const enNegociacion = await detalle(A);
  assert.equal(enNegociacion.etapa, 'PROPUESTA');
  assert.equal(enNegociacion.contactoContraparte, null);
  assert.ok(!JSON.stringify([enNegociacion, (await B.get('/transacciones')).data]).match(/987654321|912345678/));
  ok('en negociación (etapa PROPUESTA) el contacto sigue oculto');

  assert.equal((await A.post(`/transacciones/${id}/aceptar`)).status, 200);
  const deA = await detalle(A);
  const deB = await detalle(B);
  assert.equal(deA.etapa, 'ACEPTADA');
  assert.equal(deA.contactoContraparte.telefono, '+51912345678');
  assert.match(deA.contactoContraparte.whatsappUrl, /^https:\/\/wa\.me\/51912345678\?text=/);
  assert.equal(deB.contactoContraparte.telefono, '+51987654321');
  assert.equal(deB.contactoContraparte.nombre, 'Ana Humo');
  ok('al aceptar (etapa ACEPTADA) cada parte ve el contacto de la otra, con enlace de WhatsApp');

  const deC = await C.get(`/transacciones/${id}`);
  assert.equal(deC.status, 404);
  assert.ok(!JSON.stringify(deC.data).match(/987654321|912345678/));
  ok('un tercero no ve la operación ni el contacto');

  // El script de verificación manual (el que usarán en producción) funciona contra esta API.
  const envAdmin = { ...ENV, API_URL: BASE };
  const lista = spawnSync(process.execPath, ['scripts/admin-verificar.mjs'], { cwd: raiz, env: envAdmin, encoding: 'utf8' });
  assert.equal(lista.status, 0, lista.stderr);
  assert.match(lista.stdout, /c@humo\.test|Empresa c@humo\.test/);
  const idC = (await ADM.get('/admin/empresas')).data.find((e) => e.razonSocial.includes('c@humo.test')).id;
  const verif = spawnSync(process.execPath, ['scripts/admin-verificar.mjs', idC, 'VERIFICADA', 'prueba', 'de', 'humo'], { cwd: raiz, env: envAdmin, encoding: 'utf8' });
  assert.equal(verif.status, 0, verif.stderr);
  assert.match(verif.stdout, /VERIFICADA \(método MANUAL\)/);
  ok('scripts/admin-verificar.mjs lista y verifica empresas pendientes');

  paso('Función sin servidor (api/index.js, la entrada que usa Vercel)');
  const PUERTO_SL = PUERTO_API + 1;
  lanzar('serverless', [join(raiz, 'scripts/humo-serverless.cjs')], raiz, { ...ENV, NODE_ENV: 'development', PUERTO_SERVERLESS: String(PUERTO_SL) });
  await esperarPuerto(PUERTO_SL);
  const sl = async (metodo, ruta, cuerpo) => {
    const r = await fetch(`http://127.0.0.1:${PUERTO_SL}/api${ruta}`, { method: metodo, headers: cuerpo ? { 'Content-Type': 'application/json' } : {}, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
    return { status: r.status, data: await r.json().catch(() => ({})) };
  };
  assert.equal((await sl('GET', '/health')).status, 200);
  const l = await sl('POST', '/auth/login', { email: ADMIN.email, password: ADMIN.password });
  assert.equal(l.status, 200, JSON.stringify(l.data));
  assert.equal((await sl('GET', '/ruta-que-no-existe')).status, 404);
  ok('la función sin servidor arranca en frío, responde /api/health y lee el cuerpo JSON del login');

  console.log('\n\x1b[32m✔ Recorrido de humo en producción local: TODO BIEN\x1b[0m\n');
} catch (e) {
  console.error(`\n\x1b[31m✖ Falló el recorrido de humo:\x1b[0m ${e instanceof Error ? e.message : e}`);
  console.error('  (HUMO_VERBOSO=1 muestra los registros de la API y la base)');
  process.exitCode = 1;
}
process.exit(process.exitCode ?? 0);
