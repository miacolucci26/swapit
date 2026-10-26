import type { EstadoLote } from './enums';

/**
 * Ciclo de un lote en el modelo B2B2B: lo reporta un proveedor (portal, WhatsApp o el propio intermediario),
 * el intermediario lo cotiza, lo acopia (recoge y pesa) y lo despacha a su cliente; solo entonces se emite el certificado.
 */
export const TRANSICIONES_LOTE: Partial<Record<EstadoLote, EstadoLote[]>> = {
  REPORTADO: ['COTIZADO', 'RECHAZADO'],
  COTIZADO: ['COTIZADO', 'ACOPIADO', 'RECHAZADO'], // se puede volver a cotizar
  ACOPIADO: ['DESPACHADO'],
  DESPACHADO: [],
  RECHAZADO: [],
};

export function puedeTransicionarLote(desde: EstadoLote, hacia: EstadoLote): boolean {
  return TRANSICIONES_LOTE[desde]?.includes(hacia) ?? false;
}

export const ETIQUETA_ESTADO_LOTE: Partial<Record<EstadoLote, string>> = {
  REPORTADO: 'Reportado',
  COTIZADO: 'Cotizado',
  ACOPIADO: 'Acopiado',
  DESPACHADO: 'Despachado',
  RECHAZADO: 'Rechazado',
};
