import type { UnidadLote } from './enums';

export const ETIQUETA_UNIDAD: Record<UnidadLote, { corta: string; plural: string; porUnidad: string }> = {
  ton: { corta: 't', plural: 'toneladas', porUnidad: 'tonelada' },
  kg: { corta: 'kg', plural: 'kilogramos', porUnidad: 'kilo' },
  und: { corta: 'und.', plural: 'unidades', porUnidad: 'unidad' },
};

/**
 * Convierte la cantidad de un lote a toneladas (base de todas las métricas de impacto y de créditos).
 * `kgPorUnidad` es el peso promedio de una unidad de la categoría — PLACEHOLDER, no validado.
 */
export function aToneladas(cantidad: number, unidad: string, kgPorUnidad?: number | null): number {
  if (unidad === 'kg') return cantidad / 1000;
  if (unidad === 'und') return (cantidad * (kgPorUnidad ?? 1)) / 1000;
  return cantidad;
}

/** "12 t", "3 und.", "40 kg" — para mensajes y documentos. */
export function formatoCantidad(cantidad: number, unidad: string): string {
  const u = ETIQUETA_UNIDAD[unidad as UnidadLote]?.corta ?? unidad;
  return `${Number(cantidad.toFixed(2)).toLocaleString('es-PE')} ${u}`;
}

/** Masa equivalente legible: por debajo de 1 t se muestra en kilos. */
export function formatoMasa(toneladas: number): string {
  if (toneladas > 0 && toneladas < 1) return `${Number((toneladas * 1000).toFixed(1)).toLocaleString('es-PE')} kg`;
  return `${Number(toneladas.toFixed(2)).toLocaleString('es-PE')} t`;
}

/** Nombre visible para terceros: "Ana Torres Quispe" -> "Ana T." (no se expone el apellido completo). */
export function nombrePublico(nombreCompleto: string): string {
  const partes = nombreCompleto.trim().split(/\s+/).filter(Boolean);
  if (partes.length <= 1) return partes[0] ?? '';
  return `${partes[0]} ${partes[1][0].toUpperCase()}.`;
}
