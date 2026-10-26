"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useModo } from "@/lib/modo";
import { Logo } from "./Logo";

/**
 * Barra de las páginas públicas. En las que mezclan información libre con la app (p. ej. «Aprovechamiento») se pide
 * `detectarSesion` para ofrecer «Mi panel» a quien ya ingresó, en lugar de «Ingresar / Crear cuenta».
 */
export default function PublicNav({ detectarSesion = false }: { detectarSesion?: boolean }) {
  const modo = useModo();
  const [dentro, setDentro] = useState(false);
  useEffect(() => {
    if (detectarSesion) api("/auth/me").then(() => setDentro(true)).catch(() => undefined);
  }, [detectarSesion]);
  const enlace = "min-h-10 items-center gap-1.5 rounded-control px-3 py-2 text-sm font-medium text-ink-700 hover:bg-nav-50 hover:text-nav-900";
  const primario = "inline-flex min-h-10 whitespace-nowrap items-center rounded-control bg-pri-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pri-700";
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Principal">
          <Link href="/aprovechamiento" className={`hidden sm:inline-flex ${enlace}`}>
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
        </nav>
      </div>
    </header>
  );
}
