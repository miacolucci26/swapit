-- Modos comprador y vendedor (docs/diseno/estructura-web.md): un producto se puede pausar sin borrarlo
-- y el vendedor guarda el nombre de su tienda y cómo cobra.
-- Idempotente: la API también la aplica sola al arrancar si falta (src/prisma/prisma.service.ts).

ALTER TYPE "EstadoLote" ADD VALUE IF NOT EXISTS 'PAUSADO';

ALTER TABLE "Empresa" ADD COLUMN IF NOT EXISTS "nombreTienda" TEXT;
ALTER TABLE "Empresa" ADD COLUMN IF NOT EXISTS "cobroMetodo" TEXT;
ALTER TABLE "Empresa" ADD COLUMN IF NOT EXISTS "cobroCuenta" TEXT;
