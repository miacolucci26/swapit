/**
 * Postgres REAL en memoria para pruebas (PGlite + PostGIS + pgvector), con las migraciones de prisma/migrations.
 * Así las consultas espaciales y de vectores se prueban de verdad, sin Docker.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';
import { postgis } from '@electric-sql/pglite-postgis';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

export async function iniciarDb(port: number) {
  const db = await PGlite.create({ extensions: { vector, postgis } });
  const dir = join(process.cwd(), 'prisma', 'migrations');
  for (const m of readdirSync(dir).filter((x) => /^\d+_/.test(x)).sort()) {
    await db.exec(readFileSync(join(dir, m, 'migration.sql'), 'utf8'));
  }
  const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1', maxConnections: 8 });
  await server.start();
  process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?connection_limit=1&pgbouncer=true&sslmode=disable`;
  process.env.JWT_SECRET = 'test-secret';
  return {
    async detener() {
      // Deja que Prisma/pg terminen de cerrar sus conexiones antes de cerrar PGlite (si no, a veces queda un error asíncrono tardío).
      await new Promise((r) => setTimeout(r, 400));
      await server.stop();
      await db.close();
    },
  };
}
