import { Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard, JwtPayload, RolesEmpresa } from '../auth/auth.guard';
import { FacturacionService } from './facturacion.service';

type AuthReq = Request & { user: JwtPayload };

/** Suscripción mensual y fees por certificado del intermediario (cobros simulados). */
@Controller('facturacion')
@UseGuards(AuthGuard)
@RolesEmpresa('INTERMEDIARIO')
export class FacturacionController {
  constructor(private readonly facturacion: FacturacionService) {}

  @Get()
  resumen(@Req() req: AuthReq) {
    return this.facturacion.resumen(req.user.empresaId);
  }

  @Post('suscribir')
  @HttpCode(200)
  suscribir(@Req() req: AuthReq) {
    return this.facturacion.suscribir(req.user.empresaId);
  }

  @Post('cancelar')
  @HttpCode(200)
  cancelar(@Req() req: AuthReq) {
    return this.facturacion.cancelar(req.user.empresaId);
  }
}
