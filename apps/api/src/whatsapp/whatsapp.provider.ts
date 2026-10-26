import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface OpcionesEnvio {
  /** Conversación del simulador de la demo: se guarda pero NUNCA se envía a WhatsApp. */
  simulado?: boolean;
}

/**
 * Envío de mensajes por WhatsApp. En producción es la Cloud API de WhatsApp Business de Meta (`CloudApiWhatsappProvider`,
 * un número verificado por intermediario o uno de la plataforma; fuera de la ventana de 24 h solo se pueden enviar plantillas
 * aprobadas; ver docs/whatsapp-roadmap.md). Sin las variables, `MockWhatsappProvider` solo guarda el mensaje.
 */
export abstract class WhatsappProvider {
  abstract enviarTexto(intermediarioId: string, telefono: string, texto: string, opciones?: OpcionesEnvio): Promise<void>;
}

/** MOCK: no envía nada; guarda el mensaje saliente para que el simulador de chat lo muestre. */
@Injectable()
export class MockWhatsappProvider extends WhatsappProvider {
  constructor(private readonly prisma: PrismaService) {
    super();
  }
  async enviarTexto(intermediarioId: string, telefono: string, texto: string): Promise<void> {
    await this.prisma.mensajeWhatsapp.create({ data: { intermediarioId, telefono, direccion: 'SALIENTE', texto } });
  }
}

export interface ConfigCloudApi {
  token: string;
  /** Número de teléfono de la plataforma (id de Meta, no el número en sí). Un intermediario puede tener el suyo (Empresa.whatsappPhoneId). */
  phoneNumberId: string;
  /** Versión de la Graph API, p. ej. «v26.0». */
  version: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

export const VERSION_GRAPH_POR_DEFECTO = 'v26.0';

/** Lee WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID y WHATSAPP_GRAPH_VERSION; null si faltan las dos primeras (entonces se usa el mock). */
export function configCloudApiDeEntorno(env: Record<string, string | undefined> = process.env): ConfigCloudApi | null {
  const token = env.WHATSAPP_TOKEN?.trim();
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!token || !phoneNumberId) return null;
  const version = env.WHATSAPP_GRAPH_VERSION?.trim() || VERSION_GRAPH_POR_DEFECTO;
  if (!/^v\d+\.\d+$/.test(version)) throw new Error('WHATSAPP_GRAPH_VERSION debe tener la forma v26.0');
  if (!/^\d{5,25}$/.test(phoneNumberId)) throw new Error('WHATSAPP_PHONE_NUMBER_ID debe ser el identificador numérico de Meta');
  return { token, phoneNumberId, version };
}

/**
 * Meta WhatsApp Cloud API por fetch. Guarda el mensaje saliente en la base (igual que el mock) y lo envía; un fallo del envío se
 * registra (solo el código HTTP, nunca el token ni el texto) y NO interrumpe el flujo: el webhook debe responder 200 a Meta.
 * Dentro de la ventana de 24 h desde el último mensaje del proveedor se puede responder con texto libre.
 */
@Injectable()
export class CloudApiWhatsappProvider extends WhatsappProvider {
  private readonly log = new Logger(CloudApiWhatsappProvider.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cfg: ConfigCloudApi,
  ) {
    super();
  }

  async enviarTexto(intermediarioId: string, telefono: string, texto: string, opciones: OpcionesEnvio = {}): Promise<void> {
    await this.prisma.mensajeWhatsapp.create({ data: { intermediarioId, telefono, direccion: 'SALIENTE', texto } });
    if (opciones.simulado) return;
    // Un intermediario con su propio número usa el suyo; si no, el de la plataforma.
    const inter = await this.prisma.empresa.findUnique({ where: { id: intermediarioId }, select: { whatsappPhoneId: true } });
    const phoneId = inter?.whatsappPhoneId || this.cfg.phoneNumberId;
    const f = this.cfg.fetchFn ?? fetch;
    try {
      const res = await f(`https://graph.facebook.com/${this.cfg.version}/${phoneId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.cfg.token}` },
        body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: telefono, type: 'text', text: { preview_url: false, body: texto.slice(0, 4000) } }),
        signal: AbortSignal.timeout(this.cfg.timeoutMs ?? 8000),
      });
      if (!res.ok) this.log.warn(`WhatsApp Cloud API rechazó el envío (HTTP ${res.status})`);
    } catch (e) {
      this.log.warn(`WhatsApp Cloud API no disponible (${(e as Error).name})`);
    }
  }
}

/** Mock salvo que estén definidas WHATSAPP_TOKEN y WHATSAPP_PHONE_NUMBER_ID. */
export function crearWhatsappProvider(prisma: PrismaService, env: Record<string, string | undefined> = process.env): WhatsappProvider {
  const cfg = configCloudApiDeEntorno(env);
  return cfg ? new CloudApiWhatsappProvider(prisma, cfg) : new MockWhatsappProvider(prisma);
}
