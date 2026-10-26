"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Btn, Card, Cargando, LinkBtn, PageHeader } from "@/components/ui";
import { Icono } from "@/components/vis/Iconos";
import { api, ApiError } from "@/lib/api";
import { hora } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { Proveedor } from "@/lib/types";

interface Msg { id: string; direccion: "ENTRANTE" | "SALIENTE"; texto: string; createdAt: string }
const DESCONOCIDO = "+51900000999";
// Cada atajo responde al paso de la conversación en que se usa (0 = saludo ... 5 = ya registrado).
const ATAJOS = ["Hola", "Bidones de PEAD azules enjuagados", "800 kg", "1.70", "Sí", "Estado"];

// Pasos de la conversación; el bot los anuncia con estas frases (ver whatsapp.service).
const PASOS: { nombre: string; marca: string }[] = [
  { nombre: "Material", marca: "¿Qué material tienes" },
  { nombre: "Cantidad", marca: "¿Cuánto tienes" },
  { nombre: "Precio", marca: "¿A cuánto lo vendes" },
  { nombre: "Enviar", marca: "¿Lo envío a" },
  { nombre: "Listo", marca: "Registré tu reporte" },
];

/** Paso actual (0 = sin empezar, 1..5) según el último aviso del bot. */
function pasoActual(msgs: Msg[]) {
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].direccion !== "SALIENTE") continue;
    for (let p = PASOS.length - 1; p >= 0; p--) if (msgs[i].texto.includes(PASOS[p].marca)) return p + 1;
  }
  return 0;
}

/**
 * Simulador del bot de WhatsApp: tú escribes «como» un proveedor de tu red y ves cómo le responde el bot, que le arma
 * el reporte de material paso a paso. No se envía nada por WhatsApp real; es la misma lógica que atendería el webhook.
 */
