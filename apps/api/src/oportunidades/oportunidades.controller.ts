import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { AuthGuard, JwtPayload } from '../auth/auth.guard';
import { limitar, tope } from '../common/limite-tasa';
import { SoloMarketplace } from '../common/modo';
import { parseBody } from '../common/zod-body';
import { OportunidadesService } from './oportunidades.service';

const sugerirSchema = z.object({
  titulo: z.string().trim().max(140).optional(),
  descripcion: z.string().trim().min(10, 'La descripción debe tener al menos 10 caracteres.').max(2000),
  categoriaCodigo: z.string().max(60).optional(),
});

const paraCompradorSchema = z.object({
  loteId: z.string().min(1).max(40),
  negocio: z.string().trim().max(200).optional(),
});

@SoloMarketplace()
@Controller('oportunidades')
@UseGuards(AuthGuard)
export class OportunidadesController {
  constructor(private readonly oportunidades: OportunidadesService) {}

  /** Publicar › «¿Quién podría aprovechar esto?»: usos posibles del material y compradores que ya buscan algo parecido. */
  @Post('sugerir')
  @HttpCode(200)
  sugerir(@Req() req: Request & { user: JwtPayload }, @Body() body: unknown) {
    // Cada consulta puede gastar una llamada a Gemini: tope por cuenta para cuidar la cuota gratuita.
    limitar(`oportunidades:${req.user.empresaId}`, tope(30), 3600_000);
    return this.oportunidades.sugerir(req.user.empresaId, parseBody(sugerirSchema, body));
  }

  /** Ficha › «¿En qué te puede servir?»: usos de la oferta para este comprador, según su negocio si se conoce. */
  @Post('para-comprador')
  @HttpCode(200)
  paraComprador(@Req() req: Request & { user: JwtPayload }, @Body() body: unknown) {
    // Mismo tope que «sugerir»: ambos gastan la misma cuota de Gemini.
    limitar(`oportunidades:${req.user.empresaId}`, tope(30), 3600_000);
    const { loteId, negocio } = parseBody(paraCompradorSchema, body);
    return this.oportunidades.paraComprador(req.user.empresaId, loteId, negocio || undefined);
  }
}
