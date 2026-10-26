-- Benchmark de precios por subtipo de material.
-- Cada observación es un precio real o de ejemplo (por tonelada) de una categoría, con su volumen, fecha y ubicación;
-- se compara con un lote por similitud (pgvector), distancia (PostGIS), volumen y recencia.

-- Un intermediario decide si sus observaciones alimentan el pool compartido (anónimo). Por defecto NO.
ALTER TABLE "Empresa" ADD COLUMN "compartirPrecios" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "PrecioObservado" (
  "id" TEXT NOT NULL,
  "categoriaId" TEXT NOT NULL,
  "precioPorTon" DOUBLE PRECISION NOT NULL,
  "cantidadTon" DOUBLE PRECISION NOT NULL,
  "fecha" TIMESTAMP(3) NOT NULL,
  -- SEMILLA = dato de ejemplo (sintético) · ACOPIO = compra registrada en Swapit · CSV = importada por el intermediario
  "fuente" TEXT NOT NULL,
  "intermediarioId" TEXT,
  "descripcion" TEXT,
  "ubicacion" geography(Point,4326),
  "embedding" vector(1536),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PrecioObservado_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PrecioObservado_fuente_check" CHECK ("fuente" IN ('SEMILLA', 'ACOPIO', 'CSV')),
  CONSTRAINT "PrecioObservado_precio_check" CHECK ("precioPorTon" > 0 AND "cantidadTon" > 0)
);

CREATE INDEX "PrecioObservado_categoriaId_idx" ON "PrecioObservado"("categoriaId");
CREATE INDEX "PrecioObservado_intermediarioId_idx" ON "PrecioObservado"("intermediarioId");
ALTER TABLE "PrecioObservado" ADD CONSTRAINT "PrecioObservado_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaResiduo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrecioObservado" ADD CONSTRAINT "PrecioObservado_intermediarioId_fkey" FOREIGN KEY ("intermediarioId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
