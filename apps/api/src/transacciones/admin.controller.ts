import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { estadoIncidenciaSchema } from '@swapit/shared';
import { SoloMarketplace } from '../common/modo';
import { parseBody } from '../common/zod-body';
import { AuthGuard, Roles } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';

/** Moderación: las incidencias solo las ve el rol ADMIN. */
@SoloMarketplace()
@Controller('admin')
@UseGuards(AuthGuard)
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('incidencias')
  @Roles('ADMIN')
  incidencias() {
    return this.prisma.incidencia.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        usuario: { select: { nombre: true, empresa: { select: { razonSocial: true } } } },
        transaccion: { select: { id: true, estado: true, lote: { select: { titulo: true } }, ofertante: { select: { razonSocial: true } }, receptor: { select: { razonSocial: true } } } },
      },
    });
  }

  @Post('incidencias/:id/estado')
  @Roles('ADMIN')
  @HttpCode(200)
  estado(@Param('id') id: string, @Body() body: unknown) {
    const { estado } = parseBody(estadoIncidenciaSchema, body);
    return this.prisma.incidencia.update({ where: { id }, data: { estado } });
  }
}
