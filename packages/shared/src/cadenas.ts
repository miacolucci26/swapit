import { CADENAS } from './cadenas-datos';
import { raiz, textoPlano } from './conocimiento';
import { SECTORES, nombreTipoDestino, type Sector, type TipoDestino } from './sectores';

/**
 * Cadenas productivas y las «vidas» de sus residuos: qué sale en cada etapa del proceso y qué se puede hacer con ello,
 * ordenado de mayor a menor valor (jerarquía del Decreto Legislativo 1278: prevenir y reusar antes que reciclar,
 * reciclar antes que quemar, quemar antes que disponer).
 *
 * Es información de uso libre para orientar: NO es una validación técnica ni sanitaria. Cada vida declara su nivel de
 * evidencia para no vender como cierto lo que es una hipótesis, y los valores son cualitativos a propósito (no hay
 * precios de mercado validados). Los datos están en `cadenas-datos.ts`.
 */

/** Dónde queda el material en la jerarquía de residuos. */
export const NIVELES = {
  PREVENIR: { orden: 1, nombre: 'Sigue siendo producto', ayuda: 'Se evita que llegue a ser residuo: sigue como alimento o insumo.' },
  REUSO: { orden: 2, nombre: 'Reúso directo', ayuda: 'Se vuelve a usar casi igual, sin transformarlo mucho.' },
  MATERIAL: { orden: 3, nombre: 'Valorización material', ayuda: 'Se transforma en otro material: reciclaje, compost, ingredientes, construcción.' },
  ENERGIA: { orden: 4, nombre: 'Valorización energética', ayuda: 'Se aprovecha como combustible cuando no hay un uso mejor.' },
  DISPOSICION: { orden: 5, nombre: 'Gestión autorizada', ayuda: 'No tiene un uso comercial seguro: debe manejarlo un operador autorizado.' },
} as const;
export type Nivel = keyof typeof NIVELES;

export const VALORES = { ALTO: 'Valor alto', MEDIO: 'Valor medio', BAJO: 'Valor bajo', COSTO: 'Tiene costo de manejo' } as const;
export type Valor = keyof typeof VALORES;

/** Qué tan respaldada está una vida. Es la parte que más importa para no engañar a nadie. */
export const EVIDENCIAS = {
  PRACTICA_COMUN: { nombre: 'Práctica común', ayuda: 'Se hace de forma corriente en la industria o la confirmaron actores del rubro.' },
  REPORTADO: { nombre: 'Reportado', ayuda: 'Hay estudios, proyectos o prensa que lo reportan; falta validarlo con compradores locales.' },
  POR_VALIDAR: { nombre: 'Por validar', ayuda: 'Hipótesis plausible: confírmala con compradores y técnicos antes de apostar por ella.' },
} as const;
export type Evidencia = keyof typeof EVIDENCIAS;

/** Para quién tiene sentido: una MYPE con poco capital o una planta industrial. */
export type Escala = 'MYPE' | 'AMBAS' | 'INDUSTRIAL';

export interface Vida {
  uso: string;
  nivel: Nivel;
  valor: Valor;
  /** A quién se le entrega o se le vende. */
  destinos: TipoDestino[];
  /** Cómo se gana dinero (o se evita un costo) con esto. */
  negocio: string;
  /** Lo que hay que cumplir o verificar para que funcione. */
  requisitos: string;
  evidencia: Evidencia;
  escala: Escala;
}

export interface Residuo {
  id: string;
  nombre: string;
  /** Otros nombres con que se le conoce (se usan para la búsqueda en lenguaje libre). */
  sinonimos: string[];
  /** Código de CategoriaResiduo con el que se registra el lote. */
  categoria: string;
  descripcion: string;
  /** Cómo subirle el valor antes de ofrecerlo (separar, secar, no mezclar…). */
  preparacion?: string;
  /** Preguntas propias de este residuo, además de las generales de cada destino. */
  preguntas?: string[];
  /** De mayor a menor valor: la primera vida es la que conviene intentar primero. */
  vidas: Vida[];
}

export interface Etapa {
  id: string;
  nombre: string;
  /** Qué ocurre en esta etapa (una frase). */
  que: string;
  residuos: Residuo[];
}

export interface Cadena {
  id: string;
  sector: Sector;
  nombre: string;
  zonas: string[];
  resumen: string;
  etapas: Etapa[];
}

export interface ResiduoEnCadena {
  residuo: Residuo;
  cadena: Cadena;
  etapa: Etapa;
}

// ---------- Acceso ----------

export { CADENAS };

export const RESIDUOS: ResiduoEnCadena[] = CADENAS.flatMap((cadena) => cadena.etapas.flatMap((etapa) => etapa.residuos.map((residuo) => ({ residuo, cadena, etapa }))));

export const cadenaPorId = (id: string): Cadena | undefined => CADENAS.find((c) => c.id === id);
export const residuoPorId = (id: string): ResiduoEnCadena | undefined => RESIDUOS.find((r) => r.residuo.id === id);

