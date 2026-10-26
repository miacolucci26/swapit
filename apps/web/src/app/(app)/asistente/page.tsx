"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  crearAsistente, diagnosticarNano, ejecutar, ejecutarConfirmada, EVIDENCIAS, informeDiagnostico, ModeloConRespaldo, ModeloNano, ModeloReglas, NIVELES, VALORES,
  type ApiFn, type Artefacto, type Disponibilidad, type Evidencia, type Nivel, type Paso, type PasoDiagnostico, type Pendiente, type RegistroModelo, type Sesion, type Valor,
} from "@swapit/shared";
import { Badge, Btn, Card, inputCls, PageHeader } from "@/components/ui";
import { ESTILO_NIVEL, SelloEvidencia, ValorMonedas } from "@/components/vis/EscaleraVidas";
import { Icono, type NombreIcono } from "@/components/vis/Iconos";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";

interface Burbuja {
  rol: "usuario" | "asistente";
  texto: string;
  artefactos?: Artefacto[];
  pasos?: Paso[];
  motor?: string;
  degradado?: boolean;
  pendiente?: Pendiente;
  bitacora?: RegistroModelo[];
}

const apiAdaptada: ApiFn = (ruta, init) => api(ruta, { method: init?.method, json: init?.json }) as never;

const SUGERENCIAS_EMPRESA = [
  "Necesito cáscaras de fruta para hacer gomitas",
  "¿Qué puedo hacer con la concha de abanico?",
  "Quiero publicar 2 toneladas de cascarilla de arroz",
  "¿Qué tengo pendiente?",
];
const SUGERENCIAS_INTERMEDIARIO = [
  "¿Qué puedo hacer con la cáscara de mango?",
  "¿A cuánto debería pagar 800 kg de bidones de PEAD?",
  "¿Qué residuos genera el arroz?",
  "¿A quién le puedo vender el descarte de mango?",
  "¿Qué tengo por cotizar?",
];
const SUGERENCIAS_PERSONA = [
  "Tengo ropa y juguetes de mis hijos que ya no usan",
  "Busco un escritorio y una silla para estudiar",
  "¿Qué puedo hacer con aceite de cocina usado?",
  "¿Qué tengo pendiente?",
];

// Texto largo (para el detalle) y texto corto (para la tarjeta de estado).
const TEXTO_ESTADO: Record<Disponibilidad | "comprobando", string> = {
  comprobando: "Comprobando si tu navegador ofrece Gemini Nano…",
  unavailable: "Tu navegador no ofrece Gemini Nano (o este equipo no cumple los requisitos). El asistente funciona igual con su modo de reglas, sin IA generativa. Pulsa «Probar Gemini Nano» para ver exactamente qué falta.",
  downloadable: "Gemini Nano está soportado pero aún no descargado.",
  downloading: "El navegador está descargando Gemini Nano…",
  available: "Gemini Nano listo en este dispositivo.",
};
const TEXTO_CORTO: Record<Disponibilidad | "comprobando", string> = {
  comprobando: "Comprobando tu navegador…",
  unavailable: "Sin Gemini Nano: funciona en modo de reglas.",
  downloadable: "Listo para descargar.",
  downloading: "Descargando…",
  available: "Listo en este dispositivo.",
};

const ICONO_PASO: Record<PasoDiagnostico["estado"], { icono: NombreIcono; clase: string; texto: string }> = {
  ok: { icono: "check", clase: "bg-pri-50 text-pri-700", texto: "Bien" },
  fallo: { icono: "cerrar", clase: "bg-error-tint text-error-ink", texto: "Falló" },
  aviso: { icono: "alerta", clase: "bg-ambar-50 text-ambar-700", texto: "Aviso" },
  omitido: { icono: "flecha", clase: "bg-ink-100 text-ink-700", texto: "Omitido" },
};

// Las tarjetas de residuo llegan con los textos ya legibles ("Valor alto"); se vuelven a clave para dibujar monedas y sellos.
const claveDe = <T extends string>(tabla: Record<T, string | { nombre: string }>, texto: string): T | undefined =>
  (Object.keys(tabla) as T[]).find((k) => (typeof tabla[k] === "string" ? tabla[k] : (tabla[k] as { nombre: string }).nombre) === texto);

type Luz = "verde" | "ambar" | "rojo";
/** Semáforo de la IA local: luz + ícono + palabra. */
function Semaforo({ luz }: { luz: Luz }) {
  const on = { verde: "bg-pri-600", ambar: "bg-ambar-400", rojo: "bg-error" } as const;
  return <span className={`size-2.5 shrink-0 rounded-full ${on[luz]}`} aria-hidden />;
}

