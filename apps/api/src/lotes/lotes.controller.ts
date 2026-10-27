import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Modalidad, crearLoteSchema, editarLoteSchema } from '@swapit/shared';
import { z } from 'zod';
import type { Request } from 'express';
import { SoloMarketplace } from '../common/modo';
import { AuthGuard, JwtPayload } from '../auth/auth.guard';
import { parseBody } from '../common/zod-body';
import { LotesService } from './lotes.service';

type AuthReq = Request & { user: JwtPayload };

@SoloMarketplace()
@Controller('lotes')
@UseGuards(AuthGuard)
export class LotesController {
  constructor(private readonly lotes: LotesService) {}

  @Post()
  crear(@Req() req: AuthReq, @Body() body: unknown) {
    return this.lotes.crear(req.user.empresaId, parseBody(crearLoteSchema, body));
  }

  @Get()
  listar(
    @Req() req: AuthReq,
    @Query('categoria') categoria?: string,
    @Query('modalidad') modalidad?: string,
    @Query('q') q?: string,
    @Query('radioKm') radioKm?: string,
    @Query('mios') mios?: string,
    @Query('empresaId') empresaId?: string,
  ) {
    // Los parámetros de consulta se validan antes de llegar a SQL (un enum o un número inválido no debe producir un error de la base).
    const f = parseBody(
      z.object({
        categoria: z.string().max(60).optional(),
        modalidad: z.enum(Modalidad).optional(),
        q: z.string().max(100).optional(),
        radioKm: z.coerce.number().positive().max(5000).optional(),
        empresaId: z.string().max(60).optional(),
      }),
      { categoria: categoria || undefined, modalidad: modalidad || undefined, q: q || undefined, radioKm: radioKm || undefined, empresaId: empresaId || undefined },
    );
    return this.lotes.listar(req.user.empresaId, { ...f, mios: mios === '1' });
  }

  // Va antes de «:id» para no confundirse con un lote.
  @Get('geocodificar')
  geocodificar(@Query('q') q?: string) {
    const { q: direccion } = parseBody(z.object({ q: z.string().trim().min(3).max(200) }), { q });
    return this.lotes.geocodificar(direccion);
  }

  @Get(':id')
  detalle(@Req() req: AuthReq, @Param('id') id: string) {
    return this.lotes.detalle(id, req.user.empresaId);
  }

  @Patch(':id')
  editar(@Req() req: AuthReq, @Param('id') id: string, @Body() body: unknown) {
    return this.lotes.editar(id, req.user.empresaId, parseBody(editarLoteSchema, body));
  }

  @Post(':id/pausar')
  @HttpCode(200)
  pausar(@Req() req: AuthReq, @Param('id') id: string) {
    return this.lotes.pausar(id, req.user.empresaId, true);
  }

  @Post(':id/reanudar')
  @HttpCode(200)
  reanudar(@Req() req: AuthReq, @Param('id') id: string) {
    return this.lotes.pausar(id, req.user.empresaId, false);
  }

  @Delete(':id')
  retirar(@Req() req: AuthReq, @Param('id') id: string) {
    return this.lotes.retirar(id, req.user.empresaId);
  }
}
