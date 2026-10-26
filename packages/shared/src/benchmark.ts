import { PRECIO_REFERENCIA } from './factores-co2';
import type { PosicionPrecio } from './enums';

/**
 * Benchmark de precios por subtipo de material.
 * Dado un lote, se buscan observaciones de precio similares (mismo subtipo, región, volumen, recientes) y se estima un
 * rango de precio justo con percentiles ponderados. La similitud vectorial (pgvector) y la distancia (PostGIS) son las
 * mismas que usaba el matching de contrapartes; ahora se comparan precios, no empresas.
 */

/** Peso de cada criterio al comparar una observación con el lote consultado (suman 1). La reputación ya no interviene. */
export const PESOS_BENCHMARK = { material: 0.45, cercania: 0.2, volumen: 0.2, recencia: 0.15 } as const;

/** Puntaje mínimo para que una observación cuente como comparable. */
export const UMBRAL_COMPARABLE = 0.3;
/** Radio con el que la cercanía llega a 0 (km). */
export const RADIO_CERCANIA_KM = 300;
/** Por debajo de este número de comparables el rango es solo orientativo. */
export const MIN_COMPARABLES = 5;

export type FuentePrecio = 'SEMILLA' | 'ACOPIO' | 'CSV';

// ---------- Unidades ----------

/** Precio por tonelada a partir de un precio por unidad del lote (kg, ton o und con peso medio). */
export function precioPorTon(precio: number, unidad: string, kgPorUnidad?: number | null): number {
  if (unidad === 'kg') return precio * 1000;
  if (unidad === 'und') return (precio * 1000) / (kgPorUnidad ?? 1);
  return precio;
}

/** Inverso de `precioPorTon`: expresa un precio por tonelada en la unidad del lote. */
export function precioEnUnidad(precioTon: number, unidad: string, kgPorUnidad?: number | null): number {
  if (unidad === 'kg') return precioTon / 1000;
  if (unidad === 'und') return (precioTon * (kgPorUnidad ?? 1)) / 1000;
  return precioTon;
}

// ---------- Estadística ----------

/** Percentil ponderado (q entre 0 y 1) con interpolación lineal sobre los pesos acumulados. */
export function percentilPonderado(datos: { v: number; w: number }[], q: number): number | null {
  const d = datos.filter((x) => x.w > 0 && Number.isFinite(x.v)).sort((a, b) => a.v - b.v);
  if (!d.length) return null;
  if (d.length === 1) return d[0].v;
  const total = d.reduce((s, x) => s + x.w, 0);
  let acum = 0;
  const pos = d.map((x) => {
    const p = (acum + x.w / 2) / total;
    acum += x.w;
    return p;
  });
  if (q <= pos[0]) return d[0].v;
  if (q >= pos[pos.length - 1]) return d[d.length - 1].v;
  for (let i = 1; i < d.length; i++) {
    if (q <= pos[i]) {
      const t = (q - pos[i - 1]) / (pos[i] - pos[i - 1]);
      return d[i - 1].v + t * (d[i].v - d[i - 1].v);
    }
  }
  return d[d.length - 1].v;
}

export interface Observacion {
  precioPorTon: number;
  cantidadTon: number;
  fecha: Date;
  fuente: FuentePrecio;
  categoriaCodigo: string;
  /** Similitud coseno (0..1) entre el texto de la observación y el de la consulta. */
  similitud: number;
  distanciaKm: number | null;
}

export interface ConsultaBenchmark {
  categoriaCodigo: string;
  cantidadTon: number;
  ahora?: Date;
}

export interface Comparable extends Observacion {
  score: number;
}

