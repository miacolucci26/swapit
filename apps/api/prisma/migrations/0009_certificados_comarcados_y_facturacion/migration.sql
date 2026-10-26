-- Certificados emitidos por el intermediario (co-marcados) y cobro SaaS (suscripción mensual + fee por certificado).

-- Un certificado B2B2B nace de un lote despachado, no de una transacción P2P: transaccionId pasa a ser opcional.
ALTER TABLE "Certificado" ALTER COLUMN "transaccionId" DROP NOT NULL;
ALTER TABLE "Certificado" ADD COLUMN "intermediarioId" TEXT;
ALTER TABLE "Certificado" ADD COLUMN "loteId" TEXT;
ALTER TABLE "Certificado" ADD COLUMN "generadorId" TEXT;
ALTER TABLE "Certificado" ADD COLUMN "clienteNombre" TEXT;
ALTER TABLE "Certificado" ADD COLUMN "clienteRuc" TEXT;
ALTER TABLE "Certificado" ADD COLUMN "cantidad" DOUBLE PRECISION;
ALTER TABLE "Certificado" ADD COLUMN "unidad" TEXT;
CREATE UNIQUE INDEX "Certificado_loteId_key" ON "Certificado"("loteId");
CREATE INDEX "Certificado_intermediarioId_idx" ON "Certificado"("intermediarioId");
ALTER TABLE "Certificado" ADD CONSTRAINT "Certificado_intermediarioId_fkey" FOREIGN KEY ("intermediarioId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Certificado" ADD CONSTRAINT "Certificado_generadorId_fkey" FOREIGN KEY ("generadorId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Certificado" ADD CONSTRAINT "Certificado_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- Todo certificado nace de una transacción (modo marketplace) o de un lote despachado (B2B2B).
ALTER TABLE "Certificado" ADD CONSTRAINT "Certificado_origen_check" CHECK ("transaccionId" IS NOT NULL OR "loteId" IS NOT NULL);

CREATE TABLE "Suscripcion" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "plan" TEXT NOT NULL,
  "estado" TEXT NOT NULL,
  "montoMensual" DOUBLE PRECISION NOT NULL,
  "periodoInicio" TIMESTAMP(3) NOT NULL,
  "periodoFin" TIMESTAMP(3) NOT NULL,
  "referenciaPago" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Suscripcion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Suscripcion_estado_check" CHECK ("estado" IN ('ACTIVA', 'CANCELADA'))
);
CREATE INDEX "Suscripcion_empresaId_idx" ON "Suscripcion"("empresaId");
-- A lo sumo una suscripción activa por intermediario.
CREATE UNIQUE INDEX "Suscripcion_una_activa_key" ON "Suscripcion"("empresaId") WHERE "estado" = 'ACTIVA';
ALTER TABLE "Suscripcion" ADD CONSTRAINT "Suscripcion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CobroFee" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "concepto" TEXT NOT NULL,
  "certificadoId" TEXT,
  "monto" DOUBLE PRECISION NOT NULL,
  "estado" TEXT NOT NULL,
  "referenciaPago" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CobroFee_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CobroFee_estado_check" CHECK ("estado" IN ('PENDIENTE', 'COBRADO', 'FALLIDO'))
);
CREATE UNIQUE INDEX "CobroFee_certificadoId_key" ON "CobroFee"("certificadoId");
CREATE INDEX "CobroFee_empresaId_createdAt_idx" ON "CobroFee"("empresaId", "createdAt");
ALTER TABLE "CobroFee" ADD CONSTRAINT "CobroFee_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CobroFee" ADD CONSTRAINT "CobroFee_certificadoId_fkey" FOREIGN KEY ("certificadoId") REFERENCES "Certificado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Precios del SaaS: PLACEHOLDERS editables (decisión comercial pendiente).
ALTER TABLE "ConfigPlataforma" ADD COLUMN "feeCertificado" DOUBLE PRECISION NOT NULL DEFAULT 5;
ALTER TABLE "ConfigPlataforma" ADD COLUMN "precioPlanMensual" DOUBLE PRECISION NOT NULL DEFAULT 199;