/** Cadenas de un sector; la transversal (empaques, madera, aceites…) acompaña a todos. */
export function cadenasDeSector(sector: string): Cadena[] {
  return CADENAS.filter((c) => c.sector === sector || c.id === 'empaques-y-apoyo');
}

// ---------- Búsqueda en lenguaje libre ----------

const RELLENO = new Set([
  'de', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'con', 'para', 'que', 'del', 'al', 'en', 'mi', 'mis', 'lo', 'se', 'es', 'su', 'sus', 'por', 'como', 'cual', 'cuales', 'me', 'te', 'y', 'o', 'a',
  'hago', 'hacer', 'puedo', 'tengo', 'tienen', 'quiero', 'sirve', 'sirven', 'uso', 'usos', 'vale', 'valen', 'precio', 'cuanto', 'residuo', 'residuos', 'sobra', 'sobran', 'hay', 'esto', 'esta', 'este', 'todo', 'toda',
]);

/** Palabras con contenido de una frase (sin relleno ni tildes, en raíz mínima). */
export function palabrasClave(texto: string): string[] {
  return textoPlano(texto)
    .split(' ')
    .filter((w) => w.length >= 2 && !RELLENO.has(w))
    .map(raiz);
}

export interface ResiduoHallado extends ResiduoEnCadena {
  puntaje: number;
}

/**
 * Busca residuos por lo que dice la persona («cáscara de mango», «qué hago con el bagazo»). El nombre y los sinónimos pesan
 * más que el nombre de la cadena o de la etapa. Devuelve vacío si ninguna palabra clave coincide con un residuo.
 */
export function buscarResiduos(texto: string, max = 6): ResiduoHallado[] {
  const q = palabrasClave(texto);
  if (!q.length) return [];
  const hallados: ResiduoHallado[] = [];
  for (const r of RESIDUOS) {
    const nombre = new Set(palabrasClave(r.residuo.nombre));
    const sinonimos = new Set(r.residuo.sinonimos.flatMap(palabrasClave));
    const contexto = new Set([...palabrasClave(r.cadena.nombre), ...palabrasClave(r.etapa.nombre)]);
    let p = 0;
    let aciertosPropios = 0;
    for (const w of q) {
      if (nombre.has(w)) {
        p += 3;
        aciertosPropios++;
      } else if (sinonimos.has(w)) {
        p += 2;
        aciertosPropios++;
      } else if (contexto.has(w)) p += 1;
    }
    if (!aciertosPropios) continue;
    // Una frase completa («cáscara de mango») gana a una palabra suelta («mango»); lo mismo con los sinónimos de varias palabras.
    const fraseNombre = textoPlano(r.residuo.nombre);
    if (textoPlano(texto).includes(fraseNombre)) p += 4;
    if (r.residuo.sinonimos.some((s) => s.includes(' ') && textoPlano(texto).includes(textoPlano(s)))) p += 3;
    // Quien contesta con todas las palabras de la consulta merece ir primero.
    if (q.every((w) => nombre.has(w) || sinonimos.has(w) || contexto.has(w))) p += 2;
    hallados.push({ ...r, puntaje: p });
  }
  return hallados.sort((a, b) => b.puntaje - a.puntaje).slice(0, max);
}

export type ResolucionResiduo =
  | { tipo: 'claro'; hallado: ResiduoHallado }
  | { tipo: 'ambiguo'; opciones: ResiduoHallado[] }
  | { tipo: 'ninguno' };

/**
 * Decide si una frase apunta a UN residuo («cáscara de mango»), a varios parecidos («mango», «bagazo» → hay que preguntar cuál)
 * o a ninguno. Preguntar bien es parte del valor: una respuesta a ciegas sobre «mango» mezclaría descarte, cáscara y pepa.
 */
export function resolverResiduo(texto: string): ResolucionResiduo {
  const h = buscarResiduos(texto, 8);
  if (!h.length) return { tipo: 'ninguno' };
  if (h.length === 1 || h[0].puntaje >= h[1].puntaje + 3) return { tipo: 'claro', hallado: h[0] };
  return { tipo: 'ambiguo', opciones: h.filter((x) => x.puntaje >= h[0].puntaje - 2).slice(0, 5) };
}

/** Cadenas cuyo nombre aparece en la frase («cadena del mango», «arroz»). */
export function buscarCadenas(texto: string): Cadena[] {
  const q = new Set(palabrasClave(texto));
  return CADENAS.filter((c) => palabrasClave(c.nombre).some((w) => q.has(w)));
}

/** Sectores nombrados en la frase («pesca», «textil», «agro»). */
export function buscarSectores(texto: string) {
  const q = new Set(palabrasClave(texto));
  return SECTORES.filter((s) => s.id !== 'OTRO' && [...palabrasClave(s.nombre), ...palabrasClave(s.id)].some((w) => q.has(w)));
}

// ---------- Lectura de las vidas ----------

/** Vidas para una MYPE: las que no exigen una planta industrial. */
export const vidasParaMype = (r: Residuo): Vida[] => r.vidas.filter((v) => v.escala !== 'INDUSTRIAL');

export interface CompradorPosible {
  destino: TipoDestino;
  nombre: string;
  /** Qué usos de este residuo compran. */
  usos: string[];
}

