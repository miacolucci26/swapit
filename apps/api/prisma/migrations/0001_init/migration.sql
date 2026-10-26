-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "RolEmpresa" AS ENUM ('OFERTANTE', 'RECEPTOR', 'AMBOS');

-- CreateEnum
CREATE TYPE "EstadoKyb" AS ENUM ('PENDIENTE', 'VERIFICADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('EMPRESA', 'ADMIN');

-- CreateEnum
CREATE TYPE "Modalidad" AS ENUM ('VENTA', 'DONACION', 'CREDITOS');

-- CreateEnum
CREATE TYPE "EstadoLote" AS ENUM ('BORRADOR', 'PUBLICADO', 'RESERVADO', 'CERRADO', 'RETIRADO');

-- CreateEnum
CREATE TYPE "FrecuenciaLote" AS ENUM ('UNICO', 'RECURRENTE', 'ESTACIONAL');

-- CreateEnum
CREATE TYPE "EstadoTransaccion" AS ENUM ('SOLICITADO', 'EN_NEGOCIACION', 'ACORDADO', 'PAGO_RETENIDO', 'RECOJO_CONFIRMADO', 'ENTREGADO', 'CALIFICADO', 'CERRADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "PagoEstado" AS ENUM ('NO_APLICA', 'PENDIENTE', 'RETENIDO', 'LIBERADO', 'REEMBOLSADO');

-- CreateEnum
CREATE TYPE "TipoCredito" AS ENUM ('GANADO_DONACION', 'GASTADO_COMISION', 'GASTADO_CANJE', 'CANJE_BENEFICIO', 'AJUSTE');

-- CreateEnum
CREATE TYPE "EstadoIncidencia" AS ENUM ('ABIERTA', 'EN_REVISION', 'RESUELTA');

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "ciiu" TEXT,
    "rol" "RolEmpresa" NOT NULL,
    "direccion" TEXT NOT NULL,
    "ubicacion" geography(Point,4326),
    "estadoKyb" "EstadoKyb" NOT NULL DEFAULT 'PENDIENTE',
    "representanteLegal" TEXT NOT NULL,
    "badgeCircular" BOOLEAN NOT NULL DEFAULT false,
    "ratingProm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nTransacciones" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'EMPRESA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmpresaCertificacion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "archivoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmpresaCertificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoriaResiduo" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigoLer" TEXT,
    "sector" TEXT NOT NULL,
    "usoTipico" TEXT,
    "factorCo2PorTon" DOUBLE PRECISION NOT NULL,
    "factorCreditosPorTon" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CategoriaResiduo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lote" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "keywords" TEXT[],
    "cantidad" DOUBLE PRECISION NOT NULL,
    "unidad" TEXT NOT NULL DEFAULT 'ton',
    "cantidadDisponible" DOUBLE PRECISION NOT NULL,
    "modalidad" "Modalidad" NOT NULL,
    "precioReferencia" DOUBLE PRECISION,
    "precio" DOUBLE PRECISION,
    "aceptaCreditos" BOOLEAN NOT NULL DEFAULT false,
    "frecuencia" "FrecuenciaLote" NOT NULL DEFAULT 'UNICO',
    "ubicacion" geography(Point,4326),
    "embedding" vector(1536),
    "iaSugerencia" JSONB,
    "estado" "EstadoLote" NOT NULL DEFAULT 'BORRADOR',
    "destacadoHasta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoteImagen" (
    "id" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LoteImagen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaccion" (
    "id" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "ofertanteId" TEXT NOT NULL,
    "receptorId" TEXT NOT NULL,
    "modalidad" "Modalidad" NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precioAcordado" DOUBLE PRECISION,
    "comision" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "distanciaKm" DOUBLE PRECISION,
    "fleteEstimado" DOUBLE PRECISION,
    "estado" "EstadoTransaccion" NOT NULL DEFAULT 'SOLICITADO',
    "pagoEstado" "PagoEstado" NOT NULL DEFAULT 'NO_APLICA',
    "contratoJson" JSONB,
    "fechaRecojo" TIMESTAMP(3),
    "firmaOfertanteAt" TIMESTAMP(3),
    "firmaReceptorAt" TIMESTAMP(3),
    "fotoEntregaUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MensajeChat" (
    "id" TEXT NOT NULL,
    "transaccionId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MensajeChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditoMovimiento" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "transaccionId" TEXT,
    "tipo" "TipoCredito" NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "descripcion" TEXT,
    "claveIdempotencia" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditoMovimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificado" (
    "id" TEXT NOT NULL,
    "transaccionId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "hashSha256" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "usoFinalDeclarado" TEXT NOT NULL,
    "ton" DOUBLE PRECISION NOT NULL,
    "co2Evitado" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Calificacion" (
    "id" TEXT NOT NULL,
    "transaccionId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "destinatarioId" TEXT NOT NULL,
    "estrellas" INTEGER NOT NULL,
    "comentario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Calificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertaBusqueda" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "categoriaId" TEXT,
    "centro" geography(Point,4326),
    "radioKm" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "embedding" vector(1536),
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertaBusqueda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "alertaId" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "explicacion" TEXT,
    "notificado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incidencia" (
    "id" TEXT NOT NULL,
    "transaccionId" TEXT NOT NULL,
    "reportadaPor" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "detalle" TEXT NOT NULL,
    "estado" "EstadoIncidencia" NOT NULL DEFAULT 'ABIERTA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Incidencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigPlataforma" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "comisionVentaPct" DOUBLE PRECISION NOT NULL DEFAULT 6,
    "feeDonacion" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "tarifaFleteKmTon" DOUBLE PRECISION NOT NULL DEFAULT 0.6,

    CONSTRAINT "ConfigPlataforma_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_ruc_key" ON "Empresa"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaResiduo_codigo_key" ON "CategoriaResiduo"("codigo");

-- CreateIndex
CREATE INDEX "Lote_estado_categoriaId_idx" ON "Lote"("estado", "categoriaId");

-- CreateIndex
CREATE INDEX "Transaccion_estado_idx" ON "Transaccion"("estado");

-- CreateIndex
CREATE INDEX "MensajeChat_transaccionId_createdAt_idx" ON "MensajeChat"("transaccionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreditoMovimiento_claveIdempotencia_key" ON "CreditoMovimiento"("claveIdempotencia");

-- CreateIndex
CREATE INDEX "CreditoMovimiento_empresaId_createdAt_idx" ON "CreditoMovimiento"("empresaId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Certificado_transaccionId_key" ON "Certificado"("transaccionId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificado_codigo_key" ON "Certificado"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Calificacion_transaccionId_autorId_key" ON "Calificacion"("transaccionId", "autorId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_alertaId_loteId_key" ON "Match"("alertaId", "loteId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmpresaCertificacion" ADD CONSTRAINT "EmpresaCertificacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaResiduo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoteImagen" ADD CONSTRAINT "LoteImagen_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaccion" ADD CONSTRAINT "Transaccion_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaccion" ADD CONSTRAINT "Transaccion_ofertanteId_fkey" FOREIGN KEY ("ofertanteId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaccion" ADD CONSTRAINT "Transaccion_receptorId_fkey" FOREIGN KEY ("receptorId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensajeChat" ADD CONSTRAINT "MensajeChat_transaccionId_fkey" FOREIGN KEY ("transaccionId") REFERENCES "Transaccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensajeChat" ADD CONSTRAINT "MensajeChat_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditoMovimiento" ADD CONSTRAINT "CreditoMovimiento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditoMovimiento" ADD CONSTRAINT "CreditoMovimiento_transaccionId_fkey" FOREIGN KEY ("transaccionId") REFERENCES "Transaccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificado" ADD CONSTRAINT "Certificado_transaccionId_fkey" FOREIGN KEY ("transaccionId") REFERENCES "Transaccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calificacion" ADD CONSTRAINT "Calificacion_transaccionId_fkey" FOREIGN KEY ("transaccionId") REFERENCES "Transaccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calificacion" ADD CONSTRAINT "Calificacion_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calificacion" ADD CONSTRAINT "Calificacion_destinatarioId_fkey" FOREIGN KEY ("destinatarioId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertaBusqueda" ADD CONSTRAINT "AlertaBusqueda_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertaBusqueda" ADD CONSTRAINT "AlertaBusqueda_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaResiduo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_alertaId_fkey" FOREIGN KEY ("alertaId") REFERENCES "AlertaBusqueda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incidencia" ADD CONSTRAINT "Incidencia_transaccionId_fkey" FOREIGN KEY ("transaccionId") REFERENCES "Transaccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incidencia" ADD CONSTRAINT "Incidencia_reportadaPor_fkey" FOREIGN KEY ("reportadaPor") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

