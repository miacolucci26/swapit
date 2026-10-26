"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { buscarResiduos, formatoCantidad, formatoMasa, nombreTipoDestino, residuoPorId } from "@swapit/shared";
import { AvisoEjemplo, Badge, Btn, Card, Cargando, EstadoMaterialBadge, Field, inputCls, PuntoCategoria, RangoPrecio, SemaforoPrecio } from "@/components/ui";
import { SECTOR_CORTO } from "@/components/LoteCard";
import { EscaleraVidas, nombreCorto } from "@/components/vis/EscaleraVidas";
import { Icono } from "@/components/vis/Iconos";
import { api, ApiError } from "@/lib/api";
import { corto, enlaceWhatsapp, fecha, precioUnidad, VIA_REPORTE } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { Destino, DestinosSugeridos, Material, PosicionPrecio, Rango } from "@/lib/types";

const posicion = (precio: number, r: Rango | null | undefined): PosicionPrecio | null => (!r ? null : precio < r.p25 ? "DEBAJO" : precio > r.p75 ? "ENCIMA" : "DENTRO");
const CONFIANZA = { ALTA: ["verde", "Confianza alta"], MEDIA: ["ambar", "Confianza media"], BAJA: ["rojo", "Confianza baja"], NINGUNA: ["gris", "Sin datos"] } as const;

const PASOS = ["Reportado", "Cotizado", "Acopiado", "Despachado", "Certificado"] as const;
const CLAVES = ["REPORTADO", "COTIZADO", "ACOPIADO", "DESPACHADO"];

