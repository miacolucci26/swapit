"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Favoritos del comprador. Por ahora viven en este navegador (una lista de ids por usuario);
 * pasarlos a la API es un pendiente si se quieren ver desde otro dispositivo.
 */
const clave = (usuarioId: string) => `swapit-favoritos:${usuarioId}`;
const EVENTO = "swapit-favoritos";

function leer(usuarioId: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(clave(usuarioId)) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function useFavoritos(usuarioId: string | undefined) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    if (!usuarioId) return;
    const cargar = () => setIds(leer(usuarioId));
    cargar();
    // Todas las tarjetas comparten la lista: un cambio en una se refleja en las demás.
    window.addEventListener(EVENTO, cargar);
    window.addEventListener("storage", cargar);
    return () => {
      window.removeEventListener(EVENTO, cargar);
      window.removeEventListener("storage", cargar);
    };
  }, [usuarioId]);

  const alternar = useCallback(
    (id: string) => {
      if (!usuarioId) return;
      const actual = leer(usuarioId);
      const nueva = actual.includes(id) ? actual.filter((x) => x !== id) : [id, ...actual];
      try {
        localStorage.setItem(clave(usuarioId), JSON.stringify(nueva));
      } catch {
        // Sin almacenamiento: el cambio dura hasta recargar.
      }
      setIds(nueva);
      window.dispatchEvent(new Event(EVENTO));
    },
    [usuarioId],
  );

  return { ids, esFavorito: (id: string) => ids.includes(id), alternar };
}
