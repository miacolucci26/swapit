import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { basename } from 'node:path';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import { aToneladas, formatoCantidad, formatoMasa } from '@swapit/shared';
import { BillingProvider } from '../common/billing/billing.provider';
import { storage } from '../storage/storage';
import { PrismaService } from '../prisma/prisma.service';

/** Datos que fija el hash del certificado: si cambian en la BD, la verificación falla. */
export interface PayloadCertificado {
  codigo: string;
  /** Certificados del modo marketplace: la transacción de origen. */
  transaccionId?: string;
  /** Certificados B2B2B: el lote despachado de origen. */
  loteId?: string;
  categoria: string;
  codigoLer: string | null;
  toneladas: number;
  co2EvitadoTon: number;
  /** RUC del generador, o «PERSONA_NATURAL» / «PROVEEDOR_SIN_RUC» cuando no tiene. */
  ofertanteRuc: string;
  /** RUC de la contraparte (marketplace) o del cliente destino (B2B2B), o «CLIENTE_SIN_RUC». */
  receptorRuc: string;
  /** Solo B2B2B: RUC del intermediario que emite el certificado. */
  intermediarioRuc?: string;
  usoFinalDeclarado: string;
}

const canonico = (p: PayloadCertificado) => JSON.stringify(p, Object.keys(p).sort());
export const hashPayload = (p: PayloadCertificado) => createHash('sha256').update(canonico(p)).digest('hex');
const AVISO = 'Constancia de trazabilidad emitida por Swap It a partir de datos declarados y confirmados por ambas partes. No reemplaza el Manifiesto de Residuos Sólidos Peligrosos ni las declaraciones oficiales ante SIGERSOL/OEFA.';
const AVISO_B2B = 'Constancia de trazabilidad emitida por el intermediario a partir de datos declarados y registrados en la plataforma Swapit. No reemplaza el Manifiesto de Residuos Sólidos Peligrosos ni las declaraciones oficiales ante SIGERSOL/OEFA.';
const VERDE = '#047857';

const INCLUDE_CERT = {
  transaccion: { include: { lote: { include: { categoria: true } }, ofertante: true, receptor: true } },
  lote: { include: { categoria: true } },
  intermediario: true,
  generador: true,
} satisfies Prisma.CertificadoInclude;
type CertCompleto = Prisma.CertificadoGetPayload<{ include: typeof INCLUDE_CERT }>;

@Injectable()
export class CertificadosService {
  constructor(private readonly prisma: PrismaService, private readonly billing: BillingProvider) {}

