import type { Modalidad } from './enums';

export const EstadoTransaccion = [
  'SOLICITADO',
  'EN_NEGOCIACION',
  'ACORDADO',
  'PAGO_RETENIDO',
  'RECOJO_CONFIRMADO',
  'ENTREGADO',
  'CALIFICADO',
  'CERRADO',
  'CANCELADO',
] as const;
export type EstadoTransaccion = (typeof EstadoTransaccion)[number];

/** Transiciones válidas. PAGO_RETENIDO solo aplica a VENTA (ver siguienteTrasAcuerdo). */
export const TRANSICIONES: Record<EstadoTransaccion, EstadoTransaccion[]> = {
  SOLICITADO: ['EN_NEGOCIACION', 'CANCELADO'],
  EN_NEGOCIACION: ['ACORDADO', 'CANCELADO'],
  ACORDADO: ['PAGO_RETENIDO', 'RECOJO_CONFIRMADO', 'CANCELADO'],
  PAGO_RETENIDO: ['RECOJO_CONFIRMADO', 'CANCELADO'],
  RECOJO_CONFIRMADO: ['ENTREGADO', 'CANCELADO'],
  ENTREGADO: ['CALIFICADO'],
  CALIFICADO: ['CERRADO'],
  CERRADO: [],
  CANCELADO: [],
};

export function puedeTransicionar(desde: EstadoTransaccion, hacia: EstadoTransaccion): boolean {
  return TRANSICIONES[desde].includes(hacia);
}

/**
 * Tras ACORDADO: venta (dinero) y créditos retienen el pago; la donación y el intercambio (sin dinero
 * de por medio) saltan directo a coordinar el recojo.
 * RECOJO_CONFIRMADO = fecha y responsable de recojo confirmados.
 */
export function siguienteTrasAcuerdo(modalidad: Modalidad): EstadoTransaccion {
  return modalidad === 'DONACION' || modalidad === 'INTERCAMBIO' ? 'RECOJO_CONFIRMADO' : 'PAGO_RETENIDO';
}

export const ETIQUETA_ESTADO: Record<EstadoTransaccion, string> = {
  SOLICITADO: 'Solicitado',
  EN_NEGOCIACION: 'En negociación',
  ACORDADO: 'Acordado',
  PAGO_RETENIDO: 'Pago retenido',
  RECOJO_CONFIRMADO: 'Recojo confirmado',
  ENTREGADO: 'Entregado',
  CALIFICADO: 'Calificado',
  CERRADO: 'Cerrado',
  CANCELADO: 'Cancelado',
};

// ---------- Etapas simplificadas (lo que ve la persona usuaria) ----------

/**
 * Los nueve estados internos se agrupan en cuatro etapas que se entienden de un vistazo:
 * PROPUESTA (se está hablando), ACEPTADA (hay acuerdo y falta coordinar/entregar), CERRADA (ya se entregó) y CANCELADA.
 */
export const EtapaSimple = ['PROPUESTA', 'ACEPTADA', 'CERRADA', 'CANCELADA'] as const;
export type EtapaSimple = (typeof EtapaSimple)[number];

const ETAPA_POR_ESTADO: Record<EstadoTransaccion, EtapaSimple> = {
  SOLICITADO: 'PROPUESTA',
  EN_NEGOCIACION: 'PROPUESTA',
  ACORDADO: 'ACEPTADA',
  PAGO_RETENIDO: 'ACEPTADA',
  RECOJO_CONFIRMADO: 'ACEPTADA',
  ENTREGADO: 'CERRADA',
  CALIFICADO: 'CERRADA',
  CERRADO: 'CERRADA',
  CANCELADO: 'CANCELADA',
};

/** Etapa simple de un estado. Un estado desconocido (dato antiguo) se trata como PROPUESTA, la más prudente. */
export function etapaSimple(estado: EstadoTransaccion | string): EtapaSimple {
  return ETAPA_POR_ESTADO[estado as EstadoTransaccion] ?? 'PROPUESTA';
}

export const ETIQUETA_ETAPA: Record<EtapaSimple, string> = {
  PROPUESTA: 'Propuesta',
  ACEPTADA: 'Aceptada',
  CERRADA: 'Cerrada',
  CANCELADA: 'Cancelada',
};

/** Una línea que explica la etapa en lenguaje llano. */
export const DESCRIPCION_ETAPA: Record<EtapaSimple, string> = {
  PROPUESTA: 'Están conversando y definiendo los términos.',
  ACEPTADA: 'Ya hay acuerdo: toca coordinar el recojo y la entrega.',
  CERRADA: 'El material se entregó y la operación terminó.',
  CANCELADA: 'La operación se canceló.',
};

/**
 * Los datos de contacto de la contraparte solo se muestran cuando hay acuerdo (ACORDADO o posterior) y la operación
 * no fue cancelada. Antes del acuerdo la conversación ocurre dentro de la plataforma.
 */
export function contactoVisibleEn(estado: EstadoTransaccion | string): boolean {
  return etapaSimple(estado) === 'ACEPTADA' || etapaSimple(estado) === 'CERRADA';
}
