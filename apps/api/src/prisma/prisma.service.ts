import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Cambios de la migración 0013 (modos comprador y vendedor). Son aditivos e idempotentes, así que la API los aplica
 * sola al arrancar si faltan: el despliegue en Vercel funciona aunque nadie haya corrido `prisma migrate deploy`.
 */
const ESQUEMA_MODOS = [
  `ALTER TYPE "EstadoLote" ADD VALUE IF NOT EXISTS 'PAUSADO'`,
  `ALTER TABLE "Empresa" ADD COLUMN IF NOT EXISTS "nombreTienda" TEXT`,
  `ALTER TABLE "Empresa" ADD COLUMN IF NOT EXISTS "cobroMetodo" TEXT`,
  `ALTER TABLE "Empresa" ADD COLUMN IF NOT EXISTS "cobroCuenta" TEXT`,
];

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    await this.asegurarEsquemaModos().catch((e) => this.log.error(`No se pudo completar el esquema de modos: ${(e as Error).message}`));
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async asegurarEsquemaModos() {
    const [r] = await this.$queryRawUnsafe<{ listo: boolean }[]>(`
      SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Empresa' AND column_name = 'cobroCuenta')
         AND EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'EstadoLote' AND e.enumlabel = 'PAUSADO') AS listo`);
    if (r?.listo) return;
    for (const sql of ESQUEMA_MODOS) await this.$executeRawUnsafe(sql);
    this.log.log('Esquema de modos comprador/vendedor aplicado (migración 0013).');
  }
}
