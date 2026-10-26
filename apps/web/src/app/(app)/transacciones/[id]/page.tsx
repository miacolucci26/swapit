"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ETIQUETA_UNIDAD, formatoCantidad } from "@swapit/shared";
import { StepperEtapas, etapaDe } from "@/components/EtapaAcuerdo";
import { Badge, Btn, Card, Cargando, Estrellas, Field, inputCls, InsigniaDemo, ModalidadBadge, PuntoCategoria, TipoBadge } from "@/components/ui";
import { Icono } from "@/components/vis/Iconos";
import { api, ApiError } from "@/lib/api";
import { ENTREGA, fecha, hora, num, porUnidad, soles } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { ContactoContraparte, EtapaAcuerdo } from "@/lib/types";

interface Msg { id: string; createdAt: string; autorNombre: string; empresaId: string; sistema: boolean; texto: string }
interface Detalle {
  id: string; estado: string; etiquetaEstado: string; etapa?: EtapaAcuerdo; modalidad: "VENTA" | "DONACION" | "CREDITOS" | "INTERCAMBIO"; rol: "OFERTANTE" | "RECEPTOR";
  cantidad: number; precioAcordado: number | null; total: number; comision: number; distanciaKm: number | null; fleteEstimado: number | null;
  pagoEstado: string; fechaRecojo: string | null; responsableRecojo: string | null; fotoEntregaUrl: string | null;
  firmas: { OFERTANTE: boolean; RECEPTOR: boolean };
  terminos: { cantidad: number; precioAcordado?: number; fechaRecojo?: string; responsableRecojo?: string; pagarComisionConCreditos?: boolean; loteIntercambioId?: string } | null;
  aceptaciones: { OFERTANTE: boolean; RECEPTOR: boolean }; propuestoPor: "OFERTANTE" | "RECEPTOR" | null;
  contrato: { titulo: string; condiciones: string[]; total: number; comisionPlataforma: number } | null;
  comisionPagadaConCreditos: boolean;
  /** Solo viene cuando el acuerdo ya fue aceptado (la API lo omite o lo manda null antes). `contacto` es un alias por compatibilidad. */
  contactoContraparte?: ContactoContraparte | null; contacto?: ContactoContraparte | null;
  lote: { id: string; titulo: string; categoria: string; categoriaCodigo?: string; imagen?: string | null; cantidadDisponible: number; unidad: string; notaIntercambio?: string | null; entrega?: string; condicion?: string | null };
  loteIntercambio: { id: string; titulo: string } | null;
  ofertante: { id: string; tipo: "EMPRESA" | "PERSONA"; razonSocial: string; ratingProm: number; demo?: boolean }; receptor: { id: string; tipo: "EMPRESA" | "PERSONA"; razonSocial: string; ratingProm: number; demo?: boolean };
  mensajes: Msg[]; calificaciones: { autorId: string; estrellas: number; comentario: string | null }[];
  certificado: { codigo: string; hashSha256: string } | null; incidencias: number; saldoCreditos: number | null;
  acciones: string[]; pendiente: string;
}

const PASOS = [
  ["SOLICITADO", "Solicitud"], ["EN_NEGOCIACION", "Negociación"], ["ACORDADO", "Acuerdo"], ["PAGO_RETENIDO", "Pago en garantía"],
  ["RECOJO_CONFIRMADO", "Recojo"], ["ENTREGADO", "Entrega"], ["CALIFICADO", "Calificación"], ["CERRADO", "Cerrado"],
] as const;

async function subirFoto(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch("/api/uploads", { method: "POST", body: fd, credentials: "include" });
  const d = await r.json();
  if (!r.ok) throw new ApiError(d.message ?? "No se pudo subir la foto", r.status);
  return d.nombre;
}

const mañana = () => new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10);

