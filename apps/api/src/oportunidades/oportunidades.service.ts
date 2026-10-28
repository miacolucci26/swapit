import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { usosParaMaterial } from '@swapit/shared';
import { Embedder, aVectorSql } from '../common/embeddings/embedder';
import { GeminiService } from '../ia/gemini.service';
import { PrismaService } from '../prisma/prisma.service';

export interface Oportunidades {
  /** gemini = usos generados por la IA; local = base curada de Swapit (sin clave o si Gemini falla). */
  modo: 'gemini' | 'local';
  usos: { titulo: string; detalle: string; cuidado: string }[];
  industrias: string[];
  /** Alertas de búsqueda activas de otras cuentas que se parecen al material. Anónimas: sin nombre ni ubicación exacta. */
  compradores: { necesidad: string; tipo: 'EMPRESA' | 'PERSONA'; distanciaKm: number | null; afinidad: number }[];
  aviso?: string;
}

export interface ConsultaOportunidades {
  titulo?: string;
  descripcion: string;
  categoriaCodigo?: string;
}

const MAX_COMPRADORES = 5;
const MAX_CACHE = 200;
// Mismo criterio que el matching de alertas: por debajo de ~0.18 de coseno la coincidencia es ruido.
const SIMILITUD_MINIMA = 0.18;
// Distancia redondeada a 5 km: orienta al vendedor sin ubicar a quien busca.
const PASO_KM = 5;

@Injectable()
export class OportunidadesService {
  /** Respuestas de Gemini por texto: volver a pulsar el botón (o dos vendedores con el mismo material) no gasta otra consulta. */
  private readonly cache = new Map<string, Awaited<ReturnType<GeminiService['sugerirUsos']>>>();

  constructor(private readonly prisma: PrismaService, private readonly embedder: Embedder, private readonly gemini: GeminiService) {}

  async sugerir(empresaId: string, q: ConsultaOportunidades): Promise<Oportunidades> {
    const cat = q.categoriaCodigo ? await this.prisma.categoriaResiduo.findUnique({ where: { codigo: q.categoriaCodigo } }) : null;
    const texto = [q.titulo, q.descripcion].filter(Boolean).join('. ');
    const [usos, compradores] = await Promise.all([this.usos(texto, cat), this.compradores(empresaId, texto, cat)]);
    return { ...usos, compradores };
  }

  private async usos(texto: string, cat: { nombre: string; usoTipico: string | null } | null): Promise<Omit<Oportunidades, 'compradores'>> {
    const conIa = this.gemini.oportunidadesHabilitadas();
    if (conIa) {
      const clave = texto.toLowerCase().replace(/\s+/g, ' ').trim();
      let r = this.cache.get(clave);
      if (r === undefined) {
        r = await this.gemini.sugerirUsos(texto);
        // Solo se guardan respuestas buenas: un fallo pasajero no debe quedar fijo.
        if (r) {
          if (this.cache.size >= MAX_CACHE) this.cache.delete(this.cache.keys().next().value as string);
          this.cache.set(clave, r);
        }
      }
      if (r) return { modo: 'gemini', ...r, aviso: 'Sugerencias generadas con IA (Google Gemini) a partir de tu descripción. Revísalas antes de decidir.' };
    }
    const locales = usosParaMaterial(texto).map(({ uso }) => ({ titulo: uso.titulo, detalle: uso.detalle, cuidado: uso.cuidado }));
    if (!locales.length && cat?.usoTipico) locales.push({ titulo: `Usos habituales: ${cat.nombre}`, detalle: cat.usoTipico, cuidado: '' });
    return {
      modo: 'local',
      usos: locales.slice(0, 4),
      industrias: [],
      ...(conIa ? { aviso: 'La IA no respondió a tiempo; te mostramos los usos de la base de Swapit.' } : {}),
    };
  }

  /** Alertas activas de otras cuentas cuyo embedding se parece al del material, dentro del radio que fijó quien busca. */
  private async compradores(empresaId: string, texto: string, cat: { id: string; nombre: string } | null): Promise<Oportunidades['compradores']> {
    // Mismo texto que indexa un lote publicado (lotes.service › indexar), para comparar como lo hará el matching después.
    const vec = aVectorSql(await this.embedder.embed(cat ? `${texto}. ${cat.nombre}` : texto));
    // Una alerta con categoría solo recibe lotes de esa categoría: si el vendedor ya eligió otra, esa alerta no le sirve.
    const filtroCat = cat ? Prisma.sql`AND (a."categoriaId" IS NULL OR a."categoriaId" = ${cat.id})` : Prisma.empty;
    const filas = await this.prisma.$queryRaw<{ texto: string; tipo: 'EMPRESA' | 'PERSONA'; sim: number; dist: number | null; radioKm: number }[]>`
      SELECT a.texto, e.tipo, a."radioKm", 1 - (a.embedding <=> ${vec}::vector) AS sim,
             CASE WHEN a.centro IS NULL OR v.ubicacion IS NULL THEN NULL ELSE ST_Distance(a.centro, v.ubicacion) / 1000.0 END AS dist
      FROM "AlertaBusqueda" a
      JOIN "Empresa" e ON e.id = a."empresaId"
      LEFT JOIN "Empresa" v ON v.id = ${empresaId}
      WHERE a.activa AND a.embedding IS NOT NULL AND a."empresaId" <> ${empresaId} ${filtroCat}
      ORDER BY a.embedding <=> ${vec}::vector
      LIMIT 20`;
    return filas
      .filter((f) => Number(f.sim) >= SIMILITUD_MINIMA && (f.dist == null || Number(f.dist) <= f.radioKm))
      .slice(0, MAX_COMPRADORES)
      .map((f) => ({
        necesidad: f.texto.length > 120 ? `${f.texto.slice(0, 117)}…` : f.texto,
        tipo: f.tipo,
        distanciaKm: f.dist == null ? null : Math.max(PASO_KM, Math.round(Number(f.dist) / PASO_KM) * PASO_KM),
        afinidad: Math.round(Math.max(0, Math.min(1, (Number(f.sim) - 0.08) / 0.65)) * 100),
      }));
  }
}
