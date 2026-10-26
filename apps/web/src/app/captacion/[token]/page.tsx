"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { formatoCantidad } from "@swapit/shared";
import { Isotipo } from "@/components/Logo";
import { AvisoEjemplo, EstadoMaterialBadge, RangoPrecio } from "@/components/ui";
import { Icono, type NombreIcono } from "@/components/vis/Iconos";
import { api, ApiError } from "@/lib/api";
import { fecha, precioUnidad } from "@/lib/format";
import type { PosicionPrecio, Rango, Unidad } from "@/lib/types";

interface Inicio {
  proveedor: { nombre: string; contacto: string | null };
  intermediario: { razonSocial: string; logoUrl: string | null; colorMarca: string | null };
  categorias: { codigo: string; nombre: string; familia: string | null }[];
}
interface Resultado {
  id: string; titulo: string; categoria: { codigo: string; nombre: string }; requiereRevision: boolean; estado: string; etiquetaEstado: string; cantidad: number; unidad: Unidad;
  precioEsperado: number | null; posicionPrecio: PosicionPrecio | null;
  benchmark: { unidad: Unidad; rango: Rango | null; confianza: string; esSemilla: boolean; rangoOrientativo: boolean; n: number; nota: string } | null;
}
interface Reporte { id: string; titulo: string; cantidad: number; unidad: Unidad; estado: string; etiquetaEstado: string; precioEsperado: number | null; precioOfrecido: number | null; fecha: string }

const MENSAJE_PRECIO: Record<PosicionPrecio, { icono: NombreIcono; texto: string; clase: string }> = {
  DENTRO: { icono: "check", texto: "Tu precio es justo.", clase: "border-exito bg-exito-tint text-exito-ink" },
  ENCIMA: { icono: "alerta", texto: "Tu precio está alto: pueden negociarte.", clase: "border-alerta-ink bg-alerta-tint text-alerta-ink" },
  DEBAJO: { icono: "alerta", texto: "Tu precio está bajo: podrías pedir más.", clase: "border-alerta-ink bg-alerta-tint text-alerta-ink" },
};

const campo = "min-h-14 w-full rounded-control border border-ink-300 bg-white px-4 py-3 text-lg outline-none focus:border-nav-600 focus:ring-2 focus:ring-nav-100";
const paso = "num grid size-7 shrink-0 place-items-center rounded-md text-sm font-semibold";

/**
 * Portal del proveedor: reporta material desde el celular con un enlace, sin cuenta. Pensado para usarse con una mano:
 * pocas preguntas, botones grandes y, al final, el rango de precio de referencia.
 */
