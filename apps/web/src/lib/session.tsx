"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, ApiError, UsuarioSesion } from "./api";
import { guardarModo, leerModoGuardado, modosDeRol, type ModoUso } from "./modoUso";

interface Ctx {
  user: UsuarioSesion | null;
  loading: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Marketplace: modo con el que se navega ahora (comprador o vendedor). */
  modoUso: ModoUso;
  /** Modos que la cuenta tiene activos. */
  modos: ModoUso[];
  cambiarModo: (m: ModoUso) => void;
}
const SessionCtx = createContext<Ctx>({
  user: null, loading: true, logout: async () => {}, refresh: async () => {}, modoUso: "comprador", modos: [], cambiarModo: () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UsuarioSesion | null>(null);
  const [loading, setLoading] = useState(true);
  const [modoUso, setModoUso] = useState<ModoUso>("comprador");

  const refresh = useCallback(async () => {
    try {
      setUser(await api<UsuarioSesion>("/auth/me"));
    } catch (e) {
      setUser(null);
      if (e instanceof ApiError && e.status === 401) router.replace("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const modos = modosDeRol(user?.empresa.rol);
  // El modo guardado vale solo si la cuenta lo tiene activo; si no, el primero que tenga.
  useEffect(() => {
    if (!modos.length) return;
    const guardado = leerModoGuardado();
    setModoUso(guardado && modos.includes(guardado) ? guardado : modos[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modos.join()]);

  const cambiarModo = useCallback((m: ModoUso) => {
    guardarModo(m);
    setModoUso(m);
  }, []);

  const logout = useCallback(async () => {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
  }, [router]);

  return <SessionCtx.Provider value={{ user, loading, logout, refresh, modoUso, modos, cambiarModo }}>{children}</SessionCtx.Provider>;
}

export const useSession = () => useContext(SessionCtx);
