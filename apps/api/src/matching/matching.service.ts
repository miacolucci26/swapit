import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Embedder, aVectorSql } from '../common/embeddings/embedder';
import { aToneladas, expandirConsulta, usoQueCalza, type UsoDetectado } from '@swapit/shared';
import { empresasReveladas, enmascararFila } from '../common/confidencial';
import { estimarFlete } from '../common/flete';
import { PrismaService } from '../prisma/prisma.service';

export interface ResultadoMatch {
  loteId: string;
  titulo: string;
  categoriaCodigo: string;
  categoriaNombre: string;
  modalidad: string;
  precio: number | null;
  cantidadDisponible: number;
  unidad: string;
  empresaId: string;
  tipoPublicador: 'EMPRESA' | 'PERSONA';
  razonSocial: string;
  identidadOculta: boolean;
  ratingProm: number;
  distanciaKm: number | null;
  fleteEstimado: number | null;
  ubicacion: { lat: number; lng: number } | null;
  similitud: number;
  score: number; // 0..100
  explicacion: string;
  /** Si la búsqueda nombra un uso conocido («gomitas») y el lote calza, qué uso y qué cuidado tener. */
  usoSugerido: { titulo: string; detalle: string; cuidado: string } | null;
}

interface Consulta {
  texto: string;
  categoriaCodigo?: string | null;
  radioKm: number;
  /** Empresa que busca: se excluyen sus propios lotes y de ahí se toma el origen de distancia. */
  empresaId: string;
  /** Origen alternativo (la ubicación fijada en una alerta). */
  centroAlertaId?: string;
  limite?: number;
}

const PESOS = { similitud: 0.55, cercania: 0.2, reputacion: 0.15, categoria: 0.1 };
const UMBRAL_NOTIFICACION = 45; // score mínimo para generar un match automático

@Injectable()
export class MatchingService {
  private readonly log = new Logger(MatchingService.name);

  constructor(private readonly prisma: PrismaService, private readonly embedder: Embedder) {}

  /**
   * Ranking por IA: similitud coseno (pgvector) sobre texto + metadata del lote,
   * filtros duros (radio, categoría compatible) y peso por cercanía y reputación del ofertante.
   */
  async buscar(q: Consulta): Promise<ResultadoMatch[]> {
    // «necesito cáscaras para gomitas» se amplía con los insumos que sirven (cítricos, mango…).
    const exp = expandirConsulta(q.texto);
    const vec = aVectorSql(await this.embedder.embed(exp.texto));
    return this.ejecutar(vec, q, exp.usos);
  }