export default function WhatsappDemo() {
  const { user } = useSession();
  const [proveedores, setProveedores] = useState<Proveedor[] | null>(null);
  const [telefono, setTelefono] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const fin = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<Proveedor[]>("/empresas/proveedores").then((p) => {
      const con = p.filter((x) => x.activo && x.telefono);
      setProveedores(con);
      if (con[0]) setTelefono(con[0].telefono as string);
    });
  }, []);

  const cargar = useCallback(async (t: string) => {
    if (t) setMsgs(await api<Msg[]>(`/whatsapp/simular/mensajes?telefono=${encodeURIComponent(t)}`));
  }, []);
  useEffect(() => {
    cargar(telefono);
  }, [telefono, cargar]);
  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs]);

  async function enviar(t = texto) {
    const limpio = t.trim();
    if (!limpio || !telefono || enviando) return;
    setTexto("");
    setEnviando(true);
    setError("");
    try {
      const r = await api<{ mensajes: Msg[] }>("/whatsapp/simular", { method: "POST", json: { telefono, texto: limpio } });
      setMsgs(r.mensajes);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo enviar");
    } finally {
      setEnviando(false);
    }
  }

  async function reiniciar() {
    await api(`/whatsapp/simular?telefono=${encodeURIComponent(telefono)}`, { method: "DELETE" });
    setMsgs([]);
  }

  if (!proveedores || !user) return <Cargando />;
  const registrado = msgs.some((m) => m.direccion === "SALIENTE" && m.texto.includes("Registré tu reporte"));
  const paso = pasoActual(msgs);

  return (
    <>
      <PageHeader titulo="WhatsApp (simulador)" sub="Escribe como si fueras tu proveedor." acciones={<Badge tono="ambar">Simulación</Badge>} />

      {/* Pasos de la conversación */}
      <ol className="mb-5 grid grid-cols-5 gap-2" aria-label="Pasos de la conversación">
        {PASOS.map((p, i) => {
          const n = i + 1;
          const hecho = n < paso || paso === PASOS.length;
          const actual = n === paso && paso < PASOS.length;
          return (
            <li key={p.nombre} aria-current={actual ? "step" : undefined}>
              <span className={`block h-1.5 rounded-sm ${hecho ? "bg-nav-700" : actual ? "bg-pri-600" : "bg-ink-100"}`} />
              <span className={`mt-1.5 block truncate text-xs ${actual ? "font-semibold text-pri-700" : hecho ? "font-medium text-nav-800" : "text-ink-500"}`}><span className="num">{n}.</span> {p.nombre}</span>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <div className="mx-auto w-full max-w-[380px] overflow-hidden rounded-card border border-line bg-white shadow-card">
          <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
            <div className="flex size-9 items-center justify-center rounded-control bg-white/20 text-sm font-semibold">{user.empresa.razonSocial.slice(0, 1)}</div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{user.empresa.razonSocial}</div>
              <div className="text-xs opacity-85">asistente de captación</div>
            </div>
            <Icono nombre="whatsapp" size={20} className="ml-auto opacity-80" />
          </div>
          <div className="flex h-[26rem] flex-col gap-1.5 overflow-y-auto bg-[#ece5dd] p-3" aria-live="polite">
            {msgs.length === 0 && (
              <p className="m-auto text-center text-sm text-ink-700">Escribe «Hola»</p>
            )}
            {msgs.map((m) => (
              <div key={m.id} className={`max-w-[85%] rounded-control px-3 py-1.5 text-sm shadow-sm ${m.direccion === "ENTRANTE" ? "self-end rounded-tr-sm bg-[#dcf8c6]" : "self-start rounded-tl-sm bg-white"}`}>
                <div className="whitespace-pre-line">{m.texto}</div>
                <div className="mt-0.5 text-right text-[11px] text-ink-500">{hora(m.createdAt)}</div>
              </div>
            ))}
            <div ref={fin} />
          </div>
          <form className="flex gap-2 bg-[#f0f0f0] p-2" onSubmit={(e) => { e.preventDefault(); enviar(); }}>
            <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe un mensaje" aria-label="Mensaje" className="min-h-11 min-w-0 flex-1 rounded-control border border-ink-300 bg-white px-3 text-base outline-none md:text-[15px]" />
            <button disabled={enviando || !texto.trim()} aria-label="Enviar" className="grid size-11 shrink-0 place-items-center rounded-control bg-[#075e54] text-white disabled:opacity-50"><Icono nombre="flecha" size={20} /></button>
          </form>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <label htmlFor="escribir-como" className="text-[13px] font-medium text-ink-700">Escribir como</label>
            <select id="escribir-como" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="mt-1 min-h-11 w-full rounded-control border border-ink-300 bg-white px-3 py-2 text-base outline-none focus:border-nav-600 focus:ring-2 focus:ring-nav-100 md:text-[15px]" aria-label="Escribir como">
              {proveedores.map((p) => <option key={p.id} value={p.telefono as string}>{p.razonSocial} · {p.telefono}</option>)}
              <option value={DESCONOCIDO}>Número desconocido · {DESCONOCIDO}</option>
            </select>
            {proveedores.length === 0 && (
              <p className="mt-2 text-sm text-ink-700">Ningún proveedor tiene celular. <Link href="/red" className="font-semibold text-nav-700 underline">Agrégalo en Mi red</Link></p>
            )}
            <p className="mt-4 text-[13px] font-medium text-ink-700">Respuestas rápidas</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {ATAJOS.map((a, i) => (
                <button key={a} onClick={() => enviar(a)} disabled={enviando} className={`min-h-10 rounded-control border px-3 text-sm font-medium disabled:opacity-50 ${i === paso ? "border-pri-600 bg-pri-50 text-pri-700" : "border-ink-300 bg-white text-ink-700 hover:border-nav-600"}`}>{a}</button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Btn variante="borde" onClick={reiniciar}>Reiniciar conversación</Btn>
              {registrado && <LinkBtn href="/material">Ver el reporte</LinkBtn>}
            </div>
            {error && <p role="alert" className="mt-2 flex items-center gap-2 text-sm font-medium text-error-ink"><Icono nombre="alerta" size={16} />{error}</p>}
          </Card>

          <Card>
            <details>
              <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-nav-900">Qué es esto (y qué no)</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-700">
                <li>Simulación: no se envía nada por WhatsApp.</li>
                <li>Conversación guiada: no inventa respuestas.</li>
                <li>Crea el mismo reporte que el portal.</li>
                <li>Uso real: WhatsApp Business verificado (<code>docs/whatsapp-roadmap.md</code>).</li>
              </ul>
            </details>
          </Card>
        </div>
      </div>
    </>
  );
}
