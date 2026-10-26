import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import {
  aToneladas, estimarRango, posicionPrecio, precioEnUnidad, precioPorTon, generarSemilla,
  type FuentePrecio, type Observacion, type PosicionPrecio, type ResultadoBenchmark, type UnidadLote,
} from '@swapit/shared';
import { Embedder, aVectorSql } from '../common/embeddings/embedder';
import { PrismaService } from '../prisma/prisma.service';

export interface ConsultaEstimacion {
  categoriaCodigo: string;
  descripcion?: string;
  cantidad: number;
  unidad: UnidadLote;
  lat?: number | null;
  lng?: number | null;
  /** Quien consulta: ve los datos de ejemplo, los suyos y los de quienes aceptaron compartir. */
  intermediarioId: string;
}

export interface Estimacion extends Omit<ResultadoBenchmark, 'comparables' | 'rango'> {
  categoria: { codigo: string; nombre: string; familia: string | null };
  /** Unidad en la que se expresan `rango` y los comparables (la del lote consultado). */
  unidad: UnidadLote;
  rango: { p25: number; p50: number; p75: number } | null;
  rangoPorTon: { p25: number; p50: number; p75: number } | null;
  cantidadTon: number;
  comparables: { fecha: Date; precio: number; cantidadTon: number; fuente: FuentePrecio; categoriaCodigo: string; score: number; distanciaKm: number | null }[];
  nota: string;
}

export interface NuevaObservacion {
  categoriaId: string;
  nombreCategoria: string;
  precioPorTon: number;
  cantidadTon: number;
  fecha: Date;
  fuente: FuentePrecio;
  intermediarioId?: string | null;
  descripcion?: string | null;
  lat?: number | null;
  lng?: number | null;
}

/**
 * Benchmark de precios por subtipo de material. Reutiliza el esquema de similitud del matching (coseno pgvector +
 * distancia PostGIS) pero compara precios históricos en lugar de buscar una contraparte; los criterios y pesos
 * están en `packages/shared/src/benchmark.ts`.
 */
@Injectable()
export class BenchmarkService {
  constructor(private readonly prisma: PrismaService, private readonly embedder: Embedder) {}

  async estimar(q: ConsultaEstimacion): Promise<Estimacion> {
    const cat = await this.prisma.categoriaResiduo.findUnique({ where: { codigo: q.categoriaCodigo } });
    if (!cat) throw new BadRequestException('Categoría no válida');
    const cantidadTon = aToneladas(q.cantidad, q.unidad, cat.kgPorUnidad);
    const vec = aVectorSql(await this.embedder.embed(`${cat.nombre}. ${q.descripcion ?? ''}`));
    const lat = q.lat ?? null;
    const lng = q.lng ?? null;

    // Misma categoría o, si es un subtipo, su familia; y solo datos que el consultante puede ver:
    // los de ejemplo, los suyos y los de intermediarios que aceptaron compartir.
    const familia = cat.familia ?? null;
    const filas = await this.prisma.$queryRaw<{ precioPorTon: number; cantidadTon: number; fecha: Date; fuente: FuentePrecio; categoriaCodigo: string; sim: number; dist: number | null }[]>`
      SELECT p."precioPorTon", p."cantidadTon", p.fecha, p.fuente, c.codigo AS "categoriaCodigo",
             1 - (p.embedding <=> ${vec}::vector) AS sim,
             CASE WHEN ${lat}::float8 IS NULL OR p.ubicacion IS NULL THEN NULL
                  ELSE ST_Distance(p.ubicacion, ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography) / 1000.0 END AS dist
      FROM "PrecioObservado" p
      JOIN "CategoriaResiduo" c ON c.id = p."categoriaId"
      LEFT JOIN "Empresa" ie ON ie.id = p."intermediarioId"
      WHERE (c.codigo = ${cat.codigo} OR (${familia}::text IS NOT NULL AND c.familia = ${familia}))
        AND (p.fuente = 'SEMILLA' OR p."intermediarioId" = ${q.intermediarioId} OR ie."compartirPrecios")
        AND p.embedding IS NOT NULL
      ORDER BY p.embedding <=> ${vec}::vector
      LIMIT 300`;

    const observaciones: Observacion[] = filas.map((f) => ({
      precioPorTon: Number(f.precioPorTon),
      cantidadTon: Number(f.cantidadTon),
      fecha: new Date(f.fecha),
      fuente: f.fuente,
      categoriaCodigo: f.categoriaCodigo,
      similitud: Math.max(0, Number(f.sim)),
      distanciaKm: f.dist == null ? null : Math.round(Number(f.dist) * 10) / 10,
    }));
    const r = estimarRango(observaciones, { categoriaCodigo: cat.codigo, cantidadTon });
    const aUnidad = (t: number) => Math.round(precioEnUnidad(t, q.unidad, cat.kgPorUnidad) * 100) / 100;
    const rango = r.rango ? { p25: aUnidad(r.rango.p25), p50: aUnidad(r.rango.p50), p75: aUnidad(r.rango.p75) } : null;

    let nota: string;
    if (!r.rango) nota = 'No hay precios comparables para este material todavía. Importa tus compras históricas o registra acopios para construir tu referencia.';
    else if (r.esSemilla) nota = 'Basado en datos de ejemplo: sirve para ver cómo funciona, no como precio de mercado. Importa tus compras reales para obtener un rango propio.';
    else if (r.rangoOrientativo) nota = 'Hay pocos comparables: tómalo como una pista, no como una referencia firme.';
    else nota = `Rango estimado con ${r.n} precios comparables (mismo subtipo y zona cercana tienen más peso).`;

    return {
      categoria: { codigo: cat.codigo, nombre: cat.nombre, familia },
      unidad: q.unidad,
      cantidadTon,
      rango,
      rangoPorTon: r.rango,
      n: r.n,
      confianza: r.confianza,
      rangoOrientativo: r.rangoOrientativo,
      esSemilla: r.esSemilla,
      nota,
      comparables: r.comparables.slice(0, 8).map((c) => ({
        fecha: c.fecha, precio: aUnidad(c.precioPorTon), cantidadTon: c.cantidadTon, fuente: c.fuente, categoriaCodigo: c.categoriaCodigo, score: Math.round(c.score * 100) / 100, distanciaKm: c.distanciaKm,
      })),
    };
  }

