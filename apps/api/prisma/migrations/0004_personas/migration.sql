-- Personas naturales como segundo tipo de cuenta (sin RUC ni KYB), en el mismo catálogo que las empresas.
CREATE TYPE "TipoCuenta" AS ENUM ('EMPRESA', 'PERSONA');
ALTER TYPE "EstadoKyb" ADD VALUE 'NO_APLICA';

ALTER TABLE "Empresa" ADD COLUMN "tipo" "TipoCuenta" NOT NULL DEFAULT 'EMPRESA';
ALTER TABLE "Empresa" ALTER COLUMN "ruc" DROP NOT NULL;
ALTER TABLE "Empresa" ALTER COLUMN "representanteLegal" DROP NOT NULL;

-- Coherencia por tipo: una empresa exige RUC y representante; una persona no tiene RUC.
ALTER TABLE "Empresa" ADD CONSTRAINT "Empresa_tipo_check" CHECK (
  ("tipo" = 'EMPRESA' AND "ruc" IS NOT NULL AND "representanteLegal" IS NOT NULL)
  OR ("tipo" = 'PERSONA' AND "ruc" IS NULL)
);

-- Unidades de medida por categoría (las personas publican en unidades, las empresas en toneladas).
ALTER TABLE "CategoriaResiduo" ADD COLUMN "unidadBase" TEXT NOT NULL DEFAULT 'ton';
ALTER TABLE "CategoriaResiduo" ADD COLUMN "kgPorUnidad" DOUBLE PRECISION;
