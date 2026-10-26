"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buscarResiduos, formatoCantidad, residuoPorId } from "@swapit/shared";
import { Badge, Btn, Card, Cargando, Field, inputCls, KpiFranja, PageHeader, Tabs, Vacio } from "@/components/ui";
import { nombreCorto } from "@/components/vis/EscaleraVidas";
import { Icono } from "@/components/vis/Iconos";
import { api, ApiError } from "@/lib/api";
import { enlaceWhatsapp, fecha, precioUnidad } from "@/lib/format";
import type { Acuerdo, Destino, EstadoAcuerdo, Proveedor } from "@/lib/types";

const FILTROS: [EstadoAcuerdo | "", string][] = [["VIGENTE", "Vigentes"], ["CUMPLIDO", "Cumplidos"], ["CANCELADO", "Cancelados"], ["", "Todos"]];
const TONO_ESTADO = { VIGENTE: "azul", CUMPLIDO: "verde", CANCELADO: "gris" } as const;
const BTN_LINK = "inline-flex min-h-10 items-center gap-1.5 rounded-control border border-ink-300 bg-white px-3 text-sm font-semibold text-ink-900 hover:border-nav-600 hover:bg-surface-2";
const ETIQUETA_ESTADO = { VIGENTE: "Vigente", CUMPLIDO: "Cumplido", CANCELADO: "Cancelado" } as const;

const hoyIso = () => new Date().toISOString().slice(0, 10);
const VACIO = { proveedorId: "", descripcion: "", residuoRef: "", cantidad: "", unidad: "kg" as "kg" | "ton", precio: "", fechaRecojo: "", destinoId: "" };

