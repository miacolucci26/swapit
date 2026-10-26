/**
 * Primera carga de PRODUCCIÓN (sin datos de demostración). Es idempotente y no borra nada.
 *   1. Sincroniza el catálogo base (categorías de residuo y configuración de la plataforma).
 *   2. Crea la cuenta de administración (la que verifica empresas a mano), si no existe.
 * Las empresas reales NO se crean aquí: se registran ellas mismas en la web (eligen su propia contraseña) y quedan PENDIENTES
 * hasta que el administrador las verifica (PATCH /api/admin/empresas/:id/verificacion). Ver docs/despliegue.md.
 *
 *   ADMIN_EMAIL=… ADMIN_PASSWORD=… DATABASE_URL=… node dist/seed/primera-carga.js
 * La contraseña (mín. 12 caracteres) solo se lee del entorno; nunca se imprime ni se guarda en el repositorio.
 */
import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { sincronizarCatalogo } from './run-seed';

export interface ResultadoPrimeraCarga {
  categorias: number;
  adminCreado: boolean;
}

export async function primeraCarga(prisma: PrismaService, env: Record<string, string | undefined> = process.env): Promise<ResultadoPrimeraCarga> {
  const email = env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.ADMIN_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Define ADMIN_EMAIL con un correo válido.');
  if (!password || password.length < 12) throw new Error('Define ADMIN_PASSWORD con al menos 12 caracteres.');

  await sincronizarCatalogo(prisma);
  const categorias = await prisma.categoriaResiduo.count();

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    if (existente.rol !== 'ADMIN') throw new Error('Ese correo ya pertenece a un usuario que no es administrador; usa otro ADMIN_EMAIL.');
    return { categorias, adminCreado: false };
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.usuario.create({
    data: {
      email,
      nombre: env.ADMIN_NOMBRE?.trim() || 'Administración Swap It',
      passwordHash,
      rol: 'ADMIN',
      // El administrador necesita una cuenta de empresa para sesión; es una persona sin RUC ni KYB, no es una empresa de la red.
      empresa: { create: { tipo: 'PERSONA', razonSocial: 'Administración Swap It', rol: 'AMBOS', direccion: 'Piura, Perú', estadoKyb: 'NO_APLICA', esDemo: false } },
    },
  });
  return { categorias, adminCreado: true };
}

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  try {
    const r = await primeraCarga(prisma);
    console.log(`✓ Catálogo base listo (${r.categorias} categorías).`);
    console.log(r.adminCreado ? '✓ Cuenta de administración creada.' : '✓ La cuenta de administración ya existía (sin cambios).');
    console.log('Siguiente paso: las empresas reales se registran en la web y tú las verificas desde el panel de administración.');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
