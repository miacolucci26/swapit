"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FotoLote, precioOferta, zonaAprox } from "@/components/LoteCard";
import TarjetaOferta, { BotonFavorito, PrecioGrande } from "@/components/TarjetaOferta";
import { Btn, LinkBtn, Segmented, Vacio } from "@/components/ui";
import { Icono } from "@/components/vis/Iconos";
import { api } from "@/lib/api";
import { useBusqueda } from "@/lib/busqueda";
import { num } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { Lote } from "@/lib/types";
import { nombreSector } from "@swapit/shared";

const MapaOfertas = dynamic(() => import("@/components/MapaMarket").then((m) => m.MapaOfertas), {
  ssr: false,
  loading: () => <div className="h-[64vh] min-h-[380px] animate-pulse rounded-card bg-ink-100" />,
});

type Vista = "lista" | "mapa";
interface Filtros { categoria: string; sector: string; zona: string }
const SIN_FILTROS: Filtros = { categoria: "", sector: "", zona: "" };

const sectorDe = (l: Lote) => nombreSector(l.sector) ?? l.sector;

/** Valores distintos de un campo, ordenados, con cuántas ofertas tiene cada uno. */
function opcionesDe(lotes: Lote[], campo: (l: Lote) => string) {
  const n = new Map<string, number>();
  for (const l of lotes) n.set(campo(l), (n.get(campo(l)) ?? 0) + 1);
  return [...n].sort(([a], [b]) => a.localeCompare(b, "es"));
}

/**
 * Filtros por categoría, sector y ubicación. En la vista Mapa flotan sobre el mapa; en la lista van en una fila.
 * Cada lista de opciones sale de las ofertas cargadas, así nunca se ofrece un filtro que deje la pantalla vacía.
 */
function FiltrosOfertas({ lotes, f, onChange, flotante }: { lotes: Lote[]; f: Filtros; onChange: (f: Filtros) => void; flotante?: boolean }) {
  const campos: { clave: keyof Filtros; etiqueta: string; todas: string; ops: [string, number][] }[] = [
    { clave: "categoria", etiqueta: "Categoría", todas: "Todas las categorías", ops: opcionesDe(lotes, (l) => l.categoriaNombre) },
    { clave: "sector", etiqueta: "Sector", todas: "Todos los sectores", ops: opcionesDe(lotes, sectorDe) },
    { clave: "zona", etiqueta: "Ubicación", todas: "Todas las zonas", ops: opcionesDe(lotes, (l) => zonaAprox(l.ubicacion)) },
  ];
  const activos = (Object.keys(f) as (keyof Filtros)[]).filter((k) => f[k]).length;
  return (
    <div
      role="group"
      aria-label="Filtrar ofertas"
      className={flotante
        ? "flex flex-col gap-2 rounded-2xl border border-zinc-200/80 bg-white/85 p-2.5 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_8px_24px_-8px_rgba(24,24,27,0.18)] backdrop-blur-xl sm:w-64"
        : "flex flex-wrap items-center gap-2"}
    >
      {flotante && (
        <p className="flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Filtrar el mapa
          {activos > 0 && <button type="button" onClick={() => onChange(SIN_FILTROS)} className="normal-case tracking-normal text-nav-700 hover:underline">Limpiar</button>}
        </p>
      )}
      {campos.map((c) => (
        <label key={c.clave} className={flotante ? "block" : "block min-w-[10rem] flex-1 sm:flex-none"}>
          <span className="sr-only">{c.etiqueta}</span>
          <select
            value={f[c.clave]}
            onChange={(e) => onChange({ ...f, [c.clave]: e.target.value })}
            className={`min-h-10 w-full rounded-full border bg-white px-3.5 text-sm font-medium outline-none transition focus:border-nav-600 focus:ring-2 focus:ring-nav-100 ${f[c.clave] ? "border-nav-700 text-nav-900" : "border-ink-300 text-ink-700"}`}
          >
            <option value="">{c.todas}</option>
            {c.ops.map(([v, n]) => <option key={v} value={v}>{v} ({n})</option>)}
          </select>
        </label>
      ))}
      {!flotante && activos > 0 && (
        <button type="button" onClick={() => onChange(SIN_FILTROS)} className="min-h-10 px-2 text-sm font-semibold text-nav-700 hover:underline">Limpiar filtros</button>
      )}
    </div>
  );
}

