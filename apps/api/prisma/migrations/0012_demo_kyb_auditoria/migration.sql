-- Despliegue real: marca de cuentas demo, método de verificación (KYB) y auditoría simple de acciones de administración.

ALTER TABLE "Empresa" ADD COLUMN "esDemo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Empresa" ADD COLUMN "metodoKyb" TEXT;
ALTER TABLE "Empresa" ADD COLUMN "kybRevisadoAt" TIMESTAMP(3);

-- Las cuentas que ya existen y fueron verificadas lo fueron con el validador simulado.
UPDATE "Empresa" SET "metodoKyb" = 'SIMULADA' WHERE "estadoKyb"::text IN ('VERIFICADA', 'RECHAZADA');

CREATE TABLE "AuditoriaAdmin" (
  "id" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "accion" TEXT NOT NULL,
  "entidad" TEXT NOT NULL,
  "entidadId" TEXT NOT NULL,
  "detalle" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditoriaAdmin_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditoriaAdmin_entidad_entidadId_idx" ON "AuditoriaAdmin"("entidad", "entidadId");
