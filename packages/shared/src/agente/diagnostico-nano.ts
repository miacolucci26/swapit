import { crearAsistente } from './herramientas';
import { ESTRATEGIAS_IDIOMA, ModeloNano, fabricaDelNavegador, type FabricaLM, type SesionLM } from './modelo-nano';
import type { RegistroModelo } from './tipos';

/**
 * Autodiagnóstico de Gemini Nano. Como el modelo corre en el equipo de cada persona y depende de la versión de Chrome, del
 * hardware y de banderas del navegador, no se puede saber desde el servidor si «funciona»: este recorrido prueba cada
 * eslabón (API, disponibilidad, sesión, respuesta, JSON restringido, elección real de herramientas) y dice en cuál falla y qué
 * hacer. El informe se puede copiar y pegar para que otra persona vea exactamente lo mismo.
 */

export type EstadoPaso = 'ok' | 'fallo' | 'aviso' | 'omitido';

export interface PasoDiagnostico {
  id: string;
  titulo: string;
  estado: EstadoPaso;
  detalle: string;
  /** Qué hacer si no está bien. */
  ayuda?: string;
  ms?: number;
}

export interface OpcionesDiagnostico {
  fabrica?: FabricaLM | null;
  onProgreso?: (fraccion: number) => void;
  /** Se avisa de cada paso en cuanto termina, para ir pintándolos. */
  onPaso?: (p: PasoDiagnostico) => void;
}

const mensajeDe = (e: unknown) => (e instanceof Error ? (e.name && e.name !== 'Error' ? `${e.name}: ${e.message}` : e.message) : String(e));

const AYUDA_API =
  'Tu navegador no ofrece la API Prompt (`LanguageModel`). Usa Chrome de escritorio reciente (138 o superior; Windows 10/11, macOS 13+ o Linux). ' +
  'Según tu versión puede que debas activar las banderas chrome://flags/#prompt-api-for-gemini-nano y chrome://flags/#optimization-guide-on-device-model y reiniciar. ' +
  'El estado del modelo se ve en chrome://on-device-internals. En otros navegadores el asistente sigue funcionando con su modo de reglas.';

const AYUDA_NO_DISPONIBLE =
  'Chrome informa que este equipo no puede usar el modelo. Requisitos: unos 22 GB libres en el disco del perfil, GPU con más de 4 GB de VRAM o CPU con 16 GB de RAM y 4 núcleos, red sin límite de datos para la descarga, y no usar ventana de incógnito ni perfil de invitado. ' +
  'Mira chrome://on-device-internals para ver el motivo.';

