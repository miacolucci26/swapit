import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { modo } from './modo';

/** Región del pooler de Supabase (aws-0-<región>.pooler.supabase.com); solo el nombre de la región, nunca la URL. */
const regionDb = () => /aws-\d+-([a-z0-9-]+)\.pooler\.supabase\.com/.exec(process.env.DATABASE_URL ?? '')?.[1] ?? null;

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Comprobación para monitoreo y para el primer despliegue: responde 200 solo si la base de datos contesta y tiene PostGIS y
   * pgvector; si no, 503 (sin detalles del error, que pueden contener datos de conexión).
   */
  @Get()
  async check() {
    let names: string[];
    try {
      const ext = await this.prisma.$queryRaw<{ extname: string }[]>`
        SELECT extname FROM pg_extension WHERE extname IN ('postgis', 'vector')`;
      names = ext.map((e: { extname: string }) => e.extname);
    } catch {
      throw new ServiceUnavailableException({ ok: false, db: false });
    }
    const postgis = names.includes('postgis');
    const pgvector = names.includes('vector');
    if (!postgis || !pgvector) throw new ServiceUnavailableException({ ok: false, db: true, postgis, pgvector });
    // Ida y vuelta a la base: si pasa de ~50 ms, la base está en otra región que la función (ver docs/despliegue.md).
    const t = performance.now();
    await this.prisma.$queryRaw`SELECT 1`;
    const dbMs = Math.round(performance.now() - t);
    return { ok: true, db: true, modo: modo(), postgis, pgvector, dbMs, region: process.env.VERCEL_REGION ?? null, regionDb: regionDb() };
  }
}
