import { Injectable } from '@nestjs/common';
import { BillingProvider } from '../common/billing/billing.provider';
import { PrismaService } from '../prisma/prisma.service';

/** Plan único por ahora; el precio es un PLACEHOLDER editable en ConfigPlataforma. */
export const PLANES = { ESTANDAR: { etiqueta: 'Plan Estándar', incluye: 'Red de proveedores, portal de captación, benchmark de precios y certificados (cada certificado tiene un fee).' } } as const;
const PERIODO_DIAS = 30;

@Injectable()
export class FacturacionService {
  constructor(private readonly prisma: PrismaService, private readonly billing: BillingProvider) {}

  private config() {
    return this.prisma.configPlataforma.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  }

  private activa(empresaId: string) {
    return this.prisma.suscripcion.findFirst({ where: { empresaId, estado: 'ACTIVA', periodoFin: { gt: new Date() } } });
  }

  /** Plan, suscripción vigente y fees: lo que ve el intermediario en «Facturación». */
  async resumen(empresaId: string) {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const [cfg, suscripcion, delMes, recientes] = await Promise.all([
      this.config(),
      this.activa(empresaId),
      this.prisma.cobroFee.aggregate({ where: { empresaId, createdAt: { gte: inicioMes } }, _sum: { monto: true }, _count: { _all: true } }),
      this.prisma.cobroFee.findMany({ where: { empresaId }, orderBy: { createdAt: 'desc' }, take: 20, include: { certificado: { select: { codigo: true } } } }),
    ]);
    return {
      plan: { codigo: 'ESTANDAR', ...PLANES.ESTANDAR, precioMensual: cfg.precioPlanMensual, feeCertificado: cfg.feeCertificado },
      suscripcion,
      proximoCobro: suscripcion ? { fecha: suscripcion.periodoFin, monto: suscripcion.montoMensual } : null,
      feesDelMes: { cantidad: delMes._count._all, monto: Math.round((delMes._sum.monto ?? 0) * 100) / 100 },
      recientes: recientes.map((f) => ({ id: f.id, concepto: f.concepto, monto: f.monto, estado: f.estado, fecha: f.createdAt, certificado: f.certificado?.codigo ?? null })),
      aviso: 'Cobros simulados (sin pasarela real). Los precios son valores de ejemplo.',
    };
  }

  /** Activa la suscripción (mock). Si ya hay una vigente no se cobra de nuevo. */
  async suscribir(empresaId: string) {
    const vigente = await this.activa(empresaId);
    if (vigente) return { ...(await this.resumen(empresaId)), yaActiva: true };
    const cfg = await this.config();
    const ref = await this.billing.crearSuscripcion(empresaId, 'ESTANDAR', cfg.precioPlanMensual);
    const ahora = new Date();
    // Cierra suscripciones vencidas que quedaron marcadas como activas (el índice único permite una sola ACTIVA).
    await this.prisma.suscripcion.updateMany({ where: { empresaId, estado: 'ACTIVA' }, data: { estado: 'CANCELADA' } });
    await this.prisma.suscripcion.create({
      data: { empresaId, plan: 'ESTANDAR', estado: 'ACTIVA', montoMensual: cfg.precioPlanMensual, periodoInicio: ahora, periodoFin: new Date(ahora.getTime() + PERIODO_DIAS * 86400_000), referenciaPago: ref.referencia },
    });
    return { ...(await this.resumen(empresaId)), yaActiva: false };
  }

  async cancelar(empresaId: string) {
    const s = await this.activa(empresaId);
    if (s) {
      await this.billing.cancelarSuscripcion(s.referenciaPago ?? '');
      await this.prisma.suscripcion.update({ where: { id: s.id }, data: { estado: 'CANCELADA' } });
    }
    return this.resumen(empresaId);
  }
}
