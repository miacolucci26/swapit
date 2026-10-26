import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { actualizarDestinoSchema, destinoSchema } from '@swapit/shared';
import type { Request } from 'express';
import { AuthGuard, JwtPayload, RolesEmpresa } from '../auth/auth.guard';
import { parseBody } from '../common/zod-body';
import { DestinosService } from './destinos.service';

type AuthReq = Request & { user: JwtPayload };

/** Directorio de destinos (compradores y receptores) del intermediario. */
@Controller('destinos')
@UseGuards(AuthGuard)
@RolesEmpresa('INTERMEDIARIO')
export class DestinosController {
  constructor(private readonly destinos: DestinosService) {}

  @Get()
  listar(@Req() req: AuthReq, @Query('tipo') tipo?: string, @Query('activo') activo?: string) {
    return this.destinos.listar(req.user.empresaId, { tipo: tipo || undefined, activo: activo === undefined ? undefined : activo === 'true' });
  }

  /** Va antes de «:id». Destinos de tu directorio que reciben un residuo de la base de cadenas. */
  @Get('sugeridos')
  sugeridos(@Req() req: AuthReq, @Query('residuoRef') residuoRef = '') {
    return this.destinos.sugeridos(req.user.empresaId, residuoRef);
  }

  @Post()
  crear(@Req() req: AuthReq, @Body() body: unknown) {
    return this.destinos.crear(req.user.empresaId, parseBody(destinoSchema, body));
  }

  @Get(':id')
  uno(@Req() req: AuthReq, @Param('id') id: string) {
    return this.destinos.obtener(req.user.empresaId, id);
  }

  @Patch(':id')
  actualizar(@Req() req: AuthReq, @Param('id') id: string, @Body() body: unknown) {
    return this.destinos.actualizar(req.user.empresaId, id, parseBody(actualizarDestinoSchema, body));
  }
}