  private nuevoCodigo() {
    return `SWP-${new Date().getFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  /** Genera el certificado de una transacción entregada (modo marketplace). Idempotente. */
  async emitir(transaccionId: string, uso: string | undefined, db: Prisma.TransactionClient | PrismaService = this.prisma) {
    const existente = await db.certificado.findUnique({ where: { transaccionId } });
    if (existente) return existente;
    const t = await db.transaccion.findUniqueOrThrow({
      where: { id: transaccionId },
      include: { lote: { include: { categoria: true } }, ofertante: true, receptor: true },
    });
    const cat = t.lote.categoria;
    const codigo = this.nuevoCodigo();
    // La cantidad puede estar en toneladas, kilos o unidades: el certificado y el CO₂eq se expresan en toneladas.
    const ton = Math.round(aToneladas(t.cantidad, t.lote.unidad, cat.kgPorUnidad) * 10000) / 10000;
    const co2 = Math.round(((ton * cat.factorCo2PorTon) / 1000) * 10000) / 10000;
    const payload: PayloadCertificado = {
      codigo,
      transaccionId,
      categoria: cat.nombre,
      codigoLer: cat.codigoLer,
      toneladas: ton,
      co2EvitadoTon: co2,
      ofertanteRuc: t.ofertante.ruc ?? 'PERSONA_NATURAL',
      receptorRuc: t.receptor.ruc ?? 'PERSONA_NATURAL',
      usoFinalDeclarado: uso?.trim() || cat.usoTipico || 'Reaprovechamiento como insumo industrial',
    };
    return db.certificado.create({
      data: { transaccionId, codigo, hashSha256: hashPayload(payload), usoFinalDeclarado: payload.usoFinalDeclarado, ton, co2Evitado: co2, pdfUrl: `/api/verificar/${codigo}/pdf` },
    });
  }

  // ---------- B2B2B: certificado emitido por el intermediario a su cliente ----------

  /**
   * Emite el certificado de un lote DESPACHADO, a nombre del intermediario y para su cliente destino. Requiere una
   * suscripción activa y registra el fee por certificado. Idempotente: no cobra dos veces el mismo lote.
   */
  async emitirDesdeLote(intermediarioId: string, loteId: string, usoFinal?: string) {
    const lote = await this.prisma.lote.findFirst({
      where: { id: loteId, empresa: { intermediarioId } },
      include: { categoria: true, empresa: true },
    });
    if (!lote) throw new NotFoundException('Material no encontrado');
    const existente = await this.prisma.certificado.findUnique({ where: { loteId } });
    if (existente) return existente;
    if (lote.estado !== 'DESPACHADO') throw new BadRequestException('Solo se emite el certificado de un material despachado.');
    if (!lote.clienteDestino || lote.cantidadAcopiada == null) throw new BadRequestException('Faltan los datos del despacho (cliente y cantidad acopiada).');

    const ahora = new Date();
    const suscripcion = await this.prisma.suscripcion.findFirst({ where: { empresaId: intermediarioId, estado: 'ACTIVA', periodoFin: { gt: ahora } } });
    if (!suscripcion) throw new ConflictException('Necesitas una suscripción activa para emitir certificados. Actívala en «Facturación».');

    const intermediario = await this.prisma.empresa.findUniqueOrThrow({ where: { id: intermediarioId } });
    const cfg = await this.prisma.configPlataforma.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
    const cat = lote.categoria;
    const codigo = this.nuevoCodigo();
    const ton = Math.round(aToneladas(lote.cantidadAcopiada, lote.unidad, cat.kgPorUnidad) * 10000) / 10000;
    const co2 = Math.round(((ton * cat.factorCo2PorTon) / 1000) * 10000) / 10000;
    const uso = usoFinal?.trim() || cat.usoTipico || 'Reaprovechamiento como insumo industrial';
    const payload: PayloadCertificado = {
      codigo, loteId, categoria: cat.nombre, codigoLer: cat.codigoLer, toneladas: ton, co2EvitadoTon: co2,
      ofertanteRuc: lote.empresa.ruc ?? 'PROVEEDOR_SIN_RUC', receptorRuc: lote.clienteDestinoRuc ?? 'CLIENTE_SIN_RUC', intermediarioRuc: intermediario.ruc ?? '', usoFinalDeclarado: uso,
    };
    const cert = await this.prisma.$transaction(async (tx) => {
      const c = await tx.certificado.create({
        data: {
          codigo, loteId, intermediarioId, generadorId: lote.empresaId, clienteNombre: lote.clienteDestino, clienteRuc: lote.clienteDestinoRuc,
          cantidad: lote.cantidadAcopiada, unidad: lote.unidad, hashSha256: hashPayload(payload), usoFinalDeclarado: uso, ton, co2Evitado: co2, pdfUrl: `/api/verificar/${codigo}/pdf`,
        },
      });
      await tx.cobroFee.create({ data: { empresaId: intermediarioId, concepto: 'CERTIFICADO', certificadoId: c.id, monto: cfg.feeCertificado, estado: 'PENDIENTE' } });
      return c;
    });
    // El cobro va aparte: si la pasarela falla, el certificado ya emitido no se pierde y el fee queda FALLIDO para reintentar.
    try {
      const ref = await this.billing.cobrarFee(intermediarioId, 'CERTIFICADO', cfg.feeCertificado);
      await this.prisma.cobroFee.update({ where: { certificadoId: cert.id }, data: { estado: 'COBRADO', referenciaPago: ref.referencia } });
    } catch {
      await this.prisma.cobroFee.update({ where: { certificadoId: cert.id }, data: { estado: 'FALLIDO' } });
    }
    return cert;
  }

  private async cargar(codigo: string): Promise<CertCompleto> {
    const c = await this.prisma.certificado.findUnique({ where: { codigo }, include: INCLUDE_CERT });
    if (!c) throw new NotFoundException('Certificado no encontrado');
    return c;
  }

  private payloadDe(c: CertCompleto): PayloadCertificado {
    if (c.loteId && c.lote) {
      return {
        codigo: c.codigo,
        loteId: c.loteId,
        categoria: c.lote.categoria.nombre,
        codigoLer: c.lote.categoria.codigoLer,
        toneladas: c.ton,
        co2EvitadoTon: c.co2Evitado,
        ofertanteRuc: c.generador?.ruc ?? 'PROVEEDOR_SIN_RUC',
        receptorRuc: c.clienteRuc ?? 'CLIENTE_SIN_RUC',
        intermediarioRuc: c.intermediario?.ruc ?? '',
        usoFinalDeclarado: c.usoFinalDeclarado,
      };
    }
    const t = c.transaccion!;
    return {
      codigo: c.codigo,
      transaccionId: c.transaccionId as string,
      categoria: t.lote.categoria.nombre,
      codigoLer: t.lote.categoria.codigoLer,
      toneladas: c.ton,
      co2EvitadoTon: c.co2Evitado,
      ofertanteRuc: t.ofertante.ruc ?? 'PERSONA_NATURAL',
      receptorRuc: t.receptor.ruc ?? 'PERSONA_NATURAL',
      usoFinalDeclarado: c.usoFinalDeclarado,
    };
  }

  /** Verificación pública: recalcula el hash con los datos actuales y lo compara con el emitido. */
  async verificar(codigo: string) {
    const c = await this.cargar(codigo);
    const integro = hashPayload(this.payloadDe(c)) === c.hashSha256;
    const base = { codigo: c.codigo, valido: integro, emitidoEl: c.createdAt, hashSha256: c.hashSha256, toneladas: c.ton, co2EvitadoTon: c.co2Evitado, usoFinalDeclarado: c.usoFinalDeclarado, pdfUrl: `/api/verificar/${c.codigo}/pdf` };
    if (c.loteId && c.lote) {
      return {
        ...base,
        material: c.lote.categoria.nombre,
        codigoLer: c.lote.categoria.codigoLer,
        cantidad: formatoCantidad(c.cantidad ?? 0, c.unidad ?? 'ton'),
        // Cadena de custodia: generador → intermediario (emisor) → cliente destino.
        ofertante: { razonSocial: c.generador?.razonSocial ?? '—', ruc: c.generador?.ruc ?? null, tipo: 'EMPRESA' as const },
        receptor: { razonSocial: c.clienteNombre ?? '—', ruc: c.clienteRuc ?? null, tipo: 'EMPRESA' as const },
        emisor: { razonSocial: c.intermediario?.razonSocial ?? '—', ruc: c.intermediario?.ruc ?? null, logoUrl: c.intermediario?.logoUrl ?? null, colorMarca: c.intermediario?.colorMarca ?? null },
        despachadoEl: c.lote.despachadoAt,
      };
    }
    const t = c.transaccion!;
    return {
      ...base,
      material: t.lote.categoria.nombre,
      codigoLer: t.lote.categoria.codigoLer,
      cantidad: formatoCantidad(t.cantidad, t.lote.unidad),
      ofertante: { razonSocial: t.ofertante.razonSocial, ruc: t.ofertante.ruc, tipo: t.ofertante.tipo },
      receptor: { razonSocial: t.receptor.razonSocial, ruc: t.receptor.ruc, tipo: t.receptor.tipo },
      emisor: null,
      despachadoEl: null,
    };
  }

  async pdf(codigo: string): Promise<Buffer> {
    const c = await this.cargar(codigo);
    const url = `${process.env.WEB_ORIGIN ?? 'http://localhost:3000'}/verificar/${c.codigo}`;
    const qr = await QRCode.toBuffer(url, { margin: 1, width: 240 });
    const b2b = !!(c.loteId && c.lote);
    const color = /^#[0-9a-fA-F]{6}$/.test(c.intermediario?.colorMarca ?? '') ? (c.intermediario!.colorMarca as string) : VERDE;
    // El logo del intermediario se sube con /uploads; pdfkit solo dibuja PNG y JPG (otros formatos se omiten).
    const nombreLogo = c.intermediario?.logoUrl ? basename(c.intermediario.logoUrl.split('?')[0]) : null;
    const logo = nombreLogo && /\.(png|jpe?g)$/i.test(nombreLogo) ? await storage().leer(nombreLogo) : null;

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Certificado ${c.codigo}`, Author: b2b ? (c.intermediario?.razonSocial ?? 'Swapit') : 'Swap It' } });
      const partes: Buffer[] = [];
      doc.on('data', (b) => partes.push(b));
      doc.on('end', () => resolve(Buffer.concat(partes)));
      doc.on('error', reject);

      doc.rect(0, 0, 595, 90).fill(color);
      let xTexto = 50;
      if (b2b && logo) {
        try {
          doc.image(logo, 50, 18, { fit: [100, 54] });
          xTexto = 170;
        } catch {
          /* logo ilegible: se sigue sin él */
        }
      }
      doc.fillColor('white').font('Helvetica-Bold').fontSize(b2b ? 18 : 22).text(b2b ? (c.intermediario?.razonSocial ?? 'Swapit') : 'Swap It', xTexto, 28, { width: 595 - xTexto - 50 });
      doc.font('Helvetica').fontSize(11).text('Certificado de Manejo y Destino Final', xTexto, 58);
      doc.fillColor('#1c1917').font('Helvetica-Bold').fontSize(16).text(`N.° ${c.codigo}`, 50, 115);
      doc.font('Helvetica').fontSize(10).fillColor('#57534e').text(`Emitido el ${c.createdAt.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}`, 50, 138);

      const fila = (y: number, k: string, v: string) => {
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#57534e').text(k.toUpperCase(), 50, y, { width: 150 });
        doc.font('Helvetica').fontSize(11).fillColor('#1c1917').text(v, 210, y - 1, { width: 335 });
      };
      let y = 180;
      // «CO2eq» sin subíndice: las fuentes estándar del PDF (WinAnsi) no incluyen «₂» ni «≈» y salen corruptas.
      const co2 = `${formatoMasa(c.co2Evitado).replace(/ (kg|t)$/, ' $1 CO2eq')}`;
      let filas: [string, string][];
      if (b2b && c.lote) {
        const rucDe = (ruc?: string | null, vacio = 'sin RUC') => (ruc ? `RUC ${ruc}` : vacio);
        filas = [
          ['Material', c.lote.titulo],
          ['Categoría', c.lote.categoria.nombre],
          ['Código LER', c.lote.categoria.codigoLer ?? '—'],
          ['Cantidad acopiada', c.unidad === 'ton' ? formatoMasa(c.ton) : `${formatoCantidad(c.cantidad ?? 0, c.unidad ?? 'ton')} (aprox. ${formatoMasa(c.ton)})`],
          ['Generador (proveedor)', `${c.generador?.razonSocial ?? '—'} — ${rucDe(c.generador?.ruc)}`],
          ['Intermediario emisor', `${c.intermediario?.razonSocial ?? '—'} — ${rucDe(c.intermediario?.ruc)}`],
          ['Cliente destino', `${c.clienteNombre ?? '—'} — ${rucDe(c.clienteRuc)}`],
          ['Uso final declarado', c.usoFinalDeclarado],
          ['CO2eq evitado (estimado)', co2],
          ['Despacho', `${(c.lote.despachadoAt ?? c.createdAt).toLocaleDateString('es-PE')}`],
        ];
      } else {
        const t = c.transaccion!;
        filas = [
          ['Artículo / material', t.lote.titulo],
          ['Categoría', t.lote.categoria.nombre],
          ['Código LER', t.lote.categoria.codigoLer ?? '—'],
          ['Cantidad', t.lote.unidad === 'ton' ? formatoMasa(c.ton) : `${formatoCantidad(t.cantidad, t.lote.unidad)} (aprox. ${formatoMasa(c.ton)})`],
          ['Generador (ofertante)', `${t.ofertante.razonSocial} — ${t.ofertante.ruc ? `RUC ${t.ofertante.ruc}` : 'persona natural'}`],
          ['Receptor (destino)', `${t.receptor.razonSocial} — ${t.receptor.ruc ? `RUC ${t.receptor.ruc}` : 'persona natural'}`],
          ['Uso final declarado', c.usoFinalDeclarado],
          ['CO2eq evitado (estimado)', co2],
          ['Entrega confirmada', `${(t.firmaReceptorAt ?? c.createdAt).toLocaleDateString('es-PE')} — firmada digitalmente por ambas partes`],
        ];
      }
      for (const [k, v] of filas) {
        fila(y, k, v);
        y += doc.heightOfString(v, { width: 335 }) + 12;
      }

      y += 10;
      doc.image(qr, 50, y, { width: 100 });
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1c1917').text('Verificación de integridad', 165, y + 4);
      doc.font('Helvetica').fontSize(9).fillColor('#57534e').text(`Escanea el código o ingresa a ${url}`, 165, y + 20, { width: 380 });
      doc.font('Courier').fontSize(8).text(`SHA-256: ${c.hashSha256}`, 165, y + 50, { width: 380 });

      doc.font('Helvetica-Oblique').fontSize(8).fillColor('#78716c').text(b2b ? `Emitido por ${c.intermediario?.razonSocial ?? 'el intermediario'} con la plataforma Swapit. ${AVISO_B2B}` : AVISO, 50, 740, { width: 495, align: 'justify' });
      doc.end();
    });
  }

  /** Certificados de una empresa: como parte de una transacción (marketplace) o emitidos por ella como intermediario. */
  async deEmpresa(empresaId: string) {
    const lista = await this.prisma.certificado.findMany({
      where: { OR: [{ intermediarioId: empresaId }, { transaccion: { OR: [{ ofertanteId: empresaId }, { receptorId: empresaId }] } }] },
      orderBy: { createdAt: 'desc' },
      include: INCLUDE_CERT,
    });
    return lista.map((c) => ({
      codigo: c.codigo,
      fecha: c.createdAt,
      material: c.lote?.categoria.nombre ?? c.transaccion!.lote.categoria.nombre,
      titulo: c.lote?.titulo ?? c.transaccion!.lote.titulo,
      toneladas: c.ton,
      co2Evitado: c.co2Evitado,
      ofertante: c.generador?.razonSocial ?? c.transaccion?.ofertante.razonSocial ?? '—',
      receptor: c.clienteNombre ?? c.transaccion?.receptor.razonSocial ?? '—',
      pdfUrl: c.pdfUrl,
    }));
  }
}
