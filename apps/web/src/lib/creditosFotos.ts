// Se completa con seed-fotos/creditos.json (fotos de demostración de Wikimedia Commons).
export interface CreditoFoto { autor: string; licencia: string; pagina: string }

export const CREDITOS_FOTOS: Record<string, CreditoFoto> = {};

/** Crédito de una foto demo a partir de su URL (…/demo-foto-<id>.jpg); null para fotos subidas por usuarios. */
export function creditoDeFoto(url?: string | null): CreditoFoto | null {
  const id = url && /demo-foto-([a-z0-9-]+)\.jpg/.exec(url)?.[1];
  return (id && CREDITOS_FOTOS[id]) || null;
}
