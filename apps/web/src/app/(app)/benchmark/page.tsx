"use client";

import { useEffect, useState } from "react";
import { formatoMasa, SUBTIPOS_PLASTICO } from "@swapit/shared";
import { Badge, Btn, Card, Field, inputCls, KpiFranja, PageHeader, RangoPrecio, Seccion } from "@/components/ui";
import { Icono } from "@/components/vis/Iconos";
import { api, ApiError } from "@/lib/api";
import { corto, fecha, precioUnidad } from "@/lib/format";
import type { Estimacion, Proveedor } from "@/lib/types";

interface Cat { codigo: string; nombre: string; familia: string | null }
interface MisDatos { propias: Record<string, number>; totalPropias: number; datosDeEjemplo: number; compartirPrecios: boolean }
interface ResultadoImportacion { importadas: number; rechazadas: { linea: number; motivo: string }[]; totalRechazadas: number }

const PLANTILLA = "fecha,categoria,cantidad,unidad,precio,descripcion\n2026-09-02,PLASTICO_PET,1200,kg,1.40,Botellas PET prensadas\n2026-09-09,PLASTICO_PEAD,800,kg,1.85,Bidones de PEAD enjuagados\n";
// Confianza: puntos + palabra (nunca solo color).
const CONFIANZA = {
  ALTA: { tono: "verde", puntos: 3, texto: "Confianza alta" },
  MEDIA: { tono: "ambar", puntos: 2, texto: "Confianza media" },
  BAJA: { tono: "rojo", puntos: 1, texto: "Confianza baja" },
  NINGUNA: { tono: "gris", puntos: 0, texto: "Sin datos" },
} as const;
const FUENTE = { SEMILLA: "Ejemplo", ACOPIO: "Tus acopios", CSV: "Tu CSV" } as const;

const chipCls =
  "flex min-h-10 cursor-pointer items-center justify-center rounded-control border border-ink-300 bg-white px-3 py-2 text-center text-sm font-semibold text-ink-700 transition hover:border-nav-600 peer-checked:border-nav-700 peer-checked:bg-nav-700 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-nav-600";

function Puntos({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-hidden>
      {[0, 1, 2].map((i) => <span key={i} className={`size-2.5 rounded-full border ${i < n ? "border-current bg-current" : "border-current"}`} />)}
    </span>
  );
}

