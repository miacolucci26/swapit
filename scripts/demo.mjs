// Levanta el prototipo completo con un solo comando:
//   pnpm demo            -> BD embebida + migraciones + seed (si está vacía) + API + web
//   pnpm demo:reset      -> igual, pero recrea los datos de demostración
import { spawn, spawnSync } from 'node:child_process';
import { createConnection } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const api = join(raiz, 'apps/api');
const web = join(raiz, 'apps/web');
const reset = process.argv.includes('--reset');
const hijos = [];

// Valores por defecto para desarrollo local: el clon no trae apps/api/.env (no se versiona), así que `pnpm demo`
// funciona solo. Cualquier variable ya definida en el entorno o en apps/api/.env manda sobre estos valores.
const ENV_LOCAL = {
  DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5433/postgres?connection_limit=1&pgbouncer=true&sslmode=disable',
  // Prisma Migrate usa la conexión directa (en Supabase: puerto 5432); en local es la misma base embebida.
  DIRECT_URL: 'postgresql://postgres:postgres@127.0.0.1:5433/postgres?sslmode=disable',
  JWT_SECRET: 'swapit-dev-secret-solo-local',
  API_PORT: '4000',
  WEB_ORIGIN: 'http://localhost:3000',
  // Modo por defecto: la experiencia de INTERCAMBIO (ofertantes con fotos, demandantes, oferta de precio en la plataforma), que es
  // la que se muestra en el pitch. Con --b2b (pnpm demo:b2b) se ve Swapit para intermediarios (acopiadores).
  SWAPIT_MODO: process.argv.includes('--b2b') ? 'B2B2B' : 'MARKETPLACE',
};

const paso = (t) => console.log(`\n\x1b[32m▸ ${t}\x1b[0m`);
const sh = (cmd, cwd = raiz, env = {}) => {
  const r = spawnSync(cmd, { cwd, shell: true, stdio: 'inherit', env: { ...ENV_LOCAL, ...process.env, ...env } });
  if (r.status !== 0) {
    console.error(`Falló: ${cmd}`);
    process.exit(r.status ?? 1);
  }
};
const lanzar = (nombre, args, cwd) => {
  const p = spawn(process.execPath, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], env: { ...ENV_LOCAL, ...process.env } });
  const pref = (d) => d.toString().split('\n').filter(Boolean).forEach((l) => console.log(`[${nombre}] ${l}`));
  p.stdout.on('data', pref);
  p.stderr.on('data', pref);
  p.on('exit', (c) => {
    if (c) console.log(`[${nombre}] terminó con código ${c}`);
  });
  hijos.push(p);
  return p;
};
const puertoAbierto = (port) =>
  new Promise((ok) => {
    const s = createConnection(port, '127.0.0.1');
    s.on('connect', () => {
      s.destroy();
      ok(true);
    });
    s.on('error', () => ok(false));
  });
async function esperar(port, seg = 90) {
  for (let i = 0; i < seg; i++) {
    if (await puertoAbierto(port)) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`No abrió el puerto ${port}`);
}

const salir = () => {
  for (const h of hijos) h.kill('SIGINT');
  setTimeout(() => process.exit(0), 3000);
};
process.on('SIGINT', salir);
process.on('SIGTERM', salir);

paso('Compilando (shared + api)');
sh('pnpm --filter @swapit/api prisma:generate && pnpm --filter @swapit/shared build && pnpm --filter @swapit/api build');

paso('Base de datos embebida (PostgreSQL + PostGIS + pgvector)');
lanzar('db', ['scripts/dev-db.mjs'], api);
await esperar(5433);

paso('Migraciones');
sh('npx prisma migrate deploy', api);

paso(reset ? 'Recreando datos de demostración' : 'Datos de demostración (se omite si ya existen)');
sh('node dist/seed/run-seed.js', api, reset ? { SEED_RESET: '1' } : {});

paso('API (:4000) y web (:3000)');
lanzar('api', ['dist/main.js'], api);
await esperar(4000, 30);
lanzar('web', [join(web, 'node_modules/next/dist/bin/next'), 'dev', '-p', '3000'], web);
await esperar(3000, 60);
console.log('\n\x1b[32m✔ Swap It listo: http://localhost:3000   (Ctrl+C para detener)\x1b[0m\n');
