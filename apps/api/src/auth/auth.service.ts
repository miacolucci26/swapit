import { BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { nombrePublico, type LoginInput, type RegistroInput } from '@swapit/shared';
import { datosTienda } from '../empresas/empresas.service';
import { anotar, excedido, olvidar, tope } from '../common/limite-tasa';
import { modo } from '../common/modo';
import { EmpresasService } from '../empresas/empresas.service';
import { PrismaService } from '../prisma/prisma.service';
import { PASSWORD_MIN, bcryptCosto } from './auth.config';
import type { JwtPayload } from './auth.guard';

const VENTANA_FALLOS_MS = 15 * 60_000;
const FALLOS_POR_CUENTA = 8;
const FALLOS_POR_IP = 25;
const MSG_BLOQUEO = 'Demasiados intentos fallidos. Espera unos minutos antes de volver a intentar.';
/** Contraseñas que nadie debería usar aunque cumplan la longitud. */
const COMUNES = new Set(['1234567890', '0123456789', 'contraseña', 'contrasena1', 'password12', 'password123', 'qwertyuiop', 'qwerty1234', 'abcdefghij', 'swapit1234', 'swapit12345', 'demo123456', 'admin12345', 'peru123456', 'iloveyou12']);

export const emailNormal = (e: string) => e.trim().toLowerCase();

/** Hash «señuelo» para gastar el mismo tiempo al comparar cuando el correo no existe (no se distingue por latencia). */
const senuelo = new Map<number, Promise<string>>();
const hashSenuelo = (costo: number) => {
  if (!senuelo.has(costo)) senuelo.set(costo, bcrypt.hash('señuelo-no-es-una-contraseña', costo));
  return senuelo.get(costo)!;
};

/** Política de contraseñas para cuentas nuevas. */
export function validarPassword(password: string, email: string, nombre?: string): string | null {
  if (password.length < PASSWORD_MIN) return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
  // bcrypt solo mira los primeros 72 bytes: más allá no aporta (y engaña).
  if (Buffer.byteLength(password, 'utf8') > 72) return 'La contraseña no puede superar los 72 bytes (unos 72 caracteres sin tildes).';
  if (new Set(password).size < 4) return 'La contraseña es demasiado repetitiva.';
  const bajo = password.toLowerCase();
  if (COMUNES.has(bajo)) return 'Esa contraseña es demasiado común. Elige otra.';
  const local = emailNormal(email).split('@')[0];
  if (local.length >= 4 && bajo.includes(local)) return 'La contraseña no debe contener tu correo.';
  if (nombre && nombre.trim().length >= 5 && bajo === nombre.trim().toLowerCase()) return 'La contraseña no debe ser tu nombre.';
  return null;
}

export const registroAbierto = () => !['false', '0', 'no'].includes((process.env.REGISTRO_ABIERTO ?? '').trim().toLowerCase());

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly empresas: EmpresasService,
  ) {}

  async registrar(input: RegistroInput) {
    if (!registroAbierto()) throw new ForbiddenException('El registro está cerrado por ahora. Escríbenos y creamos tu cuenta.');
    if (modo() === 'B2B2B') {
      // Solo se registran intermediarios: sus proveedores los da de alta el propio intermediario.
      if (input.tipo === 'PERSONA') throw new ForbiddenException('Swapit es una herramienta para intermediarios; las personas no se registran.');
      if (input.empresa.rol !== 'INTERMEDIARIO') throw new BadRequestException('Solo los intermediarios se registran. Tus proveedores los das de alta desde «Mi red».');
    }
    const email = emailNormal(input.usuario.email);
    const falla = validarPassword(input.usuario.password, email, input.usuario.nombre);
    if (falla) throw new BadRequestException({ message: 'Datos inválidos', errores: [{ campo: 'usuario.password', mensaje: falla }] });
    const [ruc, existente] = await Promise.all([
      input.tipo === 'EMPRESA' ? this.prisma.empresa.findUnique({ where: { ruc: input.empresa.ruc } }) : null,
      this.prisma.usuario.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } }),
    ]);
    if (ruc) throw new ConflictException('Ya existe una empresa con ese RUC');
    if (existente) throw new ConflictException('Ya existe un usuario con ese email');

    const passwordHash = await bcrypt.hash(input.usuario.password, bcryptCosto());
    const cuenta =
      input.tipo === 'EMPRESA'
        ? { tipo: 'EMPRESA' as const, ...input.empresa }
        : {
            tipo: 'PERSONA' as const,
            // Nombre visible para terceros: sin apellido completo. El nombre real queda solo en el usuario.
            razonSocial: nombrePublico(input.usuario.nombre),
            // Cada modo se activa solo si la persona se registra en él; sin modo (API anterior) quedan los dos.
            rol: input.modo === 'COMPRADOR' ? ('RECEPTOR' as const) : input.modo === 'VENDEDOR' ? ('OFERTANTE' as const) : ('AMBOS' as const),
            direccion: input.persona.direccion,
            estadoKyb: 'NO_APLICA' as const,
            ...(input.tienda ? datosTienda(input.tienda) : {}),
          };
    const usuario = await this.prisma.usuario.create({
      data: { email, nombre: input.usuario.nombre, passwordHash, empresa: { create: cuenta } },
    });
    const direccion = input.tipo === 'EMPRESA' ? input.empresa.direccion : input.persona.direccion;
    // Geocodificación y KYB son "best effort": si fallan, la cuenta igual queda creada.
    await this.empresas.ubicar(usuario.empresaId, direccion).catch(() => false);
    if (input.tipo === 'EMPRESA') await this.empresas.verificarKyb(usuario.empresaId).catch(() => undefined);
    return this.emitirSesion(usuario);
  }

  /**
   * Inicio de sesión. Mismo mensaje y mismo coste de CPU exista o no el correo; los fallos se cuentan por cuenta y por IP
   * (no cuentan los aciertos). `ip` es la dirección ya resuelta por Express (`trust proxy`).
   */
  async login(input: LoginInput, ip = 'desconocida') {
    const email = emailNormal(input.email);
    const kCuenta = `login:fallos:cuenta:${email}`;
    const kIp = `login:fallos:ip:${ip}`;
    if (excedido(kCuenta, tope(FALLOS_POR_CUENTA), VENTANA_FALLOS_MS) || excedido(kIp, tope(FALLOS_POR_IP), VENTANA_FALLOS_MS)) {
      throw new HttpException(MSG_BLOQUEO, HttpStatus.TOO_MANY_REQUESTS);
    }
    const usuario = await this.prisma.usuario.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    const costo = bcryptCosto();
    const ok = await bcrypt.compare(input.password.slice(0, 200), usuario?.passwordHash ?? (await hashSenuelo(costo)));
    if (!usuario || !ok) {
      anotar(kCuenta, VENTANA_FALLOS_MS);
      anotar(kIp, VENTANA_FALLOS_MS);
      throw new UnauthorizedException('Credenciales incorrectas');
    }
    olvidar(kCuenta);
    // Hashes antiguos (p. ej. el seed de demo, coste 10) se suben al coste vigente en el primer acceso correcto.
    if (bcrypt.getRounds(usuario.passwordHash) < costo) {
      await this.prisma.usuario.update({ where: { id: usuario.id }, data: { passwordHash: await bcrypt.hash(input.password, costo) } }).catch(() => undefined);
    }
    return this.emitirSesion(usuario);
  }

  async perfil(usuarioId: string) {
    const u = await this.prisma.usuario.findUnique({ where: { id: usuarioId }, include: { empresa: true } });
    // Token vigente de un usuario que ya no existe (borrado o base reiniciada): sesión inválida, no error 500.
    if (!u) throw new UnauthorizedException('Sesión inválida');
    return this.publico(u);
  }

  private async emitirSesion(u: { id: string; empresaId: string; rol: 'EMPRESA' | 'ADMIN' }) {
    const perfil = await this.perfil(u.id);
    const payload: JwtPayload = { sub: u.id, empresaId: u.empresaId, rol: u.rol, tipo: perfil.empresa.tipo, rolEmpresa: perfil.empresa.rol, ini: Math.floor(Date.now() / 1000) };
    const token = await this.jwt.signAsync(payload);
    return { token, usuario: perfil };
  }

  private publico(u: any) {
    // Nunca el hash. Del perfil propio tampoco salen los campos internos de la red (enlace de captación, notas del intermediario).
    const { passwordHash, empresa, ...usuario } = u;
    const { tokenCaptacion, notasInternas, ...empresaPublica } = empresa ?? {};
    // `modo` le dice a la web qué menú y qué pantallas mostrar.
    return { ...usuario, empresa: empresaPublica, modo: modo() };
  }
}
