"use client";

import { fijarTema, useTema } from "@/lib/tema";

/** Botón sol/luna que alterna el tema de toda la página. `sobreHero` lo viste de cristal para ir sobre la foto. */
export default function ToggleTema({ sobreHero = false, className = "" }: { sobreHero?: boolean; className?: string }) {
  const oscuro = useTema() === "oscuro";
  const estilo = sobreHero
    ? "border-white/30 bg-white/15 text-white hover:bg-white/25 backdrop-blur-md"
    : "border-zinc-200/80 bg-white/70 text-zinc-700 hover:bg-zinc-100";
  return (
    <button
      type="button"
      onClick={() => fijarTema(oscuro ? "claro" : "oscuro")}
      aria-label={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={oscuro ? "Modo claro" : "Modo oscuro"}
      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full border transition ${estilo} ${className}`}
    >
      {oscuro ? (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" /></svg>
      )}
    </button>
  );
}
