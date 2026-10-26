export interface ImagenValida {
  ok: boolean;
  ext?: 'jpg' | 'png' | 'webp';
  mime?: string;
  /** Por qué se rechazó (solo para registros internos; no se muestra tal cual al usuario). */
  motivo?: string;
}

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Marcas de contenido activo que no tienen por qué aparecer en los bytes de una foto (un políglota JPG/HTML, por ejemplo). */
const ACTIVO = /<\s*(script|html|svg|iframe|object|embed|body|img\s+[^>]*onerror)|javascript:/i;

const rechazo = (motivo: string): ImagenValida => ({ ok: false, motivo });

/**
 * Comprueba por los primeros bytes (no por el nombre ni el tipo declarado) que un archivo es JPG, PNG o WEBP.
 * SVG, HTML, GIF, PDF y cualquier otro formato se rechazan. Quien guarde el archivo debe usar `ext` (el real), nunca la
 * extensión que declaró el cliente.
 */
export function validarImagen(buf: Buffer): ImagenValida {
  if (!Buffer.isBuffer(buf) || buf.length < 24) return rechazo('demasiado pequeño');
  let r: ImagenValida;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    // JPEG: SOI + marcador de segmento (APPn, DQT, SOF…) válido (0xE0-0xEF, 0xDB, 0xC0-0xCF, 0xFE).
    const m = buf[3];
    if (!((m >= 0xe0 && m <= 0xef) || m === 0xdb || m === 0xfe || (m >= 0xc0 && m <= 0xcf))) return rechazo('JPEG sin segmento válido');
    r = { ok: true, ext: 'jpg', mime: 'image/jpeg' };
  } else if (buf.subarray(0, 8).equals(PNG)) {
    // PNG: la primera pieza debe ser IHDR de 13 bytes.
    if (buf.readUInt32BE(8) !== 13 || buf.toString('latin1', 12, 16) !== 'IHDR') return rechazo('PNG sin cabecera IHDR');
    r = { ok: true, ext: 'png', mime: 'image/png' };
  } else if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') {
    // WEBP: RIFF<tamaño>WEBP seguido de un chunk VP8 / VP8L / VP8X. El tamaño declarado no puede exceder el archivo.
    const chunk = buf.toString('latin1', 12, 16);
    if (!['VP8 ', 'VP8L', 'VP8X'].includes(chunk)) return rechazo('WEBP sin chunk de imagen');
    if (buf.readUInt32LE(4) + 8 > buf.length + 1) return rechazo('WEBP truncado');
    r = { ok: true, ext: 'webp', mime: 'image/webp' };
  } else {
    return rechazo('formato no admitido');
  }
  // Defensa en profundidad: aunque se sirva con el Content-Type correcto y nosniff, no guardamos políglotas.
  if (ACTIVO.test(buf.toString('latin1'))) return rechazo('contiene marcado activo');
  return r;
}