/** Tipos de destino que compran un residuo, con los usos que les corresponden (para buscar en el directorio de destinos). */
export function compradoresDe(r: Residuo): CompradorPosible[] {
  const mapa = new Map<TipoDestino, string[]>();
  for (const v of r.vidas) for (const d of v.destinos) mapa.set(d, [...(mapa.get(d) ?? []), v.uso]);
  return [...mapa.entries()].map(([destino, usos]) => ({ destino, nombre: nombreTipoDestino(destino) ?? destino, usos }));
}

/** Preguntas que conviene hacerse (o hacerle al comprador) antes de ofrecer o comprar este residuo, según adónde irá. */
const PREGUNTAS_POR_DESTINO: Record<TipoDestino, string[]> = {
  REPROCESO_ALIMENTOS: ['¿Cuántas horas pasan entre la selección y la entrega? La fruta madura rápido.', '¿La planta exige un grado de madurez o de sanidad mínimos?'],
  MERCADO_LOCAL: ['¿Quién se lleva la fruta y a qué hora la recoge?'],
  ALIMENTO_ANIMAL: ['¿Tuvo contacto con plaguicidas o con aceites de proceso?', '¿Está fresca o ya fermentó? ¿Qué humedad tiene?'],
  COMPOSTAJE: ['¿Viene limpio de plástico, cintas y etiquetas?', '¿Cuánto volumen sale por semana? El compost necesita regularidad.'],
  ENERGIA: ['¿Qué humedad tiene (idealmente menos de 15-20 %)?', '¿Es madera tratada o pintada? No debe quemarse.'],
  CONSTRUCCION: ['¿Está limpio, lavado y sin sales ni materia orgánica?', '¿Quién ensaya su desempeño antes de usarlo en obra?'],
  RECICLADO_MATERIAL: ['¿Está separado por tipo y limpio?', '¿Contuvo algo peligroso (agroquímicos, aceites)?'],
  INGREDIENTES: ['¿Se puede asegurar trazabilidad e inocuidad (fecha, lote, almacenamiento)?', '¿El comprador pide análisis o una muestra?'],
  PLANTA_HARINAS: ['¿Llega fresco y frío? Los subproductos de pescado se descomponen en horas.', '¿Cuánto volumen constante puede entregarse por temporada?'],
  ARTESANIA_MYPE: ['¿Cuánto necesita la MYPE al mes y quién transporta?', '¿Tiene registro sanitario si es alimento o cosmético?'],
  GESTOR_AUTORIZADO: ['¿El operador tiene autorización vigente para este tipo de residuo?', '¿Entrega el manifiesto o constancia de disposición?'],
};

export function preguntasDe(r: Residuo): string[] {
  const generales = [...new Set(r.vidas.flatMap((v) => v.destinos).flatMap((d) => PREGUNTAS_POR_DESTINO[d]))];
  return [...(r.preguntas ?? []), ...generales];
}

// ---------- Diagnóstico por proceso ----------

export interface ResiduoDiagnosticado {
  residuo: Residuo;
  etapa: Etapa;
  /** La vida que conviene intentar primero. */
  primera: Vida;
  /** La más accesible para una MYPE, si existe. */
  paraMype: Vida | null;
  vidas: number;
  exigeGestor: boolean;
}

export interface Diagnostico {
  cadena: Cadena;
  etapas: Etapa[];
  residuos: ResiduoDiagnosticado[];
  /** Residuos con al menos una vida de valor alto o medio. */
  conValor: number;
  /** Residuos que solo se pueden entregar a un gestor autorizado. */
  soloGestor: number;
}

/** Dado el proceso de una empresa (las etapas que opera), lista qué residuos genera y qué conviene hacer con cada uno. */
export function diagnosticar(cadenaId: string, etapaIds: string[]): Diagnostico | null {
  const cadena = cadenaPorId(cadenaId);
  if (!cadena) return null;
  const etapas = cadena.etapas.filter((e) => etapaIds.includes(e.id));
  const residuos = etapas.flatMap((etapa) =>
    etapa.residuos.map((residuo): ResiduoDiagnosticado => ({
      residuo,
      etapa,
      primera: residuo.vidas[0],
      paraMype: vidasParaMype(residuo)[0] ?? null,
      vidas: residuo.vidas.length,
      exigeGestor: residuo.vidas.every((v) => v.nivel === 'DISPOSICION'),
    })),
  );
  return {
    cadena,
    etapas,
    residuos,
    conValor: residuos.filter((r) => r.residuo.vidas.some((v) => v.valor === 'ALTO' || v.valor === 'MEDIO')).length,
    soloGestor: residuos.filter((r) => r.exigeGestor).length,
  };
}

/** Frase corta con las vidas de un residuo, pensada para el asistente y para tarjetas. */
export function resumenVidas(r: Residuo): string {
  const n = r.vidas.length;
  return `${r.nombre}: ${n} ${n === 1 ? 'vida' : 'vidas'} — ${r.vidas.map((v, i) => `${i + 1}) ${v.uso}`).join('; ')}.`;
}
