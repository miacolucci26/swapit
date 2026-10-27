// Las suites sin modo fijado son de la herramienta para acopiadores (el código ya no la usa por defecto).
if (process.env.SWAPIT_MODO !== 'MARKETPLACE') process.env.SWAPIT_ACOPIADORES ??= '1';
import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { reiniciarLimites } from '../src/common/limite-tasa';
import { aplicarSeguridad } from '../src/common/seguridad';

export interface OpcionesApp {
  /** Deja los topes de tasa reales (login, registro…) en lugar de los holgados que usa el resto de la suite. */
  limitesReales?: boolean;
  /** Variables de entorno a fijar antes de crear la aplicación (p. ej. WEB_ORIGIN, TRUST_PROXY). */
  env?: Record<string, string | undefined>;
}

/**
 * Crea la API como la crea `bootstrap.ts`: mismo orden (cookies, prefijo, `aplicarSeguridad`). Por defecto los topes de tasa
 * se multiplican x1000 y bcrypt usa coste 4 para que la suite pueda registrar muchas cuentas desde 127.0.0.1 sin tardar;
 * `limitesReales` / `costoReal` desactivan esos atajos (las pruebas de seguridad los usan).
 */
export async function crearApp(opciones: OpcionesApp & { costoReal?: boolean } = {}) {
  for (const [k, v] of Object.entries(opciones.env ?? {})) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  if (opciones.limitesReales) delete process.env.RATE_LIMIT_FACTOR;
  else process.env.RATE_LIMIT_FACTOR = '1000';
  if (opciones.costoReal) delete process.env.BCRYPT_COST;
  else process.env.BCRYPT_COST = '4';
  reiniciarLimites();
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app: INestApplication = mod.createNestApplication({ rawBody: true });
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  aplicarSeguridad(app);
  await app.listen(0);
  const base = `http://127.0.0.1:${(app.getHttpServer().address() as any).port}`;
  return { app, base };
}

export class Cliente {
  cookie = '';
  /** Cabeceras extra en cada petición (p. ej. Origin). */
  cabeceras: Record<string, string> = {};
  constructor(private readonly base: string) {}

  async req(method: string, path: string, body?: unknown, extra: Record<string, string> = {}) {
    const res = await fetch(`${this.base}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(this.cookie ? { Cookie: this.cookie } : {}), ...this.cabeceras, ...extra },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.get('set-cookie');
    if (set && /swapit_token=[^;]+/.test(set)) this.cookie = set.split(';')[0];
    const tipo = res.headers.get('content-type') ?? '';
    const buf = Buffer.from(await res.arrayBuffer());
    const data = tipo.includes('json') && buf.length ? JSON.parse(buf.toString()) : buf;
    return { status: res.status, set, data, headers: res.headers };
  }
  get = (p: string) => this.req('GET', p);
  post = (p: string, b?: unknown) => this.req('POST', p, b ?? {});
  put = (p: string, b?: unknown) => this.req('PUT', p, b);
  patch = (p: string, b?: unknown) => this.req('PATCH', p, b);
  del = (p: string) => this.req('DELETE', p);
}