  private async ejecutar(vec: string, q: Consulta, usos: UsoDetectado[] = []): Promise<ResultadoMatch[]> {
    const origen = q.centroAlertaId
      ? Prisma.sql`(SELECT centro AS ub FROM "AlertaBusqueda" WHERE id = ${q.centroAlertaId})`
      : Prisma.sql`(SELECT ubicacion AS ub FROM "Empresa" WHERE id = ${q.empresaId})`;
    const filtroCat = q.categoriaCodigo ? Prisma.sql`AND c.codigo = ${q.categoriaCodigo}` : Prisma.empty;
    const filas = await this.prisma.$queryRaw<any[]>`
      SELECT l.id AS "loteId", l.titulo, l.modalidad, l.precio, l."cantidadDisponible", l.unidad,
             c.codigo AS "categoriaCodigo", c.nombre AS "categoriaNombre", c.sector, c."kgPorUnidad",
             e.id AS "empresaId", e.tipo AS "tipoPublicador", e."razonSocial", e."ratingProm", e."nTransacciones", e.confidencial,
             ST_Y(l.ubicacion::geometry) AS lat, ST_X(l.ubicacion::geometry) AS lng,
             1 - (l.embedding <=> ${vec}::vector) AS sim,
             CASE WHEN o.ub IS NULL OR l.ubicacion IS NULL THEN NULL ELSE ST_Distance(l.ubicacion, o.ub) / 1000.0 END AS dist
      FROM "Lote" l
      JOIN "CategoriaResiduo" c ON c.id = l."categoriaId"
      JOIN "Empresa" e ON e.id = l."empresaId"
      LEFT JOIN (SELECT ub FROM ${origen} s) o ON true
      WHERE l.estado = 'PUBLICADO' AND l."cantidadDisponible" > 0 AND l.embedding IS NOT NULL
        AND l."empresaId" <> ${q.empresaId} ${filtroCat}
        AND (o.ub IS NULL OR l.ubicacion IS NULL OR ST_DWithin(l.ubicacion, o.ub, ${q.radioKm * 1000}))
      ORDER BY l.embedding <=> ${vec}::vector
      LIMIT 60`;
    const tarifa = (await this.prisma.configPlataforma.findUnique({ where: { id: 1 } }))?.tarifaFleteKmTon ?? 0.6;

    const reveladas = await empresasReveladas(this.prisma, q.empresaId);
    const res = filas.map((fila): ResultadoMatch => {
      const f = enmascararFila(fila, q.empresaId, reveladas);
      const sim = Math.max(0, Number(f.sim));
      // Normaliza el coseno sin saturarlo: ~0.08 es ruido y ~0.7 es coincidencia casi exacta.
      const simN = Math.max(0, Math.min(1, (sim - 0.08) / 0.65));
      const dist = f.dist == null ? null : Number(f.identidadOculta ? Math.round(f.dist) : f.dist);
      const cerca = dist == null ? 0.5 : 1 - Math.min(dist / q.radioKm, 1);
      const rep = Number(f.ratingProm) > 0 ? Number(f.ratingProm) / 5 : 0.6;
      const cat = q.categoriaCodigo && f.categoriaCodigo === q.categoriaCodigo ? 1 : 0;
      const score = Math.round(100 * (PESOS.similitud * simN + PESOS.cercania * cerca + PESOS.reputacion * rep + PESOS.categoria * (q.categoriaCodigo ? cat : simN > 0.6 ? 1 : 0)));
      const partes = [`${Math.round(simN * 100)}% de afinidad · ${f.categoriaNombre.split('(')[0].trim()}`];
      if (dist != null) partes.push(`a ${Math.round(dist)} km`);
      if (Number(f.ratingProm) > 0) partes.push(`ofertante ★ ${Number(f.ratingProm).toFixed(1)}`);
      const uso = usoQueCalza(usos, f.titulo);
      if (uso) partes.push(`sirve para ${uso.titulo.toLowerCase()}`);
      return {
        loteId: f.loteId,
        titulo: f.titulo,
        categoriaCodigo: f.categoriaCodigo,
        categoriaNombre: f.categoriaNombre,
        modalidad: f.modalidad,
        precio: f.precio,
        cantidadDisponible: f.cantidadDisponible,
        unidad: f.unidad,
        empresaId: f.empresaId,
        tipoPublicador: f.tipoPublicador,
        razonSocial: f.razonSocial,
        identidadOculta: f.identidadOculta,
        ratingProm: f.ratingProm,
        distanciaKm: dist == null ? null : Math.round(dist * 10) / 10,
        fleteEstimado: estimarFlete(dist, aToneladas(f.cantidadDisponible, f.unidad, f.kgPorUnidad), tarifa),
        ubicacion: f.lat != null ? { lat: f.lat, lng: f.lng } : null,
        similitud: Math.round(sim * 100) / 100,
        score: Math.min(100, score),
        explicacion: partes.join(' · '),
        usoSugerido: uso ? { titulo: uso.titulo, detalle: uso.detalle, cuidado: uso.cuidado } : null,
      };
    });
    // Sin afinidad real con lo buscado no hay match (evita resultados que solo están "cerca").
    const relevantes = q.categoriaCodigo ? res : res.filter((r) => r.similitud >= 0.18);
    return relevantes.sort((a, b) => b.score - a.score).slice(0, q.limite ?? 20);
  }

  // ---------- Alertas de búsqueda ----------