/** Avance en 5 pasos: lo hecho en navy, lo que sigue en verde, lo pendiente en gris. El certificado es el paso final. */
function PasosAvance({ estado, certificado }: { estado: string; certificado: boolean }) {
  const rechazado = estado === "RECHAZADO";
  const idx = CLAVES.indexOf(estado);
  const hechos = rechazado ? 0 : certificado ? 5 : idx + 1;
  return (
    <ol className="grid grid-cols-5 gap-2" aria-label="Avance del material">
      {PASOS.map((nombre, i) => {
        const hecho = i < hechos;
        const siguiente = !rechazado && i === hechos;
        return (
          <li key={nombre} aria-current={siguiente ? "step" : undefined}>
            <span className={`block h-1.5 rounded-sm ${hecho ? "bg-nav-700" : siguiente ? "bg-pri-600" : "bg-ink-100"}`} />
            <span className={`mt-1.5 flex items-center gap-1 text-xs leading-tight ${hecho ? "font-medium text-nav-800" : siguiente ? "font-semibold text-pri-700" : "text-ink-500"}`}>
              <span className="num">{i + 1}.</span><span className="truncate">{nombre}</span>
            </span>
            <span className="sr-only">{hecho ? "(hecho)" : siguiente ? "(siguiente)" : "(pendiente)"}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Búsqueda del residuo de la base de cadenas para vincularlo (o corregirlo) en el material. */
function SelectorResiduo({ texto, onElegir, busy }: { texto: string; onElegir: (ref: string) => void; busy: boolean }) {
  const [q, setQ] = useState("");
  const hallados = useMemo(() => buscarResiduos(q.trim().length >= 2 ? q : texto, q.trim().length >= 2 ? 6 : 3), [q, texto]);
  return (
    <div>
      <label className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-ink-700">Buscar residuo</span>
        <span className="relative">
          <Icono nombre="buscar" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ej. cáscara de mango" className={`${inputCls} pl-10`} />
        </span>
      </label>
      {hallados.length > 0 ? (
        <>
          {q.trim().length < 2 && <p className="mt-2 text-sm font-medium text-ink-700">¿Es alguno de estos?</p>}
          <ul className="mt-2 flex flex-col gap-1.5">
            {hallados.map((h) => (
              <li key={h.residuo.id}>
                <button type="button" disabled={busy} onClick={() => onElegir(h.residuo.id)} className="flex min-h-12 w-full items-center gap-3 rounded-control border border-line bg-white px-3 py-2 text-left transition hover:border-nav-600 disabled:opacity-50">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink-900">{nombreCorto(h.residuo.nombre)}</span>
                    <span className="block truncate text-xs text-ink-500">{h.cadena.nombre}</span>
                  </span>
                  <Icono nombre="check" size={18} className="shrink-0 text-nav-700" />
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        q.trim().length >= 2 && <p className="mt-2 text-sm text-ink-500">Sin resultados. Prueba otra palabra.</p>
      )}
    </div>
  );
}

/** «Vidas y destinos»: qué se puede hacer con el residuo, a quién llamar y cómo corregir la clasificación. */
function TarjetaVidas({ m, sug, onElegir, busy, empresa }: { m: Material; sug: DestinosSugeridos | null; onElegir: (ref: string | null) => void; busy: boolean; empresa: string }) {
  const hallado = m.residuoRef ? residuoPorId(m.residuoRef) : undefined;
  const texto = `${m.titulo} ${m.descripcion}`;

  if (!hallado) {
    return (
      <Card>
        <h2 className="text-base font-semibold text-nav-900">¿Qué residuo es?</h2>
        <p className="mt-1 text-sm text-ink-700">Vincúlalo y verás sus usos y a quién llamar.</p>
        <div className="mt-3"><SelectorResiduo texto={texto} onElegir={onElegir} busy={busy} /></div>
      </Card>
    );
  }

  const nombre = nombreCorto(hallado.residuo.nombre);
  const tipos = [...(sug?.tipos ?? [])].sort((a, b) => b.destinos.length - a.destinos.length);
  const mensaje = (d: { nombre: string }) => `Hola, soy de ${empresa}. Tengo ${formatoCantidad(m.cantidad, m.unidad)} de ${nombre.toLowerCase()}${m.precioOfrecido != null ? ` (referencia ${precioUnidad(m.precioOfrecido, m.unidad)})` : ""}. ¿Les interesa, ${d.nombre}?`;

  const tipoItem = (t: NonNullable<typeof sug>["tipos"][number]) => {
    return (
              <li key={t.destino} className="rounded-control border border-line bg-surface-2/60 p-3">
                <p className="text-sm font-semibold text-nav-900">{nombreTipoDestino(t.destino, true)}</p>
                {t.destinos.length > 0 ? (
                  <ul className="mt-2 flex flex-col gap-2">
                    {t.destinos.map((d) => {
                      const wa = enlaceWhatsapp(d.telefono, mensaje(d));
                      return (
                        <li key={d.id} className="flex items-center gap-2 rounded-control border border-line bg-white px-3 py-2">
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 block text-sm font-medium leading-snug text-ink-900">{d.nombre}</span>
                            {d.zona && <span className="block truncate text-xs text-ink-500">{d.zona}</span>}
                          </span>
                          {wa && (
                            <a href={wa} target="_blank" rel="noreferrer" aria-label={`WhatsApp a ${d.nombre}`} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-control border border-ink-300 bg-white px-3 text-sm font-semibold text-ink-900 hover:border-nav-600 hover:bg-surface-2">
                              <Icono nombre="whatsapp" size={18} /><span className="hidden sm:inline">WhatsApp</span>
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-sm text-ink-500">Sin destino guardado.</span>
                    <Link href={`/destinos?nuevo=${t.destino}`} className="inline-flex min-h-10 items-center text-sm font-semibold text-nav-700 hover:underline">Agregar destino</Link>
                  </div>
                )}
              </li>
    );
  };


  return (
    <Card>
      <div className="min-w-0">
        <h2 className="text-base font-semibold leading-tight text-nav-900">Vidas y destinos</h2>
        <p className="truncate text-sm text-ink-500">{nombre} · {hallado.cadena.nombre}</p>
      </div>

      <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-500">A quién llamar</h3>
      {sug === null ? (
        <p className="mt-2 text-sm text-ink-500">Cargando…</p>
      ) : tipos.length === 0 ? (
        <p className="mt-2 text-sm text-ink-500">Sin compradores indicados.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {tipos.slice(0, 3).map(tipoItem)}
        </ul>
      )}
      {tipos.length > 3 && (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-nav-700 [&::-webkit-details-marker]:hidden">
            <Icono nombre="flecha" size={16} className="transition-transform group-open:rotate-90" />Ver {tipos.length - 3} más
          </summary>
          <ul className="flex flex-col gap-2">{tipos.slice(3).map(tipoItem)}</ul>
        </details>
      )}

      <details className="group mt-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-nav-700 [&::-webkit-details-marker]:hidden">
          <Icono nombre="flecha" size={16} className="transition-transform group-open:rotate-90" />Ver los {hallado.residuo.vidas.length} usos
        </summary>
        <EscaleraVidas residuo={hallado.residuo} modoMype abiertaInicial={null} className="mt-2" />
      </details>

      <details className="group mt-1">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-nav-700 [&::-webkit-details-marker]:hidden">
          <Icono nombre="flecha" size={16} className="transition-transform group-open:rotate-90" />Corregir residuo
        </summary>
        <div className="mt-2 flex flex-col gap-3">
          <SelectorResiduo texto={texto} onElegir={onElegir} busy={busy} />
          <Btn type="button" variante="borde" disabled={busy} onClick={() => onElegir(null)}>Quitar vínculo</Btn>
        </div>
      </details>
    </Card>
  );
}

export default function DetalleMaterial() {
  const { id } = useParams<{ id: string }>();
  const { user } = useSession();
  const [m, setM] = useState<Material | null>(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [busy, setBusy] = useState(false);
  const [oferta, setOferta] = useState("");
  const [cantAco, setCantAco] = useState("");
  const [precioFinal, setPrecioFinal] = useState("");
  const [cliente, setCliente] = useState("");
  const [clienteRuc, setClienteRuc] = useState("");
  const [destinoSel, setDestinoSel] = useState<string | null>(null);
  const [destinos, setDestinos] = useState<Destino[] | null>(null);
  const [sug, setSug] = useState<DestinosSugeridos | null>(null);
  const [uso, setUso] = useState("");

  const cargar = useCallback(async () => {
    const x = await api<Material>(`/material/${id}`);
    setM(x);
    setOferta((o) => o || (x.precioOfrecido != null ? String(x.precioOfrecido) : ""));
    setCantAco((c) => c || String(x.cantidad));
    setPrecioFinal((p) => p || (x.precioOfrecido != null ? String(x.precioOfrecido) : ""));
  }, [id]);
  useEffect(() => {
    cargar().catch(() => setError("No se encontró este material."));
  }, [cargar]);

  const estado = m?.estado;
  const residuoRef = m?.residuoRef ?? null;
  // Destinos del directorio: para el selector de despacho.
  useEffect(() => {
    if (estado !== "ACOPIADO") return;
    api<Destino[]>("/destinos?activo=true").then(setDestinos).catch(() => setDestinos([]));
  }, [estado]);
  // «A quién llamar»: destinos de tu directorio que reciben este residuo.
  useEffect(() => {
    setSug(null);
    if (!residuoRef) return;
    let vivo = true;
    api<DestinosSugeridos>(`/destinos/sugeridos?residuoRef=${encodeURIComponent(residuoRef)}`)
      .then((s) => vivo && setSug(s))
      .catch(() => vivo && setSug({ residuo: { id: residuoRef, nombre: "" }, tipos: [] }));
    return () => {
      vivo = false;
    };
  }, [residuoRef]);

  async function accion(fn: () => Promise<unknown>, ok: string) {
    setError("");
    setAviso("");
    setBusy(true);
    try {
      await fn();
      await cargar();
      setAviso(ok);
    } catch (e) {
      setError(e instanceof ApiError ? (e.errores?.map((x) => x.mensaje).join(", ") ?? e.message) : "Error de conexión");
    } finally {
      setBusy(false);
    }
  }

  if (error && !m) return <p className="rounded-card bg-error-tint p-4 text-error-ink">{error} <Link href="/material" className="font-semibold underline">Volver</Link></p>;
  if (!m) return <Cargando />;
  const b = m.benchmark;
  const u = m.unidad;
  const porU = u === "kg" ? "kilo" : "tonelada";
  const abierto = m.estado === "REPORTADO" || m.estado === "COTIZADO";
  const posOferta = oferta ? posicion(Number(oferta), b?.rango) : null;
  const via = VIA_REPORTE[m.reportadoVia ?? ""];
  const wa = enlaceWhatsapp(m.telefono, `Hola ${m.contactoNombre?.split(" ")[0] ?? ""}, sobre tu reporte «${m.titulo}»: `);
  const elegirResiduo = (ref: string | null) => accion(() => api(`/material/${id}`, { method: "PATCH", json: { residuoRef: ref } }), ref ? "Residuo vinculado." : "Vínculo quitado.");

  // Despacho: primero los destinos que reciben este residuo, luego el resto del directorio.
  const idsSug = new Set((sug?.tipos ?? []).flatMap((t) => t.destinos.map((d) => d.id)));
  const lista = destinos ?? [];
  const primerSug = lista.find((d) => idsSug.has(d.id))?.id;
  const sel = destinoSel ?? primerSug ?? (destinos && lista.length === 0 ? "otro" : "");
  const libre = sel === "otro";

  const cotizarForm = (primario: boolean) => (
    <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); accion(() => api(`/material/${id}/cotizar`, { method: "POST", json: { precioOfrecido: Number(oferta) } }), "Cotización enviada."); }}>
      <Field label={`Tu oferta (S/ por ${porU})`}>
        <input required type="number" min="0.01" step="0.01" value={oferta} onChange={(e) => setOferta(e.target.value)} className={inputCls} />
      </Field>
      {posOferta && <div className="text-sm"><SemaforoPrecio pos={posOferta} /></div>}
      <div className="flex flex-wrap gap-2">
        <Btn variante={primario ? "primario" : "borde"} disabled={busy || !oferta}>{m.estado === "REPORTADO" ? "Cotizar" : "Actualizar"}</Btn>
        {b?.rango && <Btn type="button" variante="borde" onClick={() => setOferta(String(b.rango!.p50))}>Usar precio típico ({precioUnidad(b.rango.p50, u)})</Btn>}
      </div>
    </form>
  );

  return (
    <>
      <Link href="/material" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-nav-700 hover:underline"><Icono nombre="flecha" size={16} className="rotate-180" />Material</Link>

      <div className="mt-1 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold leading-tight tracking-tight text-nav-900 md:text-[26px]">{m.titulo}</h1>
            <EstadoMaterialBadge estado={m.estado} etiqueta={m.etiquetaEstado} />
          </div>
          <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-700">
            <li>{m.proveedor}</li>
            <li className="num font-semibold text-ink-900">{formatoCantidad(m.cantidad, u)}</li>
            <li><PuntoCategoria codigo={m.categoriaCodigo} etiqueta={corto(m.categoriaNombre)} className="text-sm" /></li>
            {m.sector && <li>{SECTOR_CORTO[m.sector] ?? m.sector}</li>}
            <li className="text-ink-500">{via?.etiqueta} · {fecha(m.createdAt)}</li>
          </ul>
        </div>
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" aria-label="Escribirle por WhatsApp" className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-control border border-ink-300 bg-white px-3 text-sm font-semibold text-ink-900 hover:border-nav-600 hover:bg-surface-2">
            <Icono nombre="whatsapp" size={18} /><span className="hidden sm:inline">WhatsApp</span>
          </a>
        )}
      </div>

      <Card className="mt-4"><PasosAvance estado={m.estado} certificado={!!m.certificado} /></Card>

      {aviso && <p role="status" className="mt-3 flex items-center gap-2 rounded-control bg-pri-50 px-3 py-2 text-sm font-medium text-pri-800"><Icono nombre="check" size={16} />{aviso}</p>}
      {error && <p role="alert" className="mt-3 flex items-center gap-2 rounded-control bg-error-tint px-3 py-2 text-sm text-error-ink"><Icono nombre="alerta" size={18} className="shrink-0" /><span>{error} {error.includes("suscripción") && <Link href="/facturacion" className="font-semibold underline">Ir a Facturación</Link>}</span></p>}
      {m.iaSugerencia?.requiereRevision && (
        <p className="mt-3 flex items-center gap-2 rounded-control border border-ambar-200 bg-ambar-50 px-3 py-2 text-sm font-medium text-ambar-800"><Icono nombre="info" size={16} className="shrink-0" />¿PET, PEAD o film? Confírmalo: cambia el precio.</p>
      )}

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Columna de acción: lo siguiente va arriba y destacado */}
        <div className="contents lg:order-2 lg:flex lg:flex-col lg:gap-4">
          <div className="order-1 flex flex-col gap-4">
          {m.estado === "REPORTADO" && (
            <Card className="border! border-pri-600!">
              <p className="text-xs font-semibold uppercase tracking-wide text-pri-700">Siguiente paso</p>
              <h2 className="mt-0.5 text-lg font-semibold text-nav-900">Cotizar</h2>
              <div className="mt-3">{cotizarForm(true)}</div>
              <button className="mt-3 min-h-11 text-sm font-semibold text-ink-500 hover:text-error-ink hover:underline" onClick={() => { if (window.confirm("¿Rechazar este reporte?")) accion(() => api(`/material/${id}/rechazar`, { method: "POST" }), "Reporte rechazado."); }}>Rechazar este reporte</button>
            </Card>
          )}

          {m.estado === "COTIZADO" && (
            <>
              <Card className="border! border-pri-600! bg-pri-50!">
                <p className="inline-flex items-center gap-1.5 rounded-md bg-pri-600 px-3 py-0.5 text-xs font-bold text-white"><Icono nombre="flecha" size={14} />Siguiente</p>
                <h2 className="mt-0.5 text-lg font-semibold text-nav-900">Registrar acopio</h2>
                <form className="mt-3 flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); accion(() => api(`/material/${id}/acopiar`, { method: "POST", json: { cantidadAcopiada: Number(cantAco), precioFinal: precioFinal ? Number(precioFinal) : undefined } }), "Acopio registrado."); }}>
                  <Field label={`Cantidad recogida (${u === "kg" ? "kg" : "t"})`}><input required type="number" min="0.01" step="0.01" value={cantAco} onChange={(e) => setCantAco(e.target.value)} className={inputCls} /></Field>
                  <Field label={`Precio pagado (S/ por ${porU})`}><input type="number" min="0" step="0.01" value={precioFinal} onChange={(e) => setPrecioFinal(e.target.value)} className={inputCls} /></Field>
                  <Btn disabled={busy}>Registrar acopio</Btn>
                </form>
              </Card>
              <Card>
                <details className="group">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-base font-semibold text-nav-800 [&::-webkit-details-marker]:hidden">
                    <Icono nombre="flecha" size={16} className="transition-transform group-open:rotate-90" />Cambiar cotización
                  </summary>
                  <div className="mt-2">{cotizarForm(false)}</div>
                </details>
                <button className="mt-2 min-h-11 text-sm font-semibold text-ink-500 hover:text-error-ink hover:underline" onClick={() => { if (window.confirm("¿Rechazar este reporte?")) accion(() => api(`/material/${id}/rechazar`, { method: "POST" }), "Reporte rechazado."); }}>Rechazar este reporte</button>
              </Card>
            </>
          )}

          {m.estado === "ACOPIADO" && (
            <Card className="border! border-pri-600!">
              <p className="text-xs font-semibold uppercase tracking-wide text-pri-700">Siguiente paso</p>
              <h2 className="mt-0.5 text-lg font-semibold text-nav-900">Despachar</h2>
              <form
                className="mt-3 flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const json = libre ? { clienteDestino: cliente, clienteDestinoRuc: clienteRuc || undefined } : { destinoId: sel };
                  accion(() => api(`/material/${id}/despachar`, { method: "POST", json }), "Despacho registrado. Ya puedes certificar.");
                }}
              >
                <Field label="¿A quién?">
                  <select required value={sel} onChange={(e) => setDestinoSel(e.target.value)} className={inputCls}>
                    <option value="">Elige un destino…</option>
                    {lista.some((d) => idsSug.has(d.id)) && (
                      <optgroup label="Recomendados para este residuo">
                        {lista.filter((d) => idsSug.has(d.id)).map((d) => <option key={d.id} value={d.id}>{d.nombre}{d.zona ? ` · ${d.zona}` : ""}</option>)}
                      </optgroup>
                    )}
                    {lista.some((d) => !idsSug.has(d.id)) && (
                      <optgroup label={idsSug.size ? "Otros destinos" : "Tus destinos"}>
                        {lista.filter((d) => !idsSug.has(d.id)).map((d) => <option key={d.id} value={d.id}>{d.nombre}{d.zona ? ` · ${d.zona}` : ""}</option>)}
                      </optgroup>
                    )}
                    <option value="otro">Otro cliente (escribir)</option>
                  </select>
                </Field>
                {destinos && lista.length === 0 && (
                  <p className="flex flex-wrap items-center gap-x-2 text-sm text-ink-700">Aún no tienes destinos. <Link href="/destinos" className="inline-flex min-h-11 items-center font-semibold text-nav-700 underline">Agregar destino</Link></p>
                )}
                {libre && (
                  <>
                    <Field label="Cliente"><input required minLength={2} value={cliente} onChange={(e) => setCliente(e.target.value)} className={inputCls} placeholder="Ej. Recicladora Andina SAC" /></Field>
                    <Field label="RUC del cliente" hint="Opcional."><input inputMode="numeric" maxLength={11} value={clienteRuc} onChange={(e) => setClienteRuc(e.target.value)} className={inputCls} /></Field>
                  </>
                )}
                <Btn disabled={busy || !sel}>Despachar</Btn>
              </form>
            </Card>
          )}

          {m.estado === "DESPACHADO" && (
            <Card className="border! border-pri-600!">
              {!m.certificado && <p className="text-xs font-semibold uppercase tracking-wide text-pri-700">Último paso</p>}
              <h2 className="mt-0.5 text-lg font-semibold text-nav-900">Certificado</h2>
              <p className="mt-1 text-sm text-ink-700">Entregado a <b>{m.destinoNombre ?? m.clienteDestino}</b>{m.clienteDestinoRuc ? ` · RUC ${m.clienteDestinoRuc}` : ""} · {fecha(m.despachadoAt)}</p>
              {m.certificado ? (
                <div className="mt-3 flex flex-col gap-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-pri-700"><Icono nombre="check" size={18} />Emitido · <span className="num">{m.certificado}</span></p>
                  <div className="flex flex-wrap gap-2">
                    <a href={`/api/verificar/${m.certificado}/pdf`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-control bg-pri-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pri-700"><Icono nombre="descargar" size={16} />Descargar PDF</a>
                    <Link href={`/verificar/${m.certificado}`} target="_blank" className="inline-flex min-h-10 items-center gap-2 rounded-control border border-ink-300 bg-white px-4 py-2 text-sm font-semibold text-ink-900 hover:border-nav-600 hover:bg-surface-2">Ver verificación</Link>
                  </div>
                </div>
              ) : (
                <form className="mt-3 flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); accion(() => api(`/material/${id}/certificado`, { method: "POST", json: { usoFinal: uso || undefined } }), "Certificado emitido."); }}>
                  <Field label="Uso final" hint="Opcional. Si lo dejas vacío, usamos el típico."><input value={uso} onChange={(e) => setUso(e.target.value)} className={inputCls} placeholder="Ej. Reciclaje mecánico en hojuela" /></Field>
                  <Btn disabled={busy}>Emitir certificado</Btn>
                  <p className="text-xs text-ink-700">Con tu logo y un QR verificable. Costo por certificado (simulado).</p>
                </form>
              )}
            </Card>
          )}

          {m.estado === "RECHAZADO" && <Card><p className="text-sm font-medium text-ink-700">Reporte rechazado.</p></Card>}

          </div>

          <div className="order-3"><TarjetaVidas m={m} sug={sug} onElegir={elegirResiduo} busy={busy} empresa={user?.empresa.razonSocial ?? "Swapit"} /></div>
        </div>

        {/* Columna de información */}
        <div className="contents lg:order-1 lg:flex lg:flex-col lg:gap-4">
          <Card className="order-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-nav-900">Precio de referencia</h2>
              {b && (b.esSemilla ? <Badge tono="ambar">Ejemplo · {b.n} parecidos</Badge> : <Badge tono={CONFIANZA[b.confianza][0]}>{CONFIANZA[b.confianza][1]} · {b.n}</Badge>)}
            </div>
            {abierto && b ? (
              <>
                <p className="mt-1 text-sm text-ink-500">{corto(b.categoria.nombre)} · por {porU}</p>
                <RangoPrecio
                  rango={b.rango}
                  formato={(n) => precioUnidad(n, u)}
                  esSemilla={b.esSemilla}
                  orientativo={b.rangoOrientativo}
                  marcadores={[
                    { etiqueta: "Pide", valor: m.precioEsperado, color: "#8a5a00" },
                    { etiqueta: "Ofreces", valor: m.precioOfrecido, color: "#1f3a64" },
                  ]}
                />
                <div className="mt-3 flex flex-col gap-2 text-base">
                  {m.precioEsperado != null && <span className="flex flex-wrap items-center gap-2">Pide <b className="num">{precioUnidad(m.precioEsperado, u)}</b> <SemaforoPrecio pos={m.veredictos?.esperado} corto /></span>}
                  {m.precioOfrecido != null && <span className="flex flex-wrap items-center gap-2">Ofreces <b className="num">{precioUnidad(m.precioOfrecido, u)}</b> <SemaforoPrecio pos={m.veredictos?.ofrecido} corto /></span>}
                </div>
                {(b.esSemilla || b.nota) && (
                  <details className="group mt-2">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-nav-700 [&::-webkit-details-marker]:hidden"><Icono nombre="info" size={16} />{b.esSemilla ? "Rango de ejemplo: ver aviso" : "Ver nota"}</summary>
                    <div className="mt-1 flex flex-col gap-2">
                      {b.esSemilla && <AvisoEjemplo />}
                      <p className="text-sm text-ink-700">{b.nota}</p>
                    </div>
                  </details>
                )}
                {b.comparables.length > 0 && (
                  <details className="group mt-1">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-nav-700 [&::-webkit-details-marker]:hidden"><Icono nombre="flecha" size={16} className="transition-transform group-open:rotate-90" />Ver {b.comparables.length} precios parecidos</summary>
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="text-ink-500"><tr><th className="py-1 pr-3">Fecha</th><th className="pr-3">Precio</th><th className="pr-3">Volumen</th><th className="pr-3">Distancia</th><th>Fuente</th></tr></thead>
                        <tbody>
                          {b.comparables.map((c, i) => (
                            <tr key={i} className="border-t border-line">
                              <td className="py-1 pr-3">{fecha(c.fecha)}</td><td className="pr-3">{precioUnidad(c.precio, u)}</td><td className="pr-3">{formatoMasa(c.cantidadTon)}</td>
                              <td className="pr-3">{c.distanciaKm != null ? `${Math.round(c.distanciaKm)} km` : "—"}</td>
                              <td>{c.fuente === "SEMILLA" ? "Ejemplo" : c.fuente === "ACOPIO" ? "Tus acopios" : "Tu CSV"}{c.categoriaCodigo !== b.categoria.codigo ? " · otro tipo" : ""}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}
              </>
            ) : (
              <p className="mt-2 flex flex-wrap items-center gap-2 text-base text-ink-700">
                {m.precioFinal != null ? <>Pagaste <b className="num text-ink-900">{precioUnidad(m.precioFinal, u)}</b>{m.cantidadAcopiada != null && <> · {formatoCantidad(m.cantidadAcopiada, u)}</>} <SemaforoPrecio pos={m.posicionPrecio} corto /></> : "El rango se muestra mientras cotizas."}
              </p>
            )}
          </Card>

          <Card className="order-4">
            <details className="group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-base font-semibold text-nav-900 [&::-webkit-details-marker]:hidden">
                <Icono nombre="flecha" size={16} className="transition-transform group-open:rotate-90" />Lo que reportó el proveedor
                <span className="ml-auto text-xs font-normal text-ink-500">{via?.etiqueta}</span>
              </summary>
              <p className="mt-2 whitespace-pre-line text-base text-ink-700">{m.descripcion}</p>
              {m.imagenes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.imagenes.map((s) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <a key={s} href={s} target="_blank" rel="noreferrer"><img src={s} alt="Foto del material" className="h-24 w-32 rounded-control object-cover" /></a>
                  ))}
                </div>
              )}
              <p className="mt-3 flex flex-wrap items-center gap-x-4 border-t border-line pt-3 text-sm text-ink-700">
                <span className="inline-flex items-center gap-1"><Icono nombre="telefono" size={16} />{m.contactoNombre ?? "—"}{m.telefono ? ` · ${m.telefono}` : ""}</span>
              </p>
            </details>
          </Card>
        </div>
      </div>
    </>
  );
}
