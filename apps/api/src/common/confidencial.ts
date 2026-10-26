import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Confidencialidad de empresas: una empresa «confidencial» se muestra como «Empresa confidencial · sector»,
 * con ubicación aproximada (~5 km) y distancia redondeada, hasta que el ofertante responde una solicitud
 * (Transaccion.identidadRevelada). Sigue visible su verificación KYB, calificación y certificaciones:
 * se oculta quién es, no si es confiable.
 */
export const PASO_UBICACION_OCULTA = 0.05; // grados ≈ 5,5 km

/** Empresas cuya identidad ya conoce quien consulta, por tener una negociación abierta (o pasada) con ellas. */
export async function empresasReveladas(prisma: PrismaService, viewerId: string): Promise<Set<string>> {
  const filas = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT DISTINCT CASE WHEN "ofertanteId" = ${viewerId} THEN "receptorId" ELSE "ofertanteId" END AS id
    FROM "Transaccion"
    WHERE ("ofertanteId" = ${viewerId} OR "receptorId" = ${viewerId}) AND "identidadRevelada"`);
  return new Set(filas.map((f) => f.id));
}

export const nombreConfidencial = (sector?: string | null) => (sector ? `Empresa confidencial · ${sector}` : 'Empresa confidencial');

export const aproximar = (v: number) => Math.round(v / PASO_UBICACION_OCULTA) * PASO_UBICACION_OCULTA;

/** ¿Debe ocultarse la identidad de esta empresa para quien consulta? */
export const debeOcultar = (e: { id?: string; empresaId?: string; confidencial?: boolean | null }, viewerId: string, reveladas: Set<string>) => {
  const id = e.empresaId ?? e.id;
  return !!e.confidencial && id !== viewerId && !reveladas.has(id as string);
};

/** Aplica la máscara a una fila de lote (SQL crudo) sin alterar la original. */
export function enmascararFila<T extends { empresaId: string; confidencial?: boolean | null; razonSocial: string; sector?: string; lat: number | null; lng: number | null; distanciaKm?: number | null }>(
  f: T,
  viewerId: string,
  reveladas: Set<string>,
): T & { identidadOculta: boolean } {
  if (!debeOcultar(f, viewerId, reveladas)) return { ...f, identidadOculta: false };
  return {
    ...f,
    razonSocial: nombreConfidencial(f.sector),
    lat: f.lat == null ? null : aproximar(Number(f.lat)),
    lng: f.lng == null ? null : aproximar(Number(f.lng)),
    distanciaKm: f.distanciaKm == null ? f.distanciaKm : Math.round(Number(f.distanciaKm)),
    identidadOculta: true,
  };
}
