export class ApiError extends Error {
  constructor(message: string, public status: number, public errores?: { campo: string; mensaje: string }[]) {
    super(message);
  }
}

/** Fetch same-origin contra /api (proxy de Next hacia NestJS); la cookie de sesión va automática. */
export async function api<T = unknown>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    credentials: "include",
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.message ?? "Error inesperado", res.status, data.errores);
  return data as T;
}

export interface UsuarioSesion {
  id: string;
  nombre: string;
  email: string;
  rol: "EMPRESA" | "ADMIN";
  empresa: { id: string; tipo: "EMPRESA" | "PERSONA"; ruc: string | null; razonSocial: string; rol: string; estadoKyb: string };
  /** Modo de la plataforma: B2B2B (intermediarios, por defecto) o MARKETPLACE (producto anterior). */
  modo: "B2B2B" | "MARKETPLACE";
}
