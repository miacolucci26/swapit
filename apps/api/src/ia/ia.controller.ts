import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { clasificarSchema } from '@swapit/shared';
import type { Request } from 'express';
import { AuthGuard, JwtPayload } from '../auth/auth.guard';
import { parseBody } from '../common/zod-body';
import { PrismaService } from '../prisma/prisma.service';
import { IaService } from './ia.service';

@Controller()
@UseGuards(AuthGuard)
export class IaController {
  constructor(private readonly ia: IaService, private readonly prisma: PrismaService) {}

  /** Clasificación asistida: el ofertante siempre puede editar la sugerencia antes de publicar. */
  @Post('ia/clasificar')
  @HttpCode(200)
  clasificar(@Req() req: Request & { user: JwtPayload }, @Body() body: unknown) {
    const { descripcion, imagenes } = parseBody(clasificarSchema, body);
    return this.ia.clasificar(descripcion, imagenes, req.user.tipo === 'PERSONA' ? 'PERSONA' : 'EMPRESA');
  }

  @Get('categorias')
  categorias() {
    return this.prisma.categoriaResiduo.findMany({ orderBy: { nombre: 'asc' } });
  }

  @Get('ia/estado')
  estado() {
    return { claude: !!process.env.ANTHROPIC_API_KEY, embeddings: process.env.OPENAI_API_KEY ? 'openai' : 'local' };
  }
}
