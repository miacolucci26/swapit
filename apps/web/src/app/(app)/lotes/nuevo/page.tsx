"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ETIQUETA_UNIDAD, formatoCantidad, usosParaMaterial } from "@swapit/shared";
import { ETIQUETA_MODALIDAD, solesPrecio, zonaAprox } from "@/components/LoteCard";
import { Badge, Btn, inputCls, PageHeader, PuntoCategoria } from "@/components/ui";
import { Icono } from "@/components/vis/Iconos";
import { api, ApiError } from "@/lib/api";
import { CONDICION, corto, ENTREGA, FRECUENCIA, num, porUnidad } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { Categoria } from "@/lib/types";

interface Sugerencia {
  categoriaCodigo: string; categoriaNombre: string; confianza: number; titulo: string; descripcion: string;
  keywords: string[]; precioReferencia: number | null; unidadBase: "ton" | "kg" | "und"; modo: "claude" | "demo"; explicacion: string; advertencia?: string;
}
interface Subida { nombre: string; url: string }
type Modalidad = "VENTA" | "DONACION" | "CREDITOS" | "INTERCAMBIO";
type Coord = { lat: number; lng: number } | null;

const MAX_FOTOS = 3;
const PASOS = ["Material", "Cantidad y ubicación", "Revisar y publicar"] as const;
/** CREDITOS sigue soportado por la API, pero no se ofrece en el flujo principal. */
const MODALIDADES = ["VENTA", "DONACION", "INTERCAMBIO"] as const;
const AYUDA_MODALIDAD: Record<string, string> = {
  VENTA: "Fijas un precio por unidad.",
  DONACION: "Sin costo para quien recibe.",
  INTERCAMBIO: "A cambio de otro material o servicio.",
};

async function subir(file: File): Promise<Subida> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/uploads", { method: "POST", body: fd, credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.message ?? "No se pudo subir la imagen", res.status);
  return data;
}

