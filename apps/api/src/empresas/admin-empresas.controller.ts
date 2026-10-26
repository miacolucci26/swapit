import { Body, Controller, Get, HttpCode, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { AuthGuard, JwtPayload, Roles } from '../auth/auth.guard';
import { parseBody } from '../common/zod-body';
import { EmpresasService } from './empresas.service';

type AuthReq = Request & { user: JwtPayload };

export const verificacionManualSchema = z.object({
  estado: z.enum(['VERIFICADA', 'RECHAZADA', 'PENDIENTE']),
  /** Qué se comprobó (p. ej. «Ficha RUC en SUNAT: activo y habido; representante confirmado por teléfono»). */
  nota: z.string().max(500).optional(),
});

/**
 * Verificación manual de empresas (solo ADMIN). Mientras no haya un proveedor de SUNAT configurado, en producción toda empresa
 * nueva queda PENDIENTE y un administrador la revisa aquí. Funciona en ambos modos (no depende del marketplace).
 */
@Controller('admin/empresas')
@UseGuards(AuthGuard)
export class AdminEmpresasController {
  constructor(private readonly empresas: EmpresasService) {}

  /** Empresas por revisar (por defecto, las PENDIENTES). */
  @Get()
  @Roles('ADMIN')
  listar(@Query('estado') estado?: string) {
    const e = estado === 'VERIFICADA' || estado === 'RECHAZADA' ? estado : 'PENDIENTE';
    return this.empresas.listarParaRevision(e);
  }

  @Patch(':id/verificacion')
  @Roles('ADMIN')
  @HttpCode(200)
  verificar(@Req() req: AuthReq, @Param('id') id: string, @Body() body: unknown) {
    const { estado, nota } = parseBody(verificacionManualSchema, body);
    return this.empresas.verificarManual(req.user.sub, id, estado, nota);
  }
}