export default function DetalleTransaccion() {
  const { id } = useParams<{ id: string }>();
  const { user } = useSession();
  const [d, setD] = useState<Detalle | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const fin = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async () => {
    const x = await api<Detalle>(`/transacciones/${id}`);
    setD(x);
    setMsgs(x.mensajes);
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  // Chat por polling: cada 4 s; si hay mensajes nuevos se refresca también el estado
  const largo = useRef(0);
  useEffect(() => { largo.current = msgs.length; }, [msgs.length]);
  useEffect(() => {
    const t = setInterval(async () => {
      if (document.hidden) return;
      try {
        const nuevos = await api<Msg[]>(`/transacciones/${id}/mensajes`);
        if (nuevos.length !== largo.current) await cargar();
      } catch { /* ignora errores transitorios */ }
    }, 4000);
    return () => clearInterval(t);
  }, [id, cargar]);

  useEffect(() => { fin.current?.scrollIntoView({ block: "nearest" }); }, [msgs.length]);

  async function accion(fn: () => Promise<unknown>, mensaje: string) {
    setErr(""); setOk(""); setBusy(true);
    try { await fn(); setOk(mensaje); await cargar(); }
    catch (e) { setErr(e instanceof ApiError ? (e.errores?.map((x) => x.mensaje).join(", ") ?? e.message) : "Error de conexión"); }
    finally { setBusy(false); }
  }

  if (!d || !user) return <Cargando />;
  const puede = (a: string) => d.acciones.includes(a);
  const otra = d.rol === "OFERTANTE" ? d.receptor : d.ofertante;
  const idxPaso = PASOS.findIndex(([k]) => k === d.estado);
  const cancelado = d.estado === "CANCELADO";
  const pasos = PASOS.filter(([k]) => !(["DONACION", "INTERCAMBIO"].includes(d.modalidad) && k === "PAGO_RETENIDO"));
  const unidad = d.modalidad === "CREDITOS" ? "créditos" : "S/";
  const pxt = (n: number | null | undefined) => (n == null ? "—" : d.modalidad === "CREDITOS" ? `${n} créd.${porUnidad(d.lote.unidad)}` : `S/ ${n}${porUnidad(d.lote.unidad)}`);

  const etapa = etapaDe(d);
  const contacto = d.contactoContraparte ?? d.contacto ?? null;
  const precioTxt = d.modalidad === "DONACION" ? "Donación" : d.modalidad === "INTERCAMBIO" ? "Intercambio" : d.precioAcordado != null ? pxt(d.precioAcordado) : "A negociar";

  return (
    <>
      <Link href="/transacciones" className="inline-flex min-h-11 items-center text-sm font-semibold text-nav-700 hover:underline">← Mi actividad</Link>

      {/* Encabezado ejecutivo: etapa en 3 pasos + resumen del acuerdo */}
      <section aria-label="Resumen del acuerdo" className="mt-1 rounded-card border border-line bg-white p-4 shadow-card sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1 basis-72">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold leading-tight tracking-tight text-nav-900 md:text-2xl">{d.lote.titulo}</h1>
              <ModalidadBadge m={d.modalidad} />
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-700">
              <span>{d.ofertante.razonSocial}</span>{d.ofertante.demo && <InsigniaDemo />}
              <span aria-hidden="true">→</span>
              <span>{d.receptor.razonSocial}</span>{d.receptor.demo && <InsigniaDemo />}
              <span aria-hidden="true">·</span>
              <Link href={`/lotes/${d.lote.id}`} className="font-medium text-nav-700 hover:underline">Ver publicación</Link>
            </p>
          </div>
          <div className="w-full sm:w-80"><StepperEtapas etapa={etapa} /></div>
        </div>

        <div className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-[auto_1fr]">
          <div className="h-28 w-full overflow-hidden rounded-control bg-surface-2 sm:h-24 sm:w-36">
            {d.lote.imagen ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.lote.imagen} alt={`Foto de ${d.lote.titulo}`} className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-ink-400" aria-hidden="true"><Icono nombre="material" size={32} /></div>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm lg:grid-cols-4">
            <div><dt className="text-xs font-medium text-ink-500">Material</dt><dd className="mt-0.5"><PuntoCategoria codigo={d.lote.categoriaCodigo ?? "OTROS"} etiqueta={d.lote.categoria.split("(")[0].trim()} className="text-sm text-ink-900" /></dd></div>
            <div><dt className="text-xs font-medium text-ink-500">Cantidad</dt><dd className="num mt-0.5 font-semibold text-nav-900">{formatoCantidad(d.cantidad, d.lote.unidad)}</dd></div>
            <div><dt className="text-xs font-medium text-ink-500">{etapa === "PROPUESTA" || etapa === "CANCELADA" ? "Precio propuesto" : "Precio acordado"}</dt><dd className="num mt-0.5 font-semibold text-nav-900">{precioTxt}</dd></div>
            <div><dt className="text-xs font-medium text-ink-500">Estado interno</dt><dd className="mt-0.5"><Badge tono={cancelado ? "rojo" : d.estado === "CERRADO" ? "gris" : "verde"}>{d.etiquetaEstado}</Badge></dd></div>
            <div className="col-span-2 lg:col-span-4">
              <dt className="text-xs font-medium text-ink-500">Próxima acción</dt>
              <dd className={`mt-0.5 font-semibold ${cancelado || d.estado === "CERRADO" ? "text-ink-700" : "text-nav-900"}`}>{cancelado ? "Esta operación fue cancelada." : d.estado === "CERRADO" ? "Completada: no hay pendientes." : d.pendiente}</dd>
            </div>
          </dl>
        </div>

        {/* Los 9 estados internos se conservan, plegados */}
        <details className="mt-3 border-t border-line pt-1 text-sm">
          <summary className="inline-flex min-h-10 cursor-pointer items-center font-medium text-nav-700">Ver pasos detallados</summary>
          <ol className="mt-1 flex gap-1 overflow-x-auto pb-1">
            {pasos.map(([k, etiqueta]) => {
              const i = PASOS.findIndex(([x]) => x === k);
              const hecho = !cancelado && idxPaso >= i;
              const actual = !cancelado && idxPaso === i;
              return (
                <li key={k} className={`flex min-w-[92px] flex-1 flex-col items-center gap-1 rounded-control px-2 py-2 text-center text-[11px] font-medium ${actual ? "bg-nav-900 text-white" : hecho ? "bg-pri-50 text-pri-700" : "bg-ink-100 text-ink-500"}`}>
                  <span className="text-base">{hecho && !actual ? "✓" : i + 1}</span>{etiqueta}
                </li>
              );
            })}
          </ol>
        </details>
      </section>
      {cancelado && <p className="mt-3 rounded-control bg-error-tint p-3 text-sm text-error-ink">Esta transacción fue cancelada{d.pagoEstado === "REEMBOLSADO" ? " y el pago retenido fue reembolsado" : ""}.</p>}

      {d.rol === "RECEPTOR" && ["ENTREGADO", "CALIFICADO", "CERRADO"].includes(d.estado) && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-control bg-pri-50 p-3 text-sm text-pri-700">
          <span>¿Te sirvió? Si lo necesitas de nuevo, pídelo otra vez aquí: conservas tu historial, el pago en garantía y el certificado.</span>
          <span className="flex gap-2">
            <Link href={`/lotes?empresaId=${d.ofertante.id}`} className="rounded-control bg-pri-600 px-3 py-1.5 font-medium text-white hover:bg-pri-700">Ver lo que publica ahora</Link>
            <Link href={`/matching?texto=${encodeURIComponent(d.lote.titulo)}`} className="rounded-control border border-pri-200 bg-white px-3 py-1.5 font-medium hover:bg-pri-50">Avisarme de similares</Link>
          </span>
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        {/* Columna izquierda: chat + acciones */}
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col">
            <h2 className="mb-2 font-semibold">Conversación con {otra.razonSocial}</h2>
            <div className="max-h-[360px] min-h-[160px] overflow-y-auto rounded-control bg-surface-2 p-3">
              {msgs.map((m) => m.sistema ? (
                <div key={m.id} className="my-2 text-center"><span className="inline-block max-w-[90%] rounded-control bg-ink-100 px-3 py-1 text-xs text-ink-700">{m.texto}</span></div>
              ) : (
                <div key={m.id} className={`my-2 flex ${m.empresaId === user.empresa.id ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-card px-3 py-2 text-sm ${m.empresaId === user.empresa.id ? "bg-pri-600 text-white" : "bg-white text-ink-900 shadow-sm"}`}>
                    <div className={`text-[10px] ${m.empresaId === user.empresa.id ? "text-pri-100" : "text-ink-500"}`}>{m.autorNombre} · {hora(m.createdAt)}</div>
                    {m.texto}
                  </div>
                </div>
              ))}
              <div ref={fin} />
            </div>
            {puede("mensaje") && (
              <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!texto.trim()) return; const t = texto; setTexto(""); accion(() => api(`/transacciones/${id}/mensajes`, { method: "POST", json: { texto: t } }), ""); }}>
                <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe un mensaje…" className={inputCls} />
                <Btn disabled={busy}>Enviar</Btn>
              </form>
            )}
          </Card>

          {(err || ok) && <p className={`rounded-control p-3 text-sm ${err ? "bg-error-tint text-error-ink" : "bg-pri-50 text-pri-700"}`}>{err || ok}</p>}

          {/* Negociación */}
          {(puede("proponer") || puede("aceptar")) && (
            <Card>
              <h2 className="font-semibold">Términos de la operación</h2>
              {d.terminos && (
                <div className="mt-2 rounded-control bg-surface-2 p-3 text-sm">
                  <div className="font-medium">Propuesta actual de {d.propuestoPor === "OFERTANTE" ? d.ofertante.razonSocial : d.receptor.razonSocial}</div>
                  <div className="mt-1 text-ink-700">
                    {formatoCantidad(d.terminos.cantidad, d.lote.unidad)}{d.terminos.precioAcordado ? ` · ${pxt(d.terminos.precioAcordado)}` : d.modalidad === "INTERCAMBIO" ? ` · a cambio de ${d.loteIntercambio ? `«${d.loteIntercambio.titulo}»` : "un lote por definir"}` : " · donación"}
                    {d.terminos.fechaRecojo && ` · recojo ${fecha(d.terminos.fechaRecojo)}`}
                    {d.terminos.responsableRecojo && ` · ${d.terminos.responsableRecojo}`}
                    {d.terminos.pagarComisionConCreditos && " · comisión con créditos"}
                  </div>
                  <div className="mt-1 flex gap-2 text-xs"><Badge tono={d.aceptaciones.OFERTANTE ? "verde" : "gris"}>Ofertante {d.aceptaciones.OFERTANTE ? "✓" : "pendiente"}</Badge><Badge tono={d.aceptaciones.RECEPTOR ? "verde" : "gris"}>Receptor {d.aceptaciones.RECEPTOR ? "✓" : "pendiente"}</Badge></div>
                  {puede("aceptar") && <Btn className="mt-3" disabled={busy} onClick={() => accion(() => api(`/transacciones/${id}/aceptar`, { method: "POST" }), "Acuerdo cerrado. Se generó el contrato.")}>✓ Aceptar estos términos</Btn>}
                </div>
              )}
              <FormTerminos d={d} unidad={unidad} busy={busy} onSubmit={(v) => accion(() => api(`/transacciones/${id}/terminos`, { method: "PUT", json: v }), "Propuesta enviada")} />
            </Card>
          )}

          {puede("pagar") && (
            <Card>
              <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">Pago en garantía</h2><Badge tono="ambar">Pago simulado (demo)</Badge></div>
              <p className="mt-1 text-sm text-ink-700">
                {d.modalidad === "VENTA" ? "El monto queda retenido y se libera al ofertante cuando ambas partes firman la entrega." : "Los créditos quedan retenidos y se transfieren al ofertante al confirmarse la entrega."}
              </p>
              <div className="mt-3 rounded-control bg-surface-2 p-3 text-sm">
                <div className="flex justify-between"><span>Material ({formatoCantidad(d.cantidad, d.lote.unidad)} × {pxt(d.precioAcordado)})</span><b>{d.modalidad === "VENTA" ? soles(d.total) : `${num(d.total, 0)} créditos`}</b></div>
                {d.saldoCreditos != null && <div className={`mt-1 flex justify-between ${d.saldoCreditos < d.total ? "text-error" : "text-ink-500"}`}><span>Tu saldo de créditos</span><span>{num(d.saldoCreditos, 0)}</span></div>}
                {d.fleteEstimado != null && <div className="mt-1 flex justify-between text-ink-500"><span>Flete estimado (aparte, orientativo)</span><span>≈ {soles(d.fleteEstimado)}</span></div>}
              </div>
              <Btn className="mt-3" disabled={busy} onClick={() => accion(() => api(`/transacciones/${id}/pagar`, { method: "POST" }), "Pago simulado retenido en garantía")}>
                {d.modalidad === "VENTA" ? `Pagar ${soles(d.total)} (simulado)` : `Pagar con ${num(d.total, 0)} créditos`}
              </Btn>
              <p className="mt-2 text-xs text-ink-500">Simulación de demostración: no se mueve dinero real ni hay una pasarela de pago conectada.</p>
            </Card>
          )}

          {puede("confirmar_recojo") && (
            <FormRecojo entrega={d.lote.entrega} conPersona={d.ofertante.tipo === "PERSONA" || d.receptor.tipo === "PERSONA"} busy={busy} onSubmit={(v) => accion(() => api(`/transacciones/${id}/recojo`, { method: "POST", json: v }), "Recojo confirmado")} inicial={{ fecha: d.fechaRecojo?.slice(0, 10) ?? d.terminos?.fechaRecojo?.slice(0, 10) ?? mañana(), resp: d.responsableRecojo ?? d.terminos?.responsableRecojo ?? "" }} />
          )}

          {(puede("firmar_entrega") || d.estado === "RECOJO_CONFIRMADO") && (
            <FirmaEntrega d={d} busy={busy} puede={puede("firmar_entrega")} onFirmar={async (uso, foto) => accion(async () => {
              const nombre = foto ? await subirFoto(foto) : undefined;
              await api(`/transacciones/${id}/firmar`, { method: "POST", json: { usoFinalDeclarado: uso || undefined, fotoEntrega: nombre } });
            }, "Firma registrada")} />
          )}

          {puede("calificar") && <Calificar otra={otra.razonSocial} busy={busy} onSubmit={(v) => accion(() => api(`/transacciones/${id}/calificar`, { method: "POST", json: v }), "¡Gracias por tu calificación!")} />}

          {(puede("cancelar") || puede("incidencia")) && (
            <Acciones busy={busy} cancelar={puede("cancelar")} incidencia={puede("incidencia")}
              onCancelar={(motivo) => accion(() => api(`/transacciones/${id}/cancelar`, { method: "POST", json: { motivo } }), "Transacción cancelada")}
              onIncidencia={(v) => accion(() => api(`/transacciones/${id}/incidencias`, { method: "POST", json: v }), "Incidencia reportada a moderación")} />
          )}
        </div>

        {/* Columna derecha: resumen, contrato, certificado */}
        <div className="flex flex-col gap-4">
          {!cancelado && <BloqueContacto contacto={contacto} otra={otra.razonSocial} />}

          {d.certificado && (
            <Card className="border-pri-200 bg-pri-50">
              <div className="text-xs font-semibold uppercase tracking-wide text-pri-700">Certificado de manejo y destino final</div>
              <div className="mt-1 text-lg font-bold">{d.certificado.codigo}</div>
              <p className="mt-1 break-all text-[11px] text-pri-700">SHA-256 {d.certificado.hashSha256.slice(0, 32)}…</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={`/api/verificar/${d.certificado.codigo}/pdf`} target="_blank" className="rounded-control bg-pri-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-pri-700">Descargar PDF</a>
                <Link href={`/verificar/${d.certificado.codigo}`} target="_blank" className="rounded-control border border-pri-200 bg-white px-3 py-1.5 text-sm font-medium text-pri-700">Verificar</Link>
              </div>
            </Card>
          )}

          <Card>
            <h2 className="font-semibold">Resumen</h2>
            <dl className="mt-2 text-sm">
              {[
                ["Cantidad", formatoCantidad(d.cantidad, d.lote.unidad)],
                !["DONACION", "INTERCAMBIO"].includes(d.modalidad) ? ["Precio", pxt(d.precioAcordado)] : null,
                d.modalidad === "INTERCAMBIO" ? ["A cambio de", d.loteIntercambio?.titulo ?? "por definir"] : null,
                d.total > 0 ? ["Total", d.modalidad === "VENTA" ? soles(d.total) : `${num(d.total, 0)} créditos`] : null,
                d.modalidad !== "CREDITOS" && d.comision > 0 ? [d.modalidad === "VENTA" ? "Comisión Swap It" : "Fee de coordinación", `${soles(d.comision)}${d.comisionPagadaConCreditos ? " (pagada con créditos)" : ""}`] : null,
                d.distanciaKm != null ? ["Distancia", `${num(d.distanciaKm, 1)} km`] : null,
                d.fleteEstimado != null ? ["Flete estimado", `≈ ${soles(d.fleteEstimado)}`] : null,
                d.pagoEstado !== "NO_APLICA" ? ["Pago (simulado)", d.pagoEstado.toLowerCase()] : null,
                d.fechaRecojo ? ["Recojo", `${fecha(d.fechaRecojo)}${d.responsableRecojo ? ` · ${d.responsableRecojo}` : ""}`] : null,
              ].filter((x): x is string[] => !!x).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-line py-1.5 last:border-0"><dt className="text-ink-500">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
              ))}
            </dl>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {[d.ofertante, d.receptor].map((p, i) => (
                <div key={p.id} className="rounded-control bg-surface-2 p-2"><div className="flex items-center justify-between text-ink-500"><span>{i === 0 ? "Ofertante" : "Receptor"}</span><TipoBadge tipo={p.tipo} /></div><div className="font-medium">{p.razonSocial}</div><Estrellas v={p.ratingProm} /></div>
              ))}
            </div>
          </Card>

          {d.contrato && (
            <Card>
              <h2 className="font-semibold">Contrato</h2>
              <p className="text-sm text-ink-700">{d.contrato.titulo}</p>
              <ol className="mt-2 list-decimal pl-5 text-xs text-ink-700">{d.contrato.condiciones.map((c) => <li key={c} className="mt-1">{c}</li>)}</ol>
              <div className="mt-3 flex gap-2 text-xs"><Badge tono={d.firmas.OFERTANTE ? "verde" : "gris"}>Firma ofertante {d.firmas.OFERTANTE ? "✓" : "—"}</Badge><Badge tono={d.firmas.RECEPTOR ? "verde" : "gris"}>Firma receptor {d.firmas.RECEPTOR ? "✓" : "—"}</Badge></div>
              {d.fotoEntregaUrl && (/* eslint-disable-next-line @next/next/no-img-element */ <img src={d.fotoEntregaUrl} alt="Foto de entrega" className="mt-3 h-32 w-full rounded-control object-cover" />)}
            </Card>
          )}

          {d.calificaciones.length > 0 && (
            <Card>
              <h2 className="font-semibold">Calificaciones</h2>
              <ul className="mt-2 flex flex-col gap-2 text-sm">
                {d.calificaciones.map((c) => (
                  <li key={c.autorId} className="rounded-control bg-surface-2 p-2.5"><div className="text-ambar-500">{"★".repeat(c.estrellas)}<span className="text-ink-300">{"★".repeat(5 - c.estrellas)}</span> <span className="text-xs text-ink-500">{c.autorId === d.ofertante.id ? d.ofertante.razonSocial : d.receptor.razonSocial}</span></div>{c.comentario && <p className="mt-0.5 text-ink-700">{c.comentario}</p>}</li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

/** Contacto de la otra empresa: solo existe tras aceptar el acuerdo; antes, un candado. */
function BloqueContacto({ contacto, otra }: { contacto: ContactoContraparte | null; otra: string }) {
  if (!contacto) {
    return (
      <Card>
        <h2 className="font-semibold">Contacto</h2>
        <p className="mt-2 flex items-center gap-2 text-sm text-ink-700"><Icono nombre="candado" size={18} className="shrink-0 text-ink-500" />El contacto se habilita al aceptar el acuerdo</p>
        <p className="mt-1 text-xs text-ink-500">Mientras tanto, la conversación y las ofertas ocurren aquí, dentro de la plataforma.</p>
      </Card>
    );
  }
  const wa = contacto.whatsappUrl && /^https:\/\/wa\.me\//.test(contacto.whatsappUrl) ? contacto.whatsappUrl : null;
  return (
    <Card>
      <h2 className="font-semibold">Contacto</h2>
      <p className="mt-0.5 text-xs text-ink-500">Datos de {otra} para coordinar el recojo y la entrega.</p>
      <dl className="mt-3 text-sm">
        <div className="flex justify-between gap-3 border-b border-line py-1.5"><dt className="text-ink-500">Persona de contacto</dt><dd className="text-right font-medium">{contacto.nombre ?? "No registrada"}</dd></div>
        <div className="flex justify-between gap-3 py-1.5"><dt className="text-ink-500">Teléfono</dt><dd className="num text-right font-medium">{contacto.telefono ?? "No registrado"}</dd></div>
      </dl>
      {wa ? (
        <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-control bg-pri-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pri-700 sm:w-auto">
          <Icono nombre="telefono" size={16} />Escribir por WhatsApp
        </a>
      ) : (
        <p className="mt-3 text-xs text-ink-500">Esta empresa aún no registró un teléfono. Sigue la conversación por el chat de la plataforma.</p>
      )}
    </Card>
  );
}

function FormTerminos({ d, unidad, busy, onSubmit }: { d: Detalle; unidad: string; busy: boolean; onSubmit: (v: Record<string, unknown>) => void }) {
  const t = d.terminos;
  const [cantidad, setCantidad] = useState(String(t?.cantidad ?? d.cantidad));
  const [precio, setPrecio] = useState(String(t?.precioAcordado ?? d.precioAcordado ?? ""));
  const [fechaR, setFechaR] = useState(t?.fechaRecojo?.slice(0, 10) ?? mañana());
  const [resp, setResp] = useState(t?.responsableRecojo ?? "");
  const [conCred, setConCred] = useState(!!t?.pagarComisionConCreditos);
  const [loteIntercambioId, setLoteIntercambioId] = useState(t?.loteIntercambioId ?? d.loteIntercambio?.id ?? "");
  const [misLotes, setMisLotes] = useState<{ id: string; titulo: string }[] | null>(null);
  const esIntercambio = d.modalidad === "INTERCAMBIO";
  useEffect(() => {
    if (esIntercambio && d.rol === "RECEPTOR") api<{ id: string; titulo: string; estado: string }[]>("/lotes?mios=1").then((ls) => setMisLotes(ls.filter((l) => l.estado === "PUBLICADO")));
  }, [esIntercambio, d.rol]);
  return (
    <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={(e) => {
      e.preventDefault();
      onSubmit({
        cantidad: Number(cantidad),
        precioAcordado: ["DONACION", "INTERCAMBIO"].includes(d.modalidad) ? undefined : Number(precio),
        fechaRecojo: fechaR ? new Date(`${fechaR}T12:00:00`).toISOString() : undefined,
        responsableRecojo: resp || undefined,
        pagarComisionConCreditos: d.rol === "OFERTANTE" && d.modalidad === "VENTA" ? conCred : undefined,
        loteIntercambioId: esIntercambio ? loteIntercambioId || undefined : undefined,
      });
    }}>
      <Field label={`Cantidad (${ETIQUETA_UNIDAD[d.lote.unidad as "ton" | "kg" | "und"].corta}) — máx. ${num(d.lote.cantidadDisponible, 1)}`}><input required type="number" step={d.lote.unidad === "ton" ? 0.1 : 1} min={d.lote.unidad === "ton" ? 0.1 : 1} max={d.lote.cantidadDisponible} value={cantidad} onChange={(e) => setCantidad(e.target.value)} className={inputCls} /></Field>
      {!["DONACION", "INTERCAMBIO"].includes(d.modalidad) && <Field label={`Precio por tonelada (${unidad})`}><input required type="number" step="1" min="1" value={precio} onChange={(e) => setPrecio(e.target.value)} className={inputCls} /></Field>}
      {esIntercambio && d.rol === "RECEPTOR" && (
        <Field label="Lote que ofreces a cambio" hint={d.lote.notaIntercambio ? `El publicador busca: ${d.lote.notaIntercambio}` : undefined}>
          <select required value={loteIntercambioId} onChange={(e) => setLoteIntercambioId(e.target.value)} className={inputCls}>
            <option value="">Selecciona uno de tus lotes…</option>
            {(misLotes ?? []).map((l) => <option key={l.id} value={l.id}>{l.titulo}</option>)}
          </select>
        </Field>
      )}
      {esIntercambio && d.rol === "OFERTANTE" && (
        <Field label="Lote ofrecido a cambio"><p className="mt-1 text-sm text-ink-700">{d.loteIntercambio ? d.loteIntercambio.titulo : "Aún no lo propone el receptor"}</p></Field>
      )}
      <Field label="Fecha de recojo"><input type="date" value={fechaR} onChange={(e) => setFechaR(e.target.value)} className={inputCls} /></Field>
      <Field label="Responsable de recojo"><input value={resp} onChange={(e) => setResp(e.target.value)} placeholder="Quién recoge o entrega" className={inputCls} /></Field>
      {d.rol === "OFERTANTE" && d.modalidad === "VENTA" && <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={conCred} onChange={(e) => setConCred(e.target.checked)} /> Pagar la comisión de la plataforma con mis créditos circulares</label>}
      <div className="sm:col-span-2"><Btn variante={t ? "borde" : "primario"} disabled={busy}>{t ? "Enviar contrapropuesta" : "Proponer términos"}</Btn></div>
    </form>
  );
}

function FormRecojo({ busy, onSubmit, inicial, entrega, conPersona }: { entrega?: string; conPersona: boolean; busy: boolean; onSubmit: (v: { fechaRecojo: string; responsableRecojo: string }) => void; inicial: { fecha: string; resp: string } }) {
  const [f, setF] = useState(inicial.fecha);
  const [r, setR] = useState(inicial.resp);
  return (
    <Card>
      <h2 className="font-semibold">Confirmar recojo</h2>
      <p className="mt-1 text-sm text-ink-700">Fija fecha y responsable para coordinar la entrega.</p>
      {entrega && <p className="mt-2 text-xs text-ink-700"><b>Según el lote:</b> {ENTREGA[entrega]?.etiqueta}. {ENTREGA[entrega]?.ayuda}</p>}
      {conPersona && <p className="mt-2 rounded-control bg-ambar-50 p-2 text-xs text-ambar-800">Entre personas: encuéntrense en un lugar público y concurrido, de día, y revisen el artículo antes de firmar. No hagas pagos fuera de la plataforma: el pago en garantía te protege.</p>}
      <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); onSubmit({ fechaRecojo: new Date(`${f}T12:00:00`).toISOString(), responsableRecojo: r }); }}>
        <Field label="Fecha"><input required type="date" value={f} onChange={(e) => setF(e.target.value)} className={inputCls} /></Field>
        <Field label="Responsable"><input required minLength={2} value={r} onChange={(e) => setR(e.target.value)} placeholder="Nombre o transportista" className={inputCls} /></Field>
        <div className="sm:col-span-2"><Btn disabled={busy}>Confirmar recojo</Btn></div>
      </form>
    </Card>
  );
}

function FirmaEntrega({ d, busy, puede, onFirmar }: { d: Detalle; busy: boolean; puede: boolean; onFirmar: (uso: string, foto?: File) => void }) {
  const [uso, setUso] = useState("");
  const [foto, setFoto] = useState<File | undefined>();
  return (
    <Card>
      <h2 className="font-semibold">Entrega y firma digital</h2>
      <p className="mt-1 text-sm text-ink-700">Cuando el material se entrega, ambas partes firman. Al completarse se libera el pago (o se acreditan créditos) y se emite el certificado.</p>
      <div className="mt-2 flex gap-2 text-xs"><Badge tono={d.firmas.OFERTANTE ? "verde" : "gris"}>Ofertante {d.firmas.OFERTANTE ? "firmó ✓" : "pendiente"}</Badge><Badge tono={d.firmas.RECEPTOR ? "verde" : "gris"}>Receptor {d.firmas.RECEPTOR ? "firmó ✓" : "pendiente"}</Badge></div>
      {puede && (
        <div className="mt-3 flex flex-col gap-3">
          {d.rol === "RECEPTOR" && (
            <>
              <Field label="Uso final declarado del material" hint="Aparecerá en el certificado de destino final."><input value={uso} onChange={(e) => setUso(e.target.value)} placeholder="Ej. Compostaje industrial y biofertilizante" className={inputCls} /></Field>
              <Field label="Foto de la entrega (opcional)"><input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0])} className="text-sm" /></Field>
            </>
          )}
          <Btn disabled={busy} onClick={() => onFirmar(uso, foto)}>Firmar entrega</Btn>
        </div>
      )}
    </Card>
  );
}

