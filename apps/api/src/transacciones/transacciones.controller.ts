import { Body, Controller, Get, HttpCode, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { calificarSchema, cancelarSchema, firmaSchema, incidenciaSchema, mensajeSchema, recojoSchema, solicitarSchema, terminosSchema } from '@swapit/shared';
import type { Request } from 'express';
import { SoloMarketplace } from '../common/modo';
import { AuthGuard, JwtPayload } from '../auth/auth.guard';
import { parseBody } from '../common/zod-body';
import { TransaccionesService } from './transacciones.service';

type AuthReq = Request & { user: JwtPayload };

@SoloMarketplace()
@Controller('transacciones')
@UseGuards(AuthGuard)
export class TransaccionesController {
  constructor(private readonly svc: TransaccionesService) {}

  @Get()
  listar(@Req() req: AuthReq) {
    return this.svc.listar(req.user);
  }

  @Post()
  solicitar(@Req() req: AuthReq, @Body() body: unknown) {
    return this.svc.solicitar(req.user, parseBody(solicitarSchema, body));
  }

  @Get(':id')
  detalle(@Req() req: AuthReq, @Param('id') id: string) {
    return this.svc.detalle(req.user, id);
  }

  @Get(':id/mensajes')
  mensajes(@Req() req: AuthReq, @Param('id') id: string, @Query('despues') despues?: string) {
    return this.svc.mensajes(req.user, id, despues);
  }

  @Post(':id/mensajes')
  mensaje(@Req() req: AuthReq, @Param('id') id: string, @Body() body: unknown) {
    return this.svc.mensaje(req.user, id, parseBody(mensajeSchema, body).texto);
  }

  @Put(':id/terminos')
  proponer(@Req() req: AuthReq, @Param('id') id: string, @Body() body: unknown) {
    return this.svc.proponer(req.user, id, parseBody(terminosSchema, body));
  }

  @Post(':id/aceptar')
  @HttpCode(200)
  aceptar(@Req() req: AuthReq, @Param('id') id: string) {
    return this.svc.aceptar(req.user, id);
  }

  @Post(':id/pagar')
  @HttpCode(200)
  pagar(@Req() req: AuthReq, @Param('id') id: string) {
    return this.svc.pagar(req.user, id);
  }

  @Post(':id/recojo')
  @HttpCode(200)
  recojo(@Req() req: AuthReq, @Param('id') id: string, @Body() body: unknown) {
    return this.svc.confirmarRecojo(req.user, id, parseBody(recojoSchema, body));
  }

  @Post(':id/firmar')
  @HttpCode(200)
  firmar(@Req() req: AuthReq, @Param('id') id: string, @Body() body: unknown) {
    return this.svc.firmarEntrega(req.user, id, parseBody(firmaSchema, body ?? {}));
  }

  @Post(':id/calificar')
  @HttpCode(200)
  calificar(@Req() req: AuthReq, @Param('id') id: string, @Body() body: unknown) {
    return this.svc.calificar(req.user, id, parseBody(calificarSchema, body));
  }

  @Post(':id/cancelar')
  @HttpCode(200)
  cancelar(@Req() req: AuthReq, @Param('id') id: string, @Body() body: unknown) {
    return this.svc.cancelar(req.user, id, parseBody(cancelarSchema, body ?? {}).motivo);
  }

  @Post(':id/incidencias')
  incidencia(@Req() req: AuthReq, @Param('id') id: string, @Body() body: unknown) {
    return this.svc.reportarIncidencia(req.user, id, parseBody(incidenciaSchema, body));
  }
}
