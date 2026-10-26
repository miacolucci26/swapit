import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CrearLoteInput } from '@swapit/shared';
import { Embedder, aVectorSql } from '../common/embeddings/embedder';
import { aToneladas, ETIQUETA_UNIDAD, type UnidadLote } from '@swapit/shared';
import { empresasReveladas, enmascararFila } from '../common/confidencial';
import { estimarFlete } from '../common/flete';
import { urlArchivo } from '../common/uploads';
import { IaService } from '../ia/ia.service';
import { MatchingService } from '../matching/matching.service';
import { PrismaService } from '../prisma/prisma.service';

/** OCULTAR_DEMO=1 oculta de la lista pública (y del mapa) los lotes de empresas marcadas como demostración. Se lee en cada petición. */
export const ocultarDemo = () => process.env.OCULTAR_DEMO === '1';

/** Estados del ciclo B2B2B: esos lotes pertenecen a la red de un intermediario y no son visibles en el mercado. */
const ESTADOS_PRIVADOS = new Set(['REPORTADO', 'COTIZADO', 'ACOPIADO', 'DESPACHADO', 'RECHAZADO']);

export interface FiltrosLotes {
  categoria?: string;
  modalidad?: string;
  q?: string;
  radioKm?: number;
  mios?: boolean;
  empresaId?: string;
  limite?: number;
}

const SELECT_LOTE = Prisma.sql`
  l.id, l.titulo, l.descripcion, l.keywords, l.cantidad, l."cantidadDisponible", l.unidad, l.modalidad, l.precio,
  l."precioReferencia", l."aceptaCreditos", l.frecuencia, l.estado, l."destacadoHasta", l."createdAt", l."iaSugerencia",
  l."notaIntercambio", l.condicion, l.entrega,
  c.codigo AS "categoriaCodigo", c.nombre AS "categoriaNombre", c.sector, c."kgPorUnidad",
  e.id AS "empresaId", e.tipo AS "tipoPublicador", e."razonSocial", e."ratingProm", e."nTransacciones", e."estadoKyb", e."badgeCircular", e.confidencial, e."esDemo" AS demo,
  ST_Y(l.ubicacion::geometry) AS lat, ST_X(l.ubicacion::geometry) AS lng,
  CASE WHEN o.ub IS NULL OR l.ubicacion IS NULL THEN NULL ELSE ST_Distance(l.ubicacion, o.ub) / 1000.0 END AS "distanciaKm"`;

