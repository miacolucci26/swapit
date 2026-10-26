import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { acuerdoSchema, actualizarAcuerdoSchema, recojoAcuerdoSchema } from '@swapit/shared';
import type { Request } from 'express';
import { AuthGuard, JwtPayload, RolesEmpresa } from '../auth/auth.guard';
import { parseBody } from '../common/zod-body';
import { AcuerdosService } from './acuerdos.service';

type AuthReq = Request & { user: JwtPayload };

/** Acuerdos de temporada del intermediario con sus proveedores. */
@Controller('acuerdos')
@UseGuards(AuthGuard)
@RolesEmpresa('INTERMEDIARIO')
export class AcuerdosController {
  constructor(private readonly acuerdos: AcuerdosService) {}

  @Get()
  listar(@Req() req: AuthReq, @Query('estado') estado?: string) {
    return this.acuerdos.listar(req.user.empresaId, estado || undefined);
  }

  @Post()
  crear(@Req() req: AuthReq, @Body() body: unknown) {
    return this.acuerdos.crear(req.user.empresaId, parseBody(acuerdoSchema, body));
  }

  @Get(':id')
  uno(@Req() req: AuthReq, @Param('id') id: string) {
    return this.acuerdos.obtener(req.user.empresaId, id);
  }

  @Patch(':id')
  actualizar(@Req() req: AuthReq, @Param('id') id: string, @Body() body: unknown) {
    return this.acuerdos.actualizar(req.user.empresaId, id, parseBody(actualizarAcuerdoSchema, body));
  }

  @Post(':id/recojo')
  @HttpCode(200)
  recojo(@Req() req: AuthReq, @Param('id') id: string, @Body() body: unknown) {
    return this.acuerdos.registrarRecojo(req.user.empresaId, id, parseBody(recojoAcuerdoSchema, body));
  }
}
