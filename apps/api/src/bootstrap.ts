import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { aplicarSeguridad } from './common/seguridad';
import { UPLOADS_DIR, cabecerasUploads } from './common/uploads';
import { elegirDriver, validarConfigStorage } from './storage/storage';

type Entorno = Record<string, string | undefined>;

/**
 * Validación del entorno de producción. La parte general (JWT_SECRET, WEB_ORIGIN, etc.) la define `common/config-env.ts`
 * (revisión de seguridad); aquí se añade lo propio del despliegue: base de datos y almacenamiento de imágenes.
 * Falla al ARRANCAR (no en la primera petición) con un mensaje que dice qué falta.
 */
export function validarEntornoDespliegue(env: Entorno = process.env): void {
  const problemas: string[] = [];
  if (!env.DATABASE_URL?.trim()) problemas.push('DATABASE_URL (cadena de conexión de Supabase, pooler 6543)');
  try {
    validarConfigStorage(env);
  } catch (e) {
    problemas.push((e as Error).message);
  }
  if (env.NODE_ENV === 'production' && elegirDriver(env) === 'local' && !env.PERMITIR_DISCO_LOCAL) {
    problemas.push('STORAGE_DRIVER=local no sirve en producción (el disco es efímero o de solo lectura): usa supabase, o define PERMITIR_DISCO_LOCAL=1 si hay un volumen persistente');
  }
  if (problemas.length) throw new Error(`Configuración de producción incompleta:\n - ${problemas.join('\n - ')}`);
}

/** Carga `validarEntorno` del módulo de seguridad si existe (puede no estar aún en una rama intermedia). */
function validarEntornoGeneral(env: Entorno): void {
  let modulo: { validarEntorno?: (e: Entorno) => void } | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    modulo = require('./common/config-env');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'MODULE_NOT_FOUND') throw e;
  }
  modulo?.validarEntorno?.(env);
}

/**
 * Crea la aplicación Nest ya configurada (cookies, prefijo `api`, seguridad HTTP, cuerpo original para la firma del webhook
 * de WhatsApp). La usan el servidor normal (`main.ts`) y la función sin servidor de Vercel (`serverless.ts`).
 * No hace `listen` ni `init`: eso lo decide quien llama.
 */
export async function crearAplicacion(env: Entorno = process.env): Promise<NestExpressApplication> {
  if (env.NODE_ENV === 'production') {
    validarEntornoGeneral(env);
    validarEntornoDespliegue(env);
  }
  // rawBody: la firma del webhook de WhatsApp se calcula sobre el cuerpo original.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  aplicarSeguridad(app);
  // Imágenes en disco (driver local): desarrollo, pruebas y las ilustraciones de la demo. Con Supabase Storage no hay nada que servir.
  if (elegirDriver(env) === 'local' && !env.VERCEL) {
    app.useStaticAssets(UPLOADS_DIR, { prefix: '/api/uploads', setHeaders: cabecerasUploads });
  }
  return app;
}
