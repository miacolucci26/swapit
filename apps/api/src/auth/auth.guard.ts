import { CanActivate, ExecutionContext, Injectable, NotFoundException, SetMetadata, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { modo } from '../common/modo';
import { PrismaService } from '../prisma/prisma.service';
import { JWT_ALGORITMO, SESION_MAXIMA_S, opcionesCookie, ttlSegundos } from './auth.config';

export const COOKIE_NAME = 'swapit_token';

export interface JwtPayload {
  sub: string; // usuarioId
  empresaId: string; // id de la cuenta que publica y transa (empresa o persona)
  rol: 'EMPRESA' | 'ADMIN';
  /** Tipo de cuenta. Los tokens emitidos antes de las personas no lo traen: se asumen EMPRESA. */
  tipo?: 'EMPRESA' | 'PERSONA';
  /** Rol de la cuenta en el modelo B2B2B: INTERMEDIARIO (cliente que paga) o GENERADOR (proveedor, sin usuario propio). */
  rolEmpresa?: string;
  /** Momento (epoch s) en que se inició la sesión; la renovación automática no la extiende más allá de SESION_MAXIMA_S. */
  ini?: number;
}

export const Roles = (...roles: JwtPayload['rol'][]) => SetMetadata('roles', roles);
/** Restringe un endpoint a cierto tipo de cuenta (p. ej. cumplimiento REP y KYB solo para empresas). */
/** Restringe un endpoint a cuentas con cierto rol de empresa (p. ej. gestión de la red: solo INTERMEDIARIO). */
export const RolesEmpresa = (...roles: string[]) => SetMetadata('rolesEmpresa', roles);
export const Tipos = (...tipos: NonNullable<JwtPayload['tipo']>[]) => SetMetadata('tipos', tipos);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly reflector: Reflector, private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const token = req.cookies?.[COOKIE_NAME];
    if (!token || typeof token !== 'string') throw new UnauthorizedException('Sesión requerida');
    let payload: JwtPayload & { iat?: number; exp?: number };
    try {
      payload = await this.jwt.verifyAsync<JwtPayload & { iat?: number; exp?: number }>(token, { algorithms: [JWT_ALGORITMO] });
    } catch {
      throw new UnauthorizedException('Sesión inválida o expirada');
    }
    // La sesión sigue vigente solo si la persona existe todavía y su cuenta/rol no cambiaron (un usuario borrado o degradado
    // pierde el acceso de inmediato, no cuando caduque el token).
    const u = await this.prisma.usuario.findUnique({ where: { id: String(payload.sub) }, select: { empresaId: true, rol: true } });
    if (!u || u.empresaId !== payload.empresaId || u.rol !== payload.rol) throw new UnauthorizedException('Sesión inválida o expirada');

    const roles = this.reflector.get<JwtPayload['rol'][] | undefined>('roles', ctx.getHandler());
    if (roles && !roles.includes(payload.rol)) throw new ForbiddenException('Sin permisos');
    // Lo del marketplace no existe en modo B2B2B: 404, como si la ruta no estuviera.
    if (modo() !== 'MARKETPLACE' && this.reflector.getAllAndOverride<boolean | undefined>('soloMarketplace', [ctx.getHandler(), ctx.getClass()])) {
      throw new NotFoundException('Esta función no está disponible en Swapit para intermediarios');
    }
    payload.tipo ??= 'EMPRESA';
    const rolesEmpresa = this.reflector.getAllAndOverride<string[] | undefined>('rolesEmpresa', [ctx.getHandler(), ctx.getClass()]);
    if (rolesEmpresa && !(payload.rolEmpresa && rolesEmpresa.includes(payload.rolEmpresa))) throw new ForbiddenException('Esta función es solo para cuentas de intermediario');
    const tipos = this.reflector.getAllAndOverride<NonNullable<JwtPayload['tipo']>[] | undefined>('tipos', [ctx.getHandler(), ctx.getClass()]);
    if (tipos && !tipos.includes(payload.tipo)) throw new ForbiddenException('Esta función es solo para cuentas de empresa');
    await this.renovar(ctx, payload);
    req.user = payload;
    return true;
  }

  /** Sesión deslizante: pasada la mitad de su vida se emite una cookie nueva, sin pasar de la vigencia máxima desde el inicio de sesión. */
  private async renovar(ctx: ExecutionContext, p: JwtPayload & { iat?: number; exp?: number }) {
    const ahora = Math.floor(Date.now() / 1000);
    const ini = p.ini ?? p.iat ?? ahora;
    const ttl = ttlSegundos();
    if (!p.exp || p.exp - ahora > ttl / 2 || ahora - ini >= SESION_MAXIMA_S) return;
    const res = ctx.switchToHttp().getResponse();
    if (typeof res?.cookie !== 'function' || res.headersSent) return;
    const nuevo = await this.jwt.signAsync({ sub: p.sub, empresaId: p.empresaId, rol: p.rol, tipo: p.tipo, rolEmpresa: p.rolEmpresa, ini }, { expiresIn: Math.min(ttl, SESION_MAXIMA_S - (ahora - ini)) });
    res.cookie(COOKIE_NAME, nuevo, opcionesCookie());
  }
}
