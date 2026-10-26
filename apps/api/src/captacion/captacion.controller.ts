import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { consultaBenchmarkSchema, reporteCaptacionSchema, type ReporteCaptacionInput } from '@swapit/shared';
import type { Request } from 'express';
import { TokenCaptacionGuard } from '../auth/captacion.guard';
import { BenchmarkService } from '../benchmark/benchmark.service';
import { limitar } from '../common/limite-tasa';
import { opcionesSubidaImagen } from '../common/uploads';
import { parseBody } from '../common/zod-body';
import { MaterialService } from '../material/material.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

/**
 * Portal de captación: el proveedor de un intermediario reporta material con un enlace secreto, sin cuenta ni contraseña.
 * Cada enlace identifica a UN proveedor y solo da acceso a sus propios reportes. No es un registro abierto.
 */
@Controller('captacion')
export class CaptacionController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly material: MaterialService,
    private readonly benchmark: BenchmarkService,
    private readonly archivos: StorageService,
  ) {}

  /** Un enlace inválido, rotado o de un proveedor desactivado responde igual: 404 (no revela cuál fue el motivo). */
  private async proveedor(token: string, req: Request) {
    // Freno a adivinar enlaces o a martillar el endpoint. (El token tiene 144 bits: adivinarlo no es viable.)
    limitar(`captacion:ip:${req.ip}`, 120, 60_000);
    const p = await this.prisma.empresa.findFirst({
      where: { tokenCaptacion: token, rol: 'GENERADOR', activo: true, intermediarioId: { not: null } },
      include: { intermediario: { select: { id: true, razonSocial: true, logoUrl: true, colorMarca: true } } },
    });
    if (!p || !p.intermediario) throw new NotFoundException('Este enlace no es válido o ya no está vigente. Pídele uno nuevo a tu acopiador.');
    return { ...p, intermediario: p.intermediario };
  }

  @Get(':token')
  async inicio(@Param('token') token: string, @Req() req: Request) {
    const p = await this.proveedor(token, req);
    const categorias = await this.prisma.categoriaResiduo.findMany({ where: { codigo: { not: 'ARTICULOS_PERSONALES' } }, orderBy: { nombre: 'asc' }, select: { codigo: true, nombre: true, familia: true, unidadBase: true } });
    return {
      proveedor: { nombre: p.razonSocial, contacto: p.contactoNombre },
      intermediario: { razonSocial: p.intermediario.razonSocial, logoUrl: p.intermediario.logoUrl, colorMarca: p.intermediario.colorMarca },
      categorias,
    };
  }

  /** Reporte de material. Devuelve el rango de referencia para que el proveedor sepa si su precio es razonable. */
  @Post(':token/reporte')
  async reportar(@Param('token') token: string, @Body() body: unknown, @Req() req: Request) {
    const p = await this.proveedor(token, req);
    limitar(`captacion:reporte:${p.id}`, 20, 3600_000);
    const dto: ReporteCaptacionInput = parseBody(reporteCaptacionSchema, body);
    const l = await this.material.reportar(p.id, dto, 'PORTAL', p.intermediario.id);
    const b = l.benchmark;
    return {
      id: l.id,
      titulo: l.titulo,
      categoria: { codigo: l.categoriaCodigo, nombre: l.categoriaNombre },
      requiereRevision: !!(l.iaSugerencia as { requiereRevision?: boolean } | null)?.requiereRevision,
      estado: l.estado,
      etiquetaEstado: l.etiquetaEstado,
      cantidad: l.cantidad,
      unidad: l.unidad,
      precioEsperado: l.precioEsperado,
      posicionPrecio: l.veredictos?.esperado ?? null,
      benchmark: b ? { unidad: b.unidad, rango: b.rango, confianza: b.confianza, esSemilla: b.esSemilla, rangoOrientativo: b.rangoOrientativo, n: b.n, nota: b.nota } : null,
    };
  }

  /** Estado de los reportes de este proveedor (lo que el intermediario ya cotizó o acopió). */
  @Get(':token/estado')
  async estado(@Param('token') token: string, @Req() req: Request) {
    const p = await this.proveedor(token, req);
    const lotes = await this.material.listar(p.intermediario.id, { proveedorId: p.id });
    return lotes.map((l) => ({
      id: l.id, titulo: l.titulo, categoria: l.categoriaNombre, cantidad: l.cantidad, unidad: l.unidad, estado: l.estado, etiquetaEstado: l.etiquetaEstado,
      precioEsperado: l.precioEsperado, precioOfrecido: l.precioOfrecido, precioFinal: l.precioFinal, fecha: l.createdAt, imagenes: l.imagenes,
    }));
  }

  /** Rango de referencia para un material, con la ubicación del proveedor. */
  @Get(':token/benchmark')
  async rango(@Param('token') token: string, @Query() query: Record<string, unknown>, @Req() req: Request) {
    const p = await this.proveedor(token, req);
    const q = parseBody(consultaBenchmarkSchema, query);
    const ub = await this.benchmark.ubicacionDe(p.id);
    const e = await this.benchmark.estimar({ categoriaCodigo: q.categoria, descripcion: q.descripcion, cantidad: q.cantidad, unidad: q.unidad, lat: ub?.lat, lng: ub?.lng, intermediarioId: p.intermediario.id });
    return { unidad: e.unidad, rango: e.rango, confianza: e.confianza, esSemilla: e.esSemilla, rangoOrientativo: e.rangoOrientativo, n: e.n, nota: e.nota, categoria: e.categoria };
  }

  @Post(':token/fotos')
  @UseGuards(TokenCaptacionGuard) // antes que multer: un enlace falso no puede subir archivos
  @UseInterceptors(FileInterceptor('file', opcionesSubidaImagen))
  async foto(@Param('token') token: string, @Req() req: Request, @UploadedFile() file?: Express.Multer.File) {
    const p = await this.proveedor(token, req);
    limitar(`captacion:foto:${p.id}`, 30, 3600_000);
    if (!file) throw new BadRequestException('Falta el archivo');
    return this.archivos.guardarImagen(file);
  }
}
