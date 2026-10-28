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

/** Nombre del archivo publicado para la oferta demo `id`. */
export const nombreFoto = (id: string) => `demo-foto-${id}.jpg`;

/** Copia la foto real de la oferta a UPLOADS_DIR y devuelve su nombre, o null si esa oferta no tiene foto. */
export function prepararFotoReal(id: string): string | null {
  const origen = join(FOTOS_DIR, `${id}.jpg`);
  if (!existsSync(origen)) return null;
  copyFileSync(origen, join(UPLOADS_DIR, nombreFoto(id)));
  return nombreFoto(id);
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
    if (m && existsSync(join(FOTOS_DIR, `${m[1]}.jpg`))) porLote.set(i.loteId, m[1]);
  }
  const subidas = new Set<string>();
  let n = 0;
  for (const [loteId, id] of porLote) {
    if (!subidas.has(id)) {
      await storage().guardar(nombreFoto(id), readFileSync(join(FOTOS_DIR, `${id}.jpg`)), 'image/jpeg');
      subidas.add(id);
    }
    await prisma.$transaction([
      prisma.loteImagen.deleteMany({ where: { loteId } }),
      prisma.loteImagen.create({ data: { loteId, url: urlArchivo(nombreFoto(id)), orden: 0 } }),
    ]);
    n++;
  }
  console.log(`✓ fotos reales: ${n} ofertas actualizadas, ${subidas.size} fotos subidas`);
}