@Injectable()
export class LotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embedder: Embedder,
    private readonly ia: IaService,
    private readonly matching: MatchingService,
  ) {}

  private async tarifa() {
    return (await this.prisma.configPlataforma.findUnique({ where: { id: 1 } }))?.tarifaFleteKmTon ?? 0.6;
  }

  async crear(empresaId: string, input: CrearLoteInput) {
    const empresa = await this.prisma.empresa.findUniqueOrThrow({ where: { id: empresaId } });
    if (empresa.rol === 'RECEPTOR') throw new ForbiddenException('Tu empresa está registrada solo como receptora; cambia su rol a ofertante o ambos para publicar.');
    if (empresa.estadoKyb === 'RECHAZADA') throw new ForbiddenException('Tu empresa no superó la verificación KYB.');
    const categoria = await this.prisma.categoriaResiduo.findUnique({ where: { codigo: input.categoriaCodigo } });
    if (!categoria) throw new BadRequestException('Categoría no válida');
    // Unidad: la elegida o la de la categoría. Contar «und» solo tiene sentido si la categoría define un peso promedio.
    const unidad = (input.unidad ?? categoria.unidadBase) as UnidadLote;
    if (unidad === 'und' && !categoria.kgPorUnidad) throw new BadRequestException('Esta categoría no se puede publicar por unidades; usa kilos o toneladas.');
    const sinPrecio = input.modalidad === 'DONACION' || input.modalidad === 'INTERCAMBIO';
    if (!sinPrecio && !input.precio) {
      const por = ETIQUETA_UNIDAD[unidad].porUnidad;
      throw new BadRequestException(input.modalidad === 'VENTA' ? `Indica el precio por ${por} (S/)` : `Indica el precio por ${por} en créditos`);
    }
    const precioRef = input.precioReferencia ?? (await this.ia.precioReferencia(categoria.id, categoria.codigo));

    const lote = await this.prisma.lote.create({
      data: {
        empresaId,
        categoriaId: categoria.id,
        titulo: input.titulo,
        descripcion: input.descripcion,
        keywords: input.keywords,
        cantidad: input.cantidad,
        cantidadDisponible: input.cantidad,
        unidad,
        modalidad: input.modalidad,
        precio: sinPrecio ? null : input.precio,
        precioReferencia: precioRef,
        aceptaCreditos: input.modalidad === 'CREDITOS' ? true : input.aceptaCreditos,
        frecuencia: input.frecuencia,
        condicion: input.condicion ?? null,
        entrega: input.entrega,
        notaIntercambio: input.modalidad === 'INTERCAMBIO' ? input.notaIntercambio?.trim() || null : null,
        iaSugerencia: (input.iaSugerencia ?? undefined) as Prisma.InputJsonValue | undefined,
        estado: 'PUBLICADO',
        imagenes: { create: input.imagenes.map((n, i) => ({ url: urlArchivo(n), orden: i })) },
      },
    });
    await this.prisma.$executeRaw`UPDATE "Lote" SET ubicacion = (SELECT ubicacion FROM "Empresa" WHERE id = ${empresaId}) WHERE id = ${lote.id}`;
    await this.indexar(lote.id);
    await this.matching.evaluarLote(lote.id).catch(() => undefined);
    return this.detalle(lote.id, empresaId);
  }

  /** Calcula y guarda el embedding del lote (pgvector). */
  async indexar(loteId: string) {
    const l = await this.prisma.lote.findUniqueOrThrow({ where: { id: loteId }, include: { categoria: true } });
    const texto = `${l.titulo}. ${l.descripcion}. ${l.categoria.nombre}. ${l.keywords.join(' ')}`;
    const vec = aVectorSql(await this.embedder.embed(texto));
    await this.prisma.$executeRaw`UPDATE "Lote" SET embedding = ${vec}::vector WHERE id = ${loteId}`;
  }

  async listar(viewerEmpresaId: string, f: FiltrosLotes) {
    const cond: Prisma.Sql[] = [];
    if (f.mios) cond.push(Prisma.sql`l."empresaId" = ${viewerEmpresaId}`);
    else {
      // El mercado muestra lotes de otras empresas; los propios están en «Mis lotes».
      cond.push(Prisma.sql`l.estado = 'PUBLICADO' AND l."cantidadDisponible" > 0 AND l."empresaId" <> ${viewerEmpresaId}`);
      if (f.empresaId) cond.push(Prisma.sql`l."empresaId" = ${f.empresaId}`);
      // OCULTAR_DEMO=1: la lista pública y el mapa no muestran lotes de empresas de demostración (producción con empresas reales).
      if (ocultarDemo()) cond.push(Prisma.sql`e."esDemo" = false`);
    }
    if (f.categoria) cond.push(Prisma.sql`c.codigo = ${f.categoria}`);
    if (f.modalidad) cond.push(Prisma.sql`l.modalidad = ${f.modalidad}::"Modalidad"`);
    if (f.q) {
      const like = `%${f.q.replace(/[%_]/g, '')}%`;
      cond.push(Prisma.sql`(l.titulo ILIKE ${like} OR l.descripcion ILIKE ${like} OR EXISTS (SELECT 1 FROM unnest(l.keywords) k WHERE k ILIKE ${like}))`);
    }
    if (f.radioKm) cond.push(Prisma.sql`(o.ub IS NOT NULL AND l.ubicacion IS NOT NULL AND ST_DWithin(l.ubicacion, o.ub, ${f.radioKm * 1000}))`);
    const where = cond.length ? Prisma.sql`WHERE ${Prisma.join(cond, ' AND ')}` : Prisma.empty;
    const filas = await this.prisma.$queryRaw<any[]>`
      SELECT ${SELECT_LOTE}
      FROM "Lote" l
      JOIN "CategoriaResiduo" c ON c.id = l."categoriaId"
      JOIN "Empresa" e ON e.id = l."empresaId"
      LEFT JOIN (SELECT ubicacion AS ub FROM "Empresa" WHERE id = ${viewerEmpresaId}) o ON true
      ${where}
      ORDER BY (l."destacadoHasta" IS NOT NULL AND l."destacadoHasta" > now()) DESC, "distanciaKm" ASC NULLS LAST, l."createdAt" DESC
      LIMIT ${Math.min(f.limite ?? 100, 300)}`;
    return this.enriquecer(filas, viewerEmpresaId);
  }

  async detalle(id: string, viewerEmpresaId: string) {
    const [fila] = await this.prisma.$queryRaw<any[]>`
      SELECT ${SELECT_LOTE}
      FROM "Lote" l
      JOIN "CategoriaResiduo" c ON c.id = l."categoriaId"
      JOIN "Empresa" e ON e.id = l."empresaId"
      LEFT JOIN (SELECT ubicacion AS ub FROM "Empresa" WHERE id = ${viewerEmpresaId}) o ON true
      WHERE l.id = ${id}`;
    // Un lote del ciclo B2B2B (reportado, cotizado, acopiado…) es de la red de un intermediario: nunca se ve por aquí, salvo su dueño.
    if (!fila || (ESTADOS_PRIVADOS.has(fila.estado) && fila.empresaId !== viewerEmpresaId)) throw new NotFoundException('Lote no encontrado');
    const [lote] = await this.enriquecer([fila], viewerEmpresaId);
    const transaccion = await this.prisma.transaccion.findFirst({
      where: { loteId: id, receptorId: viewerEmpresaId, estado: { notIn: ['CERRADO', 'CANCELADO'] } },
      select: { id: true, estado: true },
    });
    const certificaciones = await this.prisma.empresaCertificacion.findMany({ where: { empresaId: lote.empresaId }, select: { nombre: true } });
    return { ...lote, transaccionActiva: transaccion, certificacionesEmpresa: certificaciones.map((c) => c.nombre), esMio: lote.empresaId === viewerEmpresaId };
  }

  async retirar(id: string, empresaId: string) {
    const l = await this.prisma.lote.findUnique({ where: { id } });
    if (!l) throw new NotFoundException('Lote no encontrado');
    if (l.empresaId !== empresaId) throw new ForbiddenException();
    const activas = await this.prisma.transaccion.count({ where: { loteId: id, estado: { notIn: ['CERRADO', 'CANCELADO', 'SOLICITADO', 'EN_NEGOCIACION'] } } });
    if (activas) throw new BadRequestException('El lote tiene transacciones en curso');
    await this.prisma.lote.update({ where: { id }, data: { estado: 'RETIRADO' } });
    return { ok: true };
  }

  private async enriquecer(filas: any[], viewerEmpresaId?: string) {
    if (!filas.length) return [];
    const [imgs, tarifa] = await Promise.all([
      this.prisma.loteImagen.findMany({ where: { loteId: { in: filas.map((f) => f.id) } }, orderBy: { orden: 'asc' } }),
      this.tarifa(),
    ]);
    const ahora = Date.now();
    const reveladas = viewerEmpresaId ? await empresasReveladas(this.prisma, viewerEmpresaId) : new Set<string>();
    return filas.map((fila) => {
      const f = viewerEmpresaId ? enmascararFila(fila, viewerEmpresaId, reveladas) : { ...fila, identidadOculta: false };
      const km = f.distanciaKm == null ? null : Number(f.distanciaKm);
      return {
        ...f,
        esMio: f.empresaId === viewerEmpresaId,
        distanciaKm: km == null ? null : Math.round(km * 10) / 10,
        fleteEstimado: estimarFlete(km, aToneladas(f.cantidadDisponible, f.unidad, f.kgPorUnidad), tarifa),
        destacado: !!f.destacadoHasta && new Date(f.destacadoHasta).getTime() > ahora,
        imagenes: imgs.filter((i) => i.loteId === f.id).map((i) => i.url),
        ubicacion: f.lat != null ? { lat: f.lat, lng: f.lng } : null,
      };
    });
  }
}
