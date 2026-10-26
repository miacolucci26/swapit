-- Pivote B2B2B: el intermediario es la cuenta que paga; sus proveedores (generadores) son cuentas «Empresa»
-- que él da de alta y gestiona. Cada lote lo reporta un proveedor y pertenece a la red de su intermediario.

ALTER TABLE "Empresa" ADD COLUMN "intermediarioId" TEXT;
ALTER TABLE "Empresa" ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;
-- Enlace secreto del portal de captación: el proveedor reporta material sin tener usuario ni contraseña.
ALTER TABLE "Empresa" ADD COLUMN "tokenCaptacion" TEXT;
ALTER TABLE "Empresa" ADD COLUMN "contactoNombre" TEXT;
ALTER TABLE "Empresa" ADD COLUMN "telefono" TEXT;
ALTER TABLE "Empresa" ADD COLUMN "contactoEmail" TEXT;
ALTER TABLE "Empresa" ADD COLUMN "notasInternas" TEXT;
-- Marca del intermediario para co-marcar sus certificados.
ALTER TABLE "Empresa" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "Empresa" ADD COLUMN "colorMarca" TEXT;

CREATE UNIQUE INDEX "Empresa_tokenCaptacion_key" ON "Empresa"("tokenCaptacion");
CREATE INDEX "Empresa_intermediarioId_idx" ON "Empresa"("intermediarioId");
ALTER TABLE "Empresa" ADD CONSTRAINT "Empresa_intermediarioId_fkey" FOREIGN KEY ("intermediarioId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Coherencia por tipo y rol: una persona no tiene RUC; un generador (proveedor) puede ser informal pero debe
-- pertenecer a un intermediario; el resto de las empresas exige RUC y representante.
ALTER TABLE "Empresa" DROP CONSTRAINT "Empresa_tipo_check";
ALTER TABLE "Empresa" ADD CONSTRAINT "Empresa_tipo_check" CHECK (
  ("tipo" = 'PERSONA' AND "ruc" IS NULL)
  OR ("tipo" = 'EMPRESA' AND "rol" = 'GENERADOR' AND "intermediarioId" IS NOT NULL)
  OR ("tipo" = 'EMPRESA' AND "rol" <> 'GENERADOR' AND "ruc" IS NOT NULL AND "representanteLegal" IS NOT NULL)
);

-- Material reportado: lo que pide el proveedor, lo que ofrece el intermediario, lo que finalmente se pagó.
ALTER TABLE "Lote" ADD COLUMN "precioEsperado" DOUBLE PRECISION;
ALTER TABLE "Lote" ADD COLUMN "precioOfrecido" DOUBLE PRECISION;
ALTER TABLE "Lote" ADD COLUMN "precioFinal" DOUBLE PRECISION;
ALTER TABLE "Lote" ADD COLUMN "cantidadAcopiada" DOUBLE PRECISION;
-- Dónde cae un precio frente al rango de referencia: DEBAJO | DENTRO | ENCIMA.
ALTER TABLE "Lote" ADD COLUMN "posicionPrecio" TEXT;
ALTER TABLE "Lote" ADD COLUMN "reportadoVia" TEXT;
ALTER TABLE "Lote" ADD COLUMN "clienteDestino" TEXT;
ALTER TABLE "Lote" ADD COLUMN "clienteDestinoRuc" TEXT;
ALTER TABLE "Lote" ADD COLUMN "acopiadoAt" TIMESTAMP(3);
ALTER TABLE "Lote" ADD COLUMN "despachadoAt" TIMESTAMP(3);

-- Las categorías se agrupan en familias (p. ej. PLASTICO_PET y PLASTICO_PEAD son de la familia PLASTICO).
ALTER TABLE "CategoriaResiduo" ADD COLUMN "familia" TEXT;
