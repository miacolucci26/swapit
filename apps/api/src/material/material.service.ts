import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';
import {
  ETIQUETA_ESTADO_LOTE, aToneladas, nombrePresentacion, nombreSector, nombreTipoActor, precioPorTon, puedeTransicionarLote, residuoPorId, resolverResiduo,
  type DespachoInput, type EstadoLote, type ReportadoVia, type ReporteCaptacionInput, type UnidadLote,
} from '@swapit/shared';
import { BenchmarkService } from '../benchmark/benchmark.service';
import { CertificadosService } from '../certificados/certificados.service';
import { urlArchivo } from '../common/uploads';
import { IaService } from '../ia/ia.service';
import { LotesService } from '../lotes/lotes.service';
import { PrismaService } from '../prisma/prisma.service';

/** Estados del ciclo B2B2B: separan estos lotes de los del modo marketplace. */
export const ESTADOS_B2B = ['REPORTADO', 'COTIZADO', 'ACOPIADO', 'DESPACHADO', 'RECHAZADO'] as const;
const LISTA_ESTADOS = Prisma.join(ESTADOS_B2B.map((e) => Prisma.sql`${e}`));

export interface FiltrosMaterial {
  estado?: string;
  proveedorId?: string;
  categoria?: string;
  sector?: string;
  tipoActor?: string;
  residuoRef?: string;
  presentacion?: string;
  /** Texto libre: busca en el título, la descripción y el nombre del proveedor. */
  q?: string;
  limite?: number;
}

const SELECT_MATERIAL = Prisma.sql`
  l.id, l.titulo, l.descripcion, l.keywords, l.cantidad, l.unidad, l.estado, l."precioEsperado", l."precioOfrecido", l."precioFinal",
  l."cantidadAcopiada", l."posicionPrecio", l."reportadoVia", l."clienteDestino", l."clienteDestinoRuc", l."acopiadoAt", l."despachadoAt",
  l."createdAt", l."iaSugerencia", l."residuoRef", l."presentacion", l."destinoId", l."acuerdoId",
  c.codigo AS "categoriaCodigo", c.nombre AS "categoriaNombre", c.familia, c."kgPorUnidad",
  e.id AS "proveedorId", e."razonSocial" AS proveedor, e.telefono, e."contactoNombre", e."intermediarioId",
  e.sector, e."tipoActor", d.nombre AS "destinoNombre",
  ST_Y(l.ubicacion::geometry) AS lat, ST_X(l.ubicacion::geometry) AS lng`;
const DESDE_MATERIAL = Prisma.sql`
  FROM "Lote" l
  JOIN "CategoriaResiduo" c ON c.id = l."categoriaId"
  JOIN "Empresa" e ON e.id = l."empresaId"
  LEFT JOIN "Destino" d ON d.id = l."destinoId"`;

/**
 * Material que reportan los proveedores de un intermediario y que él cotiza, acopia y despacha.
 * Todo está acotado a la red del intermediario: otro intermediario nunca ve estos lotes.
 */
