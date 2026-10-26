"use client";

import { useSyncExternalStore } from "react";

export type Tema = "claro" | "oscuro";
const CLAVE = "swapit-tema";
const suscriptores = new Set<() => void>();

/** Cambia el tema, lo recuerda en este navegador y avisa a los componentes suscritos. */
export function fijarTema(t: Tema) {
  try {
    localStorage.setItem(CLAVE, t);
  } catch {
    /* almacenamiento bloqueado: el tema vale solo para esta visita */
  }
  document.documentElement.classList.toggle("dark", t === "oscuro");
  suscriptores.forEach((f) => f());
}

/** Tema actual (la clase `dark` de <html> es la fuente de verdad; el script de layout.tsx la pone antes de pintar). */
export function useTema(): Tema {
  return useSyncExternalStore(
    (cb) => {
      suscriptores.add(cb);
      return () => suscriptores.delete(cb);
    },
    () => (document.documentElement.classList.contains("dark") ? "oscuro" : "claro"),
    () => "claro",
  );
}