/** Acuerdos de temporada: precio y fecha de recojo pactados antes de la campaña, y los recojos que los van saldando. */
export default function AcuerdosPage() {
  const [lista, setLista] = useState<Acuerdo[] | null>(null);
  const [filtro, setFiltro] = useState<EstadoAcuerdo | "">("VIGENTE");
  const [form, setForm] = useState<typeof VACIO | null>(null);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [destinos, setDestinos] = useState<Destino[]>([]);
  const [qResiduo, setQResiduo] = useState("");
  const [errores, setErrores] = useState<string[]>([]);
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState(false);
  // Recojo en curso (una tarjeta a la vez).
  const [recojoId, setRecojoId] = useState<string | null>(null);
  const [cant, setCant] = useState("");
  const [prec, setPrec] = useState("");
  const [busy, setBusy] = useState(false);
  const [errRecojo, setErrRecojo] = useState("");

  const cargar = useCallback(() => api<Acuerdo[]>("/acuerdos").then(setLista), []);
  useEffect(() => {
    cargar();
    api<Proveedor[]>("/empresas/proveedores").then((p) => setProveedores(p.filter((x) => x.activo)));
    api<Destino[]>("/destinos?activo=true").then(setDestinos).catch(() => setDestinos([]));
  }, [cargar]);

  const conteo = useMemo(() => {
    const c: Record<string, number> = { "": lista?.length ?? 0 };
    for (const a of lista ?? []) c[a.estado] = (c[a.estado] ?? 0) + 1;
    return c;
  }, [lista]);
  const visibles = (lista ?? []).filter((a) => !filtro || a.estado === filtro);
  const hallados = useMemo(() => (qResiduo.trim().length >= 2 ? buscarResiduos(qResiduo, 4) : []), [qResiduo]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setErrores([]);
    setGuardando(true);
    try {
      await api("/acuerdos", {
        method: "POST",
        json: {
          proveedorId: form.proveedorId,
          descripcion: form.descripcion,
          residuoRef: form.residuoRef || undefined,
          cantidadEstimada: Number(form.cantidad),
          unidad: form.unidad,
          precioPactado: Number(form.precio),
          fechaRecojo: form.fechaRecojo || undefined,
          destinoId: form.destinoId || undefined,
        },
      });
      setAviso("Acuerdo creado.");
      setForm(null);
      setQResiduo("");
      setFiltro("VIGENTE");
      await cargar();
    } catch (err) {
      setErrores(err instanceof ApiError ? (err.errores?.map((x) => `${x.campo}: ${x.mensaje}`) ?? [err.message]) : ["Error de conexión"]);
    } finally {
      setGuardando(false);
    }
  }

  async function registrarRecojo(a: Acuerdo, e: React.FormEvent) {
    e.preventDefault();
    setErrRecojo("");
    setBusy(true);
    try {
      await api(`/acuerdos/${a.id}/recojo`, { method: "POST", json: { cantidad: Number(cant), precio: prec ? Number(prec) : undefined } });
      setAviso(`Recojo registrado: ${formatoCantidad(Number(cant), a.unidad)}.`);
      setRecojoId(null);
      await cargar();
    } catch (err) {
      setErrRecojo(err instanceof ApiError ? (err.errores?.map((x) => x.mensaje).join(", ") ?? err.message) : "Error de conexión");
    } finally {
      setBusy(false);
    }
  }

  async function cambiarEstado(a: Acuerdo, estado: EstadoAcuerdo) {
    if (!window.confirm(estado === "CUMPLIDO" ? "¿Marcar este acuerdo como cumplido?" : "¿Cancelar este acuerdo?")) return;
    try {
      await api(`/acuerdos/${a.id}`, { method: "PATCH", json: { estado } });
      setAviso(estado === "CUMPLIDO" ? "Acuerdo cumplido." : "Acuerdo cancelado.");
      await cargar();
    } catch (err) {
      setAviso(err instanceof ApiError ? err.message : "No se pudo completar la acción");
    }
  }

  if (!lista) return <Cargando />;
  const campo = (k: keyof typeof VACIO) => ({ value: form?.[k] ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f)) });
  const porU = form?.unidad === "ton" ? "tonelada" : "kilo";
  const residuoForm = form?.residuoRef ? residuoPorId(form.residuoRef) : undefined;

  return (
    <>
      <PageHeader titulo="Acuerdos de temporada" sub="Precio y fecha pactados antes de la campaña." acciones={<Btn onClick={() => { setForm({ ...VACIO }); setErrores([]); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Nuevo acuerdo</Btn>} />
      {aviso && <p role="status" className="mb-4 flex items-center gap-2 rounded-control bg-pri-50 px-3 py-2 text-sm font-medium text-pri-800"><Icono nombre="check" size={16} />{aviso}</p>}

      {lista.length > 0 && (
        <KpiFranja
          className="mb-5"
          items={[
            { etiqueta: "Vigentes", valor: conteo.VIGENTE ?? 0, tono: "ok" },
            { etiqueta: "Atrasados", valor: lista.filter((a) => a.estado === "VIGENTE" && !!a.fechaRecojo && a.fechaRecojo.slice(0, 10) < hoyIso()).length, nota: "pasó la fecha de recojo", tono: lista.some((a) => a.estado === "VIGENTE" && !!a.fechaRecojo && a.fechaRecojo.slice(0, 10) < hoyIso()) ? "alerta" : "neutro" },
            { etiqueta: "Cumplidos", valor: conteo.CUMPLIDO ?? 0 },
            { etiqueta: "Total pactado", valor: lista.length },
          ]}
        />
      )}

      {form && (
        <Card className="mb-5">
          <h2 className="text-base font-semibold text-nav-900">Nuevo acuerdo</h2>
          {proveedores.length === 0 ? (
            <p className="mt-2 text-base text-ink-700">Primero agrega un proveedor en <a href="/red" className="font-semibold text-nav-700 underline">Mi red</a>.</p>
          ) : (
            <form onSubmit={crear} className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Proveedor">
                <select required className={inputCls} {...campo("proveedorId")}>
                  <option value="">Elige…</option>
                  {proveedores.map((p) => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
                </select>
              </Field>
              <Field label="Destino" hint="Opcional.">
                <select className={inputCls} {...campo("destinoId")}>
                  <option value="">Sin destino aún</option>
                  {destinos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="¿Qué material?" hint="Ej. «Descarte de mango, campaña 2026».">
                  <input required minLength={3} maxLength={300} className={inputCls} {...campo("descripcion")} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm font-semibold text-ink-700">Residuo <span className="font-normal text-ink-500">(opcional)</span></p>
                {residuoForm ? (
                  <div className="mt-1 flex items-center gap-3 rounded-control border border-nav-600 bg-nav-50 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">{nombreCorto(residuoForm.residuo.nombre)}</span>
                    <button type="button" className="min-h-11 px-2 text-sm font-semibold text-nav-700 hover:underline" onClick={() => setForm((f) => (f ? { ...f, residuoRef: "" } : f))}>Cambiar</button>
                  </div>
                ) : (
                  <div className="mt-1">
                    <span className="relative block">
                      <Icono nombre="buscar" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
                      <input value={qResiduo} onChange={(e) => setQResiduo(e.target.value)} placeholder="Busca: cáscara de mango, bagazo…" aria-label="Buscar residuo" className={`${inputCls} pl-10`} />
                    </span>
                    {hallados.length > 0 && (
                      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                        {hallados.map((h) => (
                          <li key={h.residuo.id}>
                            <button type="button" className="flex min-h-12 w-full items-center gap-3 rounded-control border border-line bg-white px-3 py-2 text-left transition hover:border-nav-600" onClick={() => { setForm((f) => (f ? { ...f, residuoRef: h.residuo.id, descripcion: f.descripcion || nombreCorto(h.residuo.nombre) } : f)); setQResiduo(""); }}>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-ink-900">{nombreCorto(h.residuo.nombre)}</span>
                                <span className="block truncate text-xs text-ink-500">{h.cadena.nombre}</span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              <Field label="Cantidad estimada">
                <div className="flex gap-2">
                  <input required type="number" min="0.1" step="0.1" className={inputCls} {...campo("cantidad")} />
                  <select className={`${inputCls} w-28`} aria-label="Unidad" {...campo("unidad")}>
                    <option value="kg">kilos</option>
                    <option value="ton">toneladas</option>
                  </select>
                </div>
              </Field>
              <Field label={`Precio pactado (S/ por ${porU})`}>
                <input required type="number" min="0" step="0.01" className={inputCls} {...campo("precio")} />
              </Field>
              <Field label="Fecha de recojo" hint="Opcional.">
                <input type="date" min={hoyIso()} className={inputCls} {...campo("fechaRecojo")} />
              </Field>
              {errores.length > 0 && <ul role="alert" className="list-disc pl-5 text-sm text-error-ink sm:col-span-2">{errores.map((m) => <li key={m}>{m}</li>)}</ul>}
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <Btn disabled={guardando}>{guardando ? "Guardando…" : "Crear acuerdo"}</Btn>
                <Btn type="button" variante="borde" onClick={() => { setForm(null); setQResiduo(""); }}>Cancelar</Btn>
              </div>
            </form>
          )}
        </Card>
      )}

      <Tabs
        etiqueta="Estado del acuerdo"
        valor={filtro}
        onChange={(v) => setFiltro(v as EstadoAcuerdo | "")}
        opciones={FILTROS.map(([k, etiqueta]) => ({ valor: k, etiqueta, conteo: conteo[k] ?? 0 }))}
        className="mb-4"
      />

      {visibles.length === 0 ? (
        <Vacio
          titulo={lista.length ? "Nada con ese filtro" : "Aún no tienes acuerdos"}
          texto={lista.length ? "Prueba con otro estado." : "Pacta precio y fecha antes de la campaña."}
          accion={<Btn onClick={() => { setForm({ ...VACIO }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Nuevo acuerdo</Btn>}
        />
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
          {visibles.map((a) => {
            const vigente = a.estado === "VIGENTE";
            const atrasado = vigente && !!a.fechaRecojo && a.fechaRecojo.slice(0, 10) < hoyIso();
            const pct = Math.min(100, a.avance);
            const nombre = a.proveedor.contactoNombre?.split(" ")[0] ?? "";
            const wa = enlaceWhatsapp(a.proveedor.telefono, `Hola ${nombre}, confirmamos: ${a.descripcion}. Precio ${precioUnidad(a.precioPactado, a.unidad)}${a.fechaRecojo ? `. Recojo: ${fecha(a.fechaRecojo)}` : ""}. ¿Todo bien?`);
            const abierto = recojoId === a.id;
            return (
              <li key={a.id}>
                <Card className={`h-full ${vigente ? "" : "opacity-80"}`}>
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold leading-tight text-nav-900">{a.descripcion}</h3>
                      <p className="mt-0.5 truncate text-sm text-ink-500">{a.proveedor.razonSocial}</p>
                    </div>
                    <Badge tono={TONO_ESTADO[a.estado]} className="shrink-0">{ETIQUETA_ESTADO[a.estado]}</Badge>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="num text-[28px] font-semibold leading-none text-nav-900">{pct}<span className="text-base font-medium text-ink-500"> %</span></span>
                      <span className="text-sm text-ink-700"><b className="num text-ink-900">{formatoCantidad(a.recogido, a.unidad)}</b> de {formatoCantidad(a.cantidadEstimada, a.unidad)}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-sm bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Avance del acuerdo">
                      <div className="h-full rounded-sm bg-pri-600 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-line pt-3 text-sm">
                    <div><dt className="text-xs text-ink-500">Precio pactado</dt><dd className="num font-semibold text-ink-900">{precioUnidad(a.precioPactado, a.unidad)}</dd></div>
                    <div><dt className="text-xs text-ink-500">Recojo</dt><dd className={atrasado ? "font-semibold text-ambar-700" : "text-ink-900"}>{a.fechaRecojo ? `${fecha(a.fechaRecojo)}${atrasado ? " · atrasado" : ""}` : "Sin fecha"}</dd></div>
                    {a.destino && <div className="col-span-2"><dt className="text-xs text-ink-500">Destino</dt><dd className="text-ink-900">{a.destino.nombre}</dd></div>}
                  </dl>

                  {abierto && (
                    <form onSubmit={(e) => registrarRecojo(a, e)} className="mt-3 grid gap-3 rounded-control border border-line bg-surface-2 p-3 sm:grid-cols-2">
                      <Field label={`Cantidad recogida (${a.unidad === "kg" ? "kg" : "t"})`}>
                        <input required autoFocus type="number" min="0.01" step="0.01" value={cant} onChange={(e) => setCant(e.target.value)} className={inputCls} />
                      </Field>
                      <Field label={`Precio (S/ por ${a.unidad === "kg" ? "kilo" : "tonelada"})`} hint={`Vacío = ${precioUnidad(a.precioPactado, a.unidad)}.`}>
                        <input type="number" min="0" step="0.01" value={prec} onChange={(e) => setPrec(e.target.value)} className={inputCls} />
                      </Field>
                      {errRecojo && <p role="alert" className="text-sm text-error-ink sm:col-span-2">{errRecojo}</p>}
                      <div className="flex flex-wrap gap-2 sm:col-span-2">
                        <Btn disabled={busy || !cant}>{busy ? "Registrando…" : "Registrar recojo"}</Btn>
                        <Btn type="button" variante="borde" onClick={() => setRecojoId(null)}>Cancelar</Btn>
                      </div>
                    </form>
                  )}

                  {vigente && !abierto && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Btn onClick={() => { setRecojoId(a.id); setCant(""); setPrec(""); setErrRecojo(""); }}>Registrar recojo</Btn>
                      {wa && (
                        <a href={wa} target="_blank" rel="noreferrer" className={BTN_LINK}>
                          <Icono nombre="whatsapp" size={16} />Enviar por WhatsApp
                        </a>
                      )}
                    </div>
                  )}
                  {vigente && (
                    <div className="mt-1 flex flex-wrap gap-x-4 text-sm">
                      <button className="min-h-10 font-semibold text-pri-700 hover:underline" onClick={() => cambiarEstado(a, "CUMPLIDO")}>Marcar cumplido</button>
                      <button className="min-h-10 font-semibold text-error-ink hover:underline" onClick={() => cambiarEstado(a, "CANCELADO")}>Cancelar</button>
                    </div>
                  )}

                  {a.recojos.length > 0 && (
                    <details className="group mt-1">
                      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-nav-700 [&::-webkit-details-marker]:hidden">
                        <Icono nombre="flecha" size={14} className="transition-transform group-open:rotate-90" />{a.recojos.length} recojo{a.recojos.length === 1 ? "" : "s"}
                      </summary>
                      <ul className="divide-y divide-line text-sm">
                        {a.recojos.map((r) => (
                          <li key={r.loteId} className="flex items-center justify-between gap-2 py-1.5">
                            <span className="num">{r.cantidad != null ? formatoCantidad(r.cantidad, a.unidad) : "—"}{r.precio != null ? ` · ${precioUnidad(r.precio, a.unidad)}` : ""}</span>
                            <span className="text-ink-500">{fecha(r.fecha)}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
