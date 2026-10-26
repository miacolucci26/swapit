import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, TipoCredito } from '@prisma/client';
import { BENEFICIOS } from '@swapit/shared';
import { PrismaService } from '../prisma/prisma.service';

type Db = Prisma.TransactionClient | PrismaService;

export interface Movimiento {
  empresaId: string;
  transaccionId?: string | null;
  tipo: TipoCredito;
  monto: number; // con signo
  descripcion: string;
  clave: string; // idempotencia: la misma clave nunca se registra dos veces
}

/** Ledger append-only: el saldo siempre es SUM(monto); no existe un campo de balance mutable. */
@Injectable()
export class CreditosService {
  constructor(private readonly prisma: PrismaService) {}

  async saldo(empresaId: string, db: Db = this.prisma): Promise<number> {
    const r = await db.creditoMovimiento.aggregate({ where: { empresaId }, _sum: { monto: true } });
    return Math.round((r._sum.monto ?? 0) * 100) / 100;
  }

  async registrar(m: Movimiento, db: Db = this.prisma) {
    return db.creditoMovimiento.upsert({
      where: { claveIdempotencia: m.clave },
      update: {},
      create: {
        empresaId: m.empresaId,
        transaccionId: m.transaccionId ?? null,
        tipo: m.tipo,
        monto: Math.round(m.monto * 100) / 100,
        descripcion: m.descripcion,
        claveIdempotencia: m.clave,
      },
    });
  }

  async panel(empresaId: string) {
    const [saldo, movimientos, ganado, gastado] = await Promise.all([
      this.saldo(empresaId),
      this.prisma.creditoMovimiento.findMany({ where: { empresaId }, orderBy: { createdAt: 'desc' }, take: 50 }),
      this.prisma.creditoMovimiento.aggregate({ where: { empresaId, monto: { gt: 0 } }, _sum: { monto: true } }),
      this.prisma.creditoMovimiento.aggregate({ where: { empresaId, monto: { lt: 0 } }, _sum: { monto: true } }),
    ]);
    return {
      saldo,
      totalGanado: Math.round(ganado._sum.monto ?? 0),
      totalGastado: Math.round(Math.abs(gastado._sum.monto ?? 0)),
      movimientos,
      beneficios: Object.entries(BENEFICIOS).map(([codigo, b]) => ({ codigo, ...b })),
    };
  }

  /** Canje por beneficios no monetarios. */
  async canjear(empresaId: string, beneficio: keyof typeof BENEFICIOS, loteId?: string) {
    const b = BENEFICIOS[beneficio];
    const saldo = await this.saldo(empresaId);
    if (saldo < b.costo) throw new BadRequestException(`Saldo insuficiente: necesitas ${b.costo} créditos y tienes ${saldo}.`);

    return this.prisma.$transaction(async (tx) => {
      if (beneficio === 'DESTACAR_LOTE') {
        if (!loteId) throw new BadRequestException('Elige el lote a destacar');
        const lote = await tx.lote.findFirst({ where: { id: loteId, empresaId, estado: 'PUBLICADO' } });
        if (!lote) throw new BadRequestException('Solo puedes destacar lotes propios y publicados');
        await tx.lote.update({ where: { id: loteId }, data: { destacadoHasta: new Date(Date.now() + b.dias * 86400_000) } });
      }
      if (beneficio === 'BADGE_CIRCULAR') {
        const ya = await tx.empresa.findUniqueOrThrow({ where: { id: empresaId }, select: { badgeCircular: true } });
        if (ya.badgeCircular) throw new BadRequestException('Tu empresa ya tiene el badge circular');
        await tx.empresa.update({ where: { id: empresaId }, data: { badgeCircular: true } });
      }
      await this.registrar(
        { empresaId, tipo: 'CANJE_BENEFICIO', monto: -b.costo, descripcion: `${beneficio}: ${b.etiqueta}`, clave: `canje:${beneficio}:${empresaId}:${Date.now()}` },
        tx,
      );
      return { ok: true, saldo: await this.saldo(empresaId, tx) };
    });
  }

  async tieneReporte(empresaId: string) {
    return (await this.prisma.creditoMovimiento.count({ where: { empresaId, tipo: 'CANJE_BENEFICIO', descripcion: { startsWith: 'REPORTE_SOSTENIBILIDAD' } } })) > 0;
  }
}
