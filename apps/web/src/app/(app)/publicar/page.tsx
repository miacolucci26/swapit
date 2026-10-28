"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { crearLoteSchema, ETIQUETA_UNIDAD } from "@swapit/shared";
import { PanelOportunidades } from "@/components/PanelOportunidades";
import { RequiereModo } from "@/components/ShellMarket";
import { Btn, Field, inputCls, PageHeader } from "@/components/ui";
import { Icono } from "@/components/vis/Iconos";
import { api, ApiError } from "@/lib/api";
import { corto } from "@/lib/format";
import type { Categoria, Lote, Unidad } from "@/lib/types";

const MapaUbicacion = dynamic(() => import("@/components/MapaMarket").then((m) => m.MapaUbicacion), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-card bg-surface-2" />,
});

interface Subida { nombre: string; url: string }
type Punto = { lat: number; lng: number };

const MAX_FOTOS = 3;
/** Mensajes en castellano para los campos que valida el esquema (categoría, precio y ubicación se revisan aparte). */
const MENSAJE_CAMPO: Record<string, string> = {
  titulo: "El título debe tener entre 5 y 140 caracteres.",
  descripcion: "La descripción debe tener al menos 10 caracteres.",
  cantidad: "Indica una cantidad mayor que cero.",
};

async function subir(file: File): Promise<Subida> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/uploads", { method: "POST", body: fd, credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.message ?? "No se pudo subir la imagen", res.status);
  return data;
}

/** Publicar (solo modo vendedor): fotos, título, precio, descripción y ubicación en el mapa. */
export default function Publicar() {
  return (
    <RequiereModo modo="vendedor">
      <Formulario />
    </RequiereModo>
  );
}

