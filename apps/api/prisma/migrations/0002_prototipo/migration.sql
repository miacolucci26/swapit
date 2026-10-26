-- Crédito recibido por el ofertante cuando el receptor paga con créditos circulares
ALTER TYPE "TipoCredito" ADD VALUE 'GANADO_CANJE';

-- Responsable de recojo acordado en la negociación
ALTER TABLE "Transaccion" ADD COLUMN "responsableRecojo" TEXT;
