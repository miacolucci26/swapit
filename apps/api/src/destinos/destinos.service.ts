import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { compradoresDe, residuoPorId, type ActualizarDestinoInput, type DestinoInput } from '@swapit/shared';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Directorio de destinos del intermediario: a quién entrega o vende cada tipo de residuo. Es suyo: otro intermediario nunca lo ve
 * (un id ajeno responde 404, no «prohibido»).
 */
@Injectable()
export class DestinosService {
  constructor(private readonly prisma: PrismaService) {}

  /** Cada destino con cuántos despachos se le han hecho y cuándo fue el último. */
  async listar(intermediarioId: string, f: { tipo?: string; activo?: boolean } = {}) {
    const destinos = await this.prisma.destino.findMany({
      where: { intermediarioId, ...(f.tipo ? { tipo: f.tipo } : {}), ...(f.activo !== undefined ? { activo: f.activo } : {}) },
      orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
    });
    if (!destinos.length) return [];
    const despachos = await this.prisma.lote.groupBy({
      by: ['destinoId'],
      where: { destinoId: { in: destinos.map((d) => d.id) }, estado: 'DESPACHADO' },
      _count: { _all: true },
      _max: { despachadoAt: true },
    });
    return destinos.map((d) => {
      const x = despachos.find((g) => g.destinoId === d.id);
      return { ...d, despachos: x?._count._all ?? 0, ultimoDespacho: x?._max.despachadoAt ?? null };
    });
  }

  private async telefonoLibre(intermediarioId: string, telefono: string | undefined, exceptoId?: string) {
    if (!telefono) return;
    const otro = await this.prisma.destino.findFirst({ where: { intermediarioId, telefono, activo: true, ...(exceptoId ? { id: { not: exceptoId } } : {}) }, select: { nombre: true } });
    if (otro) throw new ConflictException(`Ya tienes un destino con ese teléfono (${otro.nombre})`);
  }

  async crear(intermediarioId: string, input: DestinoInput) {
    await this.telefonoLibre(intermediarioId, input.telefono);
    return this.prisma.destino.create({ data: { ...input, intermediarioId } });
  }

  async obtener(intermediarioId: string, id: string) {
    const d = await this.prisma.destino.findFirst({ where: { id, intermediarioId } });
    if (!d) throw new NotFoundException('Destino no encontrado');
    return d;
  }

  async actualizar(intermediarioId: string, id: string, input: ActualizarDestinoInput) {
    await this.obtener(intermediarioId, id);
    await this.telefonoLibre(intermediarioId, input.telefono, id);
    return this.prisma.destino.update({ where: { id }, data: input });
  }

  /**
   * Destinos del directorio que reciben un residuo: los de los tipos de comprador que la base de cadenas indica para él, con
   * los usos que le corresponden a cada tipo. Sirve para decir, en la ficha del material, «a quién llamar».
   */
  async sugeridos(intermediarioId: string, residuoRef: string) {
    const hallado = residuoPorId(residuoRef);
    if (!hallado) throw new NotFoundException('Residuo desconocido');
    const tipos = compradoresDe(hallado.residuo);
    const propios = await this.prisma.destino.findMany({ where: { intermediarioId, activo: true, tipo: { in: tipos.map((t) => t.destino) } }, orderBy: { nombre: 'asc' } });
    return {
      residuo: { id: hallado.residuo.id, nombre: hallado.residuo.nombre },
      tipos: tipos.map((t) => ({ ...t, destinos: propios.filter((d) => d.tipo === t.destino).map((d) => ({ id: d.id, nombre: d.nombre, zona: d.zona, telefono: d.telefono })) })),
    };
  }
}
