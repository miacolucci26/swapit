import { BadRequestException } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import type { ServerResponse } from 'node:http';
import { extname, join } from 'node:path';
import { memoryStorage } from 'multer';
import { maxBytesImagen } from '../storage/storage.service';
import { nombreSeguro, storage } from '../storage/storage';

/** Carpeta del driver `local`. En Vercel (disco de solo lectura) no se crea: allí se usa el driver `supabase`. */
export const UPLOADS_DIR = process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads');
if (!process.env.VERCEL) {
  try {
    mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch {
    // disco no escribible: el driver local fallará al guardar y se informará entonces
  }
}

/** URL pública de un archivo subido a partir de su nombre (relativa en el driver local; absoluta en Supabase Storage). */
export const urlArchivo = (nombre: string) => storage().urlPublica(nombreSeguro(nombre));

/**
 * Cabeceras al servir /api/uploads (solo driver local): los SVG (ilustraciones del seed de demo) salen como image/svg+xml y con CSP
 * restrictiva (sin scripts) y nosniff. Subir SVG sigue prohibido: el filtro de subida solo admite JPG, PNG y WEBP.
 */
export function cabecerasUploads(res: ServerResponse, ruta: string) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (extname(ruta).toLowerCase() === '.svg') {
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  }
}

const EXT_OK = new Set(['.jpg', '.jpeg', '.png', '.webp']);

/**
 * Opciones de multer para subir una imagen: en memoria (no se escribe en disco), máx. 5 MB (4 MB en Vercel), solo JPG, PNG o WEBP.
 * El archivo se valida por su contenido y se guarda con `StorageService.guardarImagen`, que le pone un nombre aleatorio.
 * Las usan el panel y el portal de captación.
 */
export const opcionesSubidaImagen = {
  storage: memoryStorage(),
  limits: { fileSize: maxBytesImagen(), files: 1 },
  fileFilter: (_req: unknown, file: { originalname: string }, cb: (e: Error | null, ok: boolean) => void) =>
    EXT_OK.has(extname(file.originalname).toLowerCase()) ? cb(null, true) : cb(new BadRequestException('Solo imágenes JPG, PNG o WEBP'), false),
};