export async function diagnosticarNano(opciones: OpcionesDiagnostico = {}): Promise<PasoDiagnostico[]> {
  const fabrica = opciones.fabrica === undefined ? fabricaDelNavegador() : opciones.fabrica;
  const pasos: PasoDiagnostico[] = [];
  let detenido = false;

  const paso = async (id: string, titulo: string, f: () => Promise<Omit<PasoDiagnostico, 'id' | 'titulo' | 'ms'>>, critico = true) => {
    if (detenido) {
      const p: PasoDiagnostico = { id, titulo, estado: 'omitido', detalle: 'No se probó porque falló un paso anterior.' };
      pasos.push(p);
      opciones.onPaso?.(p);
      return;
    }
    const t0 = Date.now();
    let p: PasoDiagnostico;
    try {
      p = { id, titulo, ...(await f()), ms: Date.now() - t0 };
    } catch (e) {
      p = { id, titulo, estado: 'fallo', detalle: mensajeDe(e), ms: Date.now() - t0 };
    }
    if (p.estado === 'fallo' && critico) detenido = true;
    pasos.push(p);
    opciones.onPaso?.(p);
  };

  await paso('api', 'El navegador ofrece la API Prompt', async () =>
    fabrica ? { estado: 'ok', detalle: '`LanguageModel` está presente.' } : { estado: 'fallo', detalle: '`LanguageModel` no existe en este navegador.', ayuda: AYUDA_API },
  );

  let disponibilidad = '';
  await paso('disponibilidad', 'El modelo está disponible', async () => {
    const porIdioma: string[] = [];
    let primera: { nombre: string; estado: string } | null = null;
    for (const e of ESTRATEGIAS_IDIOMA) {
      const d = String(await fabrica!.availability(e.opciones).catch((err) => `error (${mensajeDe(err)})`));
      porIdioma.push(`${e.nombre}: ${d}`);
      if (!primera && (d === 'available' || d === 'downloadable' || d === 'downloading')) primera = { nombre: e.nombre, estado: d };
    }
    const detalle = `${porIdioma.join('. ')}.`;
    if (!primera) return { estado: 'fallo', detalle, ayuda: AYUDA_NO_DISPONIBLE };
    disponibilidad = primera.estado;
    const nota = primera.nombre === ESTRATEGIAS_IDIOMA[0].nombre ? '' : ` El navegador no acepta declarar español; se usará el modelo ${primera.nombre} (las instrucciones y respuestas siguen en español).`;
    if (primera.estado === 'available') return { estado: nota ? 'aviso' : 'ok', detalle: detalle + nota };
    return { estado: 'aviso', detalle: `${detalle}${nota} El modelo aún no está descargado: el siguiente paso lo descarga (puede tardar y necesita espacio y red; debe iniciarse con un clic tuyo).` };
  });

  await paso('params', 'Parámetros del modelo', async () => {
    if (!fabrica?.params) return { estado: 'aviso', detalle: 'Este navegador no expone `params()`: se usarán los valores por defecto.' };
    const p = await fabrica.params();
    return p ? { estado: 'ok', detalle: `temperatura por defecto ${p.defaultTemperature}, topK por defecto ${p.defaultTopK} (máx. ${p.maxTopK}).` } : { estado: 'aviso', detalle: '`params()` no devolvió valores: se usarán los por defecto.' };
  }, false);

  const nano = new ModeloNano(fabrica);
  await paso('sesion', 'Se puede crear una sesión (y descargar el modelo)', async () => {
    await nano.preparar(opciones.onProgreso);
    return { estado: 'ok', detalle: disponibilidad === 'available' ? 'Sesión creada.' : 'Modelo descargado y sesión creada.' };
  });

  const ref: { sesion: SesionLM | null } = { sesion: null };
  await paso('respuesta', 'El modelo responde una frase simple', async () => {
    ref.sesion = await nano.sesionAislada('Responde solo con lo que se te pide, sin explicaciones.');
    const s = await ref.sesion.prompt('Responde solo con la palabra OK.');
    return /ok/i.test(s) ? { estado: 'ok', detalle: `Respondió: «${s.trim().slice(0, 60)}».` } : { estado: 'aviso', detalle: `Respondió algo inesperado: «${s.trim().slice(0, 80)}».` };
  });

  await paso('json', 'El modelo respeta un esquema JSON', async () => {
    const esquema = { type: 'object', properties: { letra: { type: 'string', enum: ['A', 'B'] } }, required: ['letra'], additionalProperties: false };
    const s = await ref.sesion!.prompt('Elige la letra A. Responde con JSON: {"letra":"A"}', { responseConstraint: esquema });
    const j = JSON.parse(s) as { letra?: string };
    return j.letra === 'A' || j.letra === 'B' ? { estado: 'ok', detalle: `Devolvió ${s.trim()}.` } : { estado: 'fallo', detalle: `Devolvió algo que no cumple el esquema: ${s.trim().slice(0, 80)}.` };
  });

  await paso('espanol', 'El modelo contesta en español', async () => {
    const s = await ref.sesion!.prompt('Responde en español con una sola frase corta: ¿de qué color es el cielo en un día despejado?');
    const ingles = /\b(the|is|sky|blue|clear)\b/i.test(s) && !/\b(el|es|cielo|azul|de|un)\b/i.test(s);
    return ingles
      ? { estado: 'aviso', detalle: `Respondió en inglés: «${s.trim().slice(0, 80)}».`, ayuda: 'Las respuestas redactadas pueden salir en inglés: el asistente las descartará si no se parecen a los datos y usará su texto en español.' }
      : { estado: 'ok', detalle: `Respondió: «${s.trim().slice(0, 80)}».` };
  }, false);
  ref.sesion?.destroy();

  // Prueba de punta a punta con las herramientas reales del asistente: es lo que de verdad importa.
  const asistente = crearAsistente('B2B2B');
  const casos: { pedido: string; espera: string }[] = [
    { pedido: '¿A cuánto debería pagar 800 kg de bidones de PEAD?', espera: 'consultar_benchmark' },
    { pedido: '¿Qué puedo hacer con la cáscara de mango?', espera: 'vidas_de_residuo' },
    { pedido: '¿Qué residuos genera el arroz?', espera: 'explorar_cadena' },
  ];
  for (const c of casos) {
    await paso(`ruta:${c.espera}`, `Elige la herramienta correcta: «${c.pedido}»`, async () => {
      const d = await nano.decidir({ agente: { nombre: asistente.nombre, instruccion: asistente.instruccion }, herramientas: asistente.herramientas, historial: [], pedido: c.pedido, pasos: [] });
      if (d.accion === 'herramienta' && d.herramienta === c.espera) return { estado: 'ok', detalle: `Eligió ${d.herramienta} con ${JSON.stringify(d.argumentos)}.` };
      return {
        estado: 'aviso',
        detalle: d.accion === 'herramienta' ? `Eligió ${d.herramienta} en lugar de ${c.espera}.` : 'Decidió responder sin usar una herramienta.',
        ayuda: 'No es un error del navegador: el modelo se equivocó en esta frase. En la app, esa decisión la toma el modo de reglas.',
      };
    }, false);
  }
  return pasos;
}

/** Texto plano del diagnóstico, para copiar y pegar en un reporte. */
export function informeDiagnostico(pasos: PasoDiagnostico[], extra: { navegador?: string; bitacora?: RegistroModelo[] } = {}): string {
  const marca: Record<EstadoPaso, string> = { ok: '[OK]', fallo: '[FALLA]', aviso: '[AVISO]', omitido: '[--]' };
  const lineas = [
    'Diagnóstico de Gemini Nano en Swapit',
    extra.navegador ? `Navegador: ${extra.navegador}` : '',
    ...pasos.map((p) => `${marca[p.estado]} ${p.titulo}${p.ms !== undefined ? ` (${p.ms} ms)` : ''}\n     ${p.detalle}${p.ayuda ? `\n     Qué hacer: ${p.ayuda}` : ''}`),
    ...(extra.bitacora?.length ? ['', 'Últimas llamadas al modelo:', ...extra.bitacora.slice(-10).map((r) => `- ${r.etapa}${r.detalle ? ` (${r.detalle})` : ''} ${r.ms} ms ${r.error ? `ERROR: ${r.error}` : `→ ${r.salida ?? ''}`}`)] : []),
  ];
  return lineas.filter((l) => l !== '').join('\n');
}