/** Puntaje (0..1) de una observación frente a la consulta, con los pesos de `PESOS_BENCHMARK`. */
export function puntuar(o: Observacion, q: ConsultaBenchmark): number {
  const ahora = q.ahora ?? new Date();
  // Mismo subtipo = 1; otro subtipo de la misma familia (p. ej. PET vs PEAD) pesa poco: sus precios son distintos.
  const mismaCategoria = o.categoriaCodigo === q.categoriaCodigo ? 1 : 0.35;
  const material = 0.7 * mismaCategoria + 0.3 * Math.max(0, Math.min(1, o.similitud));
  const cercania = o.distanciaKm == null ? 0.5 : 1 - Math.min(o.distanciaKm / RADIO_CERCANIA_KM, 1);
  const volumen = q.cantidadTon > 0 && o.cantidadTon > 0 ? 1 - Math.min(Math.abs(Math.log(q.cantidadTon / o.cantidadTon)) / Math.log(10), 1) : 0.5;
  const meses = Math.max(0, (ahora.getTime() - o.fecha.getTime()) / (30.44 * 86400_000));
  const recencia = Math.exp(-meses / 12);
  return PESOS_BENCHMARK.material * material + PESOS_BENCHMARK.cercania * cercania + PESOS_BENCHMARK.volumen * volumen + PESOS_BENCHMARK.recencia * recencia;
}

export type ConfianzaBenchmark = 'ALTA' | 'MEDIA' | 'BAJA' | 'NINGUNA';

export interface ResultadoBenchmark {
  /** Precios por tonelada (S/); null si no hay comparables. */
  rango: { p25: number; p50: number; p75: number } | null;
  n: number;
  confianza: ConfianzaBenchmark;
  /** Menos de `MIN_COMPARABLES` comparables: el rango es una pista, no una referencia. */
  rangoOrientativo: boolean;
  /** Más de la mitad del peso viene de datos de ejemplo (semilla): no es un precio de mercado validado. */
  esSemilla: boolean;
  comparables: Comparable[];
}

/** Estima el rango de precio justo a partir de observaciones ya filtradas por visibilidad y familia. */
export function estimarRango(observaciones: Observacion[], q: ConsultaBenchmark, maxComparables = 40): ResultadoBenchmark {
  const puntuadas = observaciones.map((o) => ({ ...o, score: puntuar(o, q) })).filter((c) => c.score >= UMBRAL_COMPARABLE);
  // Otros subtipos de la familia (p. ej. PVC o mixto al consultar PET) solo sirven de respaldo cuando faltan datos del
  // mismo subtipo: si hay suficientes, se ignoran (si no, por cantidad, terminarían pesando más que el propio subtipo).
  const mismoSubtipo = puntuadas.filter((c) => c.categoriaCodigo === q.categoriaCodigo);
  let pool = mismoSubtipo.length >= MIN_COMPARABLES ? mismoSubtipo : puntuadas;
  // Los datos de ejemplo solo sirven mientras no haya referencia real: con suficientes precios reales del mismo subtipo
  // se descartan para no contaminar un benchmark verdadero con datos inventados.
  if (mismoSubtipo.filter((c) => c.fuente !== 'SEMILLA').length >= MIN_COMPARABLES) pool = pool.filter((c) => c.fuente !== 'SEMILLA');
  const comparables = pool.sort((a, b) => b.score - a.score).slice(0, maxComparables);
  if (!comparables.length) return { rango: null, n: 0, confianza: 'NINGUNA', rangoOrientativo: true, esSemilla: false, comparables: [] };

  // El peso crece más rápido que el puntaje para que los comparables muy parecidos pesen más que los dudosos.
  const datos = comparables.map((c) => ({ v: c.precioPorTon, w: c.score ** 2 }));
  const p25 = percentilPonderado(datos, 0.25) as number;
  const p50 = percentilPonderado(datos, 0.5) as number;
  const p75 = percentilPonderado(datos, 0.75) as number;
  const n = comparables.length;
  const pesoTotal = datos.reduce((s, d) => s + d.w, 0);
  const pesoSemilla = comparables.reduce((s, c) => s + (c.fuente === 'SEMILLA' ? c.score ** 2 : 0), 0);
  const pesoMismoSubtipo = comparables.reduce((s, c) => s + (c.categoriaCodigo === q.categoriaCodigo ? c.score ** 2 : 0), 0);
  const dispersion = p50 > 0 ? (p75 - p25) / p50 : 0;

  let confianza: ConfianzaBenchmark = n >= 12 && pesoMismoSubtipo / pesoTotal >= 0.6 ? 'ALTA' : n >= MIN_COMPARABLES ? 'MEDIA' : 'BAJA';
  // Mucha dispersión = los comparables no se parecen entre sí: se baja un nivel.
  if (dispersion > 0.8) confianza = confianza === 'ALTA' ? 'MEDIA' : 'BAJA';
  const redondear = (x: number) => Math.round(x * 100) / 100;
  return {
    rango: { p25: redondear(p25), p50: redondear(p50), p75: redondear(p75) },
    n,
    confianza,
    rangoOrientativo: n < MIN_COMPARABLES,
    esSemilla: pesoSemilla / pesoTotal > 0.5,
    comparables,
  };
}

