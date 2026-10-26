import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { validarImagen } from '../common/imagen-segura';
import { storage } from './storage';

/** Tamaño máximo de una imagen. Vercel limita el cuerpo de una petición a 4,5 MB: allí se deja 4 MB para el multipart. */
export const maxBytesImagen = () =>
  Math.min((Number(process.env.UPLOAD_MAX_MB) || 5) * 1024 * 1024, process.env.VERCEL ? 4 * 1024 * 1024 : Number.POSITIVE_INFINITY);

export interface ArchivoSubido {
  buffer: Buffer;
  size: number;
}

/** Guarda imágenes validadas con un nombre aleatorio y devuelve nombre y URL pública. */
@Injectable()
export class StorageService {
  /** El driver sale del entorno (STORAGE_DRIVER); las pruebas lo sustituyen con fijarStorage(). */
  private get driver() {
    return storage();
  }

  get tipo() {
    return this.driver.tipo;
  }

  urlPublica(nombre: string) {
    return this.driver.urlPublica(nombre);
  }

  leer(nombre: string) {
    return this.driver.leer(nombre);
  }

  /** Valida (por la firma real del archivo, no por el nombre ni el tipo declarado) y guarda. */
  async guardarImagen(archivo: ArchivoSubido): Promise<{ nombre: string; url: string }> {
    if (!archivo?.buffer?.length) throw new BadRequestException('El archivo está vacío');
    if (archivo.size > maxBytesImagen()) throw new BadRequestException(`La imagen supera el máximo de ${Math.floor(maxBytesImagen() / 1024 / 1024)} MB`);
    const v = validarImagen(archivo.buffer);
    if (!v.ok) throw new BadRequestException('Solo imágenes JPG, PNG o WEBP');
    // Si el validador de seguridad no informa de ext/mime, se deducen de la firma.
    const { ext, mime } = v.ext && v.mime ? { ext: v.ext, mime: v.mime } : deducirTipo(archivo.buffer);
    const nombre = `${randomBytes(12).toString('hex')}.${ext}`;
    await this.driver.guardar(nombre, archivo.buffer, mime);
    return { nombre, url: this.driver.urlPublica(nombre) };
  }
}

export function deducirTipo(b: Buffer): { ext: 'jpg' | 'png' | 'webp'; mime: string } {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', mime: 'image/png' };
  if (b.length > 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
  throw new BadRequestException('Solo imágenes JPG, PNG o WEBP');
}