function Tarjeta({ a, onElegir }: { a: Artefacto; onElegir: (pedido: string) => void }) {
  if (a.tipo === "uso") {
    return (
      <div className="rounded-card border border-line bg-white p-3 text-sm text-ink-900 sm:col-span-2">
        <p><b>{a.titulo}.</b> {a.detalle}</p>
        <p className="mt-2 flex items-start gap-2 rounded-control border border-ambar-200 bg-ambar-50 px-2.5 py-1.5 text-ambar-800"><Icono nombre="alerta" size={16} className="mt-0.5 shrink-0" />Cuidado: {a.cuidado}</p>
      </div>
    );
  }
  if (a.tipo === "opciones") {
    return (
      <div className="rounded-card border border-line bg-white p-3 text-sm sm:col-span-2">
        <b className="text-ink-900">{a.pregunta}</b>
        <div className="mt-2 flex flex-wrap gap-2">
          {a.opciones.map((o) => (
            <button key={o.pedido} onClick={() => onElegir(o.pedido)} className="min-h-10 rounded-control border border-ink-300 bg-white px-3 text-sm font-semibold text-ink-900 hover:border-nav-600 hover:bg-surface-2">
              {o.etiqueta}
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (a.tipo === "residuo") {
    return (
      <div className="rounded-card border border-line bg-white p-3 text-sm sm:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-base font-semibold text-nav-900">{a.titulo}</p>
          <Badge tono="verde">{a.vidas.length} {a.vidas.length === 1 ? "uso" : "usos"}</Badge>
        </div>
        <p className="mt-1 text-ink-500">{a.subtitulo}</p>
        <ol className="mt-3 space-y-2.5">
          {a.vidas.map((v, i) => {
            const nivel = claveDe<Nivel>(NIVELES, v.nivel);
            const valor = claveDe<Valor>(VALORES, v.valor);
            const evidencia = claveDe<Evidencia>(EVIDENCIAS, v.evidencia);
            return (
              <li key={i} className="flex gap-2.5">
                <span className={`num grid size-6 shrink-0 place-items-center rounded-md text-xs font-semibold ${nivel ? ESTILO_NIVEL[nivel].circulo : "bg-ink-100 text-ink-700"}`} title={v.nivel}>{i + 1}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-ink-900">{v.uso}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {valor ? <ValorMonedas valor={valor} /> : <Badge>{v.valor}</Badge>}
                    {evidencia ? <SelloEvidencia evidencia={evidencia} /> : <Badge>{v.evidencia}</Badge>}
                    <span className="text-xs text-ink-500">{v.nivel}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        {!!a.preguntas?.length && (
          <div className="mt-3 rounded-control border border-ambar-200 bg-ambar-50 p-2.5 text-xs text-ambar-800">
            <b className="flex items-center gap-1.5 text-sm"><Icono nombre="alerta" size={16} />Pregunta antes de cerrar un trato</b>
            <ul className="mt-1 list-disc space-y-0.5 pl-6 text-sm">{a.preguntas.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        )}
        <Link href={a.href} className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-nav-700 hover:underline">Ver el detalle completo <Icono nombre="flecha" size={16} /></Link>
      </div>
    );
  }
  const base = "block rounded-card border border-line bg-white p-3 text-sm hover:border-nav-600";
  return (
    <Link href={a.href} className={base}>
      <div className="flex items-center justify-between gap-2">
        <b className="line-clamp-1 ">{a.titulo}</b>
        {a.tipo === "lote" && a.score != null && <Badge tono={a.score >= 70 ? "verde" : "ambar"}>{a.score}% match</Badge>}
        {a.tipo === "borrador" && <Badge tono="azul">Borrador</Badge>}
      </div>
      <div className="mt-0.5 text-ink-500">{a.subtitulo}</div>
      {a.tipo === "borrador" && <div className="mt-1 line-clamp-2 text-xs text-ink-500">{a.descripcion}</div>}
      {a.tipo === "lote" && a.nota && <div className="mt-1 text-xs text-nav-800">{a.nota}</div>}
      <div className="mt-1 flex items-center gap-1 text-sm font-semibold text-nav-700">{a.tipo === "borrador" ? "Revisar y publicar" : "Abrir"} <Icono nombre="flecha" size={16} /></div>
    </Link>
  );
}

export default function Asistente() {
  const { user } = useSession();
  const modo = user?.modo ?? "B2B2B";
  const asistente = useMemo(() => crearAsistente(modo), [modo]);
  const nano = useRef<ModeloNano | null>(null);
  const sesion = useRef<Sesion>({ historial: [] });
  const fin = useRef<HTMLDivElement>(null);
  const [disp, setDisp] = useState<Disponibilidad | "comprobando">("comprobando");
  const [progreso, setProgreso] = useState<number | null>(null);
  const [listo, setListo] = useState(false);
  const [soloReglas, setSoloReglas] = useState(false);
  const [error, setError] = useState("");
  const [msgs, setMsgs] = useState<Burbuja[]>([]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [diag, setDiag] = useState<PasoDiagnostico[] | null>(null);
  const [diagCorriendo, setDiagCorriendo] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [, setVersion] = useState(0);

  useEffect(() => {
    nano.current = new ModeloNano(undefined, { temperatura: 0.3 });
    nano.current.disponibilidad().then(setDisp);
  }, []);
  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, pensando]);

  async function activar() {
    setError("");
    setProgreso(0);
    try {
      // La descarga y la creación del modelo exigen un gesto del usuario: por eso se hace desde este clic.
      await nano.current!.preparar((f) => setProgreso(f));
      nano.current!.reanudar();
      setListo(true);
      setDisp("available");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo activar Gemini Nano");
    } finally {
      setProgreso(null);
    }
  }

  async function probar() {
    setDiag([]);
    setDiagCorriendo(true);
    setCopiado(false);
    setError("");
    const acumulados: PasoDiagnostico[] = [];
    try {
      const pasos = await diagnosticarNano({
        onProgreso: (f) => setProgreso(f),
        onPaso: (p) => {
          acumulados.push(p);
          setDiag([...acumulados]);
        },
      });
      setDiag(pasos);
      if (pasos.find((p) => p.id === "sesion")?.estado === "ok") {
        nano.current?.reanudar();
        setListo(true);
        setDisp("available");
      }
    } finally {
      setProgreso(null);
      setDiagCorriendo(false);
    }
  }

  async function copiarInforme() {
    if (!diag) return;
    const informe = informeDiagnostico(diag, { navegador: navigator.userAgent, bitacora: nano.current?.bitacora() });
    try {
      await navigator.clipboard.writeText(informe);
      setCopiado(true);
    } catch {
      setError("No se pudo copiar automáticamente. Selecciona el texto del diagnóstico y cópialo.");
    }
  }

  async function enviar(t = texto) {
    const pedido = t.trim();
    if (!pedido || pensando) return;
    setTexto("");
    setMsgs((m) => [...m, { rol: "usuario", texto: pedido }]);
    setPensando(true);
    const usarNano = !soloReglas && (listo || disp === "available") && nano.current?.soportado;
    const modelo = new ModeloConRespaldo(usarNano ? nano.current : null, new ModeloReglas());
    try {
      const r = await ejecutar(asistente, modelo, pedido, { api: apiAdaptada, sesion: sesion.current });
      sesion.current.historial.push({ rol: "usuario", texto: pedido }, { rol: "asistente", texto: r.texto });
      setMsgs((m) => [...m, { rol: "asistente", ...r }]);
    } catch (e) {
      setMsgs((m) => [...m, { rol: "asistente", texto: e instanceof Error ? `Algo falló: ${e.message}` : "Algo falló." }]);
    } finally {
      setPensando(false);
      setVersion((v) => v + 1);
    }
  }

  async function confirmar(i: number, p: Pendiente) {
    setMsgs((m) => m.map((b, j) => (j === i ? { ...b, pendiente: undefined } : b)));
    setPensando(true);
    try {
      const r = await ejecutarConfirmada(asistente, p, { api: apiAdaptada, sesion: sesion.current });
      setMsgs((m) => [...m, { rol: "asistente", texto: r.resumen, artefactos: r.artefactos, motor: "reglas" }]);
    } catch (e) {
      setMsgs((m) => [...m, { rol: "asistente", texto: e instanceof Error ? `No pude hacerlo: ${e.message}` : "No pude hacerlo." }]);
    } finally {
      setPensando(false);
    }
  }

  const sugerencias = modo === "B2B2B" ? SUGERENCIAS_INTERMEDIARIO : user?.empresa.tipo === "PERSONA" ? SUGERENCIAS_PERSONA : SUGERENCIAS_EMPRESA;
  const conNano = (disp === "available" || listo) && !soloReglas;
  const enPausa = !!nano.current?.enPausa;

  // Semáforo: verde = Gemini Nano en uso; ámbar = a medias (descarga, pausa, comprobando); rojo = no disponible.
  const luz: Luz = conNano && !enPausa ? "verde" : enPausa || disp === "downloadable" || disp === "downloading" || disp === "comprobando" ? "ambar" : "rojo";
  const tituloEstado = conNano && !enPausa ? "Gemini Nano activo" : enPausa ? "Gemini Nano en pausa" : soloReglas ? "Solo reglas" : "Modo de reglas";

  return (
    <>
      <PageHeader titulo="Asistente" sub={modo === "B2B2B" ? "Pregunta con tus palabras. Solo consulta." : "Pídele lo que necesitas con tus palabras."} />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Semaforo luz={luz} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-nav-900">IA en tu dispositivo</h2>
              <Badge tono={luz === "verde" ? "verde" : luz === "ambar" ? "ambar" : "gris"}>
                {tituloEstado}
              </Badge>
            </div>
            <p className="text-sm text-ink-700">{enPausa ? "Se pausó tras un fallo: usa reglas." : TEXTO_CORTO[disp]}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(disp === "downloadable" || disp === "downloading") && !listo && <Btn onClick={activar} disabled={progreso !== null || diagCorriendo}>{progreso !== null ? "Descargando…" : "Activar Gemini Nano"}</Btn>}
            {enPausa && <Btn variante="borde" onClick={() => { nano.current?.reanudar(); setVersion((v) => v + 1); }}>Reintentar</Btn>}
            <Btn variante="borde" onClick={probar} disabled={diagCorriendo || progreso !== null}>{diagCorriendo ? "Probando…" : "Probar Gemini Nano"}</Btn>
          </div>
        </div>

        {progreso !== null && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-sm bg-surface-2" role="progressbar" aria-label="Descarga de Gemini Nano" aria-valuenow={Math.round(progreso * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-sm bg-pri-600 transition-all" style={{ width: `${Math.round(progreso * 100)}%` }} />
          </div>
        )}
        {error && <p className="mt-2 flex items-start gap-2 text-sm font-medium text-error-ink" role="alert"><Icono nombre="alerta" size={16} className="mt-0.5 shrink-0" />{error}</p>}
        {(disp === "available" || listo) && (
          <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-ink-700">
            <input type="checkbox" className="size-5 accent-nav-700" checked={soloReglas} onChange={(e) => setSoloReglas(e.target.checked)} /> Usar solo reglas
          </label>
        )}

        <details className="mt-1 text-sm text-ink-500">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold text-nav-700">Requisitos y privacidad</summary>
          <p className="mb-2 text-ink-700">{TEXTO_ESTADO[disp]}</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Solo Chrome de escritorio reciente (Windows 10/11, macOS 13+ o Linux), con unos 22 GB libres y GPU de más de 4 GB de VRAM o CPU con 16 GB de RAM y 4 núcleos.</li>
            <li>La descarga del modelo ocurre una vez y requiere una red sin límite de datos; según tu versión de Chrome puede estar detrás de una bandera (<code>chrome://flags</code>).</li>
            <li>El texto que escribes lo procesa el modelo en tu equipo. Las consultas a Swapit (precios, red, material) sí viajan a nuestro servidor, igual que en el resto de la app. La información de cadenas y residuos está en la propia página.</li>
            <li>El asistente nunca cambia datos por sí solo; lo que modificaría algo te pide confirmación antes de ejecutarse.</li>
            <li>Si Gemini Nano falla o tarda, cada decisión pasa al modo de reglas y verás el motivo en el detalle técnico de la respuesta.</li>
          </ul>
        </details>

        {diag && (
          <details open className="mt-2 border-t border-line pt-2">
            <summary className="flex min-h-11 cursor-pointer flex-wrap items-center justify-between gap-2 font-semibold text-nav-900">
              <span>Diagnóstico de Gemini Nano</span>
              {!diagCorriendo && diag.length > 0 && <span className="text-sm font-normal text-ink-500">{diag.filter((p) => p.estado === "ok").length} de {diag.length} bien</span>}
            </summary>
            {!diagCorriendo && diag.length > 0 && <div className="mb-2"><Btn variante="borde" onClick={copiarInforme}>{copiado ? "Copiado ✓" : "Copiar informe"}</Btn></div>}
            <ul className="space-y-2 text-sm">
              {diag.map((p) => {
                const e = ICONO_PASO[p.estado];
                return (
                  <li key={p.id} className="rounded-control bg-surface-2 p-2.5">
                    <div className="flex items-start gap-2.5">
                      <span className={`grid size-6 shrink-0 place-items-center rounded-md ${e.clase}`} role="img" aria-label={e.texto}><Icono nombre={e.icono} size={16} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">{p.titulo}{p.ms !== undefined && <span className="ml-2 text-xs font-normal text-ink-400">{p.ms} ms</span>}</div>
                        <div className="text-xs text-ink-700">{p.detalle}</div>
                        {p.ayuda && <div className="mt-1 text-xs text-ambar-700"><b>Qué hacer:</b> {p.ayuda}</div>}
                      </div>
                    </div>
                  </li>
                );
              })}
              {diagCorriendo && <li className="text-xs text-ink-500">Probando… la primera vez puede tardar mientras Chrome carga el modelo.</li>}
            </ul>
            {!diagCorriendo && diag.length > 0 && <p className="mt-2 text-xs text-ink-500">Si algo no se resuelve, copia el informe y pégalo para revisarlo.</p>}
          </details>
        )}
      </Card>

      <Card className="flex min-h-[26rem] flex-col">
        <div className="flex flex-1 flex-col gap-4" aria-live="polite">
          {msgs.length === 0 && (
            <div className="m-auto w-full max-w-lg text-center">
              <p className="text-base font-semibold text-nav-900">¿En qué te ayudo?</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {sugerencias.map((s) => (
                  <button key={s} onClick={() => enviar(s)} className="inline-flex min-h-10 items-center rounded-control border border-ink-300 bg-white px-3 py-2 text-left text-sm font-medium text-ink-700 hover:border-nav-600 hover:bg-surface-2">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => {
            const falloNano = m.bitacora?.find((b) => b.error && b.etapa !== "respaldo")?.error ?? m.bitacora?.find((b) => b.etapa === "respaldo")?.error;
            return (
              <div key={i} className={m.rol === "usuario" ? "ml-auto max-w-[85%]" : "flex max-w-[95%] gap-2"}>
                <div className="min-w-0 flex-1">
                  <div className={`whitespace-pre-line rounded-card px-4 py-2.5 text-sm md:text-[15px] ${m.rol === "usuario" ? "bg-nav-700 text-white" : "border border-line bg-white text-ink-900"}`}>{m.texto}</div>
                  {!!m.artefactos?.length && <div className="mt-2 grid gap-2 sm:grid-cols-2">{m.artefactos.map((a, j) => <Tarjeta key={j} a={a} onElegir={(p) => enviar(p)} />)}</div>}
                  {m.pendiente && (
                    <div className="mt-2 flex gap-2">
                      <Btn onClick={() => confirmar(i, m.pendiente!)} disabled={pensando}>Sí, hazlo</Btn>
                      <Btn variante="borde" onClick={() => setMsgs((x) => x.map((b, j) => (j === i ? { ...b, pendiente: undefined } : b)))}>No</Btn>
                    </div>
                  )}
                  {m.rol === "asistente" && m.degradado && falloNano && (
                    <p className="mt-1 flex items-start gap-1.5 rounded-control border border-ambar-200 bg-ambar-50 px-2.5 py-1.5 text-xs text-ambar-800"><Icono nombre="alerta" size={14} className="mt-0.5 shrink-0" />Gemini Nano no pudo con esto y se usó el modo de reglas: {falloNano}</p>
                  )}
                  {m.rol === "asistente" && m.motor && (
                    <details className="mt-1 text-xs text-ink-500">
                      <summary className="min-h-8 cursor-pointer py-1">
                        Respondió: {m.motor === "gemini-nano" ? "Gemini Nano (local)" : "modo de reglas"}
                        {m.degradado && " · con respaldo"}
                      </summary>
                      {!!m.pasos?.length && (
                        <ol className="mt-1 list-decimal space-y-0.5 pl-5">
                          {m.pasos.map((p, j) => <li key={j}><code>{p.agente}</code> → <code>{p.herramienta}</code>{p.ok ? "" : " (falló)"}</li>)}
                        </ol>
                      )}
                      {!!m.bitacora?.length && (
                        <ul className="mt-1 space-y-0.5 font-mono text-[11px]">
                          {m.bitacora.map((b, j) => (
                            <li key={j} className={b.error ? "text-error-ink" : ""}>{b.etapa}{b.detalle ? ` (${b.detalle})` : ""} · {b.ms} ms · {b.error ? `ERROR ${b.error}` : b.salida}</li>
                          ))}
                        </ul>
                      )}
                    </details>
                  )}
                </div>
              </div>
            );
          })}
          {pensando && <div className="flex items-center gap-2 text-sm text-ink-500"><Icono nombre="reloj" size={16} />Pensando…</div>}
          <div ref={fin} />
        </div>
        <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); enviar(); }}>
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe aquí tu pedido…" className={inputCls} aria-label="Mensaje para el asistente" />
          <Btn disabled={pensando || texto.trim().length < 2}>Enviar</Btn>
        </form>
      </Card>
    </>
  );
}
