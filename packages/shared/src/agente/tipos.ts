/**
 * Mini-ADK de Swap It. Toma de Google ADK las ideas (Agent con instrucción y herramientas tipadas,
 * sub-agentes expuestos como herramientas «AgentTool», bucle de ejecución con sesión) y las implementa
 * en TypeScript para correr en el navegador con Gemini Nano (API Prompt de Chrome), que NO tiene
 * llamadas a herramientas nativas: cada decisión se pide como JSON restringido por un esquema.
 */

export type TipoParametro = 'string' | 'number' | 'boolean';
export interface Parametro {
  tipo: TipoParametro;
  descripcion: string;
  requerido?: boolean;
  opciones?: readonly string[];
}
export type Args = Record<string, string | number | boolean | undefined>;

export type ApiFn = <T = unknown>(ruta: string, init?: { method?: string; json?: unknown }) => Promise<T>;

export type Artefacto =
  | { tipo: 'lote'; id: string; titulo: string; subtitulo: string; href: string; score?: number; nota?: string }
  | { tipo: 'borrador'; titulo: string; subtitulo: string; descripcion: string; href: string }
  | { tipo: 'uso'; titulo: string; detalle: string; cuidado: string }
  | { tipo: 'enlace'; titulo: string; subtitulo: string; href: string }
  /** Un residuo con sus «vidas» (usos de mayor a menor valor); viene de la base de cadenas productivas. */
  | { tipo: 'residuo'; id: string; titulo: string; subtitulo: string; href: string; vidas: { uso: string; nivel: string; valor: string; evidencia: string }[]; preguntas?: string[] }
  /** Una pregunta de aclaración con respuestas sugeridas que la persona puede tocar. */
  | { tipo: 'opciones'; pregunta: string; opciones: { etiqueta: string; pedido: string }[] };

export interface Pendiente {
  herramienta: string;
  argumentos: Args;
  descripcion: string;
}

export interface Paso {
  agente: string;
  herramienta: string;
  argumentos: Args;
  resumen: string;
  /** Texto breve pensado para mostrar al usuario cuando las tarjetas ya cuentan el detalle. */
  respuesta?: string;
  ok: boolean;
}

export interface ResultadoHerramienta {
  /** Texto para el modelo y para el usuario; las herramientas lo escriben en español claro. */
  resumen: string;
  /** Versión breve para el usuario cuando las tarjetas (artefactos) ya muestran el detalle. */
  respuesta?: string;
  artefactos?: Artefacto[];
  /** Si una herramienta de un sub-agente pidió confirmación, sube hasta el usuario. */
  pendiente?: Pendiente;
  /** Pasos internos de un sub-agente, para la traza. */
  pasos?: Paso[];
  /** true = el resumen ya es la respuesta final (evita otra llamada al modelo). */
  directa?: boolean;
}

export interface Mensaje {
  rol: 'usuario' | 'asistente';
  texto: string;
}

export interface Sesion {
  historial: Mensaje[];
}

export interface ContextoAgente {
  api: ApiFn;
  sesion: Sesion;
}

/** Una frase de ejemplo que debe llevar a esta herramienta, con los argumentos que de ella se esperan. */
export interface Ejemplo {
  pedido: string;
  args?: Args;
}

export interface Herramienta {
  nombre: string;
  descripcion: string;
  parametros: Record<string, Parametro>;
  /**
   * Frases de ejemplo (como los docstrings de una herramienta en ADK). Sirven de ejemplos en el prompt de un modelo pequeño,
   * que acierta mucho más viendo casos que leyendo descripciones, y de prueba de que cada herramienta es alcanzable.
   */
  ejemplos?: Ejemplo[];
  /** Completa o corrige, sin IA, los argumentos que propuso el modelo (p. ej. toma la cantidad exacta de la frase). */
  completar?: (args: Args, pedido: string) => Args;
  /** true = el modelo redacta la respuesta final a partir del resultado (si la redacción no es fiel a los datos, se usa el texto de la herramienta). */
  redactar?: boolean;
  /** true = cambia datos del usuario: nunca se ejecuta sin su confirmación explícita. */
  confirmar?: boolean;
  /** Frase con la que se le pide la confirmación al usuario. */
  confirmacion?: (args: Args) => string;
  ejecutar(args: Args, ctx: ContextoAgente): Promise<ResultadoHerramienta>;
}

export type Decision =
  | { accion: 'herramienta'; herramienta: string; argumentos: Args; razon?: string }
  | { accion: 'responder'; texto: string };

export interface EntradaModelo {
  agente: { nombre: string; instruccion: string };
  herramientas: Herramienta[];
  historial: Mensaje[];
  pedido: string;
  pasos: Paso[];
}

/** Una llamada al modelo, para poder ver (y pegar en un reporte) qué pasó cuando algo no funciona. */
export interface RegistroModelo {
  etapa: string;
  detalle?: string;
  ms: number;
  salida?: string;
  error?: string;
}

export interface Modelo {
  readonly nombre: string;
  decidir(entrada: EntradaModelo): Promise<Decision>;
  /** Qué motor respondió de verdad y si hubo que recurrir al respaldo. */
  estado?(): { motor: string; degradado: boolean };
  /** Llamadas hechas al modelo desde que se creó o reinició (para la traza técnica). */
  bitacora?(): RegistroModelo[];
}

export interface Respuesta {
  texto: string;
  artefactos: Artefacto[];
  pasos: Paso[];
  pendiente?: Pendiente;
  motor: string;
  degradado: boolean;
  /** Llamadas al modelo de este turno y errores que hicieron recurrir al respaldo. */
  bitacora: RegistroModelo[];
}

export class ErrorModelo extends Error {}