  async crearAlerta(empresaId: string, dto: { texto: string; categoriaCodigo?: string; radioKm: number }) {
    const cat = dto.categoriaCodigo ? await this.prisma.categoriaResiduo.findUnique({ where: { codigo: dto.categoriaCodigo } }) : null;
    const alerta = await this.prisma.alertaBusqueda.create({
      data: { empresaId, texto: dto.texto, categoriaId: cat?.id ?? null, radioKm: dto.radioKm },
    });
    const vec = aVectorSql(await this.embedder.embed(expandirConsulta(dto.texto).texto));
    await this.prisma.$executeRaw`
      UPDATE "AlertaBusqueda" SET embedding = ${vec}::vector, centro = (SELECT ubicacion FROM "Empresa" WHERE id = ${empresaId})
      WHERE id = ${alerta.id}`;
    await this.refrescarMatches(alerta.id);
    return this.alertaConMatches(alerta.id, empresaId);
  }

  async listarAlertas(empresaId: string) {
    const alertas = await this.prisma.alertaBusqueda.findMany({ where: { empresaId }, orderBy: { createdAt: 'desc' }, select: { id: true } });
    return Promise.all(alertas.map((a) => this.alertaConMatches(a.id, empresaId)));
  }

  async eliminarAlerta(empresaId: string, id: string) {
    const r = await this.prisma.alertaBusqueda.deleteMany({ where: { id, empresaId } });
    if (!r.count) throw new NotFoundException('Alerta no encontrada');
  }

  async marcarVistos(empresaId: string, id: string) {
    await this.prisma.match.updateMany({ where: { alertaId: id, alerta: { empresaId }, notificado: false }, data: { notificado: true } });
  }

  private async alertaConMatches(alertaId: string, empresaId: string) {
    const a = await this.prisma.alertaBusqueda.findFirst({ where: { id: alertaId, empresaId }, include: { categoria: true } });
    if (!a) throw new NotFoundException('Alerta no encontrada');
    const matches = await this.prisma.match.findMany({ where: { alertaId }, orderBy: { score: 'desc' }, take: 10, include: { lote: { select: { id: true, titulo: true, estado: true, cantidadDisponible: true } } } });
    const vigentes = matches.filter((m) => m.lote.estado === 'PUBLICADO');
    return {
      id: a.id,
      texto: a.texto,
      radioKm: a.radioKm,
      categoria: a.categoria?.nombre ?? null,
      activa: a.activa,
      nuevos: vigentes.filter((m) => !m.notificado).length,
      matches: vigentes.map((m) => ({ loteId: m.loteId, titulo: m.lote.titulo, score: Math.round(m.score), explicacion: m.explicacion, nuevo: !m.notificado })),
    };
  }

  /** Recalcula los matches de una alerta contra los lotes publicados. */
  async refrescarMatches(alertaId: string) {
    const a = await this.prisma.alertaBusqueda.findUnique({ where: { id: alertaId }, include: { categoria: true } });
    if (!a || !a.activa) return;
    const [{ vec }] = await this.prisma.$queryRaw<{ vec: string }[]>`SELECT embedding::text AS vec FROM "AlertaBusqueda" WHERE id = ${alertaId}`;
    if (!vec) return;
    const res = await this.ejecutar(vec, { texto: a.texto, categoriaCodigo: a.categoria?.codigo, radioKm: a.radioKm, empresaId: a.empresaId, centroAlertaId: a.id, limite: 30 }, expandirConsulta(a.texto).usos);
    for (const r of res.filter((x) => x.score >= UMBRAL_NOTIFICACION)) {
      await this.prisma.match.upsert({
        where: { alertaId_loteId: { alertaId, loteId: r.loteId } },
        update: { score: r.score, explicacion: r.explicacion },
        create: { alertaId, loteId: r.loteId, score: r.score, explicacion: r.explicacion },
      });
    }
  }

  /** Al publicarse un lote: cruza contra las alertas activas y deja los matches como no vistos (notificación). */
  async evaluarLote(loteId: string) {
    const alertas = await this.prisma.alertaBusqueda.findMany({ where: { activa: true }, select: { id: true } });
    for (const a of alertas) await this.refrescarMatches(a.id);
    this.log.log(`Lote ${loteId} evaluado contra ${alertas.length} alertas`);
  }
}
