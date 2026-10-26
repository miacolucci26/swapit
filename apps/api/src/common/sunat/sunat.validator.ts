import { Injectable } from '@nestjs/common';
import { validarRuc } from '@swapit/shared';

export interface ConsultaRuc {
  encontrado: boolean;
  estado?: 'ACTIVO' | 'BAJA';
  condicion?: 'HABIDO' | 'NO HABIDO';
  motivo?: string;
}

/** Cómo se decidió la verificación de una empresa (se muestra en el perfil para no llamar «oficial» a lo que no lo es). */
export type MetodoVerificacion = 'SIMULADA' | 'MANUAL' | 'API';

/**
 * Proveedor de consulta de RUC. Es la interfaz que hay que implementar para conectar un servicio real de SUNAT; la plataforma
 * no supone ninguno en concreto (ver `ApiSunatValidator` para el adaptador HTTP genérico y docs/despliegue.md).
 */
export interface SunatProvider {
  consultar(ruc: string): Promise<ConsultaRuc>;
}

/** Token de inyección que usa el resto del código (clase abstracta para poder inyectarla con Nest). */
export abstract class SunatValidator implements SunatProvider {
  abstract consultar(ruc: string): Promise<ConsultaRuc>;
}

/**
 * MOCK de SUNAT. Reglas deterministas para la demo:
 *  - dígito verificador inválido      -> no encontrado
 *  - RUC con "00" en posiciones 9-10  -> dado de BAJA (para demostrar el rechazo)
 *  - resto de RUC válidos             -> ACTIVO / HABIDO
 * NO consulta a SUNAT: solo comprueba el formato del RUC. Por eso en producción no se usa salvo que se pida expresamente
 * (SUNAT_PROVIDER=mock); sin proveedor, las empresas quedan PENDIENTES hasta que un administrador las verifique a mano.
 */
@Injectable()
export class MockSunatValidator extends SunatValidator {
  async consultar(ruc: string): Promise<ConsultaRuc> {
    if (!validarRuc(ruc)) return { encontrado: false, motivo: 'RUC no existe en SUNAT' };
    if (ruc.slice(8, 10) === '00') return { encontrado: true, estado: 'BAJA', condicion: 'NO HABIDO', motivo: 'RUC dado de baja' };
    return { encontrado: true, estado: 'ACTIVO', condicion: 'HABIDO' };
  }
}

export type EntornoSunat = Record<string, string | undefined>;

/** Método de verificación vigente según el entorno (ver `docs/despliegue.md`, sección de verificación de empresas). */
export function metodoVerificacionActual(env: EntornoSunat = process.env): MetodoVerificacion {
  const p = env.SUNAT_PROVIDER?.trim().toLowerCase();
  if (p === 'api') return 'API';
  if (p === 'mock') return 'SIMULADA';
  return env.NODE_ENV === 'production' ? 'MANUAL' : 'SIMULADA';
}

const norm = (v: unknown) => String(v ?? '').trim().toUpperCase();

/**
 * Convierte la respuesta de un servicio de consulta de RUC al formato interno. Acepta los nombres de campo más comunes
 * (`estado`/`estadoContribuyente`, `condicion`/`condicionDomicilio`/`condicionContribuyente`). Si el proveedor que elijan usa otra
 * forma, solo hay que ajustar esta función.
 */
export function normalizarRespuestaSunat(json: unknown): ConsultaRuc {
  if (!json || typeof json !== 'object') return { encontrado: false, motivo: 'Respuesta inválida del proveedor' };
  const o = json as Record<string, unknown>;
  const datos = (typeof o.data === 'object' && o.data ? (o.data as Record<string, unknown>) : o);
  const estadoCrudo = norm(datos.estado ?? datos.estadoContribuyente ?? datos.estado_contribuyente);
  const condicionCruda = norm(datos.condicion ?? datos.condicionDomicilio ?? datos.condicionContribuyente ?? datos.condicion_contribuyente);
  if (!estadoCrudo && !condicionCruda) return { encontrado: false, motivo: 'RUC no encontrado' };
  return {
    encontrado: true,
    estado: estadoCrudo.startsWith('ACTIVO') ? 'ACTIVO' : 'BAJA',
    condicion: condicionCruda.startsWith('HABIDO') ? 'HABIDO' : 'NO HABIDO',
  };
}

export interface OpcionesApiSunat {
  /** Plantilla de URL con `{ruc}`, p. ej. https://proveedor.example/v1/ruc/{ruc} */
  url: string;
  /** Token Bearer (secreto). */
  token?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

/**
 * Adaptador HTTP genérico (opcional): GET a `SUNAT_API_URL` (con `{ruc}`), cabecera `Authorization: Bearer SUNAT_API_TOKEN`,
 * respuesta JSON normalizada por `normalizarRespuestaSunat`. No supone ningún proveedor concreto. Un fallo de red o un 5xx
 * LANZA error (no se marca la empresa como rechazada por una caída del proveedor).
 */
export class ApiSunatValidator extends SunatValidator {
  constructor(private readonly o: OpcionesApiSunat) {
    super();
    if (!o.url.includes('{ruc}')) throw new Error('SUNAT_API_URL debe contener {ruc}');
  }

  async consultar(ruc: string): Promise<ConsultaRuc> {
    if (!validarRuc(ruc)) return { encontrado: false, motivo: 'RUC con formato inválido' };
    const f = this.o.fetchFn ?? fetch;
    const res = await f(this.o.url.replace('{ruc}', encodeURIComponent(ruc)), {
      headers: { Accept: 'application/json', ...(this.o.token ? { Authorization: `Bearer ${this.o.token}` } : {}) },
      signal: AbortSignal.timeout(this.o.timeoutMs ?? 8000),
    });
    if (res.status === 404) return { encontrado: false, motivo: 'RUC no encontrado' };
    if (!res.ok) throw new Error(`El proveedor de SUNAT respondió HTTP ${res.status}`);
    return normalizarRespuestaSunat(await res.json());
  }
}

/** Elige el validador según el entorno. Sin SUNAT_PROVIDER: simulado (el servicio de empresas ya decide si en producción es MANUAL). */
export function crearSunatValidator(env: EntornoSunat = process.env, fetchFn?: typeof fetch): SunatValidator {
  if (metodoVerificacionActual(env) === 'API') {
    if (!env.SUNAT_API_URL) throw new Error('SUNAT_PROVIDER=api requiere SUNAT_API_URL (con {ruc}) y, si el proveedor lo pide, SUNAT_API_TOKEN');
    return new ApiSunatValidator({ url: env.SUNAT_API_URL, token: env.SUNAT_API_TOKEN, fetchFn });
  }
  return new MockSunatValidator();
}
