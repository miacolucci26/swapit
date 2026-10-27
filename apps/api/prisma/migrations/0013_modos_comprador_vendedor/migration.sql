-- Modos comprador y vendedor (docs/diseno/estructura-web.md): un producto se puede pausar sin borrarlo
-- y el vendedor guarda el nombre de su tienda y cómo cobra.

ALTER TYPE "EstadoLote" ADD VALUE IF NOT EXISTS 'PAUSADO';

ALTER TABLE "Empresa" ADD COLUMN "nombreTienda" TEXT;
ALTER TABLE "Empresa" ADD COLUMN "cobroMetodo" TEXT;
ALTER TABLE "Empresa" ADD COLUMN "cobroCuenta" TEXT;
