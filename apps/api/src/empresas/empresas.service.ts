import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { nombrePublico, type ActivarModoInput, type ActualizarEmpresaInput, type ActualizarProveedorInput, type CrearProveedorInput, type TiendaInput } from '@swapit/shared';
import { Geocoder } from '../common/geocoding/geocoder';
import { SunatValidator, metodoVerificacionActual, type MetodoVerificacion } from '../common/sunat/sunat.validator';
import type { JwtPayload } from '../auth/auth.guard';
import { aproximar, debeOcultar, empresasReveladas, nombreConfidencial } from '../common/confidencial';
import { PrismaService } from '../prisma/prisma.service';

/** Columnas de la tienda del vendedor (registro o activación del modo vendedor). */
export const datosTienda = (t: TiendaInput) => ({
  nombreTienda: t.nombre,
  cobroMetodo: t.cobroMetodo,
  cobroCuenta: t.cobroCuenta,
  ...(t.telefono ? { telefono: t.telefono } : {}),
});

@Injectable()
export class EmpresasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sunat: SunatValidator,
    private readonly geocoder: Geocoder,
  ) {}

  /**
   * Geocodifica la dirección y guarda el punto PostGIS. Devuelve true si logró ubicarla.
   * Las personas naturales se guardan con ubicación APROXIMADA (rejilla de ~1 km): nunca se expone su domicilio exacto.
   */
  async ubicar(empresaId: string, direccion: string): Promise<boolean> {
    const c = await this.geocoder.geocodificar(direccion);
    if (!c) {
      await this.prisma.$executeRaw`UPDATE "Empresa" SET "ubicacion" = NULL WHERE id = ${empresaId}`;
      return false;
    }
    const { tipo } = await this.prisma.empresa.findUniqueOrThrow({ where: { id: empresaId }, select: { tipo: true } });
    const lat = tipo === 'PERSONA' ? Math.round(c.lat * 100) / 100 : c.lat;
    const lng = tipo === 'PERSONA' ? Math.round(c.lng * 100) / 100 : c.lng;
    await this.prisma.$executeRaw`
      UPDATE "Empresa" SET "ubicacion" = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      WHERE id = ${empresaId}`;
    return true;
  }

  /**
   * Verificación de la empresa (KYB). Depende del entorno (ver `metodoVerificacionActual`):
   *  - API: consulta el proveedor de SUNAT configurado.
   *  - SIMULADA: validador de demostración (solo comprueba el formato del RUC). Solo fuera de producción o con SUNAT_PROVIDER=mock.
   *  - MANUAL: en producción sin proveedor la empresa queda PENDIENTE hasta que un administrador la verifique
   *    (PATCH /admin/empresas/:id/verificacion). Nunca se marca VERIFICADA sin una comprobación real.
   */
  async verificarKyb(empresaId: string) {
    const empresa = await this.prisma.empresa.findUnique({ where: { id: empresaId } });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');
    // Las personas naturales no tienen RUC: no hay nada que verificar.
    if (empresa.tipo === 'PERSONA' || !empresa.ruc) return { estadoKyb: 'NO_APLICA' as const, metodoVerificacion: null, detalle: { encontrado: false } };
    const metodo = metodoVerificacionActual();
    if (metodo === 'MANUAL') {
      // Una decisión ya tomada a mano no se revierte al volver a pulsar «verificar».
      if (empresa.metodoKyb === 'MANUAL' && (empresa.estadoKyb === 'VERIFICADA' || empresa.estadoKyb === 'RECHAZADA')) {
        return { estadoKyb: empresa.estadoKyb, metodoVerificacion: 'MANUAL' as MetodoVerificacion, detalle: { encontrado: empresa.estadoKyb === 'VERIFICADA' } };
      }
      await this.prisma.empresa.update({ where: { id: empresaId }, data: { estadoKyb: 'PENDIENTE', metodoKyb: 'MANUAL' } });
      return { estadoKyb: 'PENDIENTE' as const, metodoVerificacion: 'MANUAL' as MetodoVerificacion, detalle: { encontrado: false, motivo: 'Pendiente de revisión manual por el equipo de Swap It' } };
    }
    let r;
    try {
      r = await this.sunat.consultar(empresa.ruc);
    } catch {
      // Caída del proveedor: no se rechaza a la empresa por un fallo ajeno; queda como estaba.
      throw new ServiceUnavailableException('No se pudo consultar la verificación del RUC. Inténtalo de nuevo en unos minutos.');
    }
    const ok = r.encontrado && r.estado === 'ACTIVO' && r.condicion === 'HABIDO';
    const estadoKyb = ok ? 'VERIFICADA' : 'RECHAZADA';
    await this.prisma.empresa.update({ where: { id: empresaId }, data: { estadoKyb, metodoKyb: metodo, kybRevisadoAt: new Date() } });
    return { estadoKyb, metodoVerificacion: metodo, detalle: r };
  }

  /** Acción de un ADMIN: fija el resultado de la verificación de una empresa y deja constancia en la auditoría. */
  async verificarManual(adminUsuarioId: string, empresaId: string, estado: 'VERIFICADA' | 'RECHAZADA' | 'PENDIENTE', nota?: string) {
    const e = await this.prisma.empresa.findUnique({ where: { id: empresaId }, select: { id: true, tipo: true, estadoKyb: true, razonSocial: true } });
    if (!e) throw new NotFoundException('Empresa no encontrada');
    if (e.tipo !== 'EMPRESA') throw new BadRequestException('Solo las empresas se verifican; las personas no tienen KYB.');
    const [actualizada] = await this.prisma.$transaction([
      this.prisma.empresa.update({
        where: { id: empresaId },
        data: { estadoKyb: estado, metodoKyb: 'MANUAL', kybRevisadoAt: new Date() },
        select: { id: true, razonSocial: true, estadoKyb: true, metodoKyb: true, kybRevisadoAt: true },
      }),
      this.prisma.auditoriaAdmin.create({
        data: { usuarioId: adminUsuarioId, accion: 'EMPRESA_VERIFICACION', entidad: 'Empresa', entidadId: empresaId, detalle: { desde: e.estadoKyb, hacia: estado, nota: nota?.slice(0, 500) ?? null } },
      }),
    ]);
    return { ...actualizada, metodoVerificacion: 'MANUAL' as MetodoVerificacion };
  }

  /** Empresas para revisar (por defecto, las pendientes), más antiguas primero. */
  listarParaRevision(estadoKyb: 'PENDIENTE' | 'VERIFICADA' | 'RECHAZADA' = 'PENDIENTE') {
    return this.prisma.empresa.findMany({
      where: { tipo: 'EMPRESA', estadoKyb, esDemo: false },
      orderBy: { createdAt: 'asc' },
      take: 200,
      select: { id: true, razonSocial: true, ruc: true, representanteLegal: true, direccion: true, contactoNombre: true, telefono: true, estadoKyb: true, metodoKyb: true, kybRevisadoAt: true, createdAt: true },
    });
  }

  async actualizar(empresaId: string, input: ActualizarEmpresaInput) {
    const actual = await this.prisma.empresa.findUniqueOrThrow({ where: { id: empresaId } });
    const { nombre, tienda, ...resto } = input;
    if (tienda) {
      if (actual.rol !== 'OFERTANTE' && actual.rol !== 'AMBOS') throw new BadRequestException('Activa el modo vendedor para registrar una tienda.');
      await this.prisma.empresa.update({ where: { id: empresaId }, data: datosTienda(tienda) });
    }
    if (actual.tipo === 'PERSONA') {
      // Una persona solo edita su nombre y su ubicación; razón social, rubro y rol no aplican.
      const data: { direccion?: string; razonSocial?: string } = {};
      if (resto.direccion) data.direccion = resto.direccion;
      if (nombre) {
        data.razonSocial = nombrePublico(nombre);
        await this.prisma.usuario.updateMany({ where: { empresaId }, data: { nombre } });
      }
      await this.prisma.empresa.update({ where: { id: empresaId }, data });
    } else {
      // Los roles B2B2B (INTERMEDIARIO/GENERADOR) no se cambian desde el perfil: los asigna el alta de la cuenta.
      if (resto.rol === 'GENERADOR' || resto.rol === 'INTERMEDIARIO' || actual.rol === 'INTERMEDIARIO' || actual.rol === 'GENERADOR') delete resto.rol;
      await this.prisma.empresa.update({ where: { id: empresaId }, data: resto });
    }
    if (input.direccion && input.direccion !== actual.direccion) await this.ubicar(empresaId, input.direccion);
    return this.miEmpresa(empresaId);
  }

  agregarCertificacion(empresaId: string, nombre: string) {
    return this.prisma.empresaCertificacion.create({ data: { empresaId, nombre } });
  }

  async eliminarCertificacion(empresaId: string, id: string) {
    const r = await this.prisma.empresaCertificacion.deleteMany({ where: { id, empresaId } });
    if (r.count === 0) throw new NotFoundException('Certificación no encontrada');
  }

  /** Perfil propio: agrega RUC, representante legal y dirección completa al perfil público. */
  async miEmpresa(empresaId: string) {
    const [publico, privado] = await Promise.all([
      this.perfil(empresaId),
      this.prisma.empresa.findUniqueOrThrow({
        where: { id: empresaId },
        select: { ruc: true, representanteLegal: true, direccion: true, contactoNombre: true, telefono: true, nombreTienda: true, cobroMetodo: true, cobroCuenta: true },
      }),
    ]);
    return { ...publico, ...privado };
  }

  /**
   * «Registrarme como vendedor / comprador» desde el perfil: la misma cuenta suma el otro modo (rol AMBOS).
   * No crea otro usuario ni repite el registro; el modo vendedor solo pide los datos de tienda y cobro.
   */
  async activarModo(empresaId: string, input: ActivarModoInput) {
    const e = await this.prisma.empresa.findUniqueOrThrow({ where: { id: empresaId }, select: { rol: true } });
    if (e.rol === 'INTERMEDIARIO' || e.rol === 'GENERADOR') throw new BadRequestException('Esta cuenta no usa los modos comprador y vendedor.');
    const tiene = input.modo === 'VENDEDOR' ? e.rol !== 'RECEPTOR' : e.rol !== 'OFERTANTE';
    if (tiene) throw new BadRequestException(`Tu cuenta ya tiene el modo ${input.modo === 'VENDEDOR' ? 'vendedor' : 'comprador'}.`);
    await this.prisma.empresa.update({
      where: { id: empresaId },
      data: { rol: 'AMBOS', ...(input.modo === 'VENDEDOR' ? datosTienda(input.tienda) : {}) },
    });
    return this.miEmpresa(empresaId);
  }

  /**
   * Perfil público (sin RUC ni representante legal; de una persona tampoco se expone la dirección).
   * Si la empresa es confidencial y quien consulta no tiene una negociación con ella, solo ve rubro, verificación y reputación.
   */
  async perfil(empresaId: string, viewer?: JwtPayload) {
    const e = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      include: { certificaciones: { select: { id: true, nombre: true } } },
    });
    if (!e) throw new NotFoundException('Empresa no encontrada');
    // Aislamiento por intermediario: un proveedor solo lo ve su intermediario (y él mismo).
    if (e.intermediarioId && viewer && viewer.rol !== 'ADMIN' && viewer.empresaId !== e.intermediarioId && viewer.empresaId !== e.id) throw new NotFoundException('Empresa no encontrada');
    const [geo] = await this.prisma.$queryRaw<{ lat: number | null; lng: number | null }[]>`
      SELECT ST_Y("ubicacion"::geometry) AS lat, ST_X("ubicacion"::geometry) AS lng
      FROM "Empresa" WHERE id = ${empresaId}`;
    const oculto = !!viewer && viewer.rol !== 'ADMIN' && debeOcultar(e, viewer.empresaId, await empresasReveladas(this.prisma, viewer.empresaId));
    const ub = geo?.lat != null && geo?.lng != null ? { lat: geo.lat, lng: geo.lng } : null;
    return {
      id: e.id,
      tipo: e.tipo,
      confidencial: e.confidencial,
      intermediarioId: e.intermediarioId,
      logoUrl: e.logoUrl,
      colorMarca: e.colorMarca,
      identidadOculta: oculto,
      razonSocial: oculto ? nombreConfidencial() : e.razonSocial,
      ciiu: e.ciiu,
      rol: e.rol,
      direccion: e.tipo === 'PERSONA' || oculto ? null : e.direccion,
      estadoKyb: e.estadoKyb,
      // Cómo se decidió la verificación: la interfaz no debe llamar «oficial» a una SIMULADA ni a una pendiente.
      metodoVerificacion: (e.estadoKyb === 'NO_APLICA' ? null : (e.metodoKyb ?? metodoVerificacionActual())) as MetodoVerificacion | null,
      demo: e.esDemo,
      badgeCircular: e.badgeCircular,
      ratingProm: e.ratingProm,
      nTransacciones: e.nTransacciones,
      certificaciones: e.certificaciones,
      ubicacion: ub && oculto ? { lat: aproximar(ub.lat), lng: aproximar(ub.lng) } : ub,
    };
  }

  // ---------- Red de proveedores (B2B2B) ----------
  // Un proveedor (GENERADOR) es una cuenta «Empresa» que el intermediario crea y gestiona: no tiene usuario propio,
  // reporta material por un enlace con token (portal) o por WhatsApp.

  private nuevoToken() {
    return randomBytes(18).toString('base64url');
  }

  private async telefonoLibre(intermediarioId: string, telefono: string | undefined, exceptoId?: string) {
    if (!telefono) return;
    const otro = await this.prisma.empresa.findFirst({ where: { intermediarioId, telefono, activo: true, ...(exceptoId ? { id: { not: exceptoId } } : {}) }, select: { id: true } });
    if (otro) throw new ConflictException('Ya tienes otro proveedor con ese teléfono');
  }

  async crearProveedor(intermediarioId: string, input: CrearProveedorInput) {
    if (input.ruc && (await this.prisma.empresa.findUnique({ where: { ruc: input.ruc } }))) throw new ConflictException('Ya existe una empresa con ese RUC');
    await this.telefonoLibre(intermediarioId, input.telefono);
    const e = await this.prisma.empresa.create({
      data: {
        tipo: 'EMPRESA', rol: 'GENERADOR', intermediarioId, estadoKyb: 'NO_APLICA', tokenCaptacion: this.nuevoToken(),
        razonSocial: input.razonSocial, ruc: input.ruc, ciiu: input.ciiu, direccion: input.direccion,
        contactoNombre: input.contactoNombre, telefono: input.telefono, contactoEmail: input.contactoEmail, notasInternas: input.notasInternas,
        sector: input.sector, tipoActor: input.tipoActor,
      },
    });
    await this.ubicar(e.id, input.direccion).catch(() => false);
    return this.proveedor(intermediarioId, e.id);
  }

  private consultaProveedores(filtro: Prisma.Sql) {
    return this.prisma.$queryRaw<any[]>`
      SELECT e.id, e."razonSocial", e.ruc, e.ciiu, e.direccion, e."contactoNombre", e.telefono, e."contactoEmail", e."notasInternas",
             e.activo, e."tokenCaptacion", e."createdAt", e.sector, e."tipoActor",
             ST_Y(e.ubicacion::geometry) AS lat, ST_X(e.ubicacion::geometry) AS lng,
             (SELECT count(*)::int FROM "Lote" l WHERE l."empresaId" = e.id AND l.estado::text IN ('REPORTADO','COTIZADO','ACOPIADO','DESPACHADO','RECHAZADO')) AS lotes,
             (SELECT count(*)::int FROM "Lote" l WHERE l."empresaId" = e.id AND l.estado::text IN ('REPORTADO','COTIZADO')) AS pendientes,
             (SELECT max(l."createdAt") FROM "Lote" l WHERE l."empresaId" = e.id AND l.estado::text IN ('REPORTADO','COTIZADO','ACOPIADO','DESPACHADO','RECHAZADO')) AS "ultimoReporte"
      FROM "Empresa" e WHERE e.rol::text = 'GENERADOR' AND ${filtro}
      ORDER BY e.activo DESC, e."razonSocial"`;
  }

  async listarProveedores(intermediarioId: string, f: { sector?: string; tipoActor?: string } = {}) {
    const cond = [Prisma.sql`e."intermediarioId" = ${intermediarioId}`];
    if (f.sector) cond.push(Prisma.sql`e.sector = ${f.sector}`);
    if (f.tipoActor) cond.push(Prisma.sql`e."tipoActor" = ${f.tipoActor}`);
    const filas = await this.consultaProveedores(Prisma.join(cond, ' AND '));
    return filas.map((f) => ({ ...f, ubicacion: f.lat != null ? { lat: f.lat, lng: f.lng } : null }));
  }

  async proveedor(intermediarioId: string, id: string) {
    const [f] = await this.consultaProveedores(Prisma.sql`e."intermediarioId" = ${intermediarioId} AND e.id = ${id}`);
    if (!f) throw new NotFoundException('Proveedor no encontrado');
    return { ...f, ubicacion: f.lat != null ? { lat: f.lat, lng: f.lng } : null };
  }

  async actualizarProveedor(intermediarioId: string, id: string, input: ActualizarProveedorInput) {
    const actual = await this.proveedor(intermediarioId, id);
    if (input.ruc && input.ruc !== actual.ruc && (await this.prisma.empresa.findUnique({ where: { ruc: input.ruc } }))) throw new ConflictException('Ya existe una empresa con ese RUC');
    await this.telefonoLibre(intermediarioId, input.telefono, id);
    await this.prisma.empresa.update({ where: { id }, data: input });
    if (input.direccion && input.direccion !== actual.direccion) await this.ubicar(id, input.direccion).catch(() => false);
    return this.proveedor(intermediarioId, id);
  }

  /** Invalida el enlace anterior (por si se filtró) y crea uno nuevo. */
  async rotarTokenCaptacion(intermediarioId: string, id: string) {
    await this.proveedor(intermediarioId, id);
    await this.prisma.empresa.update({ where: { id }, data: { tokenCaptacion: this.nuevoToken() } });
    return this.proveedor(intermediarioId, id);
  }
}
