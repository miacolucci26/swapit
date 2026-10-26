-- Modalidad de intercambio directo (swap) entre empresas: sin dinero de por medio.
ALTER TYPE "Modalidad" ADD VALUE 'INTERCAMBIO';

-- Fee notional de coordinación para intercambios (mismo tratamiento que feeDonacion: informativo, no se cobra).
ALTER TABLE "ConfigPlataforma" ADD COLUMN "feeIntercambio" DOUBLE PRECISION NOT NULL DEFAULT 10;

-- Qué categorías/ítems aceptaría el publicador a cambio, cuando el lote se publica en modalidad INTERCAMBIO.
ALTER TABLE "Lote" ADD COLUMN "notaIntercambio" TEXT;

-- El lote que el receptor ofrece a cambio del lote solicitado (solo modalidad INTERCAMBIO).
ALTER TABLE "Transaccion" ADD COLUMN "loteIntercambioId" TEXT;
ALTER TABLE "Transaccion" ADD CONSTRAINT "Transaccion_loteIntercambioId_fkey" FOREIGN KEY ("loteIntercambioId") REFERENCES "Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
