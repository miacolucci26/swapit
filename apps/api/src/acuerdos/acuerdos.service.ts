import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { residuoPorId, type AcuerdoInput, type ActualizarAcuerdoInput, type UnidadLote } from '@swapit/shared';
import { MaterialService } from '../material/material.service';
import { PrismaService } from '../prisma/prisma.service';

const SALDAN = ['ACOPIADO', 'DESPACHADO'];

/**
 * Acuerdos de temporada: precio y fecha de recojo pactados con un proveedor ANTES de la campaña (una sola comunicación), y los
 * recojos que van saldándolos. Cada recojo crea el material ya acopiado, así alimenta el benchmark como cualquier acopio.
 */
@Injectable()
export class AcuerdosService {
  constructor(private readonly prisma: PrismaService, private readonly material: MaterialService) {}

  private incluir = { proveedor: { select: { id: true, razonSocial: true, telefono: true, contactoNombre: true } }, destino: { select: { id: true, nombre: true, tipo: true } } } satisfies Prisma.AcuerdoInclude;

  private async vista(a: Prisma.AcuerdoGetPayload<{ include: { proveedor: { select: { id: true; razonSocial: true; telefono: true; contactoNombre: true } }; destino: { select: { id: true; nombre: true; tipo: true } } } }>) {
    const lotes = await this.prisma.lote.findMany({ where: { acuerdoId: a.id, estado: { in: SALDAN as never[] } }, select: { id: true, cantidadAcopiada: true, precioFinal: true, acopiadoAt: true }, orderBy: { acopiadoAt: 'desc' } });
    const recogido = lotes.reduce((s, l) => s + (l.cantidadAcopiada ?? 0), 0);
    return {
      ...a,
      residuoNombre: (a.residuoRef && residuoPorId(a.residuoRef)?.residuo.nombre) || null,
      recogido: Math.round(recogido * 1000) / 1000,
      avance: Math.min(100, Math.round((recogido / a.cantidadEstimada) * 100)),
      recojos: lotes.map((l) => ({ loteId: l.id, cantidad: l.cantidadAcopiada, precio: l.precioFinal, fecha: l.acopiadoAt })),
    };
  }

  async listar(intermediarioId: string, estado?: string) {
    const filas = await this.prisma.acuerdo.findMany({
      where: { intermediarioId, ...(estado ? { estado } : {}) },
      include: this.incluir,
      orderBy: [{ estado: 'asc' }, { fechaRecojo: 'asc' }, { createdAt: 'desc' }],
    });
    return Promise.all(filas.map((a) => this.vista(a)));
  }

  async obtener(intermediarioId: string, id: string) {
    const a = await this.prisma.acuerdo.findFirst({ where: { id, intermediarioId }, include: this.incluir });
    if (!a) throw new NotFoundException('Acuerdo no encontrado');
    return this.vista(a);
  }

  private async validarDestino(intermediarioId: string, destinoId?: string | null) {
    if (destinoId && !(await this.prisma.destino.findFirst({ where: { id: destinoId, intermediarioId, activo: true }, select: { id: true } }))) throw new NotFoundException('Destino no encontrado');
  }

  async crear(intermediarioId: string, input: AcuerdoInput) {
    const prov = await this.prisma.empresa.findFirst({ where: { id: input.proveedorId, rol: 'GENERADOR', activo: true, intermediarioId }, select: { id: true } });
    if (!prov) throw new NotFoundException('Proveedor no encontrado');
    await this.validarDestino(intermediarioId, input.destinoId);
    const a = await this.prisma.acuerdo.create({
      data: {
        intermediarioId, proveedorId: prov.id, destinoId: input.destinoId, descripcion: input.descripcion,
        residuoRef: input.residuoRef && residuoPorId(input.residuoRef) ? input.residuoRef : undefined,
        cantidadEstimada: input.cantidadEstimada, unidad: input.unidad, precioPactado: input.precioPactado,
        fechaRecojo: input.fechaRecojo ? new Date(`${input.fechaRecojo}T12:00:00Z`) : undefined, notas: input.notas,
      },
      include: this.incluir,
    });
    return this.vista(a);
  }

  async actualizar(intermediarioId: string, id: string, input: ActualizarAcuerdoInput) {
    await this.obtener(intermediarioId, id);
    await this.validarDestino(intermediarioId, input.destinoId);
    const { fechaRecojo, ...resto } = input;
    await this.prisma.acuerdo.update({
      where: { id },
      data: { ...resto, ...(fechaRecojo !== undefined ? { fechaRecojo: fechaRecojo ? new Date(`${fechaRecojo}T12:00:00Z`) : null } : {}) },
    });
    return this.obtener(intermediarioId, id);
  }

  /**
   * Registra un recojo: crea el material del proveedor, lo cotiza al precio pactado y lo acopia (al precio pactado o al que se
   * indique), y lo vincula al acuerdo y a su destino. Todo en una sola acción para que sea tan rápido como una llamada.
   */
  async registrarRecojo(intermediarioId: string, id: string, dto: { cantidad: number; precio?: number }) {
    const a = await this.obtener(intermediarioId, id);
    if (a.estado !== 'VIGENTE') throw new ConflictException('Este acuerdo ya no está vigente');
    const ref = a.residuoRef ? residuoPorId(a.residuoRef) : undefined;
    const categoria = ref && (await this.prisma.categoriaResiduo.findUnique({ where: { codigo: ref.residuo.categoria }, select: { codigo: true } }));
    const lote = await this.material.reportar(
      a.proveedorId,
      { descripcion: a.descripcion, categoriaCodigo: categoria ? categoria.codigo : undefined, cantidad: dto.cantidad, unidad: a.unidad as UnidadLote, precioEsperado: a.precioPactado, imagenes: [], residuoRef: a.residuoRef ?? undefined },
      'INTERMEDIARIO',
      intermediarioId,
    );
    await this.material.cotizar(intermediarioId, lote.id, a.precioPactado);
    await this.material.acopiar(intermediarioId, lote.id, { cantidadAcopiada: dto.cantidad, precioFinal: dto.precio ?? a.precioPactado });
    await this.prisma.lote.update({ where: { id: lote.id }, data: { acuerdoId: a.id, destinoId: a.destinoId } });
    return { loteId: lote.id, acuerdo: await this.obtener(intermediarioId, id) };
  }
}
