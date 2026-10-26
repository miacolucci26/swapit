/**
 * Taxonomía de materiales: algunas categorías son subtipos de una familia. Hoy solo el plástico, porque ahí el precio
 * cambia mucho según el polímero (un generador con 8-10 tipos de plástico tiene un comprador y un precio distintos
 * para cada uno). Los factores de impacto y los precios de referencia son PLACEHOLDERS, igual que los de las demás categorías.
 */
export interface SubtipoPlastico {
  codigo: string;
  /** Nombre corto del polímero, tal como lo diría un generador. */
  subtipo: string;
  nombre: string;
  /** Código de residuo (LER) orientativo. */
  codigoLer: string;
}

export const FAMILIA_PLASTICO = 'PLASTICO';

export const SUBTIPOS_PLASTICO: SubtipoPlastico[] = [
  { codigo: 'PLASTICO_PET', subtipo: 'PET', nombre: 'Plástico PET (botellas, preformas)', codigoLer: '15 01 02' },
  { codigo: 'PLASTICO_PEAD', subtipo: 'PEAD', nombre: 'Plástico PEAD / HDPE (bidones, tapas, cajas)', codigoLer: '15 01 02' },
  { codigo: 'PLASTICO_PP', subtipo: 'PP', nombre: 'Plástico PP (polipropileno, zunchos, tapas)', codigoLer: '15 01 02' },
  { codigo: 'PLASTICO_FILM', subtipo: 'Film', nombre: 'Film plástico (stretch, LDPE, bolsas)', codigoLer: '15 01 02' },
  { codigo: 'PLASTICO_PVC', subtipo: 'PVC', nombre: 'Plástico PVC (tuberías, perfiles)', codigoLer: '17 02 03' },
  { codigo: 'PLASTICO_MIXTO', subtipo: 'Mixto', nombre: 'Plástico mixto o sin clasificar', codigoLer: '19 12 04' },
];

export const CODIGOS_SUBTIPO_PLASTICO = new Set(SUBTIPOS_PLASTICO.map((s) => s.codigo));

/** Familia de una categoría (p. ej. PLASTICO_PET → PLASTICO); null si no pertenece a una familia. */
export const familiaDe = (codigo: string): string | null => (codigo === FAMILIA_PLASTICO || CODIGOS_SUBTIPO_PLASTICO.has(codigo) ? FAMILIA_PLASTICO : null);

export const subtipoDe = (codigo: string): string | null => SUBTIPOS_PLASTICO.find((s) => s.codigo === codigo)?.subtipo ?? null;
