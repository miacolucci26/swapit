"use client";

import Link from "next/link";
import { useFavoritos } from "@/lib/favoritos";
import { num } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { Lote } from "@/lib/types";
import { esDemo, FotoLote, precioOferta, zonaAprox } from "./LoteCard";
import { Badge, InsigniaDemo } from "./ui";
import { Icono } from "./vis/Iconos";

/** Corazón de favoritos (solo modo comprador). */
export function BotonFavorito({ loteId, titulo, className = "" }: { loteId: string; titulo: string; className?: string }) {
  const { user, modoUso } = useSession();
  const { esFavorito, alternar } = useFavoritos(user?.id);
  if (modoUso !== "comprador") return null;
  const activo = esFavorito(loteId);
  return (
    <button
      type="button"
      onClick={() => alternar(loteId)}
      aria-pressed={activo}
      aria-label={activo ? `Quitar «${titulo}» de favoritos` : `Guardar «${titulo}» en favoritos`}
      title={activo ? "Quitar de favoritos" : "Guardar en favoritos"}
      className={`grid size-10 place-items-center rounded-full bg-white/95 shadow-md ring-1 ring-black/5 transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nav-600 ${activo ? "text-error" : "text-ink-500 hover:text-error"} ${className}`}
    >
      <Icono nombre="corazon" size={20} className={activo ? "fill-current" : ""} />
    </button>
  );
}

/** Precio grande de la oferta («S/ 50», «Donación», «A negociar»). */
export function PrecioGrande({ l, className = "text-xl" }: { l: Pick<Lote, "modalidad" | "precio" | "unidad">; className?: string }) {
  if (l.modalidad === "VENTA" && l.precio == null) return <span className={`font-semibold text-ink-700 ${className}`}>A negociar</span>;
  const { principal, sufijo } = precioOferta(l);
  return (
    <span className={`num font-bold text-nav-900 ${className}`}>
      {principal}
      {sufijo && <span className="ml-0.5 text-xs font-medium text-ink-500">{sufijo}</span>}
    </span>
  );
}

/** Tarjeta del marketplace: foto, título, precio bien visible, tienda, zona y corazón. */
export default function TarjetaOferta({ l }: { l: Lote }) {
  return (
    <div className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/80 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_-8px_rgba(24,24,27,0.10)] backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:border-emerald-400/70 hover:shadow-[0_8px_30px_-12px_rgba(16,185,129,0.45)]">
      <Link href={`/lotes/${l.id}`} className="flex flex-1 flex-col focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nav-600">
        <div className="relative aspect-square overflow-hidden bg-surface-2 sm:aspect-[4/3]">
          <FotoLote l={l} className="transition duration-300 group-hover:scale-[1.03]" />
          {l.estado === "PAUSADO" && <Badge tono="ambar" className="absolute left-2 top-2">Pausada</Badge>}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-ink-900">{l.titulo}</h3>
          <PrecioGrande l={l} />
          <p className="mt-auto flex items-center gap-1.5 pt-1 text-xs text-ink-700">
            <Icono nombre="tienda" size={14} className="shrink-0 text-ink-500" />
            <span className="truncate">{l.razonSocial}</span>
            {esDemo(l) && <InsigniaDemo className="ml-auto shrink-0" />}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-ink-500">
            <Icono nombre="ubicacion" size={14} className="shrink-0" />
            <span className="truncate">{zonaAprox(l.ubicacion)}{l.distanciaKm != null && !l.esMio ? ` · ${num(l.distanciaKm, 0)} km` : ""}</span>
          </p>
        </div>
      </Link>
      <BotonFavorito loteId={l.id} titulo={l.titulo} className="absolute right-2 top-2" />
    </div>
  );
}
