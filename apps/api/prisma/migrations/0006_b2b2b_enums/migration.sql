-- Pivote B2B2B: roles de cuenta y estados del ciclo de acopio.
-- Va en una migración aparte porque un valor nuevo de un enum no puede usarse en la misma transacción que lo crea.

ALTER TYPE "RolEmpresa" ADD VALUE IF NOT EXISTS 'GENERADOR';
ALTER TYPE "RolEmpresa" ADD VALUE IF NOT EXISTS 'INTERMEDIARIO';

-- Ciclo de un lote reportado por un proveedor: reportado → cotizado → acopiado → despachado (o rechazado).
ALTER TYPE "EstadoLote" ADD VALUE IF NOT EXISTS 'REPORTADO';
ALTER TYPE "EstadoLote" ADD VALUE IF NOT EXISTS 'COTIZADO';
ALTER TYPE "EstadoLote" ADD VALUE IF NOT EXISTS 'ACOPIADO';
ALTER TYPE "EstadoLote" ADD VALUE IF NOT EXISTS 'DESPACHADO';
ALTER TYPE "EstadoLote" ADD VALUE IF NOT EXISTS 'RECHAZADO';
