import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { activarModoSchema, actualizarEmpresaSchema, actualizarProveedorSchema, certificacionSchema, crearProveedorSchema } from '@swapit/shared';
import type { Request } from 'express';
import { AuthGuard, JwtPayload, RolesEmpresa, Tipos } from '../auth/auth.guard';
import { SoloMarketplace } from '../common/modo';
import { parseBody } from '../common/zod-body';
import { EmpresasService } from './empresas.service';

type AuthReq = Request & { user: JwtPayload };

@Controller('empresas')
@UseGuards(AuthGuard)
export class EmpresasController {
  constructor(private readonly empresas: EmpresasService) {}

  @Get('mi')
  mi(@Req() req: AuthReq) {
    return this.empresas.miEmpresa(req.user.empresaId);
  }

  @Patch('mi')
  actualizar(@Req() req: AuthReq, @Body() body: unknown) {
    return this.empresas.actualizar(req.user.empresaId, parseBody(actualizarEmpresaSchema, body));
  }

  @Post('mi/activar-modo')
  @SoloMarketplace()
  @HttpCode(200)
  activarModo(@Req() req: AuthReq, @Body() body: unknown) {
    return this.empresas.activarModo(req.user.empresaId, parseBody(activarModoSchema, body));
  }

  @Post('mi/verificar-kyb')
  @Tipos('EMPRESA')
  @HttpCode(200)
  verificar(@Req() req: AuthReq) {
    return this.empresas.verificarKyb(req.user.empresaId);
  }

  @Post('mi/certificaciones')
  @Tipos('EMPRESA')
  certificacion(@Req() req: AuthReq, @Body() body: unknown) {
    return this.empresas.agregarCertificacion(req.user.empresaId, parseBody(certificacionSchema, body).nombre);
  }

  @Delete('mi/certificaciones/:id')
  @Tipos('EMPRESA')
  @HttpCode(204)
  quitarCertificacion(@Req() req: AuthReq, @Param('id') id: string) {
    return this.empresas.eliminarCertificacion(req.user.empresaId, id);
  }

  // ---- Red de proveedores del intermediario (van antes de «:id» para no confundirse con un perfil) ----

  @Get('proveedores')
  @RolesEmpresa('INTERMEDIARIO')
  proveedores(@Req() req: AuthReq, @Query('sector') sector?: string, @Query('tipoActor') tipoActor?: string) {
    return this.empresas.listarProveedores(req.user.empresaId, { sector: sector || undefined, tipoActor: tipoActor || undefined });
  }

  @Post('proveedores')
  @RolesEmpresa('INTERMEDIARIO')
  crearProveedor(@Req() req: AuthReq, @Body() body: unknown) {
    return this.empresas.crearProveedor(req.user.empresaId, parseBody(crearProveedorSchema, body));
  }

  @Get('proveedores/:id')
  @RolesEmpresa('INTERMEDIARIO')
  proveedor(@Req() req: AuthReq, @Param('id') id: string) {
    return this.empresas.proveedor(req.user.empresaId, id);
  }

  @Patch('proveedores/:id')
  @RolesEmpresa('INTERMEDIARIO')
  actualizarProveedor(@Req() req: AuthReq, @Param('id') id: string, @Body() body: unknown) {
    return this.empresas.actualizarProveedor(req.user.empresaId, id, parseBody(actualizarProveedorSchema, body));
  }

  @Post('proveedores/:id/rotar-enlace')
  @RolesEmpresa('INTERMEDIARIO')
  @HttpCode(200)
  rotarEnlace(@Req() req: AuthReq, @Param('id') id: string) {
    return this.empresas.rotarTokenCaptacion(req.user.empresaId, id);
  }

  /** Perfil público de cualquier empresa (para ver ofertantes/receptores). */
  @Get(':id')
  perfil(@Req() req: AuthReq, @Param('id') id: string) {
    return this.empresas.perfil(id, req.user);
  }
}
