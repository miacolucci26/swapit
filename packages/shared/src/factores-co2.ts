/**
 * Factores de impacto por categoría — VALORES PLACEHOLDER, consistentes pero NO validados.
 * Citar como "estimación" hasta contrastar con IPCC / EPA WARM.
 * kgCO2eq evitados por tonelada desviada y créditos circulares otorgados por tonelada donada.
 */
export const FACTORES_IMPACTO: Record<string, { co2PorTon: number; creditosPorTon: number }> = {
  ORGANICO_AGRO: { co2PorTon: 450, creditosPorTon: 40 },
  BIOMASA: { co2PorTon: 600, creditosPorTon: 50 },
  TEXTIL: { co2PorTon: 3500, creditosPorTon: 120 },
  PLASTICO: { co2PorTon: 1800, creditosPorTon: 90 },
  // Subtipos de plástico: mismos factores de ejemplo que PLASTICO hasta contar con datos por polímero.
  PLASTICO_PET: { co2PorTon: 1800, creditosPorTon: 90 },
  PLASTICO_PEAD: { co2PorTon: 1800, creditosPorTon: 90 },
  PLASTICO_PP: { co2PorTon: 1800, creditosPorTon: 90 },
  PLASTICO_FILM: { co2PorTon: 1800, creditosPorTon: 90 },
  PLASTICO_PVC: { co2PorTon: 1800, creditosPorTon: 90 },
  PLASTICO_MIXTO: { co2PorTon: 1800, creditosPorTon: 90 },
  METAL: { co2PorTon: 1500, creditosPorTon: 80 },
  PAPEL_CARTON: { co2PorTon: 900, creditosPorTon: 60 },
  CONSTRUCCION: { co2PorTon: 50, creditosPorTon: 15 },
  MAQUINARIA_EQUIPOS: { co2PorTon: 800, creditosPorTon: 70 },
  // Artículos personales: por tonelada equivalente (1 kg ≈ 3 kg CO2eq y 3 créditos); se aplican al peso estimado del lote.
  ARTICULOS_PERSONALES: { co2PorTon: 3000, creditosPorTon: 3000 },
  INSUMOS_RECICLADOS: { co2PorTon: 400, creditosPorTon: 45 },
  PESCA_MARISCOS: { co2PorTon: 300, creditosPorTon: 35 },
  MADERA_PALLETS: { co2PorTon: 700, creditosPorTon: 55 },
  VIDRIO_CERAMICA: { co2PorTon: 300, creditosPorTon: 30 },
  ACEITES_USADOS: { co2PorTon: 1200, creditosPorTon: 80 },
  RAEE: { co2PorTon: 2500, creditosPorTon: 150 },
  OTROS: { co2PorTon: 200, creditosPorTon: 20 },
};

/** Costo de disposición evitado (S/ por tonelada) — PLACEHOLDER para el ahorro agregado del dashboard. */
export const COSTO_DISPOSICION_EVITADO_POR_TON = 120;

/**
 * Precio de referencia por categoría, si no hay historial — PLACEHOLDER.
 * Está expresado en la unidad base de la categoría: S/ por tonelada (industriales) o S/ por unidad (artículos personales).
 */
export const PRECIO_REFERENCIA: Record<string, number> = {
  ORGANICO_AGRO: 80,
  BIOMASA: 140,
  TEXTIL: 450,
  PLASTICO: 900,
  PLASTICO_PET: 900,
  PLASTICO_PEAD: 900,
  PLASTICO_PP: 900,
  PLASTICO_FILM: 900,
  PLASTICO_PVC: 900,
  PLASTICO_MIXTO: 900,
  METAL: 1100,
  PAPEL_CARTON: 350,
  CONSTRUCCION: 40,
  MAQUINARIA_EQUIPOS: 600,
  ARTICULOS_PERSONALES: 30,
  INSUMOS_RECICLADOS: 250,
  PESCA_MARISCOS: 60,
  MADERA_PALLETS: 180,
  VIDRIO_CERAMICA: 80,
  ACEITES_USADOS: 700,
  RAEE: 120,
  OTROS: 100,
};

/** 1 crédito circular = S/ 1 al usarse para pagar comisiones. Sin valor de cambio fuera de la plataforma. */
export const VALOR_CREDITO_EN_SOLES = 1;

/**
 * Unidad base y peso promedio por categoría — PLACEHOLDER, no validado.
 * Permite publicar en unidades (p. ej. «3 libros») y convertirlas a toneladas para el impacto.
 */
export const UNIDAD_POR_CATEGORIA: Record<string, { unidadBase: 'ton' | 'kg' | 'und'; kgPorUnidad?: number }> = {
  ARTICULOS_PERSONALES: { unidadBase: 'und', kgPorUnidad: 1.5 },
  MAQUINARIA_EQUIPOS: { unidadBase: 'ton', kgPorUnidad: 50 }, // en unidades solo si se elige «und»
  MADERA_PALLETS: { unidadBase: 'und', kgPorUnidad: 20 }, // un pallet de madera pesa del orden de 15–25 kg
  RAEE: { unidadBase: 'und', kgPorUnidad: 5 },
  VIDRIO_CERAMICA: { unidadBase: 'ton', kgPorUnidad: 0.3 }, // un frasco de vidrio ≈ 0,3 kg; las familias publican en «und»
  ACEITES_USADOS: { unidadBase: 'kg' }, // se vende por litros en la práctica; 1 L ≈ 0,92 kg
};