function Formulario() {
  const router = useRouter();
  const [cats, setCats] = useState<Categoria[]>([]);
  const [fotos, setFotos] = useState<Subida[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [categoria, setCategoria] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [unidad, setUnidad] = useState<Unidad>("und");
  const [punto, setPunto] = useState<Punto | null>(null);
  const [direccion, setDireccion] = useState("");
  const [ubicando, setUbicando] = useState(false);
  const [avisoMapa, setAvisoMapa] = useState("");
  const [errores, setErrores] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api<Categoria[]>("/categorias").then(setCats).catch(() => undefined);
    // El pin empieza en la zona de la cuenta; el vendedor lo mueve a donde está el producto.
    api<{ ubicacion: Punto | null }>("/empresas/mi").then((e) => { if (e.ubicacion) setPunto(e.ubicacion); }).catch(() => undefined);
  }, []);

  const cat = cats.find((c) => c.codigo === categoria);
  const unidades = useMemo<Unidad[]>(() => (cat?.kgPorUnidad ? ["und", "kg", "ton"] : ["kg", "ton"]), [cat]);
  useEffect(() => {
    if (cat) setUnidad(cat.unidadBase === "und" && !cat.kgPorUnidad ? "kg" : cat.unidadBase);
  }, [cat]);

  async function agregarFotos(files: FileList | null) {
    if (!files?.length) return;
    setSubiendo(true);
    setErrores([]);
    try {
      const nuevas = await Promise.all([...files].slice(0, MAX_FOTOS - fotos.length).map(subir));
      setFotos((f) => [...f, ...nuevas].slice(0, MAX_FOTOS));
    } catch (e) {
      setErrores([e instanceof ApiError ? e.message : "No se pudo subir la foto"]);
    } finally {
      setSubiendo(false);
    }
  }

  async function ubicarDireccion() {
    if (direccion.trim().length < 3) return;
    setUbicando(true);
    setAvisoMapa("");
    try {
      const r = await api<{ lat: number; lng: number; aproximada: boolean } | null>(`/lotes/geocodificar?q=${encodeURIComponent(direccion.trim())}`);
      if (!r) setAvisoMapa("No encontramos esa dirección. Mueve el pin en el mapa.");
      else {
        setPunto({ lat: r.lat, lng: r.lng });
        if (r.aproximada) setAvisoMapa("Ubicamos la ciudad; ajusta el pin al lugar exacto.");
      }
    } catch {
      setAvisoMapa("No se pudo buscar la dirección. Mueve el pin en el mapa.");
    } finally {
      setUbicando(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrores([]);
    const f = new FormData(e.currentTarget);
    const parsed = crearLoteSchema.safeParse({
      categoriaCodigo: categoria,
      titulo: String(f.get("titulo") ?? "").trim(),
      descripcion: String(f.get("descripcion") ?? "").trim(),
      cantidad: Number(f.get("cantidad")),
      unidad,
      modalidad: "VENTA",
      precio: Number(f.get("precio")),
      imagenes: fotos.map((x) => x.nombre),
      ubicacion: punto ?? undefined,
    });
    const faltan: string[] = [];
    if (!categoria) faltan.push("Elige una categoría.");
    if (!(Number(f.get("precio")) > 0)) faltan.push("Indica el precio.");
    if (!punto) faltan.push("Marca la ubicación en el mapa.");
    if (!parsed.success || faltan.length) {
      const campos = parsed.success ? [] : parsed.error.issues.map((i) => MENSAJE_CAMPO[String(i.path[0])]).filter(Boolean);
      setErrores([...new Set([...faltan, ...campos])]);
      return;
    }
    setEnviando(true);
    try {
      const l = await api<Lote>("/lotes", { method: "POST", json: parsed.data });
      router.push(`/lotes/${l.id}`);
    } catch (err) {
      setErrores(err instanceof ApiError ? (err.errores?.map((x) => x.mensaje) ?? [err.message]) : ["No se pudo conectar con el servidor"]);
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader titulo="Publicar" sub="Fotos, título, precio, descripción y dónde está el producto." />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <section className="rounded-2xl border border-zinc-200/80 bg-white/80 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_-8px_rgba(24,24,27,0.10)] backdrop-blur-xl p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold text-nav-900">Fotos <span className="font-normal text-ink-500">(hasta {MAX_FOTOS})</span></h2>
          <div className="flex flex-wrap gap-3">
            {fotos.map((x) => (
              <div key={x.nombre} className="relative size-28 overflow-hidden rounded-control border border-line bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={x.url} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setFotos((f) => f.filter((y) => y.nombre !== x.nombre))} aria-label="Quitar foto" className="absolute right-1 top-1 grid size-8 place-items-center rounded-full bg-white/90 text-ink-700 shadow hover:text-error">
                  <Icono nombre="cerrar" size={14} />
                </button>
              </div>
            ))}
            {fotos.length < MAX_FOTOS && (
              <label className={`grid size-28 cursor-pointer place-items-center rounded-control border-2 border-dashed border-ink-300 text-center text-xs font-medium text-ink-500 transition hover:border-nav-600 hover:text-nav-700 ${subiendo ? "pointer-events-none opacity-60" : ""}`}>
                <span className="flex flex-col items-center gap-1"><Icono nombre="mas" size={20} />{subiendo ? "Subiendo…" : "Agregar foto"}</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => { agregarFotos(e.target.files); e.target.value = ""; }} />
              </label>
            )}
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl border border-zinc-200/80 bg-white/80 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_-8px_rgba(24,24,27,0.10)] backdrop-blur-xl p-4 sm:grid-cols-2 sm:p-5">
          <div className="sm:col-span-2">
            <Field label="Título"><input name="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required minLength={5} maxLength={140} placeholder="Ej. Silla de madera en buen estado" className={inputCls} /></Field>
          </div>
          <Field label="Precio (S/)">
            <input name="precio" type="number" inputMode="decimal" min={0} step="0.01" required placeholder="0.00" className={inputCls} />
          </Field>
          <Field label="Categoría">
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} required className={inputCls}>
              <option value="">Elige…</option>
              {cats.map((c) => <option key={c.codigo} value={c.codigo}>{corto(c.nombre)}</option>)}
            </select>
          </Field>
          <Field label="Cantidad disponible">
            <div className="flex gap-2">
              <input name="cantidad" type="number" inputMode="decimal" min={0} step="any" defaultValue={1} required className={inputCls} />
              <select value={unidad} onChange={(e) => setUnidad(e.target.value as Unidad)} aria-label="Unidad" className={`${inputCls} w-36`}>
                {unidades.map((u) => <option key={u} value={u}>{ETIQUETA_UNIDAD[u].plural}</option>)}
              </select>
            </div>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Descripción" hint="Estado, medidas, qué incluye y cómo se entrega.">
              <textarea name="descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required minLength={10} maxLength={2000} rows={4} className={inputCls} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <PanelOportunidades titulo={titulo} descripcion={descripcion} categoria={categoria} />
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200/80 bg-white/80 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_-8px_rgba(24,24,27,0.10)] backdrop-blur-xl p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-nav-900">Ubicación</h2>
          <p className="mb-3 text-xs text-ink-500">Mueve el pin (o toca el mapa) hasta donde está el producto. Los compradores solo ven la zona aproximada.</p>
          <div className="mb-3 flex gap-2">
            <input
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ubicarDireccion(); } }}
              placeholder="O escribe la dirección: Av. Grau 450, Piura"
              aria-label="Dirección"
              className={inputCls}
            />
            <Btn type="button" variante="borde" onClick={ubicarDireccion} disabled={ubicando || direccion.trim().length < 3} className="shrink-0">
              {ubicando ? "Buscando…" : "Ubicar"}
            </Btn>
          </div>
          {avisoMapa && <p role="status" className="mb-2 text-sm text-ambar-700">{avisoMapa}</p>}
          <MapaUbicacion punto={punto} onChange={setPunto} className="h-72" />
        </section>

        {errores.length > 0 && (
          <ul role="alert" className="space-y-1 rounded-control border border-error/30 bg-error-tint p-3 text-sm font-medium text-error-ink">
            {errores.map((m) => <li key={m} className="flex items-start gap-2"><Icono nombre="alerta" size={16} className="mt-0.5 shrink-0" />{m}</li>)}
          </ul>
        )}
        <Btn disabled={enviando || subiendo} className="min-h-12 text-base sm:self-end sm:px-8">{enviando ? "Publicando…" : "Publicar"}</Btn>
      </form>
    </div>
  );
}
