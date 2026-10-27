"use client";

import { useEffect, useState } from "react";
import { api } from "./api";

export type Modo = "B2B2B" | "MARKETPLACE";

/**
 * Modo de la plataforma para pantallas públicas (portada, registro, ingreso). Arranca en MARKETPLACE, que es el modo
 * por defecto, para que la página no parpadee con la versión de acopiadores mientras responde la API; solo cambia si
 * la API está en modo B2B2B.
 */
export function useModo(): Modo {
  const [modo, setModo] = useState<Modo>("MARKETPLACE");
  useEffect(() => {
    api<{ modo: Modo }>("/health").then((h) => setModo(h.modo)).catch(() => undefined);
  }, []);
  return modo;
}
