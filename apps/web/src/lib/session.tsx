"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, ApiError, UsuarioSesion } from "./api";

interface Ctx {
  user: UsuarioSesion | null;
  loading: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}
const SessionCtx = createContext<Ctx>({ user: null, loading: true, logout: async () => {}, refresh: async () => {} });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UsuarioSesion | null>(null);
  const [loading, setLoading] = useState(true);

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

  const logout = useCallback(async () => {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
  }, [router]);

  return <SessionCtx.Provider value={{ user, loading, logout, refresh }}>{children}</SessionCtx.Provider>;
}

export const useSession = () => useContext(SessionCtx);