/** Dónde cae un precio por tonelada frente al rango: debajo del p25, dentro, o encima del p75. */
export function posicionPrecio(precioTon: number, rango: { p25: number; p75: number } | null): PosicionPrecio | null {
  if (!rango) return null;
  if (precioTon < rango.p25) return 'DEBAJO';
  if (precioTon > rango.p75) return 'ENCIMA';
  return 'DENTRO';
}

// ---------- Datos de ejemplo (semilla) ----------

/** Multiplicador sobre el precio de referencia por tonelada de cada categoría. VALORES ILUSTRATIVOS, no de mercado. */
const FACTOR_SEMILLA: Record<string, number> = {
  PLASTICO_PET: 1.55, PLASTICO_PEAD: 1.9, PLASTICO_PP: 1.4, PLASTICO_FILM: 1.0, PLASTICO_PVC: 0.65, PLASTICO_MIXTO: 0.55, PLASTICO: 1.1,
  ORGANICO_AGRO: 1, BIOMASA: 1, TEXTIL: 1, PAPEL_CARTON: 1, METAL: 1, CONSTRUCCION: 1,
};
const PLAZAS = [
  { ciudad: 'Piura', lat: -5.19, lng: -80.63 },
  { ciudad: 'Sullana', lat: -4.9, lng: -80.69 },
  { ciudad: 'Chiclayo', lat: -6.77, lng: -79.84 },
  { ciudad: 'Paita', lat: -5.09, lng: -81.11 },
  { ciudad: 'Sechura', lat: -5.56, lng: -80.82 },
];

/** Generador pseudoaleatorio determinista (mulberry32): la semilla es siempre la misma. */
function azar(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ObservacionSemilla {
  categoriaCodigo: string;
  precioPorTon: number;
  cantidadTon: number;
  fecha: Date;
  lat: number;
  lng: number;
  descripcion: string;
}

/**
 * Observaciones sintéticas para demostrar el motor. ILUSTRATIVAS: la interfaz las rotula «datos de ejemplo» y
 * deben reemplazarse por compras reales (importación CSV o acopios) antes de presentarlas como precio de mercado.
 */
export function generarSemilla(ahora = new Date(), porCategoria = 14): ObservacionSemilla[] {
  const rnd = azar(20261015);
  const salida: ObservacionSemilla[] = [];
  // Todas las categorías con precio de referencia (menos los artículos personales, que son del marketplace).
  const codigos = Object.keys(PRECIO_REFERENCIA).filter((c) => c !== 'ARTICULOS_PERSONALES');
  for (const codigo of codigos) {
    const factor = FACTOR_SEMILLA[codigo] ?? 1;
    const base = PRECIO_REFERENCIA[codigo] * factor;
    for (let i = 0; i < porCategoria; i++) {
      const plaza = PLAZAS[Math.floor(rnd() * PLAZAS.length)];
      const ruido = 1 + (rnd() - 0.5) * 0.36; // ±18 %
      const cantidadTon = Math.round(Math.exp(Math.log(0.3) + rnd() * Math.log(40 / 0.3)) * 10) / 10; // 0,3 a 40 t
      const meses = Math.floor(rnd() * 14);
      salida.push({
        categoriaCodigo: codigo,
        precioPorTon: Math.round(base * ruido),
        cantidadTon,
        fecha: new Date(ahora.getTime() - meses * 30.44 * 86400_000),
        lat: plaza.lat + (rnd() - 0.5) * 0.1,
        lng: plaza.lng + (rnd() - 0.5) * 0.1,
        descripcion: `Dato de ejemplo (${plaza.ciudad})`,
      });
    }
  }
  return salida;
}