  /** Dónde cae un precio (por unidad del lote) frente al rango estimado; null si no hay rango. */
  async posicion(precio: number, unidad: UnidadLote, kgPorUnidad: number | null, q: ConsultaEstimacion): Promise<{ posicion: PosicionPrecio | null; estimacion: Estimacion }> {
    const estimacion = await this.estimar(q);
    return { posicion: posicionPrecio(precioPorTon(precio, unidad, kgPorUnidad), estimacion.rangoPorTon), estimacion };
  }

  async registrarObservacion(o: NuevaObservacion) {
    const vec = aVectorSql(await this.embedder.embed(`${o.nombreCategoria}. ${o.descripcion ?? ''}`));
    const lat = o.lat ?? null;
    const lng = o.lng ?? null;
    await this.prisma.$executeRaw`
      INSERT INTO "PrecioObservado" (id, "categoriaId", "precioPorTon", "cantidadTon", fecha, fuente, "intermediarioId", descripcion, ubicacion, embedding)
      VALUES (${randomUUID()}, ${o.categoriaId}, ${o.precioPorTon}, ${o.cantidadTon}, ${o.fecha}, ${o.fuente}, ${o.intermediarioId ?? null}, ${o.descripcion ?? null},
              CASE WHEN ${lat}::float8 IS NULL OR ${lng}::float8 IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography END,
              ${vec}::vector)`;
  }

  /** Inserta los datos de ejemplo una sola vez. Devuelve cuántos agregó. */
  async sembrar(): Promise<number> {
    if ((await this.prisma.precioObservado.count({ where: { fuente: 'SEMILLA' } })) > 0) return 0;
    const cats = new Map((await this.prisma.categoriaResiduo.findMany({ select: { id: true, codigo: true, nombre: true } })).map((c) => [c.codigo, c]));
    let n = 0;
    for (const s of generarSemilla()) {
      const c = cats.get(s.categoriaCodigo);
      if (!c) continue;
      await this.registrarObservacion({ categoriaId: c.id, nombreCategoria: c.nombre, precioPorTon: s.precioPorTon, cantidadTon: s.cantidadTon, fecha: s.fecha, fuente: 'SEMILLA', descripcion: s.descripcion, lat: s.lat, lng: s.lng });
      n++;
    }
    return n;
  }

  // ---------- Datos propios del intermediario ----------

  async misDatos(intermediarioId: string) {
    const [grupos, e, semilla] = await Promise.all([
      this.prisma.precioObservado.groupBy({ by: ['fuente'], where: { intermediarioId }, _count: { _all: true } }),
      this.prisma.empresa.findUniqueOrThrow({ where: { id: intermediarioId }, select: { compartirPrecios: true } }),
      this.prisma.precioObservado.count({ where: { fuente: 'SEMILLA' } }),
    ]);
    return {
      propias: Object.fromEntries(grupos.map((g) => [g.fuente, g._count._all])) as Record<string, number>,
      totalPropias: grupos.reduce((s, g) => s + g._count._all, 0),
      datosDeEjemplo: semilla,
      compartirPrecios: e.compartirPrecios,
    };
  }

