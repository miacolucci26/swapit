import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { limitar } from '../common/limite-tasa';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Comprueba que el enlace de captación (`:token`) pertenezca a un proveedor activo ANTES de que se lea el cuerpo de la
 * petición. Los guards corren antes que los interceptores, así que una subida de archivo (multer) con un enlace falso se
 * rechaza sin guardar ni mantener en memoria ni un byte. Sin esto, cualquiera podía escribir archivos en el servidor
 * sin tener un enlace válido.
 */
@Injectable()
export class TokenCaptacionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    limitar(`captacion:guardia:${req.ip}`, 60, 60_000);
    const token = String(req.params?.token ?? '');
    const p = token.length >= 8 ? await this.prisma.empresa.findFirst({ where: { tokenCaptacion: token, rol: 'GENERADOR', activo: true, intermediarioId: { not: null } }, select: { id: true } }) : null;
    if (!p) throw new NotFoundException('Este enlace no es válido o ya no está vigente. Pídele uno nuevo a tu acopiador.');
    return true;
  }
}
