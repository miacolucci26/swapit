import { randomBytes } from 'node:crypto';
import type { CookieOptions } from 'express';
import { esProduccion, jwtSecretDebil } from '../common/config-env';

/** Único algoritmo aceptado para firmar y verificar sesiones (impide «alg: none» y la confusión HS/RS). */
export const JWT_ALGORITMO = 'HS256' as const;
/** Vigencia por defecto de una sesión. Se renueva sola mientras la persona siga usando la app (ver AuthGuard). */
export const TTL_POR_DEFECTO_S = 12 * 3600;
/** Tope absoluto de una sesión aunque se renueve: pasado este tiempo hay que volver a iniciar sesión. */
export const SESION_MAXIMA_S = 7 * 24 * 3600;
/** Coste de bcrypt. 12 ≈ 250 ms por hash: lo bastante lento para frenar un volcado de la base, lo bastante rápido para el login. */
export const BCRYPT_COSTO = 12;
/** Longitud mínima de la contraseña de una cuenta nueva (el seed de demo inserta directo y no pasa por aquí). */
export const PASSWORD_MIN = 10;

/** «12h», «30m», «7d» o segundos a secas → segundos; nunca más que SESION_MAXIMA_S. */
export function ttlSegundos(valor = process.env.JWT_EXPIRES_IN): number {
  const m = /^(\d+)\s*([smhd]?)$/.exec((valor ?? '').trim());
  if (!m) return TTL_POR_DEFECTO_S;
  const n = Number(m[1]) * ({ s: 1, m: 60, h: 3600, d: 86400, '': 1 } as Record<string, number>)[m[2]];
  return Math.max(60, Math.min(n, SESION_MAXIMA_S));
}

/** Coste real de bcrypt: en producción siempre BCRYPT_COSTO; en pruebas se puede bajar con BCRYPT_COST (≥ 4) para acelerar la suite. */
export function bcryptCosto(): number {
  if (esProduccion()) return BCRYPT_COSTO;
  const c = Number(process.env.BCRYPT_COST);
  return Number.isInteger(c) && c >= 4 && c <= 15 ? c : BCRYPT_COSTO;
}

let efimero: string | undefined;

/**
 * Secreto de firma. En producción es obligatorio y debe ser fuerte (≥ 32 caracteres, no de ejemplo): si no, la API no arranca.
 * Fuera de producción, sin JWT_SECRET se usa uno aleatorio por proceso (nunca uno conocido y compartido).
 */
export function jwtSecret(env: Record<string, string | undefined> = process.env): string {
  const s = env.JWT_SECRET;
  if (esProduccion(env)) {
    const motivo = jwtSecretDebil(s);
    if (motivo) throw new Error(`JWT_SECRET inválido para producción: ${motivo}.`);
    return s as string;
  }
  if (s) return s;
  efimero ??= randomBytes(32).toString('base64url');
  return efimero;
}

/** Atributos de la cookie de sesión. `Secure` en producción; `SameSite=Lax` (la web llama a la API por su propio dominio, vía rewrite). */
export function opcionesCookie(): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', secure: esProduccion(), path: '/', maxAge: ttlSegundos() * 1000 };
}
