import { Body, Controller, Get, HttpCode, NotFoundException, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { compartirPreciosSchema, consultaBenchmarkSchema, importarPreciosSchema } from '@swapit/shared';
import type { Request } from 'express';
import { AuthGuard, JwtPayload, RolesEmpresa } from '../auth/auth.guard';
import { parseBody } from '../common/zod-body';
import { PrismaService } from '../prisma/prisma.service';
import { BenchmarkService } from './benchmark.service';

type AuthReq = Request & { user: JwtPayload };

/** Benchmark de precios por subtipo: lo consulta el intermediario (y el proveedor, por su enlace, desde captación). */
@Controller('benchmark')
@UseGuards(AuthGuard)
@RolesEmpresa('INTERMEDIARIO')
export class BenchmarkController {
  constructor(private readonly benchmark: BenchmarkService, private readonly prisma: PrismaService) {}

  /** Rango de precio justo para un material y volumen. Si se indica un proveedor, la distancia se mide desde él. */
  @Get()
  async estimar(@Req() req: AuthReq, @Query() query: Record<string, unknown>) {
    const q = parseBody(consultaBenchmarkSchema, query);
    let origen = req.user.empresaId;
    if (q.proveedorId) {
      const p = await this.prisma.empresa.findFirst({ where: { id: q.proveedorId, intermediarioId: req.user.empresaId }, select: { id: true } });
      if (!p) throw new NotFoundException('Proveedor no encontrado');
      origen = p.id;
    }
    const ub = await this.benchmark.ubicacionDe(origen);
    return this.benchmark.estimar({ categoriaCodigo: q.categoria, descripcion: q.descripcion, cantidad: q.cantidad, unidad: q.unidad, lat: ub?.lat, lng: ub?.lng, intermediarioId: req.user.empresaId });
  }

  @Get('mis-datos')
  misDatos(@Req() req: AuthReq) {
    return this.benchmark.misDatos(req.user.empresaId);
  }

  @Post('importar')
  @HttpCode(200)
  importar(@Req() req: AuthReq, @Body() body: unknown) {
    return this.benchmark.importarCsv(req.user.empresaId, parseBody(importarPreciosSchema, body).csv);
  }

  @Put('compartir')
  compartir(@Req() req: AuthReq, @Body() body: unknown) {
    return this.benchmark.compartir(req.user.empresaId, parseBody(compartirPreciosSchema, body).compartir);
  }
}
