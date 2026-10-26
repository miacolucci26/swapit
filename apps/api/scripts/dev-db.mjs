// Postgres embebido (PGlite) con PostGIS + pgvector, expuesto por socket en :5433.
// Los datos persisten en apps/api/.pgdata. Uso: node scripts/dev-db.mjs
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';
import { postgis } from '@electric-sql/pglite-postgis';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

// DB_PORT y DB_DIR permiten levantar otra base (p. ej. scripts/humo.mjs usa una en memoria: DB_DIR=memory://).
const PUERTO = Number(process.env.DB_PORT ?? 5433);
const db = await PGlite.create({ dataDir: process.env.DB_DIR ?? './.pgdata', extensions: { vector, postgis } });
await db.exec('CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS vector;');
const r = await db.query("SELECT extname FROM pg_extension WHERE extname IN ('postgis','vector') ORDER BY 1");
console.log('extensiones:', r.rows.map((x) => x.extname).join(', '));
const server = new PGLiteSocketServer({ db, port: PUERTO, host: '127.0.0.1', maxConnections: 8 });
await server.start();
console.log(`PGlite escuchando en postgresql://postgres:postgres@127.0.0.1:${PUERTO}/postgres`);

// Cierre ordenado: PGlite persiste en disco al cerrar.
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    await server.stop();
    await db.close();
    process.exit(0);
  });
}
