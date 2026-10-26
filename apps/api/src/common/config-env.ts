/**
 * Validación del entorno al arrancar. En producción el servidor NO debe levantar con una configuración de desarrollo:
 * `erroresEntorno` devuelve la lista de errores (vacía = todo bien) y `validarEntorno` los convierte en una excepción.
 * Fuera de producción solo se exige lo mínimo (nada) para no estorbar el desarrollo ni las pruebas.
 */
type Env = Record<string, string | undefined>;

/** Secretos de ejemplo que circulan en el repositorio, la documentación o el seed de demostración. */
const SECRETOS_DE_EJEMPLO = [
  'dev-secret-inseguro',
  'simbio-dev-secret-solo-local',
  'swapit-dev-secret-solo-local',
  'cambia-esto-por-un-secreto-largo',
  'test-secret',
  'changeme',
  'secret',
  'password',
];
const MARCAS_DE_DESARROLLO = /(dev-secret|solo-local|cambia-?esto|changeme|ejemplo|example|your[-_]?secret|placeholder|xxxx)/i;
const TOKENS_DE_EJEMPLO = ['swapit-demo', 'changeme', 'token', 'verify'];

export const esProduccion = (env: Env = process.env) => env.NODE_ENV === 'production';

/** Longitud mínima del secreto de firma de sesiones en producción. */
export const JWT_SECRET_MIN = 32;

export function jwtSecretDebil(secreto: string | undefined): string | null {
  if (!secreto) return 'no está definido';
  if (secreto.length < JWT_SECRET_MIN) return `tiene ${secreto.length} caracteres (mínimo ${JWT_SECRET_MIN})`;
  if (SECRETOS_DE_EJEMPLO.includes(secreto.toLowerCase()) || MARCAS_DE_DESARROLLO.test(secreto)) return 'es un valor de ejemplo o de desarrollo';
  if (new Set(secreto).size < 10) return 'tiene muy poca variedad de caracteres';
  return null;
}

