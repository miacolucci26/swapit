import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ETIQUETA_ESTADO,
  ETIQUETA_ETAPA,
  EstadoTransaccion,
  etapaSimple,
  VALOR_CREDITO_EN_SOLES,
  puedeTransicionar,
  siguienteTrasAcuerdo,
} from '@swapit/shared';
import type { JwtPayload } from '../auth/auth.guard';
import { CertificadosService } from '../certificados/certificados.service';
import { estimarFlete } from '../common/flete';
import { aToneladas, formatoCantidad } from '@swapit/shared';
import { PaymentProvider } from '../common/payments/payment.provider';
import { urlArchivo } from '../common/uploads';
import { contactoDeContraparte } from './contacto';
import { CreditosService } from '../creditos/creditos.service';
import { PrismaService } from '../prisma/prisma.service';

type Rol = 'OFERTANTE' | 'RECEPTOR';
const SISTEMA = '::sistema:: ';
const ABIERTOS: EstadoTransaccion[] = ['SOLICITADO', 'EN_NEGOCIACION', 'ACORDADO', 'PAGO_RETENIDO', 'RECOJO_CONFIRMADO'];
const redondear = (n: number) => Math.round(n * 100) / 100;
const etiquetaPor = (unidad: string) => ({ ton: 'tonelada', kg: 'kilo', und: 'unidad' } as Record<string, string>)[unidad] ?? unidad;

interface Contrato {
  terminos?: { cantidad: number; precioAcordado?: number; fechaRecojo?: string; responsableRecojo?: string; pagarComisionConCreditos?: boolean; loteIntercambioId?: string };
  aceptaciones: { OFERTANTE: boolean; RECEPTOR: boolean };
  propuestoPor?: Rol;
  documento?: Record<string, unknown>;
  pagoRef?: string;
  comisionPagadaConCreditos?: boolean;
}

