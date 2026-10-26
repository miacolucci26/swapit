import { ForbiddenException, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { COSTO_DISPOSICION_EVITADO_POR_TON, aToneladas } from '@swapit/shared';
import { aproximar } from '../common/confidencial';
import { CreditosService } from '../creditos/creditos.service';
import { PrismaService } from '../prisma/prisma.service';

const ENTREGADAS = ['ENTREGADO', 'CALIFICADO', 'CERRADO'] as const;
const r2 = (n: number) => Math.round(n * 100) / 100;
/** Masa y CO₂ con 4 decimales: un artículo personal pesa milésimas de tonelada. */
const r4 = (n: number) => Math.round(n * 10000) / 10000;

export interface Periodo {
  desde?: Date;
  hasta?: Date;
}

@Injectable()
export class ImpactoService {
  constructor(private readonly prisma: PrismaService, private readonly creditos: CreditosService) {}

  private async entregadas(empresaId: string | undefined, p: Periodo) {
    return this.prisma.transaccion.findMany({
      where: {
        estado: { in: [...ENTREGADAS] },
        ...(empresaId ? { OR: [{ ofertanteId: empresaId }, { receptorId: empresaId }] } : {}),
        ...(p.desde || p.hasta ? { updatedAt: { ...(p.desde ? { gte: p.desde } : {}), ...(p.hasta ? { lte: p.hasta } : {}) } } : {}),
      },
      include: { lote: { include: { categoria: true } } },
    });
  }

  /** Métricas de impacto: global (público, para el pitch) o de una empresa. */
  async agregado(empresaId?: string, p: Periodo = {}) {
    const ts = await this.entregadas(empresaId, p);
    let toneladas = 0;
    let co2 = 0;
    let ingresos = 0;
    let ingresosCreditos = 0;
    const porCat = new Map<string, { codigo: string; nombre: string; toneladas: number; co2: number }>();
    const porMes = new Map<string, { mes: string; toneladas: number; co2: number; simbiosis: number }>();
    const activas = new Set<string>();

    for (const t of ts) {
      const cat = t.lote.categoria;
      // Las cantidades pueden estar en t, kg o unidades: todo el impacto se mide en toneladas equivalentes.
      const ton = aToneladas(t.cantidad, t.lote.unidad, cat.kgPorUnidad);
      const tco2 = (ton * cat.factorCo2PorTon) / 1000;
      toneladas += ton;
      co2 += tco2;
      activas.add(t.ofertanteId);
      activas.add(t.receptorId);
      const total = t.cantidad * (t.precioAcordado ?? 0);
      // El ingreso lo percibe el ofertante; en la vista de una empresa solo cuenta si es su venta.
      if (!empresaId || t.ofertanteId === empresaId) {
        if (t.modalidad === 'VENTA') ingresos += total;
        if (t.modalidad === 'CREDITOS') ingresosCreditos += total;
      }
      const c = porCat.get(cat.codigo) ?? { codigo: cat.codigo, nombre: cat.nombre.split('(')[0].trim(), toneladas: 0, co2: 0 };
      c.toneladas += ton;
      c.co2 += tco2;
      porCat.set(cat.codigo, c);
      const mes = t.updatedAt.toISOString().slice(0, 7);
      const m = porMes.get(mes) ?? { mes, toneladas: 0, co2: 0, simbiosis: 0 };
      m.toneladas += ton;
      m.co2 += tco2;
      m.simbiosis += 1;
      porMes.set(mes, m);
    }
    const costoEvitado = toneladas * COSTO_DISPOSICION_EVITADO_POR_TON;

    // Últimos 6 meses (rellena con ceros para que el gráfico no tenga huecos)
    const meses: { mes: string; toneladas: number; co2: number; simbiosis: number }[] = [];
    const hoy = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - i, 1));
      const clave = d.toISOString().slice(0, 7);
      const m = porMes.get(clave) ?? { mes: clave, toneladas: 0, co2: 0, simbiosis: 0 };
      meses.push({ ...m, toneladas: r4(m.toneladas), co2: r4(m.co2) });
    }

    const [lotesActivos, [empresasRegistradas, personasRegistradas], certificados, heat] = await Promise.all([
      this.prisma.lote.count({ where: { estado: 'PUBLICADO', ...(empresaId ? { empresaId } : {}) } }),
      empresaId ? Promise.resolve([1, 0]) : Promise.all([
        this.prisma.empresa.count({ where: { tipo: 'EMPRESA', usuarios: { some: { rol: 'EMPRESA' } } } }),
        this.prisma.empresa.count({ where: { tipo: 'PERSONA' } }),
      ]),
      this.prisma.certificado.count({ where: empresaId ? { transaccion: { OR: [{ ofertanteId: empresaId }, { receptorId: empresaId }] } } : {} }),
      empresaId ? Promise.resolve([]) : this.mapaCalor(ts.map((t) => ({ ofertanteId: t.ofertanteId, cantidad: aToneladas(t.cantidad, t.lote.unidad, t.lote.categoria.kgPorUnidad) }))),
    ]);

    return {
      toneladas: r4(toneladas),
      co2EvitadoTon: r4(co2),
      ingresosSoles: r2(ingresos),
      ingresosCreditos: r2(ingresosCreditos),
      costoDisposicionEvitado: r2(costoEvitado),
      ahorroEconomicoTotal: r2(ingresos + costoEvitado),
      simbiosis: ts.length,
      participantesActivos: activas.size,
      empresasRegistradas,
      personasRegistradas,
      lotesActivos,
      certificados,
      porCategoria: [...porCat.values()].map((c) => ({ ...c, toneladas: r4(c.toneladas), co2: r4(c.co2) })).sort((a, b) => b.toneladas - a.toneladas),
      porMes: meses,
      calor: heat,
      supuestos: `CO₂eq y ahorro son estimaciones con factores fijos por categoría (costo de disposición evitado: S/ ${COSTO_DISPOSICION_EVITADO_POR_TON}/t).`,
    };
  }

  /** Puntos ponderados por actividad (toneladas transadas + ofertadas) para el mapa de calor. */
  private async mapaCalor(ts: { ofertanteId: string; cantidad: number }[]) {
    const filas = await this.prisma.$queryRaw<{ id: string; confidencial: boolean; lat: number | null; lng: number | null; ofertado: number }[]>`
      SELECT e.id, e.confidencial, ST_Y(e.ubicacion::geometry) AS lat, ST_X(e.ubicacion::geometry) AS lng,
             COALESCE((SELECT SUM(CASE l.unidad WHEN 'kg' THEN l."cantidadDisponible" / 1000.0
                                               WHEN 'und' THEN l."cantidadDisponible" * COALESCE(c."kgPorUnidad", 1) / 1000.0
                                               ELSE l."cantidadDisponible" END)
                       FROM "Lote" l JOIN "CategoriaResiduo" c ON c.id = l."categoriaId"
                       WHERE l."empresaId" = e.id AND l.estado = 'PUBLICADO'), 0) AS ofertado
      FROM "Empresa" e WHERE e.ubicacion IS NOT NULL`;
    const transado = new Map<string, number>();
    for (const t of ts) transado.set(t.ofertanteId, (transado.get(t.ofertanteId) ?? 0) + t.cantidad);
    return filas
      // El mapa de calor es público (sin sesión): la ubicación de TODA empresa se aproxima a ~5 km, no solo la de las confidenciales.
      .map((f) => ({ lat: aproximar(f.lat as number), lng: aproximar(f.lng as number), peso: r2(Number(f.ofertado) + (transado.get(f.id) ?? 0)) }))
      .filter((p) => p.peso > 0);
  }

  // ---------- Cumplimiento REP ----------

  async cumplimiento(empresaId: string, rol: 'OFERTANTE' | 'RECEPTOR', p: Periodo) {
    const ts = (await this.entregadas(empresaId, p)).filter((t) => (rol === 'OFERTANTE' ? t.ofertanteId === empresaId : t.receptorId === empresaId));
    const ids = ts.map((t) => t.id);
    const [certs, empresas, empresa] = await Promise.all([
      this.prisma.certificado.findMany({ where: { transaccionId: { in: ids } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.empresa.findMany({ where: { id: { in: [...new Set(ts.flatMap((t) => [t.ofertanteId, t.receptorId]))] } }, select: { id: true, razonSocial: true } }),
      this.prisma.empresa.findUniqueOrThrow({ where: { id: empresaId }, select: { razonSocial: true, ruc: true } }),
    ]);
    const nombre = new Map(empresas.map((e) => [e.id, e.razonSocial]));
    const certPorT = new Map(certs.map((c) => [c.transaccionId, c]));

    const filas = new Map<string, { categoria: string; codigoLer: string | null; toneladas: number; operaciones: number; contrapartes: Set<string> }>();
    for (const t of ts) {
      const cat = t.lote.categoria;
      const f = filas.get(cat.codigo) ?? { categoria: cat.nombre.split('(')[0].trim(), codigoLer: cat.codigoLer, toneladas: 0, operaciones: 0, contrapartes: new Set<string>() };
      f.toneladas += aToneladas(t.cantidad, t.lote.unidad, cat.kgPorUnidad);
      f.operaciones += 1;
      f.contrapartes.add(nombre.get(rol === 'OFERTANTE' ? t.receptorId : t.ofertanteId) ?? '—');
      filas.set(cat.codigo, f);
    }
    const detalle = ts
      .map((t) => ({
        fecha: t.updatedAt,
        codigo: certPorT.get(t.id)?.codigo ?? '—',
        material: t.lote.categoria.nombre.split('(')[0].trim(),
        codigoLer: t.lote.categoria.codigoLer,
        toneladas: aToneladas(t.cantidad, t.lote.unidad, t.lote.categoria.kgPorUnidad),
        contraparte: nombre.get(rol === 'OFERTANTE' ? t.receptorId : t.ofertanteId) ?? '—',
        usoFinal: certPorT.get(t.id)?.usoFinalDeclarado ?? '—',
      }))
      .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

    return {
      empresa,
      rol,
      periodo: { desde: p.desde ?? null, hasta: p.hasta ?? null },
      totalToneladas: r4(ts.reduce((s, t) => s + aToneladas(t.cantidad, t.lote.unidad, t.lote.categoria.kgPorUnidad), 0)),
      totalCertificados: certs.length,
      porCategoria: [...filas.values()].map((f) => ({ ...f, toneladas: r4(f.toneladas), contrapartes: [...f.contrapartes] })).sort((a, b) => b.toneladas - a.toneladas),
      detalle,
    };
  }

  async cumplimientoXlsx(empresaId: string, rol: 'OFERTANTE' | 'RECEPTOR', p: Periodo): Promise<Buffer> {
    const d = await this.cumplimiento(empresaId, rol, p);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Swap It';
    const ws = wb.addWorksheet('Resumen REP');
    ws.addRow(['Reporte de gestión de residuos — evidencia de trazabilidad (Swap It)']).font = { bold: true, size: 14 };
    ws.addRow(['Empresa', d.empresa.razonSocial]);
    ws.addRow(['RUC', d.empresa.ruc]);
    ws.addRow(['Rol', rol === 'OFERTANTE' ? 'Generador (ofertante)' : 'Receptor']);
    ws.addRow(['Periodo', `${p.desde?.toISOString().slice(0, 10) ?? 'inicio'} a ${p.hasta?.toISOString().slice(0, 10) ?? 'hoy'}`]);
    ws.addRow([]);
    const cab = ws.addRow(['Categoría', 'Código LER', 'Toneladas', 'Operaciones', 'Contrapartes']);
    cab.font = { bold: true };
    for (const f of d.porCategoria) ws.addRow([f.categoria, f.codigoLer ?? '', f.toneladas, f.operaciones, f.contrapartes.join(', ')]);
    ws.addRow([]);
    ws.addRow(['TOTAL', '', d.totalToneladas, d.detalle.length]).font = { bold: true };
    ws.addRow([]);
    ws.addRow(['Nota: constancia de trazabilidad de Swap It; no reemplaza declaraciones oficiales ante SIGERSOL/OEFA/MINAM.']).font = { italic: true, size: 9 };
    ws.columns = [{ width: 34 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 60 }];

    const wd = wb.addWorksheet('Certificados');
    wd.addRow(['Fecha', 'Certificado', 'Material', 'Código LER', 'Toneladas', rol === 'OFERTANTE' ? 'Receptor' : 'Generador', 'Uso final declarado']).font = { bold: true };
    for (const x of d.detalle) wd.addRow([x.fecha.toISOString().slice(0, 10), x.codigo, x.material, x.codigoLer ?? '', x.toneladas, x.contraparte, x.usoFinal]);
    wd.columns = [{ width: 12 }, { width: 22 }, { width: 28 }, { width: 12 }, { width: 12 }, { width: 34 }, { width: 50 }];
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  /** Reporte de sostenibilidad (beneficio canjeable con créditos). */
  async reporteSostenibilidadXlsx(empresaId: string): Promise<Buffer> {
    if (!(await this.creditos.tieneReporte(empresaId))) throw new ForbiddenException('Canjea el beneficio «Reporte de sostenibilidad» con tus créditos para descargarlo.');
    const [a, empresa] = await Promise.all([this.agregado(empresaId), this.prisma.empresa.findUniqueOrThrow({ where: { id: empresaId } })]);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Impacto');
    ws.addRow([`Reporte de sostenibilidad — ${empresa.razonSocial}`]).font = { bold: true, size: 14 };
    ws.addRow([]);
    for (const [k, v] of [['Toneladas desviadas', a.toneladas], ['CO₂eq evitado (t, estimado)', a.co2EvitadoTon], ['Ingresos por venta (S/)', a.ingresosSoles], ['Costo de disposición evitado (S/, estimado)', a.costoDisposicionEvitado], ['Ahorro económico total (S/)', a.ahorroEconomicoTotal], ['Simbiosis concretadas', a.simbiosis], ['Certificados emitidos', a.certificados]] as const) ws.addRow([k, v]);
    ws.addRow([]);
    ws.addRow([a.supuestos]).font = { italic: true, size: 9 };
    ws.columns = [{ width: 46 }, { width: 18 }];
    const wm = wb.addWorksheet('Por mes');
    wm.addRow(['Mes', 'Toneladas', 'CO₂eq (t)', 'Simbiosis']).font = { bold: true };
    a.porMes.forEach((m) => wm.addRow([m.mes, m.toneladas, m.co2, m.simbiosis]));
    const wc = wb.addWorksheet('Por categoría');
    wc.addRow(['Categoría', 'Toneladas', 'CO₂eq (t)']).font = { bold: true };
    a.porCategoria.forEach((c) => wc.addRow([c.nombre, c.toneladas, c.co2]));
    wc.columns = [{ width: 40 }, { width: 14 }, { width: 14 }];
    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}