@Injectable()
export class MaterialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lotes: LotesService,
    private readonly ia: IaService,
    private readonly benchmark: BenchmarkService,
    private readonly certificados: CertificadosService,
  ) {}

  /**
   * Núcleo único para el portal de captación, WhatsApp y el intermediario: crea un lote REPORTADO de un proveedor.
   * Si no se indica la categoría, la IA la sugiere (y deja `requiereRevision` cuando no está segura del subtipo).
   */
  async reportar(proveedorId: string, dto: ReporteCaptacionInput, via: ReportadoVia, intermediarioId?: string) {
    const prov = await this.prisma.empresa.findFirst({ where: { id: proveedorId, rol: 'GENERADOR', activo: true, ...(intermediarioId ? { intermediarioId } : {}) } });
    if (!prov) throw new NotFoundException('Proveedor no encontrado');

    const sug = dto.categoriaCodigo ? null : await this.ia.clasificar(dto.descripcion, dto.imagenes, 'EMPRESA');
    const codigo = dto.categoriaCodigo ?? sug!.categoriaCodigo;
    const cat = await this.prisma.categoriaResiduo.findUnique({ where: { codigo } });
    if (!cat) throw new BadRequestException('Categoría no válida');
    const unidad = dto.unidad as UnidadLote;
    if (unidad === 'und' && !cat.kgPorUnidad) throw new BadRequestException('Esta categoría no se puede reportar por unidades; usa kilos o toneladas.');

    const lote = await this.prisma.lote.create({
      data: {
        residuoRef: this.residuoValido(dto.residuoRef) ?? this.deducirResiduo(dto.descripcion),
        presentacion: dto.presentacion,
        empresaId: prov.id,
        categoriaId: cat.id,
        // El clasificador demo agrega « — sector» a los títulos de empresa; en la red del intermediario sobra.
        titulo: (sug?.titulo ?? dto.descripcion.trim().replace(/\s+/g, ' ').slice(0, 100)).replace(/ — [^—]{3,40}$/, ''),
        descripcion: dto.descripcion.trim(),
        keywords: sug?.keywords ?? [],
        cantidad: dto.cantidad,
        cantidadDisponible: dto.cantidad,
        unidad,
        modalidad: 'VENTA',
        precioEsperado: dto.precioEsperado,
        estado: 'REPORTADO',
        reportadoVia: via,
        iaSugerencia: sug ? ({ modo: sug.modo, confianza: sug.confianza, categoriaSugerida: sug.categoriaCodigo, requiereRevision: sug.requiereRevision ?? false } as Prisma.InputJsonValue) : undefined,
        imagenes: { create: dto.imagenes.map((n, i) => ({ url: urlArchivo(n), orden: i })) },
      },
    });
    await this.prisma.$executeRaw`UPDATE "Lote" SET ubicacion = (SELECT ubicacion FROM "Empresa" WHERE id = ${prov.id}) WHERE id = ${lote.id}`;
    await this.lotes.indexar(lote.id);
    if (dto.precioEsperado != null) await this.fijarPosicion(prov.intermediarioId as string, lote.id, dto.precioEsperado);
    return this.detalle(prov.intermediarioId as string, lote.id);
  }

  /** Solo se aceptan referencias a residuos que existan en la base de cadenas. */
  private residuoValido(ref?: string | null) {
    return ref && residuoPorId(ref) ? ref : undefined;
  }

  /** Si la descripción apunta con claridad a UN residuo de la base de cadenas, se vincula solo; si es ambigua, queda sin vincular. */
  private deducirResiduo(descripcion: string) {
    const r = resolverResiduo(descripcion);
    return r.tipo === 'claro' ? r.hallado.residuo.id : undefined;
  }

  async listar(intermediarioId: string, f: FiltrosMaterial = {}) {
    const cond: Prisma.Sql[] = [Prisma.sql`e."intermediarioId" = ${intermediarioId}`, Prisma.sql`l.estado::text IN (${LISTA_ESTADOS})`];
    if (f.estado) cond.push(Prisma.sql`l.estado::text = ${f.estado}`);
    if (f.proveedorId) cond.push(Prisma.sql`l."empresaId" = ${f.proveedorId}`);
    if (f.categoria) cond.push(Prisma.sql`(c.codigo = ${f.categoria} OR c.familia = ${f.categoria})`);
    if (f.sector) cond.push(Prisma.sql`e.sector = ${f.sector}`);
    if (f.tipoActor) cond.push(Prisma.sql`e."tipoActor" = ${f.tipoActor}`);
    if (f.residuoRef) cond.push(Prisma.sql`l."residuoRef" = ${f.residuoRef}`);
    if (f.presentacion) cond.push(Prisma.sql`l."presentacion" = ${f.presentacion}`);
    if (f.q?.trim()) {
      // Los comodines que escriba el usuario se escapan: «%» busca un «%».
      const like = `%${f.q.trim().replace(/[\\%_]/g, '\\$&')}%`;
      cond.push(Prisma.sql`(l.titulo ILIKE ${like} OR l.descripcion ILIKE ${like} OR e."razonSocial" ILIKE ${like})`);
    }
    const filas = await this.prisma.$queryRaw<any[]>`
      SELECT ${SELECT_MATERIAL}
      ${DESDE_MATERIAL}
      WHERE ${Prisma.join(cond, ' AND ')}
      ORDER BY l."createdAt" DESC
      LIMIT ${Math.min(f.limite ?? 300, 5000)}`;
    return this.enriquecer(filas);
  }

  /** Detalle del lote con el benchmark de precio vigente (mientras no esté acopiado). */
  async detalle(intermediarioId: string, id: string) {
    const l = await this.base(intermediarioId, id);
    if (l.estado !== 'REPORTADO' && l.estado !== 'COTIZADO') return { ...l, benchmark: null, veredictos: null };
    const est = await this.estimar(l);
    const pos = (precio: number | null) => (precio == null ? null : this.posicionDe(precio, l, est.rangoPorTon));
    return { ...l, benchmark: est, veredictos: { esperado: pos(l.precioEsperado), ofrecido: pos(l.precioOfrecido) } };
  }

  private estimar(l: any) {
    return this.benchmark.estimar({ categoriaCodigo: l.categoriaCodigo, descripcion: l.descripcion, cantidad: l.cantidad, unidad: l.unidad as UnidadLote, lat: l.lat, lng: l.lng, intermediarioId: l.intermediarioId });
  }

  private posicionDe(precio: number, l: any, rango: { p25: number; p75: number } | null) {
    if (!rango) return null;
    const ton = precioPorTon(precio, l.unidad, l.kgPorUnidad);
    return ton < rango.p25 ? 'DEBAJO' : ton > rango.p75 ? 'ENCIMA' : 'DENTRO';
  }

  /** Calcula y guarda dónde cae un precio frente al rango (el semáforo de la lista de material). */
  private async fijarPosicion(intermediarioId: string, id: string, precio: number) {
    const l = await this.base(intermediarioId, id);
    const est = await this.estimar(l);
    await this.prisma.lote.update({ where: { id }, data: { posicionPrecio: this.posicionDe(precio, l, est.rangoPorTon) } });
  }

  private async base(intermediarioId: string, id: string) {
    const [fila] = await this.prisma.$queryRaw<any[]>`
      SELECT ${SELECT_MATERIAL}
      ${DESDE_MATERIAL}
      WHERE l.id = ${id} AND e."intermediarioId" = ${intermediarioId} AND l.estado::text IN (${LISTA_ESTADOS})`;
    if (!fila) throw new NotFoundException('Material no encontrado');
    const [lote] = await this.enriquecer([fila]);
    return lote;
  }

  private async enriquecer(filas: any[]) {
    if (!filas.length) return [];
    const ids = filas.map((f) => f.id);
    const [imgs, certs] = await Promise.all([
      this.prisma.loteImagen.findMany({ where: { loteId: { in: ids } }, orderBy: { orden: 'asc' } }),
      this.prisma.certificado.findMany({ where: { loteId: { in: ids } }, select: { loteId: true, codigo: true } }),
    ]);
    return filas.map((f) => ({
      ...f,
      etiquetaEstado: ETIQUETA_ESTADO_LOTE[f.estado as EstadoLote] ?? f.estado,
      imagenes: imgs.filter((i) => i.loteId === f.id).map((i) => i.url),
      ubicacion: f.lat != null ? { lat: f.lat, lng: f.lng } : null,
      certificado: certs.find((c) => c.loteId === f.id)?.codigo ?? null,
    }));
  }

  private mover(estadoActual: string, hacia: EstadoLote) {
    if (!puedeTransicionarLote(estadoActual as EstadoLote, hacia)) {
      throw new BadRequestException(`No se puede pasar de «${ETIQUETA_ESTADO_LOTE[estadoActual as EstadoLote] ?? estadoActual}» a «${ETIQUETA_ESTADO_LOTE[hacia]}».`);
    }
  }

  async cotizar(intermediarioId: string, id: string, precioOfrecido: number) {
    const l = await this.base(intermediarioId, id);
    this.mover(l.estado, 'COTIZADO');
    await this.prisma.lote.update({ where: { id }, data: { estado: 'COTIZADO', precioOfrecido } });
    await this.fijarPosicion(intermediarioId, id, precioOfrecido);
    return this.detalle(intermediarioId, id);
  }

  async acopiar(intermediarioId: string, id: string, dto: { cantidadAcopiada: number; precioFinal?: number }) {
    const l = await this.base(intermediarioId, id);
    this.mover(l.estado, 'ACOPIADO');
    const precioFinal = dto.precioFinal ?? l.precioOfrecido;
    if (precioFinal == null) throw new BadRequestException('Indica el precio final pagado al proveedor.');
    await this.prisma.lote.update({ where: { id }, data: { estado: 'ACOPIADO', cantidadAcopiada: dto.cantidadAcopiada, precioFinal, cantidadDisponible: 0, acopiadoAt: new Date() } });
    // Cada acopio alimenta el benchmark del propio intermediario con un precio real.
    const cat = await this.prisma.categoriaResiduo.findUniqueOrThrow({ where: { codigo: l.categoriaCodigo } });
    await this.benchmark.registrarObservacion({
      categoriaId: cat.id, nombreCategoria: cat.nombre, precioPorTon: precioPorTon(precioFinal, l.unidad, l.kgPorUnidad), cantidadTon: aToneladas(dto.cantidadAcopiada, l.unidad, l.kgPorUnidad),
      fecha: new Date(), fuente: 'ACOPIO', intermediarioId, descripcion: l.titulo, lat: l.lat, lng: l.lng,
    });
    return this.detalle(intermediarioId, id);
  }

  async despachar(intermediarioId: string, id: string, dto: DespachoInput) {
    const l = await this.base(intermediarioId, id);
    this.mover(l.estado, 'DESPACHADO');
    let cliente = dto.clienteDestino;
    let destinoId: string | null = null;
    if (dto.destinoId) {
      const d = await this.prisma.destino.findFirst({ where: { id: dto.destinoId, intermediarioId } });
      if (!d) throw new NotFoundException('Destino no encontrado');
      cliente = cliente ?? d.nombre;
      destinoId = d.id;
    }
    await this.prisma.lote.update({ where: { id }, data: { estado: 'DESPACHADO', clienteDestino: cliente, clienteDestinoRuc: dto.clienteDestinoRuc ?? null, destinoId, despachadoAt: new Date() } });
    return this.detalle(intermediarioId, id);
  }

  /** Corrige cómo se clasificó el material: residuo de la base de cadenas y presentación. */
  async actualizar(intermediarioId: string, id: string, dto: { residuoRef?: string | null; presentacion?: string | null }) {
    await this.base(intermediarioId, id);
    if (dto.residuoRef && !residuoPorId(dto.residuoRef)) throw new BadRequestException('Residuo desconocido');
    await this.prisma.lote.update({ where: { id }, data: { residuoRef: dto.residuoRef, presentacion: dto.presentacion } });
    return this.detalle(intermediarioId, id);
  }

  /** Excel con el material de la red (para llevarlo al ERP o a una hoja de cálculo propia). */
  async exportarXlsx(intermediarioId: string, f: FiltrosMaterial = {}): Promise<Buffer> {
    const filas = await this.listar(intermediarioId, { ...f, limite: 5000 });
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Swapit';
    const ws = wb.addWorksheet('Material');
    ws.addRow(['Fecha de reporte', 'Proveedor', 'Sector', 'Tipo de proveedor', 'Material', 'Categoría', 'Residuo (base de cadenas)', 'Presentación', 'Cantidad', 'Unidad', 'Precio esperado (S/)', 'Precio ofrecido (S/)', 'Precio final (S/)', 'Estado', 'Destino o cliente', 'Fecha de acopio', 'Fecha de despacho', 'Certificado']).font = { bold: true };
    const dia = (d?: Date | string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');
    for (const m of filas) {
      ws.addRow([
        dia(m.createdAt), m.proveedor, nombreSector(m.sector) ?? '', nombreTipoActor(m.tipoActor) ?? '', m.titulo, String(m.categoriaNombre).split('(')[0].trim(),
        (m.residuoRef && residuoPorId(m.residuoRef)?.residuo.nombre) || '', nombrePresentacion(m.presentacion) ?? '', m.cantidadAcopiada ?? m.cantidad, m.unidad,
        m.precioEsperado ?? '', m.precioOfrecido ?? '', m.precioFinal ?? '', m.etiquetaEstado, m.destinoNombre ?? m.clienteDestino ?? '', dia(m.acopiadoAt), dia(m.despachadoAt), m.certificado ?? '',
      ]);
    }
    ws.columns = [{ width: 14 }, { width: 28 }, { width: 22 }, { width: 24 }, { width: 36 }, { width: 24 }, { width: 34 }, { width: 14 }, { width: 11 }, { width: 8 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 28 }, { width: 14 }, { width: 14 }, { width: 22 }];
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter = { from: 'A1', to: 'R1' };
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  async rechazar(intermediarioId: string, id: string) {
    const l = await this.base(intermediarioId, id);
    this.mover(l.estado, 'RECHAZADO');
    await this.prisma.lote.update({ where: { id }, data: { estado: 'RECHAZADO', cantidadDisponible: 0 } });
    return this.detalle(intermediarioId, id);
  }

  /** Emite el certificado co-marcado de un lote despachado (requiere suscripción activa; cobra el fee por certificado). */
  async emitirCertificado(intermediarioId: string, id: string, usoFinal?: string) {
    await this.base(intermediarioId, id);
    const cert = await this.certificados.emitirDesdeLote(intermediarioId, id, usoFinal);
    return { codigo: cert.codigo, hashSha256: cert.hashSha256, pdfUrl: cert.pdfUrl, material: await this.detalle(intermediarioId, id) };
  }

  /** Cifras del panel del intermediario. */
  async resumen(intermediarioId: string) {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const [lotes, proveedores, certMes, suscripcion, destinos, acuerdosVigentes, certTotal] = await Promise.all([
      this.prisma.lote.findMany({
        where: { empresa: { intermediarioId }, estado: { in: [...ESTADOS_B2B] } },
        include: { categoria: { select: { nombre: true, kgPorUnidad: true } }, empresa: { select: { razonSocial: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.empresa.count({ where: { intermediarioId, activo: true } }),
      this.prisma.certificado.count({ where: { intermediarioId, createdAt: { gte: inicioMes } } }),
      this.prisma.suscripcion.findFirst({ where: { empresaId: intermediarioId, estado: 'ACTIVA', periodoFin: { gt: ahora } }, select: { periodoFin: true } }),
      this.prisma.destino.count({ where: { intermediarioId, activo: true } }),
      this.prisma.acuerdo.count({ where: { intermediarioId, estado: 'VIGENTE' } }),
      this.prisma.certificado.count({ where: { intermediarioId } }),
    ]);
    const porEstado: Record<string, number> = { REPORTADO: 0, COTIZADO: 0, ACOPIADO: 0, DESPACHADO: 0, RECHAZADO: 0 };
    const semaforo = { DEBAJO: 0, DENTRO: 0, ENCIMA: 0 };
    let acopiadoMesTon = 0;
    let pagadoMes = 0;
    const porCategoria = new Map<string, number>();
    for (const l of lotes) {
      porEstado[l.estado] = (porEstado[l.estado] ?? 0) + 1;
      // El semáforo evalúa lo que el intermediario ofreció o pagó (lotes ya cotizados en adelante).
      if (['COTIZADO', 'ACOPIADO', 'DESPACHADO'].includes(l.estado) && l.posicionPrecio && l.posicionPrecio in semaforo) semaforo[l.posicionPrecio as keyof typeof semaforo]++;
      if (l.acopiadoAt && l.acopiadoAt >= inicioMes && l.cantidadAcopiada != null) {
        const ton = aToneladas(l.cantidadAcopiada, l.unidad, l.categoria.kgPorUnidad);
        acopiadoMesTon += ton;
        pagadoMes += l.cantidadAcopiada * (l.precioFinal ?? 0);
        porCategoria.set(l.categoria.nombre.split('(')[0].trim(), (porCategoria.get(l.categoria.nombre.split('(')[0].trim()) ?? 0) + ton);
      }
    }
    const evaluados = semaforo.DEBAJO + semaforo.DENTRO + semaforo.ENCIMA;
    return {
      proveedoresActivos: proveedores,
      destinosActivos: destinos,
      acuerdosVigentes,
      // Primeros pasos del intermediario: cada paso es verdadero cuando ya lo hizo al menos una vez.
      inicio: {
        proveedor: proveedores > 0,
        reporte: lotes.length > 0,
        cotizacion: lotes.some((l) => l.estado !== 'REPORTADO' && l.estado !== 'RECHAZADO'),
        acopio: lotes.some((l) => l.estado === 'ACOPIADO' || l.estado === 'DESPACHADO'),
        destino: destinos > 0,
        certificado: certTotal > 0,
      },
      porEstado,
      pendientes: porEstado.REPORTADO,
      porDespachar: porEstado.ACOPIADO,
      acopiadoMesTon: Math.round(acopiadoMesTon * 1000) / 1000,
      pagadoMes: Math.round(pagadoMes * 100) / 100,
      certificadosMes: certMes,
      semaforo,
      pctPrecioJusto: evaluados ? Math.round((semaforo.DENTRO / evaluados) * 100) : null,
      suscripcionActiva: !!suscripcion,
      vigenteHasta: suscripcion?.periodoFin ?? null,
      porCategoria: [...porCategoria.entries()].map(([nombre, ton]) => ({ nombre, toneladas: Math.round(ton * 1000) / 1000 })).sort((a, b) => b.toneladas - a.toneladas),
      ultimos: lotes.slice(0, 6).map((l) => ({ id: l.id, titulo: l.titulo, proveedor: l.empresa.razonSocial, estado: l.estado, etiquetaEstado: ETIQUETA_ESTADO_LOTE[l.estado as EstadoLote] ?? l.estado, fecha: l.createdAt, reportadoVia: l.reportadoVia })),
    };
  }
}
