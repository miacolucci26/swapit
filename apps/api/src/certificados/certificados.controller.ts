import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard, JwtPayload } from '../auth/auth.guard';
import { CertificadosService } from './certificados.service';

@Controller()
export class CertificadosController {
  constructor(private readonly certs: CertificadosService) {}

  @Get('certificados')
  @UseGuards(AuthGuard)
  mios(@Req() req: Request & { user: JwtPayload }) {
    return this.certs.deEmpresa(req.user.empresaId);
  }

  /** Público: cualquier tercero (auditor, OEFA) puede validar un certificado con su código. */
  @Get('verificar/:codigo')
  verificar(@Param('codigo') codigo: string) {
    return this.certs.verificar(codigo);
  }

  @Get('verificar/:codigo/pdf')
  async pdf(@Param('codigo') codigo: string, @Res() res: Response) {
    const buf = await this.certs.pdf(codigo);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${codigo}.pdf"` });
    res.send(buf);
  }
}
