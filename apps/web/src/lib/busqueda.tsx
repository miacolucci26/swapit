"use client";

import { createContext, useContext, useState } from "react";

/** Texto del buscador de la barra superior; lo lee el marketplace para filtrar las ofertas. */
const BusquedaCtx = createContext<{ q: string; setQ: (q: string) => void }>({ q: "", setQ: () => {} });

export function BusquedaProvider({ children }: { children: React.ReactNode }) {
  const [q, setQ] = useState("");
  return <BusquedaCtx.Provider value={{ q, setQ }}>{children}</BusquedaCtx.Provider>;
}

export const useBusqueda = () => useContext(BusquedaCtx);
