import { HttpException, HttpStatus } from '@nestjs/common';

const ventanas = new Map<string, number[]>();
const MAX_CLAVES = 20_000;

/** Evita que el mapa crezca sin fin con claves que no vuelven (se barre al pasar el umbral). */
function barrer(ahora: number, ventanaMs: number) {
  if (ventanas.size <= MAX_CLAVES) return;
  for (const [k, v] of ventanas) if (!v.some((t) => ahora - t < ventanaMs)) ventanas.delete(k);
  // Si aun así sigue lleno (ataque con muchas claves distintas), descarta las más antiguas: mejor perder memoria de límites que caerse.
  if (ventanas.size > MAX_CLAVES * 1.5) {
    let sobran = ventanas.size - MAX_CLAVES;
    for (const k of ventanas.keys()) {
      if (sobran-- <= 0) break;
      ventanas.delete(k);
    }
  }
}

/**
 * Límite de tasa en memoria (suficiente para una sola instancia: demo y piloto). Lanza 429 si `clave` supera `max`
 * llamadas dentro de `ventanaMs`. Para varias instancias (o funciones sin servidor) habría que moverlo a Redis/Upstash:
 * cada instancia lleva su propio contador. Ver docs/seguridad.md.
 */
export function limitar(clave: string, max: number, ventanaMs: number, ahora = Date.now()) {
  const recientes = (ventanas.get(clave) ?? []).filter((t) => ahora - t < ventanaMs);
  if (recientes.length >= max) {
    ventanas.set(clave, recientes);
    throw new HttpException('Demasiadas solicitudes. Intenta de nuevo en unos minutos.', HttpStatus.TOO_MANY_REQUESTS);
  }
  recientes.push(ahora);
  ventanas.set(clave, recientes);
  barrer(ahora, ventanaMs);
}

/** Como `limitar` pero sin lanzar: para middlewares de Express, que deben responder ellos mismos. */
export function intentar(clave: string, max: number, ventanaMs: number, ahora = Date.now()): { ok: boolean; reintentarEnSeg: number } {
  const recientes = (ventanas.get(clave) ?? []).filter((t) => ahora - t < ventanaMs);
  if (recientes.length >= max) {
    ventanas.set(clave, recientes);
    return { ok: false, reintentarEnSeg: Math.max(1, Math.ceil((recientes[0] + ventanaMs - ahora) / 1000)) };
  }
  recientes.push(ahora);
  ventanas.set(clave, recientes);
  barrer(ahora, ventanaMs);
  return { ok: true, reintentarEnSeg: 0 };
}

/** ¿Ya se alcanzó el máximo en la ventana? No cuenta una llamada nueva (sirve para bloquear tras N fallos). */
export function excedido(clave: string, max: number, ventanaMs: number, ahora = Date.now()): boolean {
  return (ventanas.get(clave) ?? []).filter((t) => ahora - t < ventanaMs).length >= max;
}

/** Anota un evento (p. ej. un intento fallido) sin comprobar el máximo. */
export function anotar(clave: string, ventanaMs: number, ahora = Date.now()) {
  const recientes = (ventanas.get(clave) ?? []).filter((t) => ahora - t < ventanaMs);
  recientes.push(ahora);
  ventanas.set(clave, recientes);
  barrer(ahora, ventanaMs);
}

/** Borra el historial de una clave (p. ej. tras un inicio de sesión correcto). */
export function olvidar(clave: string) {
  ventanas.delete(clave);
}

/**
 * Multiplicador de los topes de las rutas sensibles (login, registro, global). Solo las pruebas lo suben (RATE_LIMIT_FACTOR)
 * para poder registrar decenas de cuentas desde una misma IP; en producción se ignora siempre.
 */
export function factorLimites(): number {
  if (process.env.NODE_ENV === 'production') return 1;
  const f = Number(process.env.RATE_LIMIT_FACTOR ?? 1);
  return Number.isFinite(f) && f >= 1 ? f : 1;
}
export const tope = (max: number) => Math.round(max * factorLimites());

/** Solo para pruebas. */
export const reiniciarLimites = () => ventanas.clear();
