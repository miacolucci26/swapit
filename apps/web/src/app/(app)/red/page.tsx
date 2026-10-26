"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { nombreSector, nombreTipoActor, SECTORES, TIPOS_ACTOR } from "@swapit/shared";
import { Badge, Btn, Card, Cargando, Field, inputCls, KpiFranja, PageHeader, TablaDatos, Vacio } from "@/components/ui";
import { SECTOR_CORTO } from "@/components/LoteCard";
import { Icono } from "@/components/vis/Iconos";
import { api, ApiError } from "@/lib/api";
import { enlaceWhatsapp, fecha } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { Proveedor } from "@/lib/types";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-card bg-ink-100" /> });

const VACIO = { razonSocial: "", ruc: "", direccion: "", contactoNombre: "", telefono: "", contactoEmail: "", notasInternas: "", sector: "", tipoActor: "" };

const BTN_LINK = "inline-flex min-h-10 items-center gap-1.5 rounded-control border border-ink-300 bg-white px-3 text-sm font-semibold text-ink-900 hover:border-nav-600 hover:bg-surface-2";

/** Mi red: los proveedores del intermediario y el enlace con el que cada uno reporta su material. */
export default function Red() {
  const { user } = useSession();
  const [lista, setLista] = useState<Proveedor[] | null>(null);
  const [sector, setSector] = useState("");
  const [tipoActor, setTipoActor] = useState("");
  const [form, setForm] = useState<typeof VACIO | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [errores, setErrores] = useState<string[]>([]);
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(() => {
    const p = new URLSearchParams();
    if (sector) p.set("sector", sector);
    if (tipoActor) p.set("tipoActor", tipoActor);
    const qs = p.toString();
    return api<Proveedor[]>(`/empresas/proveedores${qs ? `?${qs}` : ""}`).then(setLista);
  }, [sector, tipoActor]);
  useEffect(() => {
    cargar();
  }, [cargar]);

  const enlace = (p: Proveedor) => `${window.location.origin}/captacion/${p.tokenCaptacion}`;
  const mensaje = (p: Proveedor) => `Hola ${p.contactoNombre?.split(" ")[0] ?? ""}, soy de ${user?.empresa.razonSocial}. Reporta tu material desde este enlace y verás el precio de referencia: ${enlace(p)}`;

  async function copiar(p: Proveedor) {
    try {
      await navigator.clipboard.writeText(enlace(p));
      setAviso(`Enlace de ${p.razonSocial} copiado.`);
    } catch {
      window.prompt("Copia el enlace:", enlace(p));
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setErrores([]);
    setGuardando(true);
    // Los campos vacíos no se envían: el RUC, el teléfono, el correo, el sector y el tipo son opcionales.
    const datos = Object.fromEntries(Object.entries(form).filter(([, v]) => v.trim() !== ""));
    try {
      if (editando) await api(`/empresas/proveedores/${editando}`, { method: "PATCH", json: datos });
      else await api("/empresas/proveedores", { method: "POST", json: datos });
      setAviso(editando ? "Proveedor actualizado." : "Proveedor agregado. Envíale su enlace.");
      setForm(null);
      setEditando(null);
      await cargar();
    } catch (err) {
      setErrores(err instanceof ApiError ? (err.errores?.map((x) => `${x.campo}: ${x.mensaje}`) ?? [err.message]) : ["Error de conexión"]);
    } finally {
      setGuardando(false);
    }
  }

  async function accion(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      setAviso(ok);
      await cargar();
    } catch (err) {
      setAviso(err instanceof ApiError ? err.message : "No se pudo completar la acción");
    }
  }

  if (!lista) return <Cargando />;
  const campo = (k: keyof typeof VACIO) => ({ value: form?.[k] ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f)) });
  const puntos = lista.filter((p) => p.ubicacion && p.activo).map((p) => ({ id: p.id, lat: p.ubicacion!.lat, lng: p.ubicacion!.lng, modalidad: "VENTA", titulo: p.razonSocial }));
  const hayFiltros = !!(sector || tipoActor);

  return (
    <>
      <PageHeader
        titulo="Mi red"
        sub="Cada proveedor reporta con su enlace."
        acciones={<Btn onClick={() => { setForm({ ...VACIO }); setEditando(null); setErrores([]); }}>Agregar proveedor</Btn>}
      />
      {aviso && <p role="status" className="mb-4 flex items-center gap-2 rounded-control bg-pri-50 px-3 py-2 text-sm font-medium text-pri-800"><Icono nombre="check" size={16} />{aviso}</p>}

      <KpiFranja
        className="mb-5"
        items={[
          { etiqueta: "Proveedores", valor: lista.length, nota: hayFiltros ? "con el filtro actual" : undefined },
          { etiqueta: "Activos", valor: lista.filter((p) => p.activo).length, tono: "ok" },
          { etiqueta: "Por cotizar", valor: lista.reduce((a, p) => a + (p.activo ? p.pendientes : 0), 0), tono: lista.some((p) => p.pendientes > 0) ? "alerta" : "neutro" },
          { etiqueta: "Reportes", valor: lista.reduce((a, p) => a + p.lotes, 0) },
        ]}
      />

      {form && (
        <Card className="mb-5">
          <h2 className="text-base font-semibold text-nav-900">{editando ? "Editar proveedor" : "Nuevo proveedor"}</h2>
          <form onSubmit={guardar} className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Nombre o razón social"><input required minLength={2} className={inputCls} {...campo("razonSocial")} /></Field>
            <Field label="Persona de contacto"><input required minLength={2} className={inputCls} {...campo("contactoNombre")} /></Field>
            <Field label="Sector">
              <select className={inputCls} {...campo("sector")}>
                <option value="">Sin indicar</option>
                {SECTORES.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </Field>
            <Field label="Tipo de proveedor">
              <select className={inputCls} {...campo("tipoActor")}>
                <option value="">Sin indicar</option>
                {TIPOS_ACTOR.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </Field>
            <Field label="Celular (WhatsApp)" hint="Ej. 987654321."><input inputMode="tel" className={inputCls} {...campo("telefono")} /></Field>
            <Field label="Dirección de recojo" hint="Barrio y ciudad bastan."><input required minLength={5} className={inputCls} {...campo("direccion")} /></Field>
            <Field label="RUC" hint="Opcional. Vacío si es informal."><input inputMode="numeric" maxLength={11} className={inputCls} {...campo("ruc")} /></Field>
            <Field label="Correo" hint="Opcional."><input type="email" className={inputCls} {...campo("contactoEmail")} /></Field>
            <div className="sm:col-span-2"><Field label="Notas internas" hint="Solo tú las ves."><textarea rows={2} maxLength={500} className={inputCls} {...campo("notasInternas")} /></Field></div>
            {errores.length > 0 && <ul role="alert" className="list-disc pl-5 text-sm text-error-ink sm:col-span-2">{errores.map((m) => <li key={m}>{m}</li>)}</ul>}
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Btn disabled={guardando}>{guardando ? "Guardando…" : editando ? "Guardar cambios" : "Agregar proveedor"}</Btn>
              <Btn type="button" variante="borde" onClick={() => { setForm(null); setEditando(null); }}>Cancelar</Btn>
            </div>
          </form>
        </Card>
      )}

      {/* Filtros en una sola barra */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={sector} onChange={(e) => setSector(e.target.value)} className={`${inputCls} w-auto min-w-40`} aria-label="Sector">
          <option value="">Todos los sectores</option>
          {SECTORES.map((s) => <option key={s.id} value={s.id}>{SECTOR_CORTO[s.id]}</option>)}
        </select>
        <select value={tipoActor} onChange={(e) => setTipoActor(e.target.value)} className={`${inputCls} w-auto min-w-44`} aria-label="Tipo de proveedor">
          <option value="">Todos los tipos</option>
          {TIPOS_ACTOR.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
        {hayFiltros && <button type="button" onClick={() => { setSector(""); setTipoActor(""); }} className="min-h-10 px-2 text-sm font-semibold text-nav-700 hover:underline">Quitar filtros</button>}
      </div>

      {lista.length === 0 ? (
        <Vacio
          titulo={hayFiltros ? "Nadie con ese filtro" : "Aún no tienes proveedores"}
          texto={hayFiltros ? "Prueba con otro sector o tipo." : "Agrega al primero y envíale su enlace."}
          accion={hayFiltros ? <Btn variante="borde" onClick={() => { setSector(""); setTipoActor(""); }}>Quitar filtros</Btn> : undefined}
        />
      ) : (
        <>
          {puntos.length > 0 && <div className="mb-5 overflow-hidden rounded-card border border-line"><MapView className="h-64" puntos={puntos} /></div>}
          <TablaDatos minAncho={860}>
            <thead>
              <tr><th>Proveedor</th><th>Contacto</th><th className="text-right">Reportes</th><th>Último reporte</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {lista.map((p) => {
                const wa = enlaceWhatsapp(p.telefono, mensaje(p));
                return (
                  <tr key={p.id} className={`align-top ${p.activo ? "" : "opacity-60"}`}>
                    <td className="max-w-[260px]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium text-ink-900">{p.razonSocial}</span>
                        {!p.activo && <Badge>Desactivado</Badge>}
                        {p.pendientes > 0 && <Badge tono="ambar">{p.pendientes} por cotizar</Badge>}
                      </div>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {p.sector ? nombreSector(p.sector) : "Sin sector"}{p.tipoActor ? ` · ${nombreTipoActor(p.tipoActor)}` : ""} · {p.ruc ? `RUC ${p.ruc}` : "Sin RUC"}
                      </p>
                      <p className="text-xs text-ink-500">{p.direccion}</p>
                      {p.notasInternas && <p className="mt-0.5 text-xs italic text-ink-500">{p.notasInternas}</p>}
                    </td>
                    <td className="whitespace-nowrap text-ink-700">{p.contactoNombre}{p.telefono && <span className="block text-xs text-ink-500">{p.telefono}</span>}</td>
                    <td className="num text-right">{p.lotes}</td>
                    <td className="whitespace-nowrap text-ink-500">{p.ultimoReporte ? fecha(p.ultimoReporte) : "Aún no reporta"}</td>
                    <td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {wa && (
                          <a href={wa} target="_blank" rel="noreferrer" className={BTN_LINK}><Icono nombre="whatsapp" size={16} />WhatsApp</a>
                        )}
                        <button type="button" className={BTN_LINK} onClick={() => copiar(p)}>Copiar enlace</button>
                        <Link href={`/material?nuevo=${p.id}`} className={BTN_LINK}>Material</Link>
                      </div>
                      <details className="group mt-1">
                        <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-nav-700 [&::-webkit-details-marker]:hidden">
                          <Icono nombre="flecha" size={12} className="transition-transform group-open:rotate-90" />Más acciones
                        </summary>
                        <div className="flex flex-wrap gap-x-4 text-sm">
                          <a href={enlace(p)} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center font-semibold text-nav-700 hover:underline">Ver portal</a>
                          <button className="min-h-9 font-semibold text-nav-700 hover:underline" onClick={() => { setEditando(p.id); setForm({ razonSocial: p.razonSocial, ruc: p.ruc ?? "", direccion: p.direccion, contactoNombre: p.contactoNombre ?? "", telefono: p.telefono ?? "", contactoEmail: p.contactoEmail ?? "", notasInternas: p.notasInternas ?? "", sector: p.sector ?? "", tipoActor: p.tipoActor ?? "" }); setErrores([]); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button>
                          <button className="min-h-9 font-semibold text-ambar-700 hover:underline" onClick={() => { if (window.confirm("El enlace anterior dejará de funcionar. ¿Generar uno nuevo?")) accion(() => api(`/empresas/proveedores/${p.id}/rotar-enlace`, { method: "POST" }), "Enlace renovado: envíale el nuevo."); }}>Renovar enlace</button>
                          <button className="min-h-9 font-semibold text-error-ink hover:underline" onClick={() => accion(() => api(`/empresas/proveedores/${p.id}`, { method: "PATCH", json: { activo: !p.activo } }), p.activo ? "Proveedor desactivado: su enlace ya no funciona." : "Proveedor activado.")}>{p.activo ? "Desactivar" : "Activar"}</button>
                        </div>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TablaDatos>
        </>
      )}
    </>
  );
}