/** Campo con etiqueta, ayuda y error asociados (htmlFor / aria-describedby). */
function Campo({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: (p: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => React.ReactNode }) {
  const desc = [hint ? `${id}-hint` : "", error ? `${id}-err` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[13px] font-medium text-ink-700">{label}</label>
      {children({ id, "aria-invalid": !!error, "aria-describedby": desc })}
      {hint && <span id={`${id}-hint`} className="text-xs text-ink-500">{hint}</span>}
      {error && <span id={`${id}-err`} className="text-xs font-medium text-error-ink">{error}</span>}
    </div>
  );
}

const errCls = (e?: string) => (e ? "!border-error" : "");

export default function NuevoLote() {
  const router = useRouter();
  const { user } = useSession();
  const esPersona = user?.empresa.tipo === "PERSONA";
  const [paso, setPaso] = useState(0);
  const [validar, setValidar] = useState(false);
  const [cats, setCats] = useState<Categoria[]>([]);
  const [fotos, setFotos] = useState<Subida[]>([]);
  const [principal, setPrincipal] = useState(0);
  const [subiendo, setSubiendo] = useState(false);
  const [sug, setSug] = useState<Sugerencia | null>(null);

  const [descripcion, setDescripcion] = useState("");
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [keywords, setKeywords] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [unidad, setUnidad] = useState<"ton" | "kg" | "und">("ton");
  const [modalidad, setModalidad] = useState<Modalidad>("VENTA");
  const [precio, setPrecio] = useState("");
  const [notaIntercambio, setNotaIntercambio] = useState("");
  const [frecuencia, setFrecuencia] = useState("UNICO");
  const [condicion, setCondicion] = useState("");
  const [entrega, setEntrega] = useState<keyof typeof ENTREGA>("RECOJO_RECEPTOR");
  const [aceptaCreditos, setAceptaCreditos] = useState(false);
  const [direccion, setDireccion] = useState("");
  const [direccionInicial, setDireccionInicial] = useState("");
  const [ubicacion, setUbicacion] = useState<Coord>(null);
  const [error, setError] = useState<string[]>([]);
  const [publicando, setPublicando] = useState(false);

  // Lo que la persona ya tocó a mano no se vuelve a sobrescribir con la sugerencia.
  const tocado = useRef({ titulo: false, categoria: false, keywords: false, precio: false });
  const modalidadRef = useRef(modalidad);
  modalidadRef.current = modalidad;
  const titularPaso = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    api<Categoria[]>("/categorias").then(setCats);
    const d = new URLSearchParams(window.location.search).get("desc");
    if (d) setDescripcion(d);
    api<{ direccion: string | null; ubicacion: Coord }>("/empresas/mi").then((e) => {
      setDireccion(e.direccion ?? "");
      setDireccionInicial(e.direccion ?? "");
      setUbicacion(e.ubicacion);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (esPersona) setEntrega("PUNTO_ENCUENTRO");
  }, [esPersona]);

  // Al llevar el foco al título del paso, quien usa lector de pantalla sabe dónde está.
  const primeraVez = useRef(true);
  useEffect(() => {
    if (primeraVez.current) { primeraVez.current = false; return; }
    titularPaso.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [paso]);

  // Al describir el material se sugiere categoría, título y precio de referencia (se puede editar todo).
  useEffect(() => {
    if (descripcion.trim().length < 12) return;
    let vigente = true;
    const t = setTimeout(() => {
      api<Sugerencia>("/ia/clasificar", { method: "POST", json: { descripcion, imagenes: fotos.map((f) => f.nombre) } })
        .then((s) => {
          if (!vigente) return;
          setSug(s);
          if (!tocado.current.categoria) { setCategoria(s.categoriaCodigo); setUnidad(s.unidadBase); }
          if (!tocado.current.titulo) setTitulo(s.titulo);
          if (!tocado.current.keywords) setKeywords(s.keywords.join(", "));
          if (!tocado.current.precio && s.precioReferencia && modalidadRef.current === "VENTA") setPrecio(String(s.precioReferencia));
        })
        .catch(() => undefined);
    }, 900);
    return () => { vigente = false; clearTimeout(t); };
    // Las fotos no vuelven a disparar el análisis: solo el texto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descripcion]);

  const usos = descripcion.trim().length >= 6 ? usosParaMaterial(descripcion).slice(0, 2) : [];
  const catSel = cats.find((c) => c.codigo === categoria);
  const refPrecio = sug?.precioReferencia != null && unidad === sug.unidadBase ? sug.precioReferencia : null;
  const sinPrecio = modalidad === "DONACION" || modalidad === "INTERCAMBIO";
  const ubicacionCambia = direccion.trim() !== direccionInicial.trim();

  // ---- Validación en línea (solo lo necesario para crear la oferta) ----
  const e1 = {
    descripcion: descripcion.trim().length < 10 ? "Cuéntanos qué material es (mínimo 10 caracteres)." : "",
    titulo: titulo.trim().length < 5 ? "Pon un título de al menos 5 caracteres." : "",
    categoria: !categoria ? "Elige el tipo de material." : "",
  };
  const e2 = {
    cantidad: !(Number(cantidad) > 0) ? "Indica la cantidad disponible." : "",
    precio: !sinPrecio && !(Number(precio) > 0) ? "Indica el precio por unidad." : "",
    direccion: ubicacionCambia && direccion.trim().length > 0 && direccion.trim().length < 5 ? "Escribe al menos la ciudad (mínimo 5 caracteres)." : "",
  };
  const ok1 = !e1.descripcion && !e1.titulo && !e1.categoria;
  const ok2 = !e2.cantidad && !e2.precio && !e2.direccion;
  const ver = (e?: string) => (validar ? e : undefined);

  function elegirCategoria(codigo: string) {
    tocado.current.categoria = true;
    setCategoria(codigo);
    const c = cats.find((x) => x.codigo === codigo);
    if (c) setUnidad(c.unidadBase);
  }

  async function onFotos(files: FileList | null) {
    if (!files?.length) return;
    setSubiendo(true);
    setError([]);
    try {
      const nuevas: Subida[] = [];
      for (const f of Array.from(files).slice(0, MAX_FOTOS - fotos.length)) nuevas.push(await subir(f));
      setFotos((x) => [...x, ...nuevas]);
    } catch (e) {
      setError([e instanceof ApiError ? e.message : "Error al subir la imagen"]);
    } finally {
      setSubiendo(false);
    }
  }

  function quitarFoto(i: number) {
    setFotos((x) => x.filter((_, j) => j !== i));
    setPrincipal(0);
  }

  function irA(p: number) {
    setValidar(false);
    setError([]);
    setPaso(p);
  }

  function siguiente() {
    setValidar(true);
    if (paso === 0 && !ok1) return;
    if (paso === 1 && !ok2) return;
    irA(paso + 1);
  }

  async function publicar() {
    setError([]);
    setPublicando(true);
    // La foto principal va primero: es la que se ve en la tarjeta.
    const orden = fotos.length ? [fotos[principal], ...fotos.filter((_, i) => i !== principal)] : [];
    try {
      // La ubicación de la oferta es la de la empresa: si cambió, se actualiza (y se geocodifica) antes de publicar.
      if (ubicacionCambia && direccion.trim().length >= 5) {
        await api("/empresas/mi", { method: "PATCH", json: { direccion: direccion.trim() } });
      }
      const lote = await api<{ id: string }>("/lotes", {
        method: "POST",
        json: {
          categoriaCodigo: categoria, titulo, descripcion,
          keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
          cantidad: Number(cantidad), unidad, modalidad, precio: sinPrecio ? undefined : Number(precio) || undefined,
          precioReferencia: refPrecio ?? sug?.precioReferencia ?? undefined, aceptaCreditos, frecuencia, condicion: condicion || undefined, entrega, imagenes: orden.map((f) => f.nombre),
          notaIntercambio: modalidad === "INTERCAMBIO" ? notaIntercambio.trim() || undefined : undefined,
          iaSugerencia: sug ? { modo: sug.modo, confianza: sug.confianza, categoriaSugerida: sug.categoriaCodigo } : undefined,
        },
      });
      router.push(`/lotes/${lote.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? (err.errores?.map((x) => `${x.campo}: ${x.mensaje}`) ?? [err.message]) : ["Error de conexión"]);
      setPublicando(false);
    }
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (paso < 2) siguiente();
    else if (!publicando) publicar();
  }

  const fotoGrande = fotos[principal];
  const panel = "rounded-card border border-line bg-white p-4 shadow-card sm:p-5";
  const sufPrecio = porUnidad(unidad);
  const zonaTexto = ubicacionCambia ? direccion.trim() : ubicacion ? zonaAprox(ubicacion) : direccion.trim() || "Sin ubicación";
  const precioResumen = modalidad === "VENTA" ? `${solesPrecio(Number(precio) || null)}${sufPrecio}` : ETIQUETA_MODALIDAD[modalidad];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader titulo="Publicar oferta" sub="Tres pasos cortos. Pedimos solo lo necesario para que otras empresas puedan evaluarla." />

      {/* Progreso */}
      <nav aria-label="Progreso de la publicación" className="mb-5">
        <p className="mb-2 text-xs font-medium text-ink-500" aria-live="polite">Paso {paso + 1} de {PASOS.length}</p>
        <ol className="grid grid-cols-3 gap-2">
          {PASOS.map((p, i) => {
            const hecho = i < paso;
            const actual = i === paso;
            return (
              <li key={p} aria-current={actual ? "step" : undefined} className="min-w-0">
                <div className={`h-1.5 rounded-full ${hecho || actual ? "bg-pri-600" : "bg-ink-100"}`} />
                <div className="mt-2 flex items-start gap-2">
                  <span aria-hidden="true" className={`num grid size-5 shrink-0 place-items-center rounded-md text-[11px] font-semibold ${hecho ? "bg-pri-600 text-white" : actual ? "bg-nav-700 text-white" : "bg-ink-100 text-ink-500"}`}>
                    {hecho ? <Icono nombre="check" size={12} /> : i + 1}
                  </span>
                  <span className={`min-w-0 text-xs leading-tight sm:text-sm ${actual ? "font-semibold text-nav-900" : "font-medium text-ink-500"}`}>
                    {p}{hecho && <span className="sr-only"> (completado)</span>}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>

      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        {/* ------------------------------ Paso 1 ------------------------------ */}
        {paso === 0 && (
          <>
            <section className={panel} aria-labelledby="t-paso">
              <h2 id="t-paso" ref={titularPaso} tabIndex={-1} className="text-base font-semibold text-nav-900 outline-none md:text-lg">Fotos del material</h2>
              <p className="mt-0.5 text-sm text-ink-500">Opcional, pero las ofertas con fotos reciben más propuestas. Hasta {MAX_FOTOS}.</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {fotos.map((f, i) => (
                  <div key={f.nombre} className="relative">
                    <button type="button" onClick={() => setPrincipal(i)} aria-label={`Foto ${i + 1}${principal === i ? " (principal)" : ": usar como principal"}`} aria-pressed={principal === i} className={`block size-24 overflow-hidden rounded-control border-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nav-600 ${principal === i ? "border-pri-600" : "border-line"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f.url} alt="" className="h-full w-full object-cover" />
                    </button>
                    {principal === i && <span className="absolute inset-x-0 bottom-0 rounded-b-control bg-pri-600/90 py-0.5 text-center text-[11px] font-medium text-white">Principal</span>}
                    <button type="button" onClick={() => quitarFoto(i)} aria-label={`Quitar foto ${i + 1}`} className="absolute -right-2 -top-2 grid size-8 place-items-center rounded-full bg-ink-900 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nav-600"><Icono nombre="cerrar" size={14} /></button>
                  </div>
                ))}
                {fotos.length < MAX_FOTOS && (
                  <label className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-control border border-dashed border-ink-300 bg-surface-2 text-center text-xs font-medium text-ink-700 hover:border-nav-600 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-nav-600">
                    <Icono nombre={subiendo ? "reloj" : "mas"} size={20} className="text-nav-700" />
                    {subiendo ? "Subiendo…" : fotos.length ? "Añadir" : "Subir fotos"}
                    <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { onFotos(e.target.files); e.target.value = ""; }} />
                  </label>
                )}
              </div>
              {fotoGrande && fotos.length > 1 && <p className="mt-2 text-xs text-ink-500">Toca una foto para elegirla como principal; es la que se ve en la tarjeta.</p>}
            </section>

            <section className={`${panel} flex flex-col gap-4`} aria-label="Tipo de material">
              <Campo id="n-desc" label="¿Qué ofreces?" hint="Material, estado, volumen y de dónde viene." error={ver(e1.descripcion)}>
                {(p) => <textarea {...p} required rows={4} maxLength={2000} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={`${inputCls} ${errCls(ver(e1.descripcion))}`} />}
              </Campo>
              {usos.length > 0 && (
                <details className="rounded-control bg-surface-2 px-3.5 py-1">
                  <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-nav-800"><Icono nombre="reciclar" size={16} />Usos posibles de este material</summary>
                  <ul className="mb-2 list-disc pl-5 text-sm text-ink-700">{usos.map((u) => <li key={u.uso.id}>{u.uso.titulo}</li>)}</ul>
                </details>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo id="n-cat" label="Tipo de material" hint={sug && categoria === sug.categoriaCodigo ? "Sugerido según tu descripción." : undefined} error={ver(e1.categoria)}>
                  {(p) => (
                    <select {...p} required value={categoria} onChange={(e) => elegirCategoria(e.target.value)} className={`${inputCls} ${errCls(ver(e1.categoria))}`}>
                      <option value="">Selecciona…</option>
                      {cats.map((c) => <option key={c.codigo} value={c.codigo}>{corto(c.nombre)}</option>)}
                    </select>
                  )}
                </Campo>
                <Campo id="n-tit" label="Título de la oferta" hint={sug && !tocado.current.titulo ? "Sugerido; puedes editarlo." : undefined} error={ver(e1.titulo)}>
                  {(p) => <input {...p} required maxLength={140} value={titulo} onChange={(e) => { tocado.current.titulo = true; setTitulo(e.target.value); }} className={`${inputCls} ${errCls(ver(e1.titulo))}`} />}
                </Campo>
              </div>
            </section>
          </>
        )}

        {/* ------------------------------ Paso 2 ------------------------------ */}
        {paso === 1 && (
          <>
            <section className={`${panel} flex flex-col gap-4`} aria-labelledby="t-paso">
              <div>
                <h2 id="t-paso" ref={titularPaso} tabIndex={-1} className="text-base font-semibold text-nav-900 outline-none md:text-lg">Cantidad y disponibilidad</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo id="n-cant" label="Cantidad disponible" error={ver(e2.cantidad)}>
                  {(p) => (
                    <div className="flex gap-2">
                      <input {...p} required type="number" inputMode="decimal" min={unidad === "ton" ? 0.1 : 1} step={unidad === "ton" ? 0.1 : 1} value={cantidad} onChange={(e) => setCantidad(e.target.value)} className={`${inputCls} min-w-0 flex-1 ${errCls(ver(e2.cantidad))}`} />
                      <select value={unidad} onChange={(e) => setUnidad(e.target.value as "ton" | "kg" | "und")} className={`${inputCls} !w-32 shrink-0`} aria-label="Unidad">
                        <option value="ton">toneladas</option>
                        <option value="kg">kilos</option>
                        {catSel?.kgPorUnidad && <option value="und">unidades</option>}
                      </select>
                    </div>
                  )}
                </Campo>
                <Campo id="n-frec" label="Disponibilidad">
                  {(p) => (
                    <select {...p} value={frecuencia} onChange={(e) => setFrecuencia(e.target.value)} className={inputCls}>
                      {Object.entries(FRECUENCIA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  )}
                </Campo>
              </div>
              <Campo id="n-ubi" label="Ubicación de retiro (ciudad o dirección)" hint={ubicacionCambia ? "Al publicar, se actualizará la ubicación de tu empresa. Se muestra solo la zona, nunca la dirección exacta." : ubicacion ? `Zona visible: ${zonaAprox(ubicacion)}. Se muestra solo la zona, nunca la dirección exacta.` : "Incluye la ciudad (ej. «Piura», «Chiclayo»). Se muestra solo la zona."} error={ver(e2.direccion)}>
                {(p) => <input {...p} autoComplete="off" value={direccion} onChange={(e) => setDireccion(e.target.value)} className={`${inputCls} ${errCls(ver(e2.direccion))}`} />}
              </Campo>
            </section>

            <section className={`${panel} flex flex-col gap-4`} aria-label="Modalidad y precio">
              <fieldset>
                <legend className="text-base font-semibold text-nav-900 md:text-lg">Modalidad</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {MODALIDADES.map((m) => (
                    <label key={m} className={`relative flex min-h-12 cursor-pointer flex-col justify-center rounded-control border px-3 py-2 transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-nav-600 ${modalidad === m ? "border-pri-600 bg-pri-50" : "border-ink-300 bg-white hover:border-nav-600"}`}>
                      <input type="radio" name="modalidad" value={m} checked={modalidad === m} onChange={() => setModalidad(m)} className="sr-only" />
                      <span className="text-sm font-semibold text-ink-900">{ETIQUETA_MODALIDAD[m]}</span>
                      <span className="text-xs text-ink-500">{AYUDA_MODALIDAD[m]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {!sinPrecio && (
                <Campo id="n-precio" label={`Precio por ${ETIQUETA_UNIDAD[unidad].porUnidad} (S/)`} hint={refPrecio ? `Referencia de mercado: S/ ${num(refPrecio, 0)}${sufPrecio}` : undefined} error={ver(e2.precio)}>
                  {(p) => <input {...p} required type="number" inputMode="decimal" min="0.01" step="0.01" value={precio} onChange={(e) => { tocado.current.precio = true; setPrecio(e.target.value); }} className={`${inputCls} sm:max-w-xs ${errCls(ver(e2.precio))}`} />}
                </Campo>
              )}
            </section>

            <details className="rounded-card border border-line bg-white px-4 shadow-card sm:px-5">
              <summary className="flex min-h-12 cursor-pointer items-center gap-2 text-sm font-semibold text-nav-800"><Icono nombre="mas" size={16} />Más detalles (opcional)</summary>
              <div className="flex flex-col gap-4 pb-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo id="n-cond" label="Condición">
                    {(p) => (
                      <select {...p} value={condicion} onChange={(e) => setCondicion(e.target.value)} className={inputCls}>
                        <option value="">No indicar</option>
                        {Object.entries(CONDICION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    )}
                  </Campo>
                  <Campo id="n-ent" label="Entrega" hint={ENTREGA[entrega].ayuda}>
                    {(p) => (
                      <select {...p} value={entrega} onChange={(e) => setEntrega(e.target.value as keyof typeof ENTREGA)} className={inputCls}>
                        {Object.entries(ENTREGA).map(([k, v]) => <option key={k} value={k}>{v.corta}</option>)}
                      </select>
                    )}
                  </Campo>
                </div>
                <Campo id="n-kw" label="Palabras clave" hint="Separadas por comas; ayudan a que te encuentren.">
                  {(p) => <input {...p} value={keywords} onChange={(e) => { tocado.current.keywords = true; setKeywords(e.target.value); }} className={inputCls} />}
                </Campo>
                {modalidad === "INTERCAMBIO" && (
                  <Campo id="n-nota" label="¿Qué quieres a cambio?" hint="Ej. cartón corrugado o pallets.">
                    {(p) => <input {...p} maxLength={300} value={notaIntercambio} onChange={(e) => setNotaIntercambio(e.target.value)} className={inputCls} />}
                  </Campo>
                )}
                {modalidad === "VENTA" && (
                  <label className="flex min-h-11 items-center gap-2.5 text-sm text-ink-700">
                    <input type="checkbox" className="size-5 accent-pri-600" checked={aceptaCreditos} onChange={(e) => setAceptaCreditos(e.target.checked)} />
                    También acepto créditos circulares
                  </label>
                )}
              </div>
            </details>
          </>
        )}

        {/* ------------------------------ Paso 3 ------------------------------ */}
        {paso === 2 && (
          <section className={panel} aria-labelledby="t-paso">
            <h2 id="t-paso" ref={titularPaso} tabIndex={-1} className="text-base font-semibold text-nav-900 outline-none md:text-lg">Revisa tu oferta</h2>
            <p className="mt-0.5 text-sm text-ink-500">Así la verán otras empresas. Puedes volver a cualquier paso para corregir.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
              <div className="aspect-[4/3] overflow-hidden rounded-control border border-line bg-surface-2 sm:aspect-square">
                {fotoGrande ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fotoGrande.url} alt="Foto principal de la oferta" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-ink-500">
                    <span aria-hidden="true" className="text-5xl font-semibold text-ink-300">{(corto(catSel?.nombre ?? "Material")).charAt(0)}</span>
                    <span className="text-xs">Sin fotos</span>
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tono="azul">{ETIQUETA_MODALIDAD[modalidad]}</Badge>
                  {catSel && <PuntoCategoria codigo={catSel.codigo} etiqueta={corto(catSel.nombre)} />}
                </div>
                <h3 className="mt-2 break-words text-lg font-semibold leading-snug text-nav-900">{titulo}</h3>
                <p className="mt-1 line-clamp-3 break-words text-sm text-ink-700">{descripcion}</p>
              </div>
            </div>
            <div className="mt-4 overflow-hidden rounded-control border border-line bg-white">
            <dl className="-mb-px -mr-px grid grid-cols-1 min-[480px]:grid-cols-2">
              {[
                ["Cantidad", formatoCantidad(Number(cantidad) || 0, unidad)],
                ["Precio", precioResumen],
                ["Ubicación", zonaTexto],
                ["Disponibilidad", FRECUENCIA[frecuencia]],
                ...(condicion ? [["Condición", CONDICION[condicion]]] : []),
                ["Entrega", ENTREGA[entrega].corta],
                ...(modalidad === "INTERCAMBIO" && notaIntercambio.trim() ? [["A cambio de", notaIntercambio.trim()]] : []),
              ].map(([k, v]) => (
                <div key={k} className="min-w-0 border-b border-r border-line px-3.5 py-2.5">
                  <dt className="text-xs font-medium text-ink-500">{k}</dt>
                  <dd className="num mt-0.5 break-words text-sm font-semibold text-ink-900">{v}</dd>
                </div>
              ))}
            </dl>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4">
              <button type="button" onClick={() => irA(0)} className="min-h-11 text-sm font-semibold text-nav-700 underline">Editar material</button>
              <button type="button" onClick={() => irA(1)} className="min-h-11 text-sm font-semibold text-nav-700 underline">Editar cantidad y ubicación</button>
            </div>
          </section>
        )}

        {error.length > 0 && <ul role="alert" className="list-disc rounded-control bg-error-tint py-2.5 pl-8 pr-3 text-sm font-medium text-error-ink">{error.map((m) => <li key={m}>{m}</li>)}</ul>}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          {paso > 0 ? (
            <Btn type="button" variante="borde" onClick={() => irA(paso - 1)} className="min-h-11">Atrás</Btn>
          ) : <span />}
          {paso < 2 ? (
            <Btn type="submit" disabled={subiendo} className="min-h-11">Continuar<Icono nombre="flecha" size={16} /></Btn>
          ) : (
            <Btn type="submit" disabled={publicando || subiendo} className="min-h-11">{publicando ? "Publicando…" : "Publicar oferta"}</Btn>
          )}
        </div>
      </form>
    </div>
  );
}