function Calificar({ otra, busy, onSubmit }: { otra: string; busy: boolean; onSubmit: (v: { estrellas: number; comentario?: string }) => void }) {
  const [n, setN] = useState(5);
  const [c, setC] = useState("");
  return (
    <Card>
      <h2 className="font-semibold">Califica a {otra}</h2>
      <div className="mt-2 flex gap-1 text-3xl">
        {[1, 2, 3, 4, 5].map((i) => <button key={i} type="button" onClick={() => setN(i)} aria-label={`${i} estrellas`} className={i <= n ? "text-ambar-500" : "text-ink-300"}>★</button>)}
      </div>
      <textarea value={c} onChange={(e) => setC(e.target.value)} rows={2} maxLength={500} placeholder="Comentario breve (opcional)" className={`${inputCls} mt-2`} />
      <Btn className="mt-2" disabled={busy} onClick={() => onSubmit({ estrellas: n, comentario: c || undefined })}>Enviar calificación</Btn>
    </Card>
  );
}

function Acciones({ busy, cancelar, incidencia, onCancelar, onIncidencia }: { busy: boolean; cancelar: boolean; incidencia: boolean; onCancelar: (m?: string) => void; onIncidencia: (v: { tipo: string; detalle: string }) => void }) {
  const [modo, setModo] = useState<"" | "cancelar" | "incidencia">("");
  const [motivo, setMotivo] = useState("");
  const [tipo, setTipo] = useState("MATERIAL_NO_CORRESPONDE");
  return (
    <Card>
      <div className="flex flex-wrap gap-2">
        {cancelar && <Btn variante="peligro" onClick={() => setModo(modo === "cancelar" ? "" : "cancelar")}>Cancelar transacción</Btn>}
        {incidencia && <Btn variante="borde" onClick={() => setModo(modo === "incidencia" ? "" : "incidencia")}>Reportar un problema</Btn>}
      </div>
      {modo === "cancelar" && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-sm text-ink-700">Se liberará la reserva del lote y, si hubo pago retenido, se reembolsará.</p>
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo (opcional)" className={inputCls} />
          <div><Btn variante="peligro" disabled={busy} onClick={() => { onCancelar(motivo || undefined); setModo(""); }}>Sí, cancelar</Btn></div>
        </div>
      )}
      {modo === "incidencia" && (
        <div className="mt-3 flex flex-col gap-2">
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputCls}>
            <option value="MATERIAL_NO_CORRESPONDE">El material no corresponde a lo publicado</option>
            <option value="NO_SE_PRESENTO">La otra parte no se presentó al recojo</option>
            <option value="PRECIO_DISTINTO">Precio distinto al acordado</option>
            <option value="OTRO">Otro</option>
          </select>
          <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} placeholder="Describe lo ocurrido (solo lo ve el equipo de moderación)" className={inputCls} />
          <div><Btn disabled={busy || motivo.trim().length < 5} onClick={() => { onIncidencia({ tipo, detalle: motivo }); setModo(""); setMotivo(""); }}>Enviar a moderación</Btn></div>
        </div>
      )}
    </Card>
  );
}
