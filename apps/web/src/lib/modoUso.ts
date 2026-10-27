/**
 * Modos de uso del marketplace (docs/diseno/estructura-web.md): comprador y vendedor.
 * La cuenta puede tener los dos (rol AMBOS); cada uno se activa solo si la persona se registra en él.
 * El modo con el que está navegando ahora se recuerda en este navegador.
 */
export type ModoUso = "comprador" | "vendedor";

export const ETIQUETA_MODO: Record<ModoUso, string> = { comprador: "Comprador", vendedor: "Vendedor" };
export const otroModo = (m: ModoUso): ModoUso => (m === "comprador" ? "vendedor" : "comprador");

/** Modos que tiene activos una cuenta según su rol. */
export function modosDeRol(rol: string | undefined): ModoUso[] {
  if (rol === "RECEPTOR") return ["comprador"];
  if (rol === "OFERTANTE") return ["vendedor"];
  if (rol === "AMBOS") return ["comprador", "vendedor"];
  return [];
}

export const esModoUso = (v: unknown): v is ModoUso => v === "comprador" || v === "vendedor";

const CLAVE = "swapit-modo-uso";

export function leerModoGuardado(): ModoUso | null {
  try {
    const v = localStorage.getItem(CLAVE);
    return esModoUso(v) ? v : null;
  } catch {
    return null;
  }
}

export function guardarModo(m: ModoUso) {
  try {
    localStorage.setItem(CLAVE, m);
  } catch {
    // Sin almacenamiento (modo privado): el modo vale solo para esta visita.
  }
}

/** Modo de uso que viene en la URL (?modo=comprador|vendedor) en las pantallas públicas. */
export function modoDeUrl(): ModoUso | null {
  const v = new URLSearchParams(window.location.search).get("modo");
  return esModoUso(v) ? v : null;
}