/** Precio corto para el pin del mapa. */
function etiquetaPin(l: Lote) {
  if (l.modalidad === "VENTA" && l.precio == null) return "A negociar";
  return precioOferta(l).principal;
}

/** Mini tarjeta de la oferta elegida en el mapa. */
function MiniTarjeta({ l, onCerrar }: { l: Lote; onCerrar: () => void }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-zinc-200/80 bg-white/80 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_-8px_rgba(24,24,27,0.10)] backdrop-blur-xl p-2.5">
      <Link href={`/lotes/${l.id}`} className="size-24 shrink-0 overflow-hidden rounded-control bg-surface-2"><FotoLote l={l} /></Link>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Link href={`/lotes/${l.id}`} className="line-clamp-2 text-sm font-medium text-ink-900 hover:underline">{l.titulo}</Link>
        <PrecioGrande l={l} className="text-lg" />
        <p className="truncate text-xs text-ink-700">{l.razonSocial}</p>
        <p className="truncate text-xs text-ink-500">{zonaAprox(l.ubicacion)}{l.distanciaKm != null ? ` · ${num(l.distanciaKm, 0)} km` : ""}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between">
        <button type="button" onClick={onCerrar} aria-label="Cerrar" className="grid size-9 place-items-center rounded-full text-ink-500 hover:bg-surface-2 hover:text-ink-900">
          <Icono nombre="cerrar" size={16} />
        </button>
        <BotonFavorito loteId={l.id} titulo={l.titulo} />
      </div>
    </div>
  );
}

