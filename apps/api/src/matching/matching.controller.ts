import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { crearAlertaSchema } from '@swapit/shared';
import type { Request } from 'express';
import { SoloMarketplace } from '../common/modo';
import { AuthGuard, JwtPayload } from '../auth/auth.guard';
import { parseBody } from '../common/zod-body';
import { MatchingService } from './matching.service';

type AuthReq = Request & { user: JwtPayload };

@SoloMarketplace()
@Controller('matching')
@UseGuards(AuthGuard)
export class MatchingController {
  constructor(private readonly matching: MatchingService) {}

  /** Búsqueda semántica: descripción libre de lo que necesita el receptor. */
  @Get('buscar')
  buscar(@Req() req: AuthReq, @Query('texto') texto = '', @Query('categoria') categoria?: string, @Query('radioKm') radioKm?: string) {
    if (texto.trim().length < 3) return [];
    // Texto acotado (se convierte en un embedding) y radio numérico: nada de NaN ni de valores absurdos hacia SQL.
    const radio = radioKm ? Number(radioKm) : 100;
    if (typeof texto !== 'string' || texto.length > 300 || !Number.isFinite(radio) || radio <= 0 || radio > 5000) throw new BadRequestException('Consulta inválida');
    return this.matching.buscar({ texto, categoriaCodigo: categoria ? String(categoria).slice(0, 60) : undefined, radioKm: radio, empresaId: req.user.empresaId });
  }

  @Get('alertas')
  alertas(@Req() req: AuthReq) {
    return this.matching.listarAlertas(req.user.empresaId);
  }

  @Post('alertas')
  crear(@Req() req: AuthReq, @Body() body: unknown) {
    return this.matching.crearAlerta(req.user.empresaId, parseBody(crearAlertaSchema, body));
  }

  @Post('alertas/:id/vistos')
  @HttpCode(204)
  vistos(@Req() req: AuthReq, @Param('id') id: string) {
    return this.matching.marcarVistos(req.user.empresaId, id);
  }

  @Delete('alertas/:id')
  @HttpCode(204)
  eliminar(@Req() req: AuthReq, @Param('id') id: string) {
    return this.matching.eliminarAlerta(req.user.empresaId, id);
  }
}