/** Precio de referencia: cuánto vale un material por subtipo, volumen y zona; y cómo alimentarlo con tus compras reales. */
export default function BenchmarkPage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [categoria, setCategoria] = useState("PLASTICO_PET");
  const [cantidad, setCantidad] = useState("1000");
  const [unidad, setUnidad] = useState<"kg" | "ton">("kg");
  const [proveedorId, setProveedorId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [est, setEst] = useState<Estimacion | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [datos, setDatos] = useState<MisDatos | null>(null);
  const [csv, setCsv] = useState("");
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [importando, setImportando] = useState(false);

  const cargarDatos = () => api<MisDatos>("/benchmark/mis-datos").then(setDatos);
  useEffect(() => {
    api<Cat[]>("/categorias").then((c) => setCats(c.filter((x) => x.codigo !== "ARTICULOS_PERSONALES")));
    api<Proveedor[]>("/empresas/proveedores").then((p) => setProveedores(p.filter((x) => x.activo)));
    cargarDatos();
  }, []);

  async function consultar(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    setCargando(true);
    try {
      const p = new URLSearchParams({ categoria, cantidad, unidad });
      if (descripcion.trim()) p.set("descripcion", descripcion.trim());
      if (proveedorId) p.set("proveedorId", proveedorId);
      setEst(await api<Estimacion>(`/benchmark?${p}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo consultar");
    } finally {
      setCargando(false);
    }
  }
  useEffect(() => {
    consultar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function importar() {
    setImportando(true);
    setResultado(null);
    try {
      setResultado(await api<ResultadoImportacion>("/benchmark/importar", { method: "POST", json: { csv } }));
      await cargarDatos();
      await consultar();
    } catch (err) {
      setResultado({ importadas: 0, totalRechazadas: 1, rechazadas: [{ linea: 0, motivo: err instanceof ApiError ? err.message : "Error de conexión" }] });
    } finally {
      setImportando(false);
    }
  }

  const plasticos = cats.filter((c) => c.codigo.startsWith("PLASTICO_"));
  const otros = cats.filter((c) => !c.codigo.startsWith("PLASTICO_"));
  const esPlastico = categoria.startsWith("PLASTICO_");
  const conf = est ? CONFIANZA[est.confianza] : null;
  const porUnd = est?.unidad === "kg" ? "por kilo" : "por tonelada";

  return (
    <>
      <PageHeader titulo="Precio de referencia" sub="Cuánto vale tu material, según tipo y volumen." />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <form onSubmit={consultar} className="flex flex-col gap-4">
              <fieldset>
                <legend className="text-[13px] font-medium text-ink-700">Plástico por tipo</legend>
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {plasticos.map((c) => (
                    <label key={c.codigo}>
                      <input type="radio" name="categoria" value={c.codigo} checked={categoria === c.codigo} onChange={() => setCategoria(c.codigo)} className="peer sr-only" />
                      <span className={chipCls}>{SUBTIPOS_PLASTICO.find((s) => s.codigo === c.codigo)?.subtipo ?? corto(c.nombre)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Otro material">
                  <select value={esPlastico ? "" : categoria} onChange={(e) => e.target.value && setCategoria(e.target.value)} className={inputCls}>
                    <option value="" disabled>Elegir otro…</option>
                    {otros.map((c) => <option key={c.codigo} value={c.codigo}>{corto(c.nombre)}</option>)}
                  </select>
                </Field>
                <Field label="Zona (desde…)">
                  <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className={inputCls}>
                    <option value="">Mi sede</option>
                    {proveedores.map((p) => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
                  </select>
                </Field>
                <div className="flex flex-col gap-1">
                  <span className="text-[13px] font-medium text-ink-700">Cantidad</span>
                  <div className="flex gap-2">
                    <input required type="number" min="0.1" step="0.1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className={inputCls} aria-label="Cantidad" />
                    <div className="flex shrink-0 overflow-hidden rounded-control border border-ink-300" role="radiogroup" aria-label="Unidad">
                      {(["kg", "ton"] as const).map((u) => (
                        <label key={u}>
                          <input type="radio" name="unidad" value={u} checked={unidad === u} onChange={() => setUnidad(u)} className="peer sr-only" />
                          <span className="flex min-h-11 min-w-12 cursor-pointer items-center justify-center px-3 text-sm font-bold text-ink-700 peer-checked:bg-nav-700 peer-checked:text-white peer-focus-visible:outline-[3px] peer-focus-visible:-outline-offset-2 peer-focus-visible:outline-nav-600">{u === "kg" ? "kg" : "t"}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <Field label="Detalle (opcional)">
                  <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej. transparente, prensado" className={inputCls} />
                </Field>
              </div>
              <div><Btn disabled={cargando} className="w-full sm:w-auto">{cargando ? "Consultando…" : "Ver precio"}</Btn></div>
            </form>
          </Card>

          {error && (
            <p role="alert" className="flex items-center gap-2 rounded-control bg-error-tint px-3 py-2 text-sm font-medium text-error-ink"><Icono nombre="alerta" size={16} />{error}</p>
          )}

          {est && conf && (
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-nav-900">{corto(est.categoria.nombre)}</h2>
                <span className="text-sm text-ink-500">{formatoMasa(est.cantidadTon)} · {porUnd}</span>
              </div>

              {est.rango ? (
                <div className="mt-3">
                  <p className="text-xs font-medium text-ink-500">Precio típico</p>
                  <p className="num text-[32px] font-semibold leading-none text-nav-900">{precioUnidad(est.rango.p50, est.unidad)}</p>
                  <p className="mt-2 text-sm text-ink-700">
                    Rango <b className="num text-pri-700">{precioUnidad(est.rango.p25, est.unidad)}</b> a <b className="num text-pri-700">{precioUnidad(est.rango.p75, est.unidad)}</b>
                  </p>
                </div>
              ) : null}

              <div className="mt-2">
                <RangoPrecio rango={est.rango} formato={(n) => precioUnidad(n, est.unidad)} esSemilla={est.esSemilla} orientativo={est.rangoOrientativo} />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tono={conf.tono}>
                  <span className="inline-flex items-center gap-1.5"><Puntos n={conf.puntos} />{conf.texto}</span>
                </Badge>
                <Badge tono="gris">{est.n} {est.n === 1 ? "precio parecido" : "precios parecidos"}</Badge>
                {est.esSemilla && <Badge tono="ambar">Datos de ejemplo</Badge>}
                {est.rangoOrientativo && <Badge tono="gris">~ Orientativo</Badge>}
              </div>
              {est.esSemilla && (
                <p className="mt-2 flex items-start gap-2 rounded-control border border-ambar-200 bg-ambar-50 p-2.5 text-sm text-ambar-800">
                  <Icono nombre="info" size={16} className="mt-0.5 shrink-0" />Rango de ejemplo, no de mercado. Carga tus compras para ver el tuyo.
                </p>
              )}

              {est.comparables.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">Precios parecidos</h3>
                  <div className="mt-1 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs uppercase text-ink-500">
                        <tr><th className="py-1 pr-3">Fecha</th><th className="pr-3">Precio</th><th className="pr-3">Volumen</th><th className="hidden pr-3 sm:table-cell">Dist.</th><th className="hidden pr-3 sm:table-cell">Parecido</th><th>Fuente</th></tr>
                      </thead>
                      <tbody>
                        {est.comparables.map((c, i) => (
                          <tr key={i} className="border-t border-line">
                            <td className="whitespace-nowrap py-1.5 pr-3">{fecha(c.fecha)}</td>
                            <td className="num whitespace-nowrap pr-3 font-semibold">{precioUnidad(c.precio, est.unidad)}</td>
                            <td className="whitespace-nowrap pr-3">{formatoMasa(c.cantidadTon)}</td>
                            <td className="hidden whitespace-nowrap pr-3 sm:table-cell">{c.distanciaKm != null ? `${Math.round(c.distanciaKm)} km` : "—"}</td>
                            <td className="hidden pr-3 sm:table-cell">
                              <span className="flex items-center gap-1.5">
                                <span className="h-1.5 w-10 overflow-hidden rounded-full bg-ink-100" aria-hidden><span className="block h-full bg-nav-600" style={{ width: `${Math.round(c.score * 100)}%` }} /></span>
                                <span className="text-xs">{Math.round(c.score * 100)}%</span>
                              </span>
                            </td>
                            <td className="whitespace-nowrap text-xs">{FUENTE[c.fuente]}{c.categoriaCodigo !== est.categoria.codigo ? " · otro tipo" : ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <details className="mt-3 text-sm text-ink-700">
                <summary className="min-h-11 cursor-pointer py-2 font-semibold text-nav-700">Ver cómo se calcula</summary>
                <p>{est.nota}</p>
                <p className="mt-1 text-xs text-ink-500">Pesa el parecido (45 %), la cercanía (20 %), el volumen (20 %) y la antigüedad (15 %). Otro tipo de plástico solo entra si faltan datos.</p>
              </details>
            </Card>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {datos && (
            <>
              <KpiFranja
                items={[
                  { etiqueta: "Tus precios", valor: datos.totalPropias, nota: `${datos.propias.ACOPIO ?? 0} acopios · ${datos.propias.CSV ?? 0} CSV` },
                  { etiqueta: "De ejemplo", valor: datos.datosDeEjemplo, nota: "Se dejan con 5 reales", tono: datos.totalPropias >= 5 ? "neutro" : "alerta" },
                ]}
              />
              <Card>
                <label className="flex min-h-11 cursor-pointer items-center gap-3">
                  <input type="checkbox" className="size-5 shrink-0 accent-nav-700" checked={datos.compartirPrecios} onChange={async (e) => setDatos(await api<MisDatos>("/benchmark/compartir", { method: "PUT", json: { compartir: e.target.checked } }))} />
                  <span className="text-sm font-medium">Compartir mis precios, sin mi nombre</span>
                </label>
                <p className="mt-1 text-sm text-ink-500">{datos.compartirPrecios ? "Otros intermediarios los ven sin tu nombre." : "Solo tuyos."}</p>
              </Card>
            </>
          )}

          <Card>
            <details>
              <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-nav-900">
                <Icono nombre="descargar" size={16} />Importar compras (CSV)
              </summary>
              <p className="mt-2 text-sm text-ink-500">Columnas: <code>fecha, categoria, cantidad, unidad, precio</code>.</p>
              <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={6} className={`${inputCls} mt-3 font-mono text-xs`} placeholder={PLANTILLA} aria-label="CSV de compras" />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Btn variante="borde" type="button" onClick={() => setCsv(PLANTILLA)}>Usar plantilla</Btn>
                <label className="inline-flex min-h-11 cursor-pointer items-center rounded-control border border-ink-300 bg-white px-4 text-sm font-semibold hover:border-nav-600 hover:bg-surface-2">
                  Subir archivo
                  <input type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setCsv(await f.text()); }} />
                </label>
                <Btn type="button" disabled={importando || csv.trim().length < 10} onClick={importar}>{importando ? "Importando…" : "Importar"}</Btn>
              </div>
              {resultado && (
                <div className="mt-3 text-sm" role="status">
                  <p className={`flex items-center gap-1.5 font-semibold ${resultado.importadas ? "text-pri-700" : "text-error-ink"}`}>
                    <Icono nombre={resultado.importadas ? "check" : "alerta"} size={16} />
                    {resultado.importadas} fila{resultado.importadas === 1 ? "" : "s"} importada{resultado.importadas === 1 ? "" : "s"}{resultado.totalRechazadas ? `, ${resultado.totalRechazadas} rechazada${resultado.totalRechazadas === 1 ? "" : "s"}` : ""}
                  </p>
                  {resultado.rechazadas.length > 0 && <ul className="mt-1 list-disc pl-5 text-xs text-error-ink">{resultado.rechazadas.slice(0, 6).map((r, i) => <li key={i}>{r.linea ? `Línea ${r.linea}: ` : ""}{r.motivo}</li>)}</ul>}
                </div>
              )}
            </details>
          </Card>
        </div>
      </div>
    </>
  );
}