@Injectable()
export class TransaccionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creditos: CreditosService,
    private readonly certificados: CertificadosService,
    private readonly pagos: PaymentProvider,
  ) {}

  // ---------- utilidades ----------

  private contratoDe(t: { contratoJson: Prisma.JsonValue }): Contrato {
    const c = (t.contratoJson ?? {}) as unknown as Partial<Contrato>;
    return { aceptaciones: { OFERTANTE: false, RECEPTOR: false }, ...c } as Contrato;
  }

  private async cargar(id: string, actor: JwtPayload) {
    const t = await this.prisma.transaccion.findUnique({
      where: { id },
      include: { lote: { include: { categoria: true } }, ofertante: true, receptor: true },
    });
    if (!t) throw new NotFoundException('Transacción no encontrada');
    if (actor.rol !== 'ADMIN' && t.ofertanteId !== actor.empresaId && t.receptorId !== actor.empresaId) throw new NotFoundException('Transacción no encontrada');
    const rol: Rol = t.ofertanteId === actor.empresaId ? 'OFERTANTE' : 'RECEPTOR';
    return { t, rol };
  }

  private exigirRol(rol: Rol, esperado: Rol, accion: string) {
    if (rol !== esperado) throw new ForbiddenException(`Solo ${esperado === 'RECEPTOR' ? 'el receptor' : 'el ofertante'} puede ${accion}.`);
  }

  /** Nombre con que se ve a la otra parte: «Empresa confidencial» mientras no haya respondido el ofertante. */
  private nombreVisible(t: { identidadRevelada: boolean }, e: { id: string; razonSocial: string; confidencial: boolean }, actor: JwtPayload) {
    const oculto = !t.identidadRevelada && e.confidencial && e.id !== actor.empresaId && actor.rol !== 'ADMIN';
    return oculto ? 'Empresa confidencial' : e.razonSocial;
  }

  private async mover(db: Prisma.TransactionClient | PrismaService, t: { id: string; estado: EstadoTransaccion }, hacia: EstadoTransaccion, data: Prisma.TransaccionUpdateInput = {}) {
    if (!puedeTransicionar(t.estado, hacia)) throw new BadRequestException(`No se puede pasar de ${ETIQUETA_ESTADO[t.estado]} a ${ETIQUETA_ESTADO[hacia]}.`);
    // Cuando el ofertante responde (negociación), las partes dejan de ser anónimas entre sí.
    return db.transaccion.update({ where: { id: t.id }, data: { ...data, estado: hacia, ...(hacia === 'EN_NEGOCIACION' ? { identidadRevelada: true } : {}) } });
  }

  private async sistema(db: Prisma.TransactionClient | PrismaService, transaccionId: string, usuarioId: string, texto: string) {
    await db.mensajeChat.create({ data: { transaccionId, autorId: usuarioId, texto: SISTEMA + texto } });
  }

  private async config() {
    return this.prisma.configPlataforma.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  }

  private total(cantidad: number, precio: number | null | undefined) {
    return redondear(cantidad * (precio ?? 0));
  }

  // ---------- 1. Solicitud ----------

  async solicitar(actor: JwtPayload, dto: { loteId: string; cantidad: number; mensaje?: string; precioOfertado?: number }) {
    const [lote, receptor] = await Promise.all([
      this.prisma.lote.findUnique({ where: { id: dto.loteId }, include: { categoria: { select: { kgPorUnidad: true } } } }),
      this.prisma.empresa.findUniqueOrThrow({ where: { id: actor.empresaId } }),
    ]);
    if (!lote || lote.estado !== 'PUBLICADO') throw new BadRequestException('El lote no está disponible');
    if (lote.empresaId === actor.empresaId) throw new BadRequestException('No puedes solicitar tu propio lote');
    if (receptor.rol === 'OFERTANTE') throw new ForbiddenException('Tu empresa está registrada solo como ofertante; cambia su rol a receptor o ambos.');
    if (receptor.estadoKyb === 'RECHAZADA') throw new ForbiddenException('Tu empresa no superó la verificación KYB.');
    if (dto.cantidad > lote.cantidadDisponible) throw new BadRequestException(`Solo hay ${formatoCantidad(lote.cantidadDisponible, lote.unidad)} disponibles`);
    const abierta = await this.prisma.transaccion.findFirst({ where: { loteId: lote.id, receptorId: actor.empresaId, estado: { in: ABIERTOS } } });
    if (abierta) throw new BadRequestException('Ya tienes una solicitud abierta para este lote');

    const [geo] = await this.prisma.$queryRaw<{ km: number | null }[]>`
      SELECT ST_Distance(l.ubicacion, e.ubicacion) / 1000.0 AS km
      FROM "Lote" l, "Empresa" e WHERE l.id = ${lote.id} AND e.id = ${actor.empresaId}`;
    const km = geo?.km == null ? null : Math.round(Number(geo.km) * 10) / 10;
    const cfg = await this.config();

    const t = await this.prisma.transaccion.create({
      data: {
        loteId: lote.id,
        ofertanteId: lote.empresaId,
        receptorId: actor.empresaId,
        modalidad: lote.modalidad,
        cantidad: dto.cantidad,
        // La oferta de precio del demandante es el punto de partida de la negociación; sin oferta, el precio publicado.
        precioAcordado: dto.precioOfertado ?? lote.precio,
        distanciaKm: km,
        fleteEstimado: estimarFlete(km, aToneladas(dto.cantidad, lote.unidad, lote.categoria.kgPorUnidad), cfg.tarifaFleteKmTon),
        estado: 'SOLICITADO',
        pagoEstado: 'NO_APLICA',
        contratoJson: { aceptaciones: { OFERTANTE: false, RECEPTOR: false } } as unknown as Prisma.InputJsonValue,
      },
    });
    await this.prisma.mensajeChat.create({
      data: { transaccionId: t.id, autorId: actor.sub, texto: dto.mensaje?.trim() || `Hola, me interesa este lote (${formatoCantidad(dto.cantidad, lote.unidad)})${dto.precioOfertado ? ` y ofrezco S/ ${dto.precioOfertado} por ${etiquetaPor(lote.unidad)}` : ''}. ¿Podemos coordinar?` },
    });
    return { id: t.id };
  }

  // ---------- 2. Negociación ----------

  async mensaje(actor: JwtPayload, id: string, texto: string) {
    const { t, rol } = await this.cargar(id, actor);
    if (t.estado === 'CANCELADO' || t.estado === 'CERRADO') throw new BadRequestException('La conversación está cerrada');
    await this.prisma.$transaction(async (tx) => {
      await tx.mensajeChat.create({ data: { transaccionId: id, autorId: actor.sub, texto } });
      if (t.estado === 'SOLICITADO' && rol === 'OFERTANTE') await this.mover(tx, t, 'EN_NEGOCIACION');
    });
    return { ok: true };
  }

  async mensajes(actor: JwtPayload, id: string, despues?: string) {
    const { t } = await this.cargar(id, actor);
    const filas = await this.prisma.mensajeChat.findMany({
      where: { transaccionId: id, ...(despues ? { createdAt: { gt: new Date(despues) } } : {}) },
      orderBy: { createdAt: 'asc' },
      include: { autor: { select: { nombre: true, empresaId: true, empresa: { select: { tipo: true, razonSocial: true, confidencial: true } } } } },
    });
    return filas.map((m) => ({
      id: m.id,
      createdAt: m.createdAt,
      // Una persona natural se muestra con su nombre público («Camila R.»), nunca con sus apellidos completos.
      autorNombre: !t.identidadRevelada && m.autor.empresa.confidencial && m.autor.empresaId !== actor.empresaId && actor.rol !== 'ADMIN'
        ? 'Empresa confidencial'
        : m.autor.empresa.tipo === 'PERSONA' ? m.autor.empresa.razonSocial : m.autor.nombre,
      empresaId: m.autor.empresaId,
      sistema: m.texto.startsWith(SISTEMA),
      texto: m.texto.startsWith(SISTEMA) ? m.texto.slice(SISTEMA.length) : m.texto,
    }));
  }

  async proponer(actor: JwtPayload, id: string, dto: { cantidad: number; precioAcordado?: number; fechaRecojo?: string; responsableRecojo?: string; pagarComisionConCreditos?: boolean; loteIntercambioId?: string }) {
    const { t, rol } = await this.cargar(id, actor);
    if (!['SOLICITADO', 'EN_NEGOCIACION'].includes(t.estado)) throw new BadRequestException('Ya no se pueden modificar los términos');
    if (dto.cantidad > t.lote.cantidadDisponible) throw new BadRequestException(`Solo hay ${formatoCantidad(t.lote.cantidadDisponible, t.lote.unidad)} disponibles`);
    const sinPrecio = t.modalidad === 'DONACION' || t.modalidad === 'INTERCAMBIO';
    if (!sinPrecio && !(dto.precioAcordado && dto.precioAcordado > 0)) {
      throw new BadRequestException(t.modalidad === 'VENTA' ? 'Indica el precio por tonelada en S/' : 'Indica el precio por tonelada en créditos');
    }
    let loteOfrecido: { id: string; titulo: string } | null = null;
    if (t.modalidad === 'INTERCAMBIO' && dto.loteIntercambioId) {
      const candidato = await this.prisma.lote.findUnique({ where: { id: dto.loteIntercambioId }, select: { id: true, titulo: true, empresaId: true } });
      if (!candidato || candidato.empresaId !== t.receptorId) throw new BadRequestException('El lote ofrecido en intercambio no es válido');
      loteOfrecido = candidato;
      if (loteOfrecido.id === t.loteId) throw new BadRequestException('El lote ofrecido no puede ser el mismo que estás solicitando');
    }
    const contrato = this.contratoDe(t);
    contrato.terminos = { ...dto, precioAcordado: sinPrecio ? undefined : dto.precioAcordado, loteIntercambioId: loteOfrecido?.id };
    contrato.aceptaciones = { OFERTANTE: rol === 'OFERTANTE', RECEPTOR: rol === 'RECEPTOR' };
    contrato.propuestoPor = rol;
    await this.prisma.$transaction(async (tx) => {
      await tx.transaccion.update({
        where: { id },
        data: {
          contratoJson: contrato as unknown as Prisma.InputJsonValue,
          cantidad: dto.cantidad,
          precioAcordado: contrato.terminos!.precioAcordado ?? null,
          fechaRecojo: dto.fechaRecojo ? new Date(dto.fechaRecojo) : null,
          responsableRecojo: dto.responsableRecojo ?? null,
          loteIntercambioId: loteOfrecido?.id ?? null,
        },
      });
      if (t.estado === 'SOLICITADO') await this.mover(tx, t, 'EN_NEGOCIACION');
      const resumen =
        t.modalidad === 'DONACION'
          ? `${formatoCantidad(dto.cantidad, t.lote.unidad)} (donación)`
          : t.modalidad === 'INTERCAMBIO'
            ? `${formatoCantidad(dto.cantidad, t.lote.unidad)} a cambio de ${loteOfrecido ? `«${loteOfrecido.titulo}»` : 'un lote por definir'}`
            : `${formatoCantidad(dto.cantidad, t.lote.unidad)} a ${t.modalidad === 'CREDITOS' ? `${dto.precioAcordado} créditos` : `S/ ${dto.precioAcordado}`} por ${etiquetaPor(t.lote.unidad)}`;
      await this.sistema(tx, id, actor.sub, `${rol === 'OFERTANTE' ? t.ofertante.razonSocial : t.receptor.razonSocial} propuso términos: ${resumen}. Falta la aceptación de la otra parte.`);
    });
    return { ok: true };
  }

  async aceptar(actor: JwtPayload, id: string) {
    const { t, rol } = await this.cargar(id, actor);
    if (t.estado !== 'EN_NEGOCIACION') throw new BadRequestException('No hay términos en negociación');
    const contrato = this.contratoDe(t);
    if (!contrato.terminos) throw new BadRequestException('Primero hay que proponer los términos');
    if (contrato.propuestoPor === rol) throw new BadRequestException('Tú propusiste estos términos; falta que la otra parte los acepte');
    contrato.aceptaciones[rol] = true;

    const cfg = await this.config();
    const term = contrato.terminos;
    const sinPrecio = t.modalidad === 'DONACION' || t.modalidad === 'INTERCAMBIO';
    const total = this.total(term.cantidad, sinPrecio ? 0 : term.precioAcordado);
    const comision =
      t.modalidad === 'VENTA' ? redondear((total * cfg.comisionVentaPct) / 100) : t.modalidad === 'DONACION' ? cfg.feeDonacion : t.modalidad === 'INTERCAMBIO' ? cfg.feeIntercambio : 0;

    await this.prisma.$transaction(async (tx) => {
      const r = await tx.lote.updateMany({ where: { id: t.loteId, cantidadDisponible: { gte: term.cantidad } }, data: { cantidadDisponible: { decrement: term.cantidad } } });
      if (r.count === 0) throw new BadRequestException('El lote ya no tiene esa cantidad disponible');
      const lote = await tx.lote.findUniqueOrThrow({ where: { id: t.loteId } });
      if (lote.cantidadDisponible <= 0) await tx.lote.update({ where: { id: lote.id }, data: { estado: 'RESERVADO' } });

      const loteIntercambio = t.modalidad === 'INTERCAMBIO' && term.loteIntercambioId
        ? await tx.lote.findUnique({ where: { id: term.loteIntercambioId }, select: { id: true, titulo: true } })
        : null;

      contrato.documento = {
        titulo: t.modalidad === 'INTERCAMBIO' ? 'Acuerdo de intercambio (swap)' : t.modalidad === 'DONACION' ? 'Acuerdo de donación' : 'Acuerdo de transferencia de artículo o material',
        partes: { ofertante: { razonSocial: t.ofertante.razonSocial, ruc: t.ofertante.ruc }, receptor: { razonSocial: t.receptor.razonSocial, ruc: t.receptor.ruc } },
        material: { lote: t.lote.titulo, categoria: t.lote.categoria.nombre, codigoLer: t.lote.categoria.codigoLer },
        cantidadToneladas: term.cantidad,
        modalidad: t.modalidad,
        precioPorUnidad: sinPrecio ? 0 : term.precioAcordado,
        unidad: t.lote.unidad,
        moneda: t.modalidad === 'CREDITOS' ? 'CREDITOS' : t.modalidad === 'INTERCAMBIO' ? 'N/A' : 'PEN',
        total,
        comisionPlataforma: comision,
        fechaRecojo: term.fechaRecojo ?? null,
        responsableRecojo: term.responsableRecojo ?? null,
        loteIntercambio: t.modalidad === 'INTERCAMBIO' ? { id: loteIntercambio?.id ?? null, titulo: loteIntercambio?.titulo ?? null } : undefined,
        condiciones: [
          'El receptor declara que dará al material un uso de reaprovechamiento o valorización conforme a la normativa vigente.',
          'La entrega se confirma con la firma digital de ambas partes y, opcionalmente, foto.',
          'Swap It es un intermediario tecnológico: no almacena ni transporta el material.',
          ...(t.modalidad === 'INTERCAMBIO' ? ['Ambas partes coordinan por separado la entrega recíproca del material ofrecido a cambio.'] : []),
        ],
        acordadoEl: new Date().toISOString(),
      };
      await this.mover(tx, t, 'ACORDADO', {
        contratoJson: contrato as unknown as Prisma.InputJsonValue,
        cantidad: term.cantidad,
        comision,
        pagoEstado: siguienteTrasAcuerdo(t.modalidad) === 'PAGO_RETENIDO' ? 'PENDIENTE' : 'NO_APLICA',
      });
      const totalTexto = t.modalidad === 'CREDITOS' ? `${total} créditos` : t.modalidad === 'DONACION' ? '(donación)' : t.modalidad === 'INTERCAMBIO' ? '(intercambio)' : `S/ ${total}`;
      await this.sistema(tx, id, actor.sub, `Acuerdo cerrado. Se generó el contrato: ${formatoCantidad(term.cantidad, t.lote.unidad)} · total ${totalTexto}.`);
    });
    return { ok: true };
  }

  // ---------- 3. Pago (escrow) ----------

  async pagar(actor: JwtPayload, id: string) {
    const { t, rol } = await this.cargar(id, actor);
    this.exigirRol(rol, 'RECEPTOR', 'realizar el pago');
    if (t.estado !== 'ACORDADO') throw new BadRequestException('El pago se realiza una vez acordados los términos');
    if (t.modalidad === 'DONACION') throw new BadRequestException('Las donaciones no requieren pago');
    if (t.modalidad === 'INTERCAMBIO') throw new BadRequestException('Los intercambios no requieren pago');
    const contrato = this.contratoDe(t);
    const total = this.total(t.cantidad, t.precioAcordado);

    await this.prisma.$transaction(async (tx) => {
      if (t.modalidad === 'VENTA') {
        const ref = await this.pagos.retener(t.id, total);
        contrato.pagoRef = ref.referencia;
      } else {
        const saldo = await this.creditos.saldo(t.receptorId, tx);
        if (saldo < total) throw new BadRequestException(`Saldo insuficiente: necesitas ${total} créditos y tienes ${saldo}.`);
        await this.creditos.registrar({ empresaId: t.receptorId, transaccionId: t.id, tipo: 'GASTADO_CANJE', monto: -total, descripcion: `Pago con créditos: ${t.lote.titulo}`, clave: `pago:${t.id}` }, tx);
      }
      await this.mover(tx, t, 'PAGO_RETENIDO', { pagoEstado: 'RETENIDO', contratoJson: contrato as unknown as Prisma.InputJsonValue });
      await this.sistema(tx, id, actor.sub, t.modalidad === 'VENTA' ? `Pago de S/ ${total} retenido en garantía (${contrato.pagoRef}). Se liberará al confirmarse la entrega.` : `${total} créditos retenidos en garantía hasta la entrega.`);
    });
    return { ok: true };
  }

  // ---------- 4. Recojo y entrega ----------

  async confirmarRecojo(actor: JwtPayload, id: string, dto: { fechaRecojo: string; responsableRecojo: string }) {
    const { t } = await this.cargar(id, actor);
    const sinEscrow = t.modalidad === 'DONACION' || t.modalidad === 'INTERCAMBIO';
    const esperado: EstadoTransaccion = sinEscrow ? 'ACORDADO' : 'PAGO_RETENIDO';
    if (t.estado !== esperado) throw new BadRequestException(sinEscrow ? 'Primero deben acordarse los términos' : 'Primero debe retenerse el pago');
    await this.prisma.$transaction(async (tx) => {
      await this.mover(tx, t, 'RECOJO_CONFIRMADO', { fechaRecojo: new Date(dto.fechaRecojo), responsableRecojo: dto.responsableRecojo });
      await this.sistema(tx, id, actor.sub, `Recojo confirmado para el ${new Date(dto.fechaRecojo).toLocaleDateString('es-PE')}. Responsable: ${dto.responsableRecojo}.`);
    });
    return { ok: true };
  }

  async firmarEntrega(actor: JwtPayload, id: string, dto: { fotoEntrega?: string; usoFinalDeclarado?: string }) {
    const { t, rol } = await this.cargar(id, actor);
    if (t.estado !== 'RECOJO_CONFIRMADO') throw new BadRequestException('La entrega se firma una vez confirmado el recojo');
    if ((rol === 'OFERTANTE' && t.firmaOfertanteAt) || (rol === 'RECEPTOR' && t.firmaReceptorAt)) throw new BadRequestException('Ya firmaste esta entrega');
    const ahora = new Date();
    const data: Prisma.TransaccionUpdateInput = rol === 'OFERTANTE' ? { firmaOfertanteAt: ahora } : { firmaReceptorAt: ahora };
    if (dto.fotoEntrega) data.fotoEntregaUrl = urlArchivo(dto.fotoEntrega);
    if (rol === 'RECEPTOR' && dto.usoFinalDeclarado) {
      const c = this.contratoDe(t);
      c.documento = { ...(c.documento ?? {}), usoFinalDeclarado: dto.usoFinalDeclarado };
      data.contratoJson = c as unknown as Prisma.InputJsonValue;
    }
    const ambos = rol === 'OFERTANTE' ? !!t.firmaReceptorAt : !!t.firmaOfertanteAt;

    await this.prisma.$transaction(async (tx) => {
      await tx.transaccion.update({ where: { id }, data });
      await this.sistema(tx, id, actor.sub, `${rol === 'OFERTANTE' ? t.ofertante.razonSocial : t.receptor.razonSocial} firmó digitalmente la entrega.`);
      if (ambos) await this.cerrarEntrega(tx, id, actor.sub);
    });
    return { ok: true, entregado: ambos };
  }

  /** Efectos de la entrega confirmada por ambas partes: libera pago, créditos, certificado e impacto. */
  private async cerrarEntrega(tx: Prisma.TransactionClient, id: string, usuarioId: string) {
    const t = await tx.transaccion.findUniqueOrThrow({ where: { id }, include: { lote: { include: { categoria: true } }, ofertante: true, receptor: true } });
    const contrato = this.contratoDe(t);
    const total = this.total(t.cantidad, t.precioAcordado);
    const cat = t.lote.categoria;
    let pagoEstado = t.pagoEstado;

    if (t.modalidad === 'VENTA') {
      if (contrato.pagoRef) await this.pagos.liberar(contrato.pagoRef);
      pagoEstado = 'LIBERADO';
      if (contrato.terminos?.pagarComisionConCreditos && t.comision > 0) {
        const costo = redondear(t.comision / VALOR_CREDITO_EN_SOLES);
        if ((await this.creditos.saldo(t.ofertanteId, tx)) >= costo) {
          await this.creditos.registrar({ empresaId: t.ofertanteId, transaccionId: id, tipo: 'GASTADO_COMISION', monto: -costo, descripcion: `Comisión pagada con créditos: ${t.lote.titulo}`, clave: `comision:${id}` }, tx);
          contrato.comisionPagadaConCreditos = true;
        }
      }
    } else if (t.modalidad === 'CREDITOS') {
      await this.creditos.registrar({ empresaId: t.ofertanteId, transaccionId: id, tipo: 'GANADO_CANJE', monto: total, descripcion: `Cobro en créditos: ${t.lote.titulo}`, clave: `cobro:${id}` }, tx);
      pagoEstado = 'LIBERADO';
    } else if (t.modalidad === 'DONACION') {
      const ganados = Math.max(1, Math.round(aToneladas(t.cantidad, t.lote.unidad, cat.kgPorUnidad) * cat.factorCreditosPorTon));
      await this.creditos.registrar({ empresaId: t.ofertanteId, transaccionId: id, tipo: 'GANADO_DONACION', monto: ganados, descripcion: `Donación de ${formatoCantidad(t.cantidad, t.lote.unidad)} de ${cat.nombre.split('(')[0].trim()}`, clave: `donacion:${id}` }, tx);
    }
    // INTERCAMBIO: sin dinero ni créditos de por medio; el pagoEstado queda en NO_APLICA.

    await this.mover(tx, t, 'ENTREGADO', { pagoEstado, contratoJson: contrato as unknown as Prisma.InputJsonValue });
    await tx.empresa.updateMany({ where: { id: { in: [t.ofertanteId, t.receptorId] } }, data: { nTransacciones: { increment: 1 } } });
    const lote = await tx.lote.findUniqueOrThrow({ where: { id: t.loteId } });
    if (lote.cantidadDisponible <= 0) await tx.lote.update({ where: { id: lote.id }, data: { estado: 'CERRADO' } });
    const uso = (contrato.documento?.usoFinalDeclarado as string | undefined) ?? undefined;
    const cert = await this.certificados.emitir(id, uso, tx);
    await this.sistema(tx, id, usuarioId, `Entrega confirmada por ambas partes. Certificado de manejo y destino final emitido: ${cert.codigo}.`);
  }

  // ---------- 5. Calificación y cierre ----------

  async calificar(actor: JwtPayload, id: string, dto: { estrellas: number; comentario?: string }) {
    const { t, rol } = await this.cargar(id, actor);
    if (!['ENTREGADO', 'CALIFICADO'].includes(t.estado)) throw new BadRequestException('Solo se califica después de la entrega');
    const previa = await this.prisma.calificacion.findUnique({ where: { transaccionId_autorId: { transaccionId: id, autorId: actor.empresaId } } });
    if (previa) throw new BadRequestException('Ya calificaste esta transacción');
    const destinatarioId = rol === 'OFERTANTE' ? t.receptorId : t.ofertanteId;

    await this.prisma.$transaction(async (tx) => {
      await tx.calificacion.create({ data: { transaccionId: id, autorId: actor.empresaId, destinatarioId, estrellas: dto.estrellas, comentario: dto.comentario?.trim() || null } });
      const prom = await tx.calificacion.aggregate({ where: { destinatarioId }, _avg: { estrellas: true } });
      await tx.empresa.update({ where: { id: destinatarioId }, data: { ratingProm: redondear(prom._avg.estrellas ?? 0) } });
      // 1.ª calificación: ENTREGADO -> CALIFICADO; 2.ª (la otra parte): CALIFICADO -> CERRADO.
      await this.mover(tx, t, t.estado === 'ENTREGADO' ? 'CALIFICADO' : 'CERRADO');
    });
    return { ok: true };
  }

  // ---------- Cancelación e incidencias ----------

  async cancelar(actor: JwtPayload, id: string, motivo?: string) {
    const { t } = await this.cargar(id, actor);
    if (!ABIERTOS.includes(t.estado)) throw new BadRequestException('Esta transacción ya no se puede cancelar');
    const contrato = this.contratoDe(t);
    const reservado = ['ACORDADO', 'PAGO_RETENIDO', 'RECOJO_CONFIRMADO'].includes(t.estado);
    const total = this.total(t.cantidad, t.precioAcordado);

    await this.prisma.$transaction(async (tx) => {
      if (reservado) {
        await tx.lote.update({ where: { id: t.loteId }, data: { cantidadDisponible: { increment: t.cantidad } } });
        await tx.lote.updateMany({ where: { id: t.loteId, estado: 'RESERVADO' }, data: { estado: 'PUBLICADO' } });
      }
      let pagoEstado = t.pagoEstado;
      if (t.pagoEstado === 'RETENIDO') {
        if (t.modalidad === 'VENTA' && contrato.pagoRef) await this.pagos.reembolsar(contrato.pagoRef);
        if (t.modalidad === 'CREDITOS') await this.creditos.registrar({ empresaId: t.receptorId, transaccionId: id, tipo: 'AJUSTE', monto: total, descripcion: `Reembolso por cancelación: ${t.lote.titulo}`, clave: `reembolso:${id}` }, tx);
        pagoEstado = 'REEMBOLSADO';
      }
      await this.mover(tx, t, 'CANCELADO', { pagoEstado });
      await this.sistema(tx, id, actor.sub, `Transacción cancelada${motivo ? `: ${motivo}` : ''}.${pagoEstado === 'REEMBOLSADO' ? ' El pago retenido fue reembolsado.' : ''}`);
    });
    return { ok: true };
  }

  async reportarIncidencia(actor: JwtPayload, id: string, dto: { tipo: string; detalle: string }) {
    const { t } = await this.cargar(id, actor);
    if (t.estado === 'SOLICITADO') throw new BadRequestException('Aún no hay una transacción en curso que reportar');
    await this.prisma.incidencia.create({ data: { transaccionId: id, reportadaPor: actor.sub, tipo: dto.tipo, detalle: dto.detalle } });
    return { ok: true };
  }

  // ---------- Consultas ----------

  private acciones(t: any, rol: Rol, calificado: boolean): string[] {
    const a: string[] = [];
    const contrato = this.contratoDe(t);
    switch (t.estado as EstadoTransaccion) {
      case 'SOLICITADO':
        a.push('mensaje', 'proponer');
        break;
      case 'EN_NEGOCIACION':
        a.push('mensaje', 'proponer');
        if (contrato.terminos && contrato.propuestoPor && contrato.propuestoPor !== rol) a.push('aceptar');
        break;
      case 'ACORDADO':
        if (t.modalidad === 'DONACION' || t.modalidad === 'INTERCAMBIO') a.push('confirmar_recojo');
        else if (rol === 'RECEPTOR') a.push('pagar');
        a.push('mensaje');
        break;
      case 'PAGO_RETENIDO':
        a.push('confirmar_recojo', 'mensaje');
        break;
      case 'RECOJO_CONFIRMADO':
        if (!(rol === 'OFERTANTE' ? t.firmaOfertanteAt : t.firmaReceptorAt)) a.push('firmar_entrega');
        a.push('mensaje');
        break;
      case 'ENTREGADO':
      case 'CALIFICADO':
        if (!calificado) a.push('calificar');
        a.push('mensaje');
        break;
    }
    if (ABIERTOS.includes(t.estado)) a.push('cancelar');
    if (t.estado !== 'SOLICITADO' && t.estado !== 'CANCELADO') a.push('incidencia');
    return a;
  }

  private pendiente(t: any, rol: Rol): string {
    const contrato = this.contratoDe(t);
    switch (t.estado as EstadoTransaccion) {
      case 'SOLICITADO':
        return rol === 'OFERTANTE' ? 'Responde la solicitud' : 'Esperando respuesta del ofertante';
      case 'EN_NEGOCIACION':
        if (!contrato.terminos) return 'Propón cantidad y condiciones';
        return contrato.propuestoPor !== rol ? 'Revisa y acepta los términos propuestos' : 'Esperando que la otra parte acepte';
      case 'ACORDADO':
        return t.modalidad === 'DONACION' || t.modalidad === 'INTERCAMBIO' ? 'Confirma fecha y responsable de recojo' : rol === 'RECEPTOR' ? 'Realiza el pago en garantía' : 'Esperando el pago del receptor';
      case 'PAGO_RETENIDO':
        return 'Confirma fecha y responsable de recojo';
      case 'RECOJO_CONFIRMADO': {
        const yaFirme = rol === 'OFERTANTE' ? t.firmaOfertanteAt : t.firmaReceptorAt;
        return yaFirme ? 'Esperando la firma de la otra parte' : 'Firma la entrega al recibir/entregar el material';
      }
      case 'ENTREGADO':
      case 'CALIFICADO':
        return 'Califica a la otra empresa';
      case 'CERRADO':
        return 'Completada';
      default:
        return 'Cancelada';
    }
  }

  async listar(actor: JwtPayload) {
    const empresaId = actor.empresaId;
    const ts = await this.prisma.transaccion.findMany({
      where: { OR: [{ ofertanteId: empresaId }, { receptorId: empresaId }] },
      orderBy: { updatedAt: 'desc' },
      include: { lote: { include: { categoria: { select: { nombre: true, codigo: true } }, imagenes: { orderBy: { orden: 'asc' }, take: 1 } } }, ofertante: { select: { id: true, razonSocial: true, tipo: true, confidencial: true, esDemo: true } }, receptor: { select: { id: true, razonSocial: true, tipo: true, confidencial: true, esDemo: true } }, certificado: { select: { codigo: true } } },
    });
    return ts.map((t) => {
      const rol: Rol = t.ofertanteId === empresaId ? 'OFERTANTE' : 'RECEPTOR';
      const pendiente = this.pendiente(t, rol);
      return {
        id: t.id,
        estado: t.estado,
        etiquetaEstado: ETIQUETA_ESTADO[t.estado],
        etapa: etapaSimple(t.estado),
        etiquetaEtapa: ETIQUETA_ETAPA[etapaSimple(t.estado)],
        modalidad: t.modalidad,
        cantidad: t.cantidad,
        total: this.total(t.cantidad, t.precioAcordado),
        rol,
        precioUnitario: t.precioAcordado,
        lote: { id: t.loteId, titulo: t.lote.titulo, categoria: t.lote.categoria.nombre, categoriaCodigo: t.lote.categoria.codigo, unidad: t.lote.unidad, imagen: t.lote.imagenes[0]?.url ?? null },
        contraparte: (() => {
          const c = rol === 'OFERTANTE' ? t.receptor : t.ofertante;
          return { id: c.id, tipo: c.tipo, razonSocial: this.nombreVisible(t, c, actor), demo: c.esDemo };
        })(),
        certificado: t.certificado?.codigo ?? null,
        pendiente,
        requiereMiAccion: ABIERTOS.includes(t.estado) && /^(Responde|Propón|Revisa|Realiza|Confirma|Firma)/.test(pendiente),
        updatedAt: t.updatedAt,
      };
    });
  }

  async detalle(actor: JwtPayload, id: string) {
    const { t, rol } = await this.cargar(id, actor);
    const [mensajes, califs, cert, incidencias] = await Promise.all([
      this.mensajes(actor, id),
      this.prisma.calificacion.findMany({ where: { transaccionId: id } }),
      this.prisma.certificado.findUnique({ where: { transaccionId: id }, select: { codigo: true, hashSha256: true } }),
      this.prisma.incidencia.count({ where: { transaccionId: id } }),
    ]);
    const imagenes = await this.prisma.loteImagen.findMany({ where: { loteId: t.loteId }, orderBy: { orden: 'asc' }, take: 1 });
    const contrato = this.contratoDe(t);
    const calificado = califs.some((c) => c.autorId === actor.empresaId);
    const saldoReceptor = rol === 'RECEPTOR' && t.modalidad === 'CREDITOS' ? await this.creditos.saldo(actor.empresaId) : null;
    const loteIntercambio = t.modalidad === 'INTERCAMBIO' && t.loteIntercambioId
      ? await this.prisma.lote.findUnique({ where: { id: t.loteIntercambioId }, select: { id: true, titulo: true } })
      : null;
    return {
      id: t.id,
      estado: t.estado,
      etiquetaEstado: ETIQUETA_ESTADO[t.estado],
      etapa: etapaSimple(t.estado),
      etiquetaEtapa: ETIQUETA_ETAPA[etapaSimple(t.estado)],
      modalidad: t.modalidad,
      rol,
      cantidad: t.cantidad,
      precioAcordado: t.precioAcordado,
      total: this.total(t.cantidad, t.precioAcordado),
      comision: t.comision,
      distanciaKm: t.distanciaKm,
      fleteEstimado: t.fleteEstimado,
      pagoEstado: t.pagoEstado,
      fechaRecojo: t.fechaRecojo,
      responsableRecojo: t.responsableRecojo,
      fotoEntregaUrl: t.fotoEntregaUrl,
      firmas: { OFERTANTE: !!t.firmaOfertanteAt, RECEPTOR: !!t.firmaReceptorAt },
      terminos: contrato.terminos ?? null,
      aceptaciones: contrato.aceptaciones,
      propuestoPor: contrato.propuestoPor ?? null,
      contrato: contrato.documento ?? null,
      comisionPagadaConCreditos: !!contrato.comisionPagadaConCreditos,
      lote: { id: t.loteId, titulo: t.lote.titulo, categoria: t.lote.categoria.nombre, cantidadDisponible: t.lote.cantidadDisponible, unidad: t.lote.unidad, imagen: imagenes[0]?.url ?? null, notaIntercambio: t.lote.notaIntercambio ?? null, entrega: t.lote.entrega, condicion: t.lote.condicion },
      loteIntercambio: loteIntercambio ?? null,
      ofertante: { id: t.ofertante.id, tipo: t.ofertante.tipo, razonSocial: this.nombreVisible(t, t.ofertante, actor), ratingProm: t.ofertante.ratingProm, demo: t.ofertante.esDemo },
      receptor: { id: t.receptor.id, tipo: t.receptor.tipo, razonSocial: this.nombreVisible(t, t.receptor, actor), ratingProm: t.receptor.ratingProm, demo: t.receptor.esDemo },
      // Contacto de la otra empresa: solo desde ACORDADO en adelante y solo para las partes (null antes del acuerdo).
      contactoContraparte: contactoDeContraparte({
        estado: t.estado,
        esParte: t.ofertanteId === actor.empresaId || t.receptorId === actor.empresaId,
        contraparte: rol === 'OFERTANTE' ? t.receptor : t.ofertante,
        tituloLote: t.lote.titulo,
        cantidadTexto: formatoCantidad(t.cantidad, t.lote.unidad),
      }),
      mensajes,
      calificaciones: califs.map((c) => ({ autorId: c.autorId, estrellas: c.estrellas, comentario: c.comentario })),
      certificado: cert,
      incidencias,
      saldoCreditos: saldoReceptor,
      acciones: this.acciones(t, rol, calificado),
      pendiente: this.pendiente(t, rol),
    };
  }
}
