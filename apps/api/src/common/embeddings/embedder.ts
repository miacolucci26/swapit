import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

export const EMBEDDING_DIMS = 1536;

export abstract class Embedder {
  abstract readonly nombre: string;
  abstract embed(texto: string): Promise<number[]>;
}

export const aVectorSql = (v: number[]) => `[${v.map((x) => Number(x.toFixed(6))).join(',')}]`;

// ---------- Embedder local (modo demo, sin API key) ----------

const STOP = new Set('de la el los las un una unos unas y o a en con por para del al que se su sus es son lo como mas muy sin sobre entre este esta estos estas hay tiene tienen busco necesito disponible lote'.split(' '));

/** Conceptos que agrupan vocabulario del sector: hace que «cáscara de arándano» se parezca a «residuo de fruta». */
const CONCEPTOS: Record<string, string[]> = {
  organico: ['cascara', 'pulpa', 'bagazo', 'arandano', 'palta', 'mango', 'uva', 'esparrago', 'banano', 'limon', 'fruta', 'fruto', 'organico', 'compost', 'compostaje', 'abono', 'biofertilizante', 'residuo', 'pepa', 'hueso', 'tallo', 'vegetal', 'agro', 'agroindustrial', 'alimento', 'forraje', 'animal', 'humus'],
  biomasa: ['biomasa', 'cascarilla', 'arroz', 'raquis', 'poda', 'lena', 'pellet', 'combustible', 'caldera', 'energia', 'bagazo', 'aserrin', 'madera', 'carbon'],
  textil: ['textil', 'tela', 'retazo', 'recorte', 'merma', 'algodon', 'pima', 'hilo', 'tejido', 'confeccion', 'prenda', 'fibra', 'trapo'],
  plastico: ['plastico', 'pet', 'pead', 'polietileno', 'film', 'botella', 'envase', 'bolsa', 'polipropileno', 'resina', 'reciclado', 'pvc'],
  metal: ['metal', 'chatarra', 'acero', 'fierro', 'hierro', 'aluminio', 'cobre', 'lata', 'fundicion', 'viga', 'varilla'],
  papel: ['papel', 'carton', 'caja', 'corrugado', 'empaque', 'embalaje', 'kraft', 'cajas'],
  construccion: ['construccion', 'demolicion', 'concreto', 'ladrillo', 'desmonte', 'escombro', 'cemento', 'agregado', 'obra', 'arena', 'grava', 'excedente'],
  maquinaria: ['maquinaria', 'maquina', 'equipo', 'motor', 'compresor', 'generador', 'montacargas', 'herramienta', 'bomba', 'caldera', 'seminuevo', 'repuesto'],
  pesca: ['concha', 'abanico', 'valva', 'marisco', 'pesca', 'acuicultura', 'sechura', 'pescado', 'calcio', 'langostino', 'pota'],
  madera: ['madera', 'pallet', 'palet', 'tarima', 'tabla', 'aserrin', 'listones', 'carpinteria', 'mueble'],
  vidrio: ['vidrio', 'frasco', 'ceramica', 'loza', 'mayolica', 'azulejo', 'botella'],
  aceite: ['aceite', 'freidora', 'jabon', 'biodiesel', 'vela', 'grasa'],
  electronico: ['raee', 'celular', 'computadora', 'laptop', 'cargador', 'monitor', 'impresora', 'televisor', 'electronico', 'tablet', 'bateria'],
  pectina: ['pectina', 'gomita', 'mermelada', 'jalea', 'confiteria', 'cascara', 'limon', 'naranja', 'mandarina', 'toronja', 'mango', 'citrico'],
  insumosReciclados: ['reciclado', 'reprocesado', 'insumo', 'reutilizable', 'granulado', 'reacondicionado', 'reusar'],
};
const TOKEN_A_CONCEPTOS = new Map<string, string[]>();
for (const [concepto, palabras] of Object.entries(CONCEPTOS)) {
  for (const p of palabras) TOKEN_A_CONCEPTOS.set(p, [...(TOKEN_A_CONCEPTOS.get(p) ?? []), concepto]);
}

export function normalizar(t: string): string[] {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => (w.length > 4 && w.endsWith('es') ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w));
}

function fnv(s: string, seed = 2166136261): number {
  let h = seed >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Embedding determinista por hashing de palabras, conceptos del sector y trigramas. No es semántico profundo, pero sirve para la demo. */
@Injectable()
export class LocalEmbedder extends Embedder {
  readonly nombre = 'local-hash';

  async embed(texto: string): Promise<number[]> {
    const v = new Array<number>(EMBEDDING_DIMS).fill(0);
    const add = (feature: string, peso: number) => {
      const i = fnv(feature) % EMBEDDING_DIMS;
      const signo = fnv(feature, 7) & 1 ? 1 : -1;
      v[i] += signo * peso;
    };
    for (const w of normalizar(texto)) {
      add(`w:${w}`, 2.5);
      for (const c of TOKEN_A_CONCEPTOS.get(w) ?? []) add(`c:${c}`, 1);
      if (w.length >= 5) for (let i = 0; i <= w.length - 3; i++) add(`t:${w.slice(i, i + 3)}`, 0.15);
    }
    const norma = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    return v.map((x) => x / norma);
  }
}

// ---------- Embedder OpenAI (si hay OPENAI_API_KEY) ----------

@Injectable()
export class OpenAIEmbedder extends Embedder {
  readonly nombre = 'openai-text-embedding-3-small';
  private readonly log = new Logger(OpenAIEmbedder.name);

  async embed(texto: string): Promise<number[]> {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: texto.slice(0, 8000) }),
    });
    if (!res.ok) {
      this.log.error(`OpenAI embeddings ${res.status}`);
      throw new ServiceUnavailableException('El servicio de embeddings no está disponible');
    }
    const data: any = await res.json();
    return data.data[0].embedding as number[];
  }
}

export function crearEmbedder(): Embedder {
  return process.env.OPENAI_API_KEY ? new OpenAIEmbedder() : new LocalEmbedder();
}