export default function Captacion() {
  const { token } = useParams<{ token: string }>();
  const [inicio, setInicio] = useState<Inicio | null>(null);
  const [invalido, setInvalido] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [unidad, setUnidad] = useState<"kg" | "ton">("kg");
  const [precio, setPrecio] = useState("");
  const [categoria, setCategoria] = useState("");
  const [fotos, setFotos] = useState<{ nombre: string; url: string }[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [reportes, setReportes] = useState<Reporte[]>([]);

  const cargarReportes = useCallback(() => api<Reporte[]>(`/captacion/${token}/estado`).then(setReportes).catch(() => undefined), [token]);
  useEffect(() => {
    api<Inicio>(`/captacion/${token}`).then(setInicio).catch(() => setInvalido(true));
    cargarReportes();
  }, [token, cargarReportes]);

  async function subirFoto(files: FileList | null) {
    if (!files?.length) return;
    setSubiendo(true);
    setError("");
    try {
      for (const f of Array.from(files).slice(0, 3 - fotos.length)) {
        const fd = new FormData();
        fd.append("file", f);
        const res = await fetch(`/api/captacion/${token}/fotos`, { method: "POST", body: fd });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.message ?? "No se pudo subir la foto");
        setFotos((x) => [...x, d]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la foto");
    } finally {
      setSubiendo(false);
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      const r = await api<Resultado>(`/captacion/${token}/reporte`, {
        method: "POST",
        json: { descripcion, cantidad: Number(cantidad), unidad, categoriaCodigo: categoria || undefined, precioEsperado: precio ? Number(precio) : undefined, imagenes: fotos.map((f) => f.nombre) },
      });
      setResultado(r);
      cargarReportes();
    } catch (err) {
      setError(err instanceof ApiError ? (err.errores?.map((x) => x.mensaje).join(", ") ?? err.message) : "No se pudo enviar. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  function otro() {
    setResultado(null);
    setDescripcion("");
    setCantidad("");
    setPrecio("");
    setCategoria("");
    setFotos([]);
  }

  if (invalido) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
        <Icono nombre="alerta" size={32} className="text-ambar-700" />
        <h1 className="text-xl font-semibold text-ink-900">Este enlace ya no sirve</h1>
        <p className="text-base text-ink-700">Pide uno nuevo a tu acopiador.</p>
      </main>
    );
  }
  if (!inicio) return <div className="grid min-h-screen place-items-center"><Isotipo size={56} className="animate-pulse" /><span className="sr-only">Cargando…</span></div>;

  const color = inicio.intermediario.colorMarca ?? "#0f2140";
  const u = unidad === "kg" ? "kilo" : "tonelada";
  const b = resultado?.benchmark;
  const veredicto = resultado?.posicionPrecio ? MENSAJE_PRECIO[resultado.posicionPrecio] : null;

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-t-4 border-line bg-white px-4 py-3" style={{ borderTopColor: color }}>
        <div className="mx-auto flex w-full max-w-lg items-center gap-3">
          {inicio.intermediario.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={inicio.intermediario.logoUrl} alt="" className="size-10 rounded-control object-contain" />
          )}
          <div className="min-w-0">
            <div className="truncate text-base font-semibold leading-tight text-nav-900">{inicio.intermediario.razonSocial}</div>
            <div className="text-sm text-ink-500">Reporta tu material</div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-5">
        <h1 className="text-2xl font-semibold tracking-tight text-nav-900">Hola, {inicio.proveedor.contacto?.split(" ")[0] ?? inicio.proveedor.nombre}</h1>

        {resultado ? (
          <section className="mt-4 rounded-card border border-line bg-white p-5 shadow-card" aria-live="polite">
            <div className="flex items-center gap-3">
              <Icono nombre="check" size={28} className="shrink-0 text-pri-700" />
              <div className="min-w-0">
                <p className="text-xl font-semibold leading-tight text-pri-800">Listo, lo recibimos</p>
                <p className="text-base font-semibold text-ink-700">{formatoCantidad(resultado.cantidad, resultado.unidad)} · {resultado.categoria.nombre.split("(")[0].trim()}</p>
              </div>
            </div>
            {resultado.requiereRevision && (
              <p className="mt-3 flex items-start gap-2 rounded-control bg-alerta-tint p-3 text-sm font-semibold text-alerta-ink">
                <Icono nombre="info" size={18} className="mt-0.5 shrink-0" />
                {inicio.intermediario.razonSocial} confirmará el tipo contigo.
              </p>
            )}

            <div className="mt-4 border-t border-line pt-4">
              <p className="flex items-center gap-2 text-base font-semibold text-ink-900"><Icono nombre="balanza" size={20} className="text-nav-700" />Precio de referencia por {resultado.unidad === "kg" ? "kilo" : "tonelada"}</p>
              {b?.rango ? (
                <>
                  <RangoPrecio rango={b.rango} formato={(n) => precioUnidad(n, resultado.unidad)} esSemilla={b.esSemilla} orientativo={b.rangoOrientativo} marcadores={[{ etiqueta: "Tu precio", valor: resultado.precioEsperado, color: "#8a5a00" }]} />
                  {veredicto && (
                    <p className={`mt-3 flex items-center gap-2 rounded-control border p-3 text-base font-bold ${veredicto.clase}`}>
                      <Icono nombre={veredicto.icono} size={22} />
                      {veredicto.texto}
                    </p>
                  )}
                  {b.esSemilla ? <div className="mt-3"><AvisoEjemplo /></div> : <p className="mt-2 text-xs text-ink-500">{b.nota}</p>}
                </>
              ) : (
                <p className="mt-2 text-base text-ink-700">Aún no hay precios parecidos. Tu acopiador te dará su oferta.</p>
              )}
            </div>
            <button onClick={otro} className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-control bg-pri-600 px-4 py-3 text-lg font-semibold text-white hover:bg-pri-700">
              <Icono nombre="mas" size={22} />
              Reportar otro
            </button>
          </section>
        ) : (
          <form onSubmit={enviar} className="mt-4 flex flex-col gap-5 rounded-card border border-line bg-white p-5 shadow-card">
            <label className="flex flex-col gap-1.5">
              <span className="flex items-center gap-2 text-lg font-semibold text-ink-900">
                <span aria-hidden="true" className={`${paso} bg-nav-700 text-white`}>1</span>
                ¿Qué material tienes?
              </span>
              <textarea required minLength={5} rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={`${campo} min-h-28`} placeholder="Ej. Bidones azules de 20 litros, limpios" aria-describedby={error ? "captacion-error" : undefined} />
              <span className="text-sm text-ink-500">Tipo, estado y de dónde sale.</span>
            </label>

            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-lg font-semibold text-ink-900">
                <span aria-hidden="true" className={`${paso} bg-nav-700 text-white`}>2</span>
                ¿Cuánto?
              </span>
              <input aria-label="Cantidad" aria-describedby={error ? "captacion-error" : undefined} required type="number" inputMode="decimal" min="0.1" step="0.1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className={campo} placeholder="0" />
              <fieldset className="grid grid-cols-2 gap-2">
                <legend className="sr-only">Unidad</legend>
                {([["kg", "Kilos"], ["ton", "Toneladas"]] as const).map(([val, txt]) => (
                  <label key={val} className="cursor-pointer">
                    <input type="radio" name="unidad" value={val} checked={unidad === val} onChange={() => setUnidad(val)} className="peer sr-only" />
                    <span className="flex min-h-14 items-center justify-center gap-2 rounded-control border border-ink-300 bg-white text-lg font-semibold text-ink-700 peer-checked:border-nav-700 peer-checked:bg-nav-700 peer-checked:text-white peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-nav-600">
                      {unidad === val && <Icono nombre="check" size={20} />}
                      {txt}
                    </span>
                  </label>
                ))}
              </fieldset>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="flex items-center gap-2 text-lg font-semibold text-ink-900">
                <span aria-hidden="true" className={`${paso} bg-nav-700 text-white`}>3</span>
                ¿A cuánto lo vendes? <span className="text-sm font-semibold text-ink-500">(opcional)</span>
              </span>
              <input type="number" inputMode="decimal" min="0" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} className={campo} placeholder={`S/ por ${u}`} />
            </label>

            <div>
              <span className="flex items-center gap-2 text-lg font-semibold text-ink-900">
                <span aria-hidden="true" className={`${paso} bg-nav-700 text-white`}>4</span>
                Fotos <span className="text-sm font-semibold text-ink-500">(opcional, hasta 3)</span>
              </span>
              <div className="mt-2 flex flex-wrap gap-3">
                {fotos.map((f) => (
                  <div key={f.nombre} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt="Foto del material" className="size-24 rounded-control object-cover" />
                    <button type="button" aria-label="Quitar foto" onClick={() => setFotos((x) => x.filter((y) => y !== f))} className="absolute -right-2 -top-2 grid size-10 place-items-center rounded-full bg-ink-900 text-white"><Icono nombre="cerrar" size={18} /></button>
                  </div>
                ))}
                {fotos.length < 3 && (
                  <label className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-control border border-dashed border-nav-400 bg-nav-50 text-sm font-semibold text-nav-800">
                    {subiendo ? "Subiendo…" : <><Icono nombre="mas" size={28} />Foto</>}
                    <input type="file" accept="image/*" capture="environment" multiple className="sr-only" onChange={(e) => subirFoto(e.target.files)} />
                  </label>
                )}
              </div>
            </div>

            <details>
              <summary className="inline-flex min-h-11 cursor-pointer items-center text-base font-semibold text-nav-700">¿Sabes qué tipo es?</summary>
              <select aria-label="Tipo de material" value={categoria} onChange={(e) => setCategoria(e.target.value)} className={`${campo} mt-2`}>
                <option value="">No sé, que lo clasifiquen</option>
                {inicio.categorias.map((c) => <option key={c.codigo} value={c.codigo}>{c.nombre.split("(")[0].trim()}</option>)}
              </select>
            </details>

            {error && (
              <p id="captacion-error" role="alert" className="flex items-start gap-2 rounded-control border border-error/30 bg-error-tint p-3 text-base font-medium text-error-ink">
                <Icono nombre="alerta" size={22} className="shrink-0" />
                {error}
              </p>
            )}
            <button disabled={enviando || subiendo} className="flex min-h-14 items-center justify-center gap-2 rounded-control bg-pri-600 px-4 py-3 text-lg font-semibold text-white hover:bg-pri-700 disabled:opacity-60">
              {enviando ? "Enviando…" : <>Enviar reporte <Icono nombre="flecha" size={22} /></>}
            </button>
          </form>
        )}

        {reportes.length > 0 && (
          <section className="mt-6">
            <h2 className="text-base font-semibold text-nav-900">Tus reportes</h2>
            <ul className="mt-2 flex flex-col gap-2">
              {reportes.slice(0, 8).map((r) => (
                <li key={r.id} className="rounded-card border border-line bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-base font-semibold text-ink-900">{r.titulo}</span>
                    <EstadoMaterialBadge estado={r.estado} etiqueta={r.etiquetaEstado} />
                  </div>
                  <div className="mt-0.5 text-sm text-ink-500">{formatoCantidad(r.cantidad, r.unidad)} · {fecha(r.fecha)}</div>
                  {r.precioOfrecido != null && r.estado !== "RECHAZADO" && (
                    <div className="mt-2 flex items-center gap-2 rounded-control bg-pri-50 p-2 text-base font-semibold text-pri-800">
                      <Icono nombre="dinero" size={20} />
                      Te ofrece {precioUnidad(r.precioOfrecido, r.unidad)}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <footer className="flex items-center justify-center gap-2 px-4 py-4 text-xs text-ink-500">
        <Isotipo size={18} />
        Tu enlace es personal: no lo compartas.
      </footer>
    </div>
  );
}
