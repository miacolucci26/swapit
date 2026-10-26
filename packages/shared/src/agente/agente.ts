import type { Args, Artefacto, ContextoAgente, Ejemplo, Herramienta, Modelo, Paso, Pendiente, Respuesta, ResultadoHerramienta } from './tipos';

export interface ConfigAgente {
  nombre: string;
  descripcion: string;
  instruccion: string;
  herramientas?: Herramienta[];
  subagentes?: Agente[];
  /** Frases que deben llevar a este agente cuando es un sub-agente (se usan como ejemplos al enrutar). */
  ejemplos?: string[];
}

export interface OpcionesEjecucion {
  maxPasos?: number;
}

/** Equivalente a `Agent(name, description, instruction, tools, sub_agents)` de ADK. */
export class Agente {
  readonly nombre: string;
  readonly descripcion: string;
  readonly instruccion: string;
  readonly herramientas: Herramienta[];
  readonly subagentes: Agente[];
  readonly ejemplos: string[];

  constructor(cfg: ConfigAgente) {
    this.nombre = cfg.nombre;
    this.descripcion = cfg.descripcion;
    this.instruccion = cfg.instruccion;
    this.herramientas = cfg.herramientas ?? [];
    this.subagentes = cfg.subagentes ?? [];
    this.ejemplos = cfg.ejemplos ?? [];
  }

  /** Todas las herramientas «reales» del árbol de agentes (para ejecutar una acción ya confirmada). */
  todasLasHerramientas(): Herramienta[] {
    return [...this.herramientas, ...this.subagentes.flatMap((s) => s.todasLasHerramientas())];
  }

  /** Equivalente a `AgentTool`: el sub-agente se invoca como una herramienta más con su propio modelo de contexto. */
  comoHerramienta(modelo: Modelo, opciones: OpcionesEjecucion): Herramienta {
    return {
      nombre: `delegar_${this.nombre}`,
      descripcion: this.descripcion,
      parametros: { peticion: { tipo: 'string', descripcion: 'Lo que el usuario pidió, con sus palabras', requerido: true } },
      ejemplos: this.ejemplos.map((pedido): Ejemplo => ({ pedido, args: { peticion: pedido } })),
      completar: (args, pedido) => ({ ...args, peticion: args.peticion || pedido }),
      ejecutar: async (args, ctx) => {
        const r = await ejecutar(this, modelo, String(args.peticion ?? ''), ctx, opciones);
        return { resumen: r.texto, artefactos: r.artefactos, pendiente: r.pendiente, pasos: r.pasos, directa: true };
      },
    };
  }
}

/** Valida y convierte los argumentos que propone el modelo según los parámetros declarados. */
export function normalizarArgs(h: Herramienta, crudos: Args): { args: Args; error?: string } {
  const args: Args = {};
  for (const [nombre, p] of Object.entries(h.parametros)) {
    let v: unknown = crudos?.[nombre];
    if (v === undefined || v === null || v === '') {
      if (p.requerido) return { args, error: `Falta el parámetro «${nombre}» de ${h.nombre}.` };
      continue;
    }
    if (p.tipo === 'number') {
      v = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
      if (!Number.isFinite(v)) return { args, error: `«${nombre}» debe ser un número.` };
    } else if (p.tipo === 'boolean') {
      v = v === true || v === 'true' || v === 'sí' || v === 'si';
    } else {
      v = String(v).trim().slice(0, 600);
      if (p.opciones && !p.opciones.includes(v as string)) return { args, error: `«${nombre}» debe ser uno de: ${p.opciones.join(', ')}.` };
    }
    args[nombre] = v as string | number | boolean;
  }
  return { args };
}

const recortar = (t: string, n = 700) => (t.length > n ? t.slice(0, n - 1) + '…' : t);

/**
 * Bucle del agente (el «Runner»): el modelo elige una herramienta o responde; las herramientas devuelven
 * observaciones; se repite hasta responder o agotar los pasos. Las acciones que modifican datos se detienen
 * y piden confirmación al usuario en lugar de ejecutarse.
 */
