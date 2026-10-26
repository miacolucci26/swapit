-- Clasificación de proveedores y material, directorio de destinos y acuerdos de temporada.

ALTER TABLE "Empresa" ADD COLUMN "sector" TEXT;
ALTER TABLE "Empresa" ADD COLUMN "tipoActor" TEXT;

CREATE TABLE "Destino" (
  "id" TEXT NOT NULL,
  "intermediarioId" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "materiales" TEXT,
  "zona" TEXT,
  "contactoNombre" TEXT,
  "telefono" TEXT,
  "notas" TEXT,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Destino_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Destino_intermediarioId_idx" ON "Destino"("intermediarioId");
ALTER TABLE "Destino" ADD CONSTRAINT "Destino_intermediarioId_fkey" FOREIGN KEY ("intermediarioId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Acuerdo" (
  "id" TEXT NOT NULL,
  "intermediarioId" TEXT NOT NULL,
  "proveedorId" TEXT NOT NULL,
  "destinoId" TEXT,
  "residuoRef" TEXT,
  "descripcion" TEXT NOT NULL,
  "cantidadEstimada" DOUBLE PRECISION NOT NULL,
  "unidad" TEXT NOT NULL DEFAULT 'kg',
  "precioPactado" DOUBLE PRECISION NOT NULL,
  "fechaRecojo" TIMESTAMP(3),
  "estado" TEXT NOT NULL DEFAULT 'VIGENTE',
  "notas" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Acuerdo_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Acuerdo_estado_check" CHECK ("estado" IN ('VIGENTE', 'CUMPLIDO', 'CANCELADO'))
);
CREATE INDEX "Acuerdo_intermediarioId_estado_idx" ON "Acuerdo"("intermediarioId", "estado");
ALTER TABLE "Acuerdo" ADD CONSTRAINT "Acuerdo_intermediarioId_fkey" FOREIGN KEY ("intermediarioId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Acuerdo" ADD CONSTRAINT "Acuerdo_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Acuerdo" ADD CONSTRAINT "Acuerdo_destinoId_fkey" FOREIGN KEY ("destinoId") REFERENCES "Destino"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Lote" ADD COLUMN "residuoRef" TEXT;
ALTER TABLE "Lote" ADD COLUMN "presentacion" TEXT;
ALTER TABLE "Lote" ADD COLUMN "destinoId" TEXT;
ALTER TABLE "Lote" ADD COLUMN "acuerdoId" TEXT;
CREATE INDEX "Lote_destinoId_idx" ON "Lote"("destinoId");
CREATE INDEX "Lote_acuerdoId_idx" ON "Lote"("acuerdoId");
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_destinoId_fkey" FOREIGN KEY ("destinoId") REFERENCES "Destino"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_acuerdoId_fkey" FOREIGN KEY ("acuerdoId") REFERENCES "Acuerdo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