/** Marketplace: la pantalla principal de los dos modos (docs/diseno/estructura-web.md §4). */
export default function Marketplace() {
  const { q, setQ } = useBusqueda();
  const { modoUso } = useSession();
  const [vista, setVista] = useState<Vista>("lista");
  const [cerca, setCerca] = useState(false);
  const [lotes, setLotes] = useState<Lote[] | null>(null);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);
  const [origen, setOrigen] = useState<{ lat: number; lng: number } | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);

  useEffect(() => {
    api<{ ubicacion: { lat: number; lng: number } | null }>("/empresas/mi").then((e) => setOrigen(e.ubicacion)).catch(() => undefined);
    // /mapa redirige aquí con ?vista=mapa.
    if (new URLSearchParams(window.location.search).get("vista") === "mapa") setVista("mapa");
  }, []);

  useEffect(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    let vigente = true;
    const t = setTimeout(() => {
      setError(false);
      api<Lote[]>(`/lotes?${p}`)
        .then((r) => { if (vigente) { setLotes(r); setSel(null); } })
        .catch(() => { if (vigente) setError(true); });
    }, q ? 250 : 0);
    return () => { vigente = false; clearTimeout(t); };
  }, [q, intento]);

  // Por defecto lo más nuevo primero; «Cerca de mí» ordena por distancia a tu zona.
  const ordenados = useMemo(() => {
    if (!lotes) return null;
    const l = lotes.filter(
      (x) =>
        (!filtros.categoria || x.categoriaNombre === filtros.categoria) &&
        (!filtros.sector || sectorDe(x) === filtros.sector) &&
        (!filtros.zona || zonaAprox(x.ubicacion) === filtros.zona),
    );
    if (cerca) l.sort((a, b) => (a.distanciaKm ?? Infinity) - (b.distanciaKm ?? Infinity));
    else l.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return l;
  }, [lotes, cerca, filtros]);
  const pins = useMemo(
    () => (ordenados ?? []).filter((l) => l.ubicacion).map((l) => ({ id: l.id, lat: l.ubicacion!.lat, lng: l.ubicacion!.lng, etiqueta: etiquetaPin(l) })),
    [ordenados],
  );
  const elegido = ordenados?.find((l) => l.id === sel);
  const hayFiltros = Object.values(filtros).some(Boolean);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink-500">Vista:</span>
          <Segmented
            etiqueta="Vista"
            valor={vista}
            onChange={(v) => setVista(v as Vista)}
            opciones={[{ valor: "lista", etiqueta: "Lista" }, { valor: "mapa", etiqueta: "Mapa" }]}
          />
        </div>
        <button
          type="button"
          onClick={() => setCerca((v) => !v)}
          aria-pressed={cerca}
          disabled={!origen}
          title={origen ? "Ordenar por distancia" : "Agrega tu zona en el Perfil para ordenar por distancia"}
          className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${cerca ? "border-nav-700 bg-nav-700 text-white" : "border-ink-300 bg-white text-ink-900 hover:border-nav-600"}`}
        >
          <Icono nombre="ubicacion" size={16} />Cerca de mí
        </button>
        <p className="num ml-auto text-sm text-ink-500" aria-live="polite">
          {ordenados ? `${ordenados.length} ${ordenados.length === 1 ? "oferta" : "ofertas"}` : ""}
          {q.trim() && (
            <>
              {" "}para «{q.trim()}»{" "}
              <button type="button" onClick={() => setQ("")} className="font-semibold text-nav-700 underline-offset-2 hover:underline">Quitar</button>
            </>
          )}
        </p>
      </div>

      {error ? (
        <Vacio titulo="No pudimos cargar las ofertas" texto="Puede ser un corte momentáneo de la conexión." accion={<Btn onClick={() => setIntento((n) => n + 1)}>Reintentar</Btn>} />
      ) : !ordenados ? (
        <div role="status" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl border border-zinc-200/80 bg-white/80 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_-8px_rgba(24,24,27,0.10)] backdrop-blur-xl" />)}
          <span className="sr-only">Cargando ofertas…</span>
        </div>
      ) : ordenados.length === 0 && !!lotes?.length && hayFiltros ? (
        <Vacio titulo="Ninguna oferta con esos filtros" texto="Prueba con otra categoría, sector o zona." accion={<Btn variante="borde" onClick={() => setFiltros(SIN_FILTROS)}>Quitar filtros</Btn>} />
      ) : ordenados.length === 0 ? (
        <Vacio
          titulo={q.trim() ? "Nada con esa búsqueda" : "Aún no hay ofertas"}
          texto={q.trim() ? "Prueba con otra palabra." : modoUso === "vendedor" ? "Sé el primero en publicar." : "Cuando alguien publique, lo verás aquí."}
          accion={q.trim() ? <Btn variante="borde" onClick={() => setQ("")}>Ver todo</Btn> : modoUso === "vendedor" ? <LinkBtn href="/publicar">Publicar</LinkBtn> : undefined}
        />
      ) : vista === "lista" ? (
        <>
        <div className="mb-4"><FiltrosOfertas lotes={lotes ?? []} f={filtros} onChange={setFiltros} /></div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {ordenados.map((l) => <TarjetaOferta key={l.id} l={l} />)}
        </div>
        </>
      ) : (
        <div className="relative">
          <MapaOfertas pins={pins} seleccionado={sel} onSelect={setSel} origen={origen} className="h-[64vh] min-h-[380px]" />
          <div className="absolute left-2 top-2 z-10 max-sm:right-2 sm:left-3 sm:top-3">
            <FiltrosOfertas lotes={lotes ?? []} f={filtros} onChange={(f) => { setFiltros(f); setSel(null); }} flotante />
          </div>
          {elegido && (
            <div className="absolute inset-x-2 bottom-2 z-10 sm:left-auto sm:right-3 sm:top-3 sm:bottom-auto sm:w-96">
              <MiniTarjeta l={elegido} onCerrar={() => setSel(null)} />
            </div>
          )}
          <p className="num mt-2 text-xs text-ink-500">{pins.length} de {ordenados.length} ofertas con ubicación · Toca un precio para ver la oferta.</p>
        </div>
      )}
    </>
  );
}