export async function ejecutar(agente: Agente, modelo: Modelo, pedido: string, ctx: ContextoAgente, opciones: OpcionesEjecucion = {}): Promise<Respuesta> {
  const maxPasos = opciones.maxPasos ?? 4;
  const herramientas = [...agente.herramientas, ...agente.subagentes.map((s) => s.comoHerramienta(modelo, opciones))];
  const pasos: Paso[] = [];
  const artefactos: Artefacto[] = [];
  const fin = (texto: string, pendiente?: Pendiente): Respuesta => {
    const e = modelo.estado?.() ?? { motor: modelo.nombre, degradado: false };
    return { texto, artefactos, pasos, pendiente, motor: e.motor, degradado: e.degradado, bitacora: modelo.bitacora?.() ?? [] };
  };
  const registrar = (p: Omit<Paso, 'agente'>) => pasos.push({ agente: agente.nombre, ...p });

  for (let i = 0; i < maxPasos; i++) {
    const d = await modelo.decidir({ agente: { nombre: agente.nombre, instruccion: agente.instruccion }, herramientas, historial: ctx.sesion.historial.slice(-6), pedido, pasos: pasos.filter((p) => p.agente === agente.nombre) });
    if (d.accion === 'responder') return fin(d.texto.trim() || 'No tengo una respuesta para eso todavía.');

    const h = herramientas.find((x) => x.nombre === d.herramienta);
    if (!h) {
      registrar({ herramienta: d.herramienta, argumentos: d.argumentos, resumen: `La herramienta «${d.herramienta}» no existe. Disponibles: ${herramientas.map((x) => x.nombre).join(', ')}.`, ok: false });
      continue;
    }
    // Las herramientas pueden corregir, sin IA, lo que propuso el modelo (cantidades exactas, texto faltante).
    const propuestos = h.completar ? h.completar(d.argumentos ?? {}, pedido) : d.argumentos ?? {};
    const { args, error } = normalizarArgs(h, propuestos);
    if (error) {
      registrar({ herramienta: h.nombre, argumentos: d.argumentos ?? {}, resumen: error, ok: false });
      continue;
    }
    if (h.confirmar) {
      const descripcion = h.confirmacion?.(args) ?? `${h.descripcion} (${Object.entries(args).map(([k, v]) => `${k}: ${v}`).join(', ')})`;
      registrar({ herramienta: h.nombre, argumentos: args, resumen: 'Pendiente de tu confirmación', ok: true });
      return fin(descripcion, { herramienta: h.nombre, argumentos: args, descripcion });
    }
    let r: ResultadoHerramienta;
    try {
      r = await h.ejecutar(args, ctx);
    } catch (e) {
      registrar({ herramienta: h.nombre, argumentos: args, resumen: `Error: ${e instanceof Error ? e.message : 'falló la herramienta'}`, ok: false });
      continue;
    }
    registrar({ herramienta: h.nombre, argumentos: args, resumen: recortar(r.resumen), respuesta: r.respuesta, ok: true });
    if (r.pasos) pasos.push(...r.pasos);
    if (r.artefactos) artefactos.push(...r.artefactos);
    if (r.pendiente) return fin(r.resumen, r.pendiente);
    if (r.directa) return fin(r.respuesta ?? r.resumen);
  }
  const ultimo = [...pasos].reverse().find((p) => p.agente === agente.nombre && p.ok);
  return fin(ultimo?.resumen ?? 'No logré resolverlo. ¿Puedes darme más detalles?');
}

/** Ejecuta una acción que el usuario ya confirmó, sin pasar por el modelo. */
export async function ejecutarConfirmada(agente: Agente, pendiente: Pendiente, ctx: ContextoAgente): Promise<ResultadoHerramienta> {
  const h = agente.todasLasHerramientas().find((x) => x.nombre === pendiente.herramienta);
  if (!h) throw new Error(`Herramienta desconocida: ${pendiente.herramienta}`);
  return h.ejecutar(pendiente.argumentos, ctx);
}
