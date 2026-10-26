import { mkdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Almacenamiento de imágenes subidas. Dos controladores (drivers) tras la misma interfaz:
 *  - `local`: disco (UPLOADS_DIR). Desarrollo, pruebas y las ilustraciones SVG de la demo. En Vercel el disco es de solo
 *    lectura, así que no sirve en producción.
 *  - `supabase`: Supabase Storage por REST (fetch). El bucket debe ser PÚBLICO de solo lectura: se escribe con la clave de servicio
 *    (que nunca sale del servidor) y se lee por la URL pública.
 * La base de datos guarda solo el NOMBRE del archivo; la URL pública se calcula con `urlPublica(nombre)`.
 */
export interface StorageDriver {
  readonly tipo: 'local' | 'supabase';
  guardar(nombre: string, datos: Buffer, mime: string): Promise<void>;
  leer(nombre: string): Promise<Buffer | null>;
  urlPublica(nombre: string): string;
}

/** Deja solo caracteres seguros para un nombre de archivo (sin rutas ni espacios). */
export const nombreSeguro = (nombre: string) => nombre.replace(/[^a-zA-Z0-9._-]/g, '').replace(/^\.+/, '').slice(0, 120);

export class LocalStorageDriver implements StorageDriver {
  readonly tipo = 'local' as const;
  constructor(readonly dir: string) {
    mkdirSync(dir, { recursive: true });
  }
  async guardar(nombre: string, datos: Buffer, _mime?: string): Promise<void> {
    await writeFile(join(this.dir, nombreSeguro(nombre)), datos);
  }
  async leer(nombre: string): Promise<Buffer | null> {
    try {
      return await readFile(join(this.dir, nombreSeguro(nombre)));
    } catch {
      return null;
    }
  }
  urlPublica(nombre: string): string {
    return `/api/uploads/${nombreSeguro(nombre)}`;
  }
}

export interface OpcionesSupabase {
  url: string;
  claveServicio: string;
  bucket: string;
  /** Inyectable para pruebas. */
  fetchFn?: typeof fetch;
}

export class SupabaseStorageDriver implements StorageDriver {
  readonly tipo = 'supabase' as const;
  private readonly base: string;
  private readonly fetchFn: typeof fetch;

  constructor(private readonly o: OpcionesSupabase) {
    this.base = o.url.replace(/\/+$/, '');
    this.fetchFn = o.fetchFn ?? fetch;
  }

  /** Las claves nuevas (sb_secret_…) van solo en `apikey`; las antiguas (JWT, «eyJ…») también como Bearer. */
  private cabeceras(extra: Record<string, string> = {}): Record<string, string> {
    const h: Record<string, string> = { apikey: this.o.claveServicio, ...extra };
    if (this.o.claveServicio.startsWith('eyJ')) h.Authorization = `Bearer ${this.o.claveServicio}`;
    return h;
  }

  async guardar(nombre: string, datos: Buffer, mime: string): Promise<void> {
    const n = nombreSeguro(nombre);
    const res = await this.fetchFn(`${this.base}/storage/v1/object/${encodeURIComponent(this.o.bucket)}/${n}`, {
      method: 'POST',
      headers: this.cabeceras({ 'Content-Type': mime, 'x-upsert': 'false', 'Cache-Control': 'max-age=31536000' }),
      body: new Uint8Array(datos),
    });
    if (!res.ok) {
      // No se registra el cuerpo ni las cabeceras: solo el estado.
      throw new Error(`Supabase Storage rechazó la subida (HTTP ${res.status})`);
    }
  }

  async leer(nombre: string): Promise<Buffer | null> {
    const res = await this.fetchFn(this.urlPublica(nombre));
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }

  urlPublica(nombre: string): string {
    return `${this.base}/storage/v1/object/public/${encodeURIComponent(this.o.bucket)}/${nombreSeguro(nombre)}`;
  }
}

export type EntornoStorage = Record<string, string | undefined>;

/** Sin STORAGE_DRIVER: «supabase» si hay URL de Supabase y estamos en producción; si no, «local». */
export function elegirDriver(env: EntornoStorage = process.env): 'local' | 'supabase' {
  const d = env.STORAGE_DRIVER?.trim().toLowerCase();
  if (d === 'local' || d === 'supabase') return d;
  if (d) throw new Error(`STORAGE_DRIVER desconocido: «${d}» (usa «local» o «supabase»)`);
  return env.NODE_ENV === 'production' && env.SUPABASE_URL ? 'supabase' : 'local';
}

/** Falla pronto (al arrancar) si se pide Supabase y faltan variables, o si Vercel intenta usar el disco. */
export function validarConfigStorage(env: EntornoStorage = process.env): void {
  const driver = elegirDriver(env);
  if (driver === 'supabase') {
    const faltan = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_BUCKET'].filter((k) => !env[k]?.trim());
    if (faltan.length) throw new Error(`STORAGE_DRIVER=supabase requiere definir: ${faltan.join(', ')}`);
    if (!/^https?:\/\//.test(env.SUPABASE_URL as string)) throw new Error('SUPABASE_URL debe empezar por https://');
  } else if (env.NODE_ENV === 'production' && env.VERCEL) {
    throw new Error('En Vercel el disco es de solo lectura: usa STORAGE_DRIVER=supabase.');
  }
}

export function crearDriver(env: EntornoStorage = process.env, dirLocal?: string, fetchFn?: typeof fetch): StorageDriver {
  validarConfigStorage(env);
  if (elegirDriver(env) === 'supabase') {
    return new SupabaseStorageDriver({ url: env.SUPABASE_URL as string, claveServicio: env.SUPABASE_SERVICE_ROLE_KEY as string, bucket: env.SUPABASE_BUCKET as string, fetchFn });
  }
  return new LocalStorageDriver(dirLocal ?? env.UPLOADS_DIR ?? join(process.cwd(), 'uploads'));
}

// ---------- Instancia única de la aplicación ----------

let actual: StorageDriver | undefined;

/** Driver activo (se crea la primera vez según el entorno). */
export function storage(): StorageDriver {
  return (actual ??= crearDriver());
}

/** Para pruebas: sustituye el driver (por ejemplo, por uno falso) o lo restablece con `undefined`. */
export function fijarStorage(d: StorageDriver | undefined) {
  actual = d;
}
