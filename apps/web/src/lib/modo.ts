"use client";

import { useEffect, useState } from "react";
import { api } from "./api";

export type Modo = "B2B2B" | "MARKETPLACE";

/** Modo de la plataforma para pantallas públicas (portada, registro, ingreso). null mientras se consulta. */
export function useModo(): Modo | null {
  const [modo, setModo] = useState<Modo | null>(null);
  useEffect(() => {
    api<{ modo: Modo }>("/health").then((h) => setModo(h.modo)).catch(() => setModo("MARKETPLACE"));
  }, []);
  return modo;
}
