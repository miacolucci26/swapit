-- Confidencialidad opcional de la empresa, condición del artículo y forma de entrega.
-- Motivo: en las entrevistas las empresas dudan en exponer su nombre y sus residuos, y las familias
-- necesitan saber en qué estado está lo que reciben y dónde se entrega.

CREATE TYPE "CondicionLote" AS ENUM ('NUEVO', 'COMO_NUEVO', 'BUEN_ESTADO', 'USO_VISIBLE', 'PARA_REPARAR');
CREATE TYPE "EntregaLote" AS ENUM ('RECOJO_RECEPTOR', 'PUNTO_ENCUENTRO', 'ENVIO_OFERTANTE');

ALTER TABLE "Lote" ADD COLUMN "condicion" "CondicionLote";
ALTER TABLE "Lote" ADD COLUMN "entrega" "EntregaLote" NOT NULL DEFAULT 'RECOJO_RECEPTOR';

-- Una empresa «confidencial» se muestra como «Empresa confidencial · sector», con ubicación aproximada,
-- hasta que el ofertante responde una solicitud (la transacción pasa a negociación).
ALTER TABLE "Empresa" ADD COLUMN "confidencial" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Transaccion" ADD COLUMN "identidadRevelada" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Transaccion" SET "identidadRevelada" = true WHERE "estado" <> 'SOLICITADO';
