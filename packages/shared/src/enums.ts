/**
 * Rol de la cuenta. En el modelo B2B2B (Swapit hoy): INTERMEDIARIO es el cliente que se suscribe y paga y
 * GENERADOR es un proveedor de su red, dado de alta por él. OFERTANTE/RECEPTOR/AMBOS son del modo MARKETPLACE.
 */
export const RolEmpresa = ['OFERTANTE', 'RECEPTOR', 'AMBOS', 'GENERADOR', 'INTERMEDIARIO'] as const;
export type RolEmpresa = (typeof RolEmpresa)[number];

export const Modalidad = ['VENTA', 'DONACION', 'CREDITOS', 'INTERCAMBIO'] as const;
export type Modalidad = (typeof Modalidad)[number];

export const EstadoKyb = ['PENDIENTE', 'VERIFICADA', 'RECHAZADA', 'NO_APLICA'] as const;
export type EstadoKyb = (typeof EstadoKyb)[number];

export const EstadoLote = ['BORRADOR', 'PUBLICADO', 'RESERVADO', 'CERRADO', 'RETIRADO', 'REPORTADO', 'COTIZADO', 'ACOPIADO', 'DESPACHADO', 'RECHAZADO', 'PAUSADO'] as const;
export type EstadoLote = (typeof EstadoLote)[number];

export const FrecuenciaLote = ['UNICO', 'RECURRENTE', 'ESTACIONAL'] as const;
export type FrecuenciaLote = (typeof FrecuenciaLote)[number];

/** Tipo de cuenta: una persona natural (sin RUC ni KYB) o una empresa (RUC, rubro y KYB). */
export const TipoCuenta = ['EMPRESA', 'PERSONA'] as const;
export type TipoCuenta = (typeof TipoCuenta)[number];

/** Unidad en que se cuenta un lote. Las personas publican en unidades; las empresas suelen usar toneladas. */
export const UnidadLote = ['ton', 'kg', 'und'] as const;
export type UnidadLote = (typeof UnidadLote)[number];

/** Estado en que está un artículo (aplica sobre todo a lo que publican las personas). */
export const CondicionLote = ['NUEVO', 'COMO_NUEVO', 'BUEN_ESTADO', 'USO_VISIBLE', 'PARA_REPARAR'] as const;
export type CondicionLote = (typeof CondicionLote)[number];
export const ETIQUETA_CONDICION: Record<CondicionLote, string> = {
  NUEVO: 'Nuevo',
  COMO_NUEVO: 'Como nuevo',
  BUEN_ESTADO: 'Buen estado',
  USO_VISIBLE: 'Con señales de uso',
  PARA_REPARAR: 'Para reparar o repuestos',
};

/** Cómo llega el artículo a quien lo recibe. */
export const EntregaLote = ['RECOJO_RECEPTOR', 'PUNTO_ENCUENTRO', 'ENVIO_OFERTANTE'] as const;
export type EntregaLote = (typeof EntregaLote)[number];
export const ETIQUETA_ENTREGA: Record<EntregaLote, string> = {
  RECOJO_RECEPTOR: 'Lo recoge quien lo recibe',
  PUNTO_ENCUENTRO: 'Nos encontramos en un punto público',
  ENVIO_OFERTANTE: 'Yo lo llevo o lo envío',
};

/** Cómo llegó un reporte de material a la red del intermediario. */
export const ReportadoVia = ['PORTAL', 'WHATSAPP', 'INTERMEDIARIO'] as const;
export type ReportadoVia = (typeof ReportadoVia)[number];

/** Dónde cae un precio frente al rango de referencia del benchmark. */
export const PosicionPrecio = ['DEBAJO', 'DENTRO', 'ENCIMA'] as const;
export type PosicionPrecio = (typeof PosicionPrecio)[number];
