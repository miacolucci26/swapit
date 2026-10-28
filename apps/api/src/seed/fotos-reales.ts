import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { UPLOADS_DIR, urlArchivo } from '../common/uploads';
import type { PrismaService } from '../prisma/prisma.service';
import { storage } from '../storage/storage';

/**
 * Fotos reales de las ofertas de demostración (reemplazan a las ilustraciones SVG). Viven en apps/api/seed-fotos/<id>.jpg,
 * con licencia libre de Wikimedia Commons; autor y licencia de cada una en seed-fotos/creditos.json (la web los muestra).
 */
export const FOTOS_DIR = join(__dirname, '..', '..', 'seed-fotos');

/** Fotos de la oferta demo `id`: <id>.jpg y, si hay, <id>-2.jpg, <id>-3.jpg (sin extensión, en orden). */
export function fotosDe(id: string): string[] {
  const r: string[] = [];
  for (const f of [id, `${id}-2`, `${id}-3`]) if (existsSync(join(FOTOS_DIR, `${f}.jpg`))) r.push(f);
  return r;
}

/** Nombre del archivo publicado para la foto `f` (p. ej. «carton-2»). */
export const nombreFoto = (f: string) => `demo-foto-${f}.jpg`;

/** Copia las fotos reales de la oferta a UPLOADS_DIR y devuelve sus nombres, o null si esa oferta no tiene fotos. */
export function prepararFotoReal(id: string): string[] | null {
  const fs = fotosDe(id);
  if (!fs.length) return null;
  for (const f of fs) copyFileSync(join(FOTOS_DIR, `${f}.jpg`), join(UPLOADS_DIR, nombreFoto(f)));
  return fs.map(nombreFoto);
}

/**
 * Para una base que ya tiene la demo con ilustraciones (producción): sube cada foto real al storage y cambia las imágenes
 * de las ofertas demo por ella. Solo toca imágenes que siguen el patrón de las ilustraciones del seed
 * (demo-<empresa>-<oferta>-<n>.svg); las fotos subidas por usuarios no se tocan. Idempotente.
 */
export async function reemplazarIlustraciones(prisma: PrismaService) {
  const imgs = await prisma.loteImagen.findMany({ where: { url: { endsWith: '.svg' } }, select: { loteId: true, url: true } });
  const porLote = new Map<string, string>();
  for (const i of imgs) {
    const m = /demo-[a-z]+-(.+)-\d+\.svg$/.exec(i.url);
    if (m && fotosDe(m[1]).length) porLote.set(i.loteId, m[1]);
  }
  const subidas = new Set<string>();
  let n = 0;
  for (const [loteId, id] of porLote) {
    const fs = fotosDe(id);
    for (const f of fs) {
      if (subidas.has(f)) continue;
      await storage().guardar(nombreFoto(f), readFileSync(join(FOTOS_DIR, `${f}.jpg`)), 'image/jpeg');
      subidas.add(f);
    }
    await prisma.$transaction([
      prisma.loteImagen.deleteMany({ where: { loteId } }),
      prisma.loteImagen.createMany({ data: fs.map((f, orden) => ({ loteId, url: urlArchivo(nombreFoto(f)), orden })) }),
    ]);
    n++;
  }
  console.log(`✓ fotos reales: ${n} ofertas actualizadas, ${subidas.size} fotos subidas`);
}
