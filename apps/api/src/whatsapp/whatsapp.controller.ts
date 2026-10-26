import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, HttpCode, Post, Query, RawBodyRequest, Req, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { simularWhatsappSchema } from '@swapit/shared';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { esProduccion } from '../common/config-env';
import type { Request } from 'express';
import { AuthGuard, JwtPayload, RolesEmpresa } from '../auth/auth.guard';
import { parseBody } from '../common/zod-body';
import { PrismaService } from '../prisma/prisma.service';
import { aE164, WhatsappService } from './whatsapp.service';

type AuthReq = Request & { user: JwtPayload };

interface PayloadMeta {
  entry?: { changes?: { value?: { metadata?: { phone_number_id?: string }; messages?: { from?: string; type?: string; text?: { body?: string } }[] } }[] }[];
}

/** Igualdad en tiempo constante entre dos textos de cualquier longitud (se comparan sus SHA-256, que siempre miden lo mismo). */
export function igualesSeguro(a: string, b: string): boolean {
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
}

/** Tope de lo que se procesa por llamada: Meta agrupa pocos mensajes por petición; más que esto es un abuso. */
/** Solo los elementos que son objetos de una lista (descarta null, números y textos sueltos de un cuerpo malicioso). */
const lista = <T>(x: T[] | undefined): T[] => (Array.isArray(x) ? x.filter((e) => e !== null && typeof e === 'object') : []);
const MAX_ENTRADAS = 20;
const MAX_CAMBIOS = 20;
const MAX_MENSAJES = 100;
const MAX_TEXTO = 4096;

/**
 * Webhook con el formato de la API de WhatsApp Business (Cloud API) y simulador para la demo. El webhook es público
 * (Meta no usa nuestra sesión). En PRODUCCIÓN la firma `X-Hub-Signature-256` (HMAC-SHA256 del cuerpo original con
 * `WHATSAPP_APP_SECRET`) es OBLIGATORIA: sin el secreto configurado el webhook responde 503 y no procesa nada; sin
 * producción (desarrollo, pruebas, simulador) se acepta sin firma si no hay secreto.
 */
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly wa: WhatsappService, private readonly prisma: PrismaService) {}

  /** Verificación del webhook: Meta envía un reto y el token que configuramos; se devuelve el reto si coincide. */
  @Get('webhook')
  verificar(@Query('hub.mode') modo?: string, @Query('hub.verify_token') token?: string, @Query('hub.challenge') reto?: string) {
    const configurado = process.env.WHATSAPP_VERIFY_TOKEN;
    // El token de ejemplo «swapit-demo» solo existe fuera de producción.
    if (esProduccion() && !configurado) throw new ServiceUnavailableException('Webhook no configurado');
    const esperado = configurado ?? 'swapit-demo';
    if (modo !== 'subscribe' || typeof token !== 'string' || !igualesSeguro(token, esperado) || typeof reto !== 'string' || !reto || reto.length > 200) {
      throw new ForbiddenException('Token de verificación inválido');
    }
    // El reto lo elige quien llama: se devuelve como texto plano, nunca como HTML.
    return reto.replace(/[^\w.-]/g, '');
  }

  @Post('webhook')
  @HttpCode(200)
  async recibir(@Req() req: RawBodyRequest<Request>, @Body() body: unknown) {
    const secreto = process.env.WHATSAPP_APP_SECRET;
    if (!secreto && esProduccion()) throw new ServiceUnavailableException('Webhook no configurado');
    if (secreto) {
      const firma = req.headers['x-hub-signature-256'];
      if (typeof firma !== 'string' || !req.rawBody) throw new ForbiddenException('Firma inválida');
      const esperada = `sha256=${createHmac('sha256', secreto).update(req.rawBody).digest('hex')}`;
      if (!igualesSeguro(firma, esperada)) throw new ForbiddenException('Firma inválida');
    }
    const payload = this.validarPayload(body);
    // Meta reintenta si no recibe 200 rápido: un mensaje que falle no debe hacer fallar el resto.
    for (const entrada of payload.entry.slice(0, MAX_ENTRADAS)) {
      for (const cambio of lista(entrada.changes).slice(0, MAX_CAMBIOS)) {
        const phoneId = cambio.value?.metadata?.phone_number_id;
        const inter = typeof phoneId === 'string' && phoneId.length <= 64 ? await this.prisma.empresa.findFirst({ where: { whatsappPhoneId: phoneId, rol: 'INTERMEDIARIO' }, select: { id: true } }) : null;
        if (!inter) continue;
        for (const m of lista(cambio.value?.messages).slice(0, MAX_MENSAJES)) {
          if (typeof m.from !== 'string' || !/^\d{8,15}$/.test(m.from)) continue;
          const texto = m.type === 'text' && typeof m.text?.body === 'string' ? m.text.body.slice(0, MAX_TEXTO) : 'ayuda';
          await this.wa.procesarSeguro(inter.id, m.from, texto);
        }
      }
    }
    return { ok: true };
  }

  /** El cuerpo ya está autenticado por la firma, pero no se confía en su forma: debe ser un objeto con `entry` (lista). */
  private validarPayload(body: unknown): { entry: NonNullable<PayloadMeta['entry']> } {
    const b = body as PayloadMeta | null;
    if (!b || typeof b !== 'object' || Array.isArray(b)) throw new BadRequestException('Cuerpo inválido');
    if (b.entry === undefined) return { entry: [] };
    if (!Array.isArray(b.entry)) throw new BadRequestException('Cuerpo inválido');
    return { entry: b.entry.filter((e) => e && typeof e === 'object') };
  }

  // ---- Simulador (para la demo: el intermediario escribe «como» un proveedor) ----

  @Post('simular')
  @UseGuards(AuthGuard)
  @RolesEmpresa('INTERMEDIARIO')
  @HttpCode(200)
  async simular(@Req() req: AuthReq, @Body() body: unknown) {
    const { telefono, texto } = parseBody(simularWhatsappSchema, body);
    // El simulador nunca envía mensajes reales (aunque la Cloud API esté configurada): solo guarda la conversación.
    await this.wa.procesar(req.user.empresaId, telefono, texto, { simulado: true });
    return { telefono: aE164(telefono), mensajes: await this.wa.mensajes(req.user.empresaId, telefono) };
  }

  @Get('simular/mensajes')
  @UseGuards(AuthGuard)
  @RolesEmpresa('INTERMEDIARIO')
  mensajes(@Req() req: AuthReq, @Query('telefono') telefono = '') {
    return this.wa.mensajes(req.user.empresaId, telefono);
  }

  @Delete('simular')
  @UseGuards(AuthGuard)
  @RolesEmpresa('INTERMEDIARIO')
  @HttpCode(204)
  reiniciar(@Req() req: AuthReq, @Query('telefono') telefono = '') {
    return this.wa.reiniciar(req.user.empresaId, telefono);
  }
}