/** Lista de orígenes permitidos a partir de WEB_ORIGIN (varios separados por coma). Ignora comodines y entradas inválidas. */
export function origenesPermitidos(valor: string | undefined): string[] {
  return (valor ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter((o) => {
      if (!o || o.includes('*')) return false;
      try {
        const u = new URL(o);
        return (u.protocol === 'http:' || u.protocol === 'https:') && u.origin === o;
      } catch {
        return false;
      }
    });
}

export function erroresEntorno(env: Env = process.env): string[] {
  const errores: string[] = [];
  if (!esProduccion(env)) return errores;

  // --- Base de datos ---
  const db = env.DATABASE_URL;
  if (!db) errores.push('DATABASE_URL es obligatoria en producción.');
  else if (!/^postgres(ql)?:\/\//i.test(db)) errores.push('DATABASE_URL debe ser una cadena de conexión postgresql://…');
  else {
    if (/(@|\/\/)(localhost|127\.0\.0\.1|\[::1\])([:/]|$)/i.test(db)) errores.push('DATABASE_URL apunta a la máquina local: usa la base de producción (Supabase).');
    if (/postgres:postgres@/i.test(db)) errores.push('DATABASE_URL usa las credenciales de desarrollo (postgres:postgres).');
    if (/sslmode=disable/i.test(db)) errores.push('DATABASE_URL desactiva TLS (sslmode=disable): la conexión a la base debe ir cifrada.');
  }

  // --- Sesiones ---
  const debil = jwtSecretDebil(env.JWT_SECRET);
  if (debil) errores.push(`JWT_SECRET ${debil}. Genera uno con: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`);
  if (env.JWT_EXPIRES_IN && /^\d+d$/.test(env.JWT_EXPIRES_IN) && Number(env.JWT_EXPIRES_IN.slice(0, -1)) > 7) errores.push('JWT_EXPIRES_IN no debe superar 7 días.');

  // --- Orígenes (CORS, CSRF, cookies) ---
  if (!env.WEB_ORIGIN) errores.push('WEB_ORIGIN es obligatoria en producción (URL pública de la web; varias separadas por coma).');
  else {
    const crudos = env.WEB_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
    const validos = origenesPermitidos(env.WEB_ORIGIN);
    if (validos.length !== crudos.length) errores.push('WEB_ORIGIN tiene entradas inválidas: cada una debe ser un origen exacto (https://dominio, sin ruta ni comodines).');
    for (const o of validos) {
      if (/^http:\/\/(localhost|127\.0\.0\.1)/i.test(o)) errores.push(`WEB_ORIGIN incluye un origen de desarrollo (${o}).`);
      else if (!o.startsWith('https://')) errores.push(`WEB_ORIGIN debe usar https en producción (${o}).`);
    }
  }

  // --- Proxy: sin esto la limitación por IP vería la IP del proxy y bloquearía a todos a la vez ---
  if (env.TRUST_PROXY === undefined || env.TRUST_PROXY === '') {
    errores.push('TRUST_PROXY no está definida. Detrás de Vercel/un balanceador usa TRUST_PROXY=1 (número de proxies de confianza); si no hay proxy, TRUST_PROXY=false.');
  }

  // --- Interruptores de pruebas que nunca deben estar en producción ---
  if (env.RATE_LIMIT_FACTOR !== undefined && env.RATE_LIMIT_FACTOR !== '1') errores.push('RATE_LIMIT_FACTOR es solo para pruebas: quítala en producción.');
  if (env.BCRYPT_COST !== undefined && env.BCRYPT_COST !== '') errores.push('BCRYPT_COST es solo para pruebas: quítala en producción.');

  // --- WhatsApp: si se usa el webhook, la firma es obligatoria (sin secreto el webhook responde 503) ---
  if (env.WHATSAPP_VERIFY_TOKEN && TOKENS_DE_EJEMPLO.includes(env.WHATSAPP_VERIFY_TOKEN.toLowerCase())) errores.push('WHATSAPP_VERIFY_TOKEN es un valor de ejemplo.');
  if (env.WHATSAPP_VERIFY_TOKEN && !env.WHATSAPP_APP_SECRET) errores.push('WHATSAPP_VERIFY_TOKEN está definido pero falta WHATSAPP_APP_SECRET: el webhook no procesaría nada.');

  return errores;
}

/** Cosas que conviene revisar pero no impiden arrancar. */
export function avisosEntorno(env: Env = process.env): string[] {
  const avisos: string[] = [];
  if (!esProduccion(env)) return avisos;
  if (!env.WHATSAPP_APP_SECRET) avisos.push('WHATSAPP_APP_SECRET no está definida: el webhook de WhatsApp responderá 503 (correcto si no se usa).');
  if (!env.UPLOADS_DIR && env.VERCEL) avisos.push('Estás en Vercel sin almacenamiento persistente: las imágenes subidas al disco se pierden. Usa Supabase Storage.');
  if (!env.ANTHROPIC_API_KEY) avisos.push('Sin ANTHROPIC_API_KEY el clasificador usa el modo local de demostración.');
  if (env.DATABASE_URL && !/sslmode=(require|verify)/i.test(env.DATABASE_URL) && !/supabase\.(co|com)/i.test(env.DATABASE_URL)) avisos.push('DATABASE_URL sin sslmode=require: confirma que tu proveedor fuerza TLS.');
  if (env.REGISTRO_ABIERTO === undefined) avisos.push('REGISTRO_ABIERTO no definida: el registro público está abierto. Con el KYB simulado, cualquiera puede registrar un RUC ajeno. Cierra el registro (REGISTRO_ABIERTO=false) tras dar de alta a tus clientes.');
  return avisos;
}

/**
 * Valida el entorno y LANZA un Error con todos los problemas juntos (uno por línea) si hay alguno; no hace nada si todo está bien o
 * si no es producción. Es lo que llama `bootstrap` al arrancar. Para obtener la lista sin lanzar: `erroresEntorno`.
 */
export function validarEntorno(env: Env = process.env): void {
  const errores = erroresEntorno(env);
  if (errores.length) throw new Error(`Configuración de producción inválida:\n - ${errores.join('\n - ')}`);
}
