import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard, JwtPayload, Tipos } from '../auth/auth.guard';
import { SoloMarketplace } from '../common/modo';
import { ImpactoService, Periodo } from './impacto.service';

type AuthReq = Request & { user: JwtPayload };
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function periodo(desde?: string, hasta?: string): Periodo {
  const d = desde ? new Date(desde) : undefined;
  const h = hasta ? new Date(`${hasta}T23:59:59.999Z`) : undefined;
  return { desde: d && !isNaN(d.getTime()) ? d : undefined, hasta: h && !isNaN(h.getTime()) ? h : undefined };
}

@Controller()
export class ImpactoController {
  constructor(private readonly svc: ImpactoService) {}

  /** Público: vista agregada institucional (Demo Day / pitch). */
  @Get('impacto/publico')
  publico() {
    return this.svc.agregado();
  }

  @Get('impacto/mi')
  @UseGuards(AuthGuard)
  mi(@Req() req: AuthReq) {
    return this.svc.agregado(req.user.empresaId);
  }

  @Get('impacto/mi/reporte.xlsx')
  @UseGuards(AuthGuard)
  async reporte(@Req() req: AuthReq, @Res() res: Response) {
    const buf = await this.svc.reporteSostenibilidadXlsx(req.user.empresaId);
    res.set({ 'Content-Type': XLSX, 'Content-Disposition': 'attachment; filename="reporte-sostenibilidad.xlsx"' }).send(buf);
  }

  @Get('cumplimiento')
  @SoloMarketplace()
  @Tipos('EMPRESA')
  @UseGuards(AuthGuard)
  cumplimiento(@Req() req: AuthReq, @Query('rol') rol?: string, @Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.svc.cumplimiento(req.user.empresaId, rol === 'RECEPTOR' ? 'RECEPTOR' : 'OFERTANTE', periodo(desde, hasta));
  }

  @Get('cumplimiento/export.xlsx')
  @SoloMarketplace()
  @Tipos('EMPRESA')
  @UseGuards(AuthGuard)
  async exportar(@Req() req: AuthReq, @Res() res: Response, @Query('rol') rol?: string, @Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    const buf = await this.svc.cumplimientoXlsx(req.user.empresaId, rol === 'RECEPTOR' ? 'RECEPTOR' : 'OFERTANTE', periodo(desde, hasta));
    res.set({ 'Content-Type': XLSX, 'Content-Disposition': 'attachment; filename="reporte-cumplimiento-rep.xlsx"' }).send(buf);
  }
}
