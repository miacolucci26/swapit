import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { acopioSchema, actualizarMaterialSchema, certificadoLoteSchema, cotizarSchema, crearMaterialSchema, despachoSchema } from '@swapit/shared';
import type { Request, Response } from 'express';
import { AuthGuard, JwtPayload, RolesEmpresa } from '../auth/auth.guard';
import { parseBody } from '../common/zod-body';
import { MaterialService } from './material.service';

type AuthReq = Request & { user: JwtPayload };
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const filtros = (q: Record<string, string | undefined>) => ({
  estado: q.estado || undefined, proveedorId: q.proveedorId || undefined, categoria: q.categoria || undefined, sector: q.sector || undefined,
  tipoActor: q.tipoActor || undefined, residuoRef: q.residuoRef || undefined, presentacion: q.presentacion || undefined, q: q.q || undefined,
});

/** Material de la red del intermediario: cotizar → acopiar → despachar. Solo cuentas INTERMEDIARIO. */
@Controller('material')
@UseGuards(AuthGuard)
@RolesEmpresa('INTERMEDIARIO')
export class MaterialController {
  constructor(private readonly material: MaterialService) {}

  @Get()
  listar(@Req() req: AuthReq, @Query() q: Record<string, string | undefined>) {
    return this.material.listar(req.user.empresaId, filtros(q));
  }

  /** Excel con el material de la red; acepta los mismos filtros que la lista. Va antes de «:id». */
  @Get('exportar')
  async exportar(@Req() req: AuthReq, @Res() res: Response, @Query() q: Record<string, string | undefined>) {
    const buf = await this.material.exportarXlsx(req.user.empresaId, filtros(q));
    res.set({ 'Content-Type': XLSX, 'Content-Disposition': 'attachment; filename="material-swapit.xlsx"' }).send(buf);
  }

  /** Cifras del panel: material por estado, acopio del mes, semáforo de precios y certificados. */
  @Get('resumen')
  resumen(@Req() req: AuthReq) {
    return this.material.resumen(req.user.empresaId);
  }

  /** El intermediario registra material en nombre de un proveedor (p. ej. tras una llamada o una visita). */
  @Post()
  crear(@Req() req: AuthReq, @Body() body: unknown) {
    const { proveedorId, ...dto } = parseBody(crearMaterialSchema, body);
    return this.material.reportar(proveedorId, dto, 'INTERMEDIARIO', req.user.empresaId);
  }

  @Get(':id')
  detalle(@Req() req: AuthReq, @Param('id') id: string) {
    return this.material.detalle(req.user.empresaId, id);
  }

  /** Corrige el residuo de la base de cadenas y la presentación del material. */
  @Patch(':id')
  actualizar(@Req() req: AuthReq, @Param('id') id: string, @Body() body: unknown) {
    return this.material.actualizar(req.user.empresaId, id, parseBody(actualizarMaterialSchema, body));
  }

  @Post(':id/cotizar')
  @HttpCode(200)
  cotizar(@Req() req: AuthReq, @Param('id') id: string, @Body() body: unknown) {
    return this.material.cotizar(req.user.empresaId, id, parseBody(cotizarSchema, body).precioOfrecido);
  }

  @Post(':id/acopiar')
  @HttpCode(200)
  acopiar(@Req() req: AuthReq, @Param('id') id: string, @Body() body: unknown) {
    return this.material.acopiar(req.user.empresaId, id, parseBody(acopioSchema, body));
  }

  @Post(':id/despachar')
  @HttpCode(200)
  despachar(@Req() req: AuthReq, @Param('id') id: string, @Body() body: unknown) {
    return this.material.despachar(req.user.empresaId, id, parseBody(despachoSchema, body));
  }

  /** Certificado co-marcado del material despachado, emitido por el intermediario a su cliente. */
  @Post(':id/certificado')
  @HttpCode(200)
  certificado(@Req() req: AuthReq, @Param('id') id: string, @Body() body: unknown) {
    return this.material.emitirCertificado(req.user.empresaId, id, parseBody(certificadoLoteSchema, body ?? {}).usoFinal);
  }

  @Post(':id/rechazar')
  @HttpCode(200)
  rechazar(@Req() req: AuthReq, @Param('id') id: string) {
    return this.material.rechazar(req.user.empresaId, id);
  }
}
