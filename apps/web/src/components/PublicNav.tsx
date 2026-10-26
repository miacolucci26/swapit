"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useModo } from "@/lib/modo";
import { Logo } from "./Logo";
import ToggleTema from "./ToggleTema";

/**
 * Barra de las páginas públicas. En las que mezclan información libre con la app (p. ej. «Aprovechamiento») se pide
 * `detectarSesion` para ofrecer «Mi panel» a quien ya ingresó, en lugar de «Ingresar / Crear cuenta».
 */
export default function PublicNav({ detectarSesion = false, sobreHero = false }: { detectarSesion?: boolean; sobreHero?: boolean }) {
  const modo = useModo();
  const [dentro, setDentro] = useState(false);
  useEffect(() => {
    if (detectarSesion) api("/auth/me").then(() => setDentro(true)).catch(() => undefined);
  }, [detectarSesion]);
  const enlace = sobreHero
    ? "min-h-10 items-center gap-1.5 rounded-xl border border-transparent px-4 py-2 text-sm font-medium text-white/90 transition hover:border-white/30 hover:bg-white/15 hover:text-white hover:shadow-[0_1px_0_rgba(255,255,255,0.25)_inset] hover:backdrop-blur-md focus-visible:border-white/40 focus-visible:bg-white/15 focus-visible:outline-none"
    : "min-h-10 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900";
  const primario = sobreHero
    ? "inline-flex min-h-10 whitespace-nowrap items-center rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.25)_inset] backdrop-blur-md transition hover:bg-white/25"
    : "inline-flex min-h-10 whitespace-nowrap items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:text-zinc-50 shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_1px_2px_rgba(24,24,27,0.2)] transition hover:bg-zinc-700";
  return (
    <header className={sobreHero ? "absolute inset-x-0 top-0 z-40" : "sticky top-0 z-40 border-b border-zinc-200/70 bg-white/70 backdrop-blur-xl"}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
        <Logo claro={sobreHero} />
        {sobreHero && (
          <nav className="hidden items-center gap-1 md:flex" aria-label="Secciones de la portada">
            <a href="#como-funciona" className={`inline-flex ${enlace}`}>Cómo funciona</a>
            <a href="#beneficios" className={`inline-flex ${enlace}`}>Qué te da Swapit</a>
            <Link href="/aprovechamiento" className={`inline-flex ${enlace}`}>Aprovechamiento</Link>
          </nav>
        )}
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Principal">
          <Link href="/aprovechamiento" className={`${sobreHero ? "hidden" : "hidden sm:inline-flex"} ${enlace}`}>
            Aprovechamiento
          </Link>
          {modo === "MARKETPLACE" && <Link href="/impacto" className={`hidden sm:inline-flex ${enlace}`}>Impacto</Link>}
          {dentro ? (
            <Link href="/panel" className={primario}>Mi panel</Link>
          ) : (
            <>
              <Link href="/login" className={`inline-flex ${enlace}`}>Ingresar</Link>
              <Link href="/registro" className={primario}>Crear cuenta</Link>
            </>
          )}
          <ToggleTema sobreHero={sobreHero} />
        </nav>
      </div>
    </header>
  );
}