  /** Consentimiento: si es true, las observaciones del intermediario alimentan el rango de otros (sin nombre). */
  async compartir(intermediarioId: string, compartir: boolean) {
    await this.prisma.empresa.update({ where: { id: intermediarioId }, data: { compartirPrecios: compartir } });
    return this.misDatos(intermediarioId);
  }

  /**
   * Importa compras históricas desde un CSV (`fecha,categoria,cantidad,unidad,precio[,descripcion]`; separador coma o punto y coma).
   * `precio` es por unidad indicada (kg, ton o und). Las filas inválidas se rechazan y se informan, sin detener el resto.
   */
  async importarCsv(intermediarioId: string, csv: string) {
    const lineas = csv.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
    if (lineas.length < 2) throw new BadRequestException('El CSV debe tener una fila de encabezado y al menos una de datos.');
    const sep = lineas[0].includes(';') ? ';' : ',';
    const partir = (l: string) => {
      const out: string[] = [];
      let cur = '';
      let q = false;
      for (const ch of l) {
        if (ch === '"') q = !q;
        else if (ch === sep && !q) {
          out.push(cur.trim());
          cur = '';
        } else cur += ch;
      }
      out.push(cur.trim());
      return out;
    };
    const cab = partir(lineas[0]).map((c) => c.toLowerCase());
    const idx = (n: string) => cab.indexOf(n);
    const faltan = ['fecha', 'categoria', 'cantidad', 'unidad', 'precio'].filter((c) => idx(c) < 0);
    if (faltan.length) throw new BadRequestException(`Faltan columnas en el encabezado: ${faltan.join(', ')}.`);
    if (lineas.length - 1 > 2000) throw new BadRequestException('Máximo 2000 filas por importación.');

    const cats = new Map((await this.prisma.categoriaResiduo.findMany()).map((c) => [c.codigo, c]));
    const [ub] = await this.prisma.$queryRaw<{ lat: number | null; lng: number | null }[]>`SELECT ST_Y(ubicacion::geometry) AS lat, ST_X(ubicacion::geometry) AS lng FROM "Empresa" WHERE id = ${intermediarioId}`;
    const rechazadas: { linea: number; motivo: string }[] = [];
    let importadas = 0;
    for (let i = 1; i < lineas.length; i++) {
      const c = partir(lineas[i]);
      const fila = i + 1;
      const fecha = new Date(c[idx('fecha')]);
      const cat = cats.get(c[idx('categoria')]);
      const cantidad = Number(String(c[idx('cantidad')]).replace(',', '.'));
      const unidad = c[idx('unidad')] as UnidadLote;
      const precio = Number(String(c[idx('precio')]).replace(',', '.'));
      if (isNaN(fecha.getTime())) rechazadas.push({ linea: fila, motivo: 'Fecha inválida (usa AAAA-MM-DD).' });
      else if (!cat) rechazadas.push({ linea: fila, motivo: `Categoría desconocida: «${c[idx('categoria')]}».` });
      else if (!['kg', 'ton', 'und'].includes(unidad)) rechazadas.push({ linea: fila, motivo: 'Unidad inválida (kg, ton o und).' });
      else if (unidad === 'und' && !cat.kgPorUnidad) rechazadas.push({ linea: fila, motivo: 'Esta categoría no admite unidades; usa kg o ton.' });
      else if (!(cantidad > 0) || !(precio > 0)) rechazadas.push({ linea: fila, motivo: 'Cantidad y precio deben ser mayores que cero.' });
      else {
        await this.registrarObservacion({
          categoriaId: cat.id, nombreCategoria: cat.nombre, precioPorTon: precioPorTon(precio, unidad, cat.kgPorUnidad), cantidadTon: aToneladas(cantidad, unidad, cat.kgPorUnidad),
          fecha, fuente: 'CSV', intermediarioId, descripcion: idx('descripcion') >= 0 ? c[idx('descripcion')] || null : null, lat: ub?.lat, lng: ub?.lng,
        });
        importadas++;
      }
    }
    return { importadas, rechazadas: rechazadas.slice(0, 50), totalRechazadas: rechazadas.length };
  }

  async ubicacionDe(empresaId: string): Promise<{ lat: number; lng: number } | null> {
    const [u] = await this.prisma.$queryRaw<{ lat: number | null; lng: number | null }[]>`SELECT ST_Y(ubicacion::geometry) AS lat, ST_X(ubicacion::geometry) AS lng FROM "Empresa" WHERE id = ${empresaId}`;
    if (!u) throw new NotFoundException('Empresa no encontrada');
    return u.lat == null || u.lng == null ? null : { lat: u.lat, lng: u.lng };
  }
}
