import { ArgumentsHost, Catch, ExceptionFilter, HttpException, INestApplication, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import helmet from 'helmet';
import { esProduccion, origenesPermitidos } from './config-env';
import { intentar, tope } from './limite-tasa';

type Env = Record<string, string | undefined>;

// ---------------------------------------------------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------------------------------------------------

/** TRUST_PROXY → valor para `app.set('trust proxy')`. «true» se interpreta como 1 salto (nunca «confiar en todo», que permite falsear la IP). */
export function interpretarTrustProxy(valor: string | undefined): boolean | number | string {
  const v = (valor ?? '').trim();
  if (!v || /^(false|0|no)$/i.test(v)) return false;
  if (/^true$/i.test(v)) return 1;
  if (/^\d+$/.test(v)) return Number(v);
  return v; // «loopback», «uniquelocal», lista de CIDR…
}

/** Ruta normalizada para decidir qué límite aplicar: decodificada, en minúsculas, sin barras repetidas ni final. */
function rutaNormal(req: Request): string {
  let p = req.path;
  try {
    p = decodeURIComponent(p);
  } catch {
    /* ruta con % inválido: se usa tal cual */
  }
  return p.toLowerCase().replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
}

/** Para el registro de errores: el token del portal de captación es una credencial y no debe quedar en los logs. */
export const rutaParaLog = (ruta: string) => ruta.replace(/(\/captacion\/)[^/]+/i, '$1:token');

const responder = (res: Response, status: number, message: string, extra: Record<string, unknown> = {}) => {
  res.status(status).json({ statusCode: status, message, ...extra });
};

// ---------------------------------------------------------------------------------------------------------------------
// Defensa CSRF por origen
// ---------------------------------------------------------------------------------------------------------------------

const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * La sesión va en una cookie (SameSite=Lax + HttpOnly), así que una página ajena no puede leerla, pero podría intentar
 * que el navegador envíe una petición que cambia datos. Defensa adicional: si una petición que cambia estado trae
 * `Origin` (o, en su defecto, `Referer`), debe ser un origen de la lista blanca (WEB_ORIGIN) o el propio servidor.
 * Sin ninguno de los dos (llamadas de servidor a servidor, curl, el webhook de Meta) se deja pasar: esos clientes no
 * llevan la cookie de un navegador.
 */
export function middlewareCsrf(permitidos: string[]): RequestHandler {
  const lista = new Set(permitidos);
  return (req, res, next) => {
    if (METODOS_SEGUROS.has(req.method)) return next();
    let origen: string | undefined = req.headers.origin;
    if (origen === undefined) {
      const ref = req.headers.referer;
      if (ref) {
        try {
          origen = new URL(ref).origin;
        } catch {
          origen = 'null'; // Referer ilegible: se trata como origen desconocido
        }
      }
    }
    if (origen === undefined) return next();
    // «Mismo origen» también detrás de la web: Vercel reenvía la petición con `X-Forwarded-Host` = dominio que el navegador visitó
    // (con `trust proxy`, `req.hostname` lo usa). Así cualquier alias o despliegue de la web funciona, y una página ajena no pasa:
    // su `Origin` nunca coincide con el host al que apunta la petición. Solo cuenta si TRUST_PROXY está definida.
    const mismo = origen === `${req.protocol}://${req.headers.host}` || (req.app.get('trust proxy') && origen === `${req.protocol}://${req.hostname}`);
    if (lista.has(origen) || mismo) return next();
    responder(res, 403, 'Origen no permitido');
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Limitación de tasa por IP
// ---------------------------------------------------------------------------------------------------------------------

interface Regla {
  nombre: string;
  /** ¿aplica a esta petición? */
  aplica: (metodo: string, ruta: string) => boolean;
  max: number;
  ventanaMs: number;
}

const MIN = 60_000;
/**
 * Topes por IP. El global es generoso a propósito (una oficina entera puede salir por una misma IP); los sensibles son estrictos.
 * Los fallos de contraseña por cuenta se cuentan aparte en AuthService.
 */
export const REGLAS: Regla[] = [
  { nombre: 'login', aplica: (m, r) => m === 'POST' && r === '/api/auth/login', max: 40, ventanaMs: 15 * MIN },
  { nombre: 'registro', aplica: (m, r) => m === 'POST' && r === '/api/auth/registro', max: 10, ventanaMs: 60 * MIN },
  { nombre: 'captacion', aplica: (_m, r) => r.startsWith('/api/captacion'), max: 100, ventanaMs: MIN },
  { nombre: 'captacion-escritura', aplica: (m, r) => m === 'POST' && r.startsWith('/api/captacion'), max: 30, ventanaMs: 10 * MIN },
  { nombre: 'webhook', aplica: (_m, r) => r === '/api/whatsapp/webhook', max: 300, ventanaMs: MIN },
  { nombre: 'verificar', aplica: (_m, r) => r.startsWith('/api/verificar'), max: 60, ventanaMs: MIN },
  { nombre: 'ia', aplica: (m, r) => m === 'POST' && r.startsWith('/api/ia/'), max: 120, ventanaMs: 60 * MIN },
  { nombre: 'subidas', aplica: (m, r) => m === 'POST' && r === '/api/uploads', max: 60, ventanaMs: 10 * MIN },
];
const TOPE_GLOBAL = 1500; // por minuto y por IP

export function middlewareLimites(): RequestHandler {
  return (req, res, next) => {
    if (req.method === 'OPTIONS') return next();
    const ruta = rutaNormal(req);
    // El monitoreo y los archivos estáticos no gastan el cupo.
    if (ruta === '/api/health' || ruta.startsWith('/api/uploads/')) return next();
    const ip = req.ip ?? 'sin-ip';
    const reglas: { clave: string; max: number; ventanaMs: number }[] = [{ clave: `g:${ip}`, max: TOPE_GLOBAL, ventanaMs: MIN }];
    for (const r of REGLAS) if (r.aplica(req.method, ruta)) reglas.push({ clave: `${r.nombre}:${ip}`, max: r.max, ventanaMs: r.ventanaMs });
    for (const r of reglas) {
      const v = intentar(r.clave, tope(r.max), r.ventanaMs);
      if (!v.ok) {
        res.setHeader('Retry-After', String(v.reintentarEnSeg));
        return responder(res, 429, 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.');
      }
    }
    next();
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Errores: nada interno sale al cliente
// ---------------------------------------------------------------------------------------------------------------------

@Catch()
export class FiltroExcepciones implements ExceptionFilter {
  private readonly log = new Logger('Excepciones');

  catch(exc: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    if (res.headersSent) return;

    let status = 500;
    let cuerpo: Record<string, unknown> = { statusCode: 500, message: 'Error interno del servidor' };

    if (exc instanceof HttpException) {
      // Estas excepciones las escribe el código de la aplicación con mensajes pensados para la persona usuaria.
      status = exc.getStatus();
      const r = exc.getResponse();
      cuerpo = typeof r === 'string' ? { statusCode: status, message: r } : { statusCode: status, ...(r as Record<string, unknown>) };
    } else if (exc instanceof Prisma.PrismaClientKnownRequestError) {
      // Códigos conocidos → respuesta genérica de cliente; el detalle (tabla, columna, SQL) solo va al registro del servidor.
      const mapa: Record<string, [number, string]> = {
        P2002: [409, 'Ya existe un registro con esos datos'],
        P2003: [409, 'La operación referencia un registro que no existe o está en uso'],
        P2025: [404, 'Registro no encontrado'],
        P2000: [400, 'Un valor es demasiado largo'],
        P2023: [400, 'Identificador inválido'],
      };
      const m = mapa[exc.code];
      if (m) [status, cuerpo] = [m[0], { statusCode: m[0], message: m[1] }];
    } else if (typeof (exc as { status?: unknown })?.status === 'number' && (exc as { status: number }).status >= 400 && (exc as { status: number }).status < 500) {
      // Errores 4xx del analizador del cuerpo (body-parser): demasiado grande, tipo no admitido, codificación inválida…
      status = (exc as { status: number }).status;
      const textos: Record<number, string> = { 413: 'El cuerpo de la petición es demasiado grande', 415: 'Tipo de contenido no admitido' };
      cuerpo = { statusCode: status, message: textos[status] ?? 'Solicitud inválida' };
    } else if (exc instanceof Prisma.PrismaClientValidationError) {
      status = 400;
      cuerpo = { statusCode: 400, message: 'Solicitud inválida' };
    }

    if (status >= 500 || exc instanceof Prisma.PrismaClientKnownRequestError || exc instanceof Prisma.PrismaClientValidationError) {
      const e = exc as Error;
      this.log.error(`${req.method} ${rutaParaLog(req.path)} -> ${status}: ${e?.message?.split('\n').slice(-1)[0] ?? 'error'}`, status >= 500 ? e?.stack : undefined);
    }
    res.status(status).json(cuerpo);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Punto de entrada
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Endurecimiento HTTP de la API: cabeceras (helmet), CORS de lista blanca exacta, defensa CSRF por origen, límites de
 * tasa por IP, límite de tamaño del cuerpo, `trust proxy` configurable y filtro global de errores.
 * Lo llama `bootstrap.ts` al crear la aplicación (servidor normal y función sin servidor) y el ayudante de pruebas.
 * Debe llamarse DESPUÉS de `app.use(cookieParser())` y `app.setGlobalPrefix('api')` y ANTES de `listen`/`init`.
 */
export function aplicarSeguridad(app: INestApplication, env: Env = process.env): void {
  const produccion = esProduccion(env);
  const express = app.getHttpAdapter().getInstance();
  express.disable('x-powered-by');
  express.set('trust proxy', interpretarTrustProxy(env.TRUST_PROXY));

  // --- Cabeceras ---
  const opcionesHelmet = {
    // La API solo devuelve JSON, PDF, XLSX e imágenes: no necesita cargar nada.
    contentSecurityPolicy: { useDefaults: false, directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"], formAction: ["'none'"] } },
    // Las imágenes subidas las carga la web (otro origen en algunos despliegues).
    crossOriginResourcePolicy: { policy: 'cross-origin' as const },
    crossOriginOpenerPolicy: { policy: 'same-origin' as const },
    referrerPolicy: { policy: 'no-referrer' as const },
    frameguard: { action: 'deny' as const },
    hsts: produccion ? { maxAge: 31_536_000, includeSubDomains: true } : false,
  };
  const conCsp = helmet(opcionesHelmet);
  // El visor de PDF del navegador no abre un PDF servido con «default-src 'none'»: esa ruta lleva el resto de cabeceras sin CSP.
  const sinCsp = helmet({ ...opcionesHelmet, contentSecurityPolicy: false });
  app.use(((req, res, next) => (/\/verificar\/[^/]+\/pdf\/?$/i.test(req.path) ? sinCsp : conCsp)(req, res, next)) as RequestHandler);
  // Respuestas de la API con datos de sesión o de negocio: no se guardan en cachés compartidas. (Las imágenes estáticas fijan la suya.)
  app.use(((req, res, next) => {
    if (!req.path.startsWith('/api/uploads/')) res.setHeader('Cache-Control', 'no-store');
    next();
  }) as RequestHandler);

  // --- CORS: lista blanca exacta, con credenciales, sin comodines ---
  const permitidos = origenesPermitidos(env.WEB_ORIGIN ?? (produccion ? '' : 'http://localhost:3000'));
  app.enableCors({
    origin: permitidos,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    maxAge: 600,
    optionsSuccessStatus: 204,
  });

  // --- CSRF por origen y límites de tasa (antes de leer el cuerpo: se rechaza barato) ---
  app.use(middlewareCsrf(permitidos));
  app.use(middlewareLimites());

  // --- Tamaño del cuerpo: 1 MB de JSON (las imágenes van por multipart, con su propio tope) ---
  const nest = app as INestApplication & { useBodyParser?: (tipo: 'json' | 'urlencoded', opciones?: Record<string, unknown>) => unknown };
  nest.useBodyParser?.('json', { limit: '1mb' });
  nest.useBodyParser?.('urlencoded', { extended: false, limit: '100kb' });

  // --- Errores sin trazas ni mensajes internos ---
  app.useGlobalFilters(new FiltroExcepciones());
}
