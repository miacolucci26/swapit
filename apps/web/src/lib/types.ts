export interface Lote {
  id: string;
  titulo: string;
  descripcion: string;
  keywords: string[];
  cantidad: number;
  cantidadDisponible: number;
  unidad: "ton" | "kg" | "und";
  modalidad: "VENTA" | "DONACION" | "CREDITOS" | "INTERCAMBIO";
  precio: number | null;
  precioReferencia: number | null;
  notaIntercambio?: string | null;
  condicion?: "NUEVO" | "COMO_NUEVO" | "BUEN_ESTADO" | "USO_VISIBLE" | "PARA_REPARAR" | null;
  entrega?: "RECOJO_RECEPTOR" | "PUNTO_ENCUENTRO" | "ENVIO_OFERTANTE";
  /** La empresa publicadora es confidencial y aún no respondió: se muestra solo su sector. */
  identidadOculta?: boolean;
  aceptaCreditos: boolean;
  frecuencia: string;
  estado: string;
  categoriaCodigo: string;
  categoriaNombre: string;
  sector: string;
  kgPorUnidad?: number | null;
  empresaId: string;
  tipoPublicador: "EMPRESA" | "PERSONA";
  razonSocial: string;
  ratingProm: number;
  nTransacciones: number;
  estadoKyb: string;
  badgeCircular: boolean;
  distanciaKm: number | null;
  fleteEstimado: number | null;
  destacado: boolean;
  esMio: boolean;
  imagenes: string[];
  ubicacion: { lat: number; lng: number } | null;
  createdAt: string;
  iaSugerencia?: { modo?: string; confianza?: number } | null;
  transaccionActiva?: { id: string; estado: string } | null;
  certificacionesEmpresa?: string[];
}

export interface Categoria {
  id: string;
  codigo: string;
  nombre: string;
  sector: string;
  usoTipico: string | null;
  unidadBase: "ton" | "kg" | "und";
  kgPorUnidad: number | null;
}

/** Etapa simple de un acuerdo (la API la manda como `etapa`; si falta se deduce del estado interno). */
export type EtapaAcuerdo = "PROPUESTA" | "ACEPTADA" | "CERRADA" | "CANCELADA";

export interface TransaccionItem {
  id: string;
  estado: string;
  etiquetaEstado: string;
  /** Opcional: versiones antiguas de la API no la envían. */
  etapa?: EtapaAcuerdo;
  etiquetaEtapa?: string;
  modalidad: string;
  cantidad: number;
  total: number;
  /** Precio unitario ofertado o acordado (null en donación/intercambio). */
  precioUnitario?: number | null;
  rol: "OFERTANTE" | "RECEPTOR";
  lote: { id: string; titulo: string; categoria: string; unidad: string; categoriaCodigo?: string; imagen?: string | null };
  contraparte: { id: string; razonSocial: string; tipo: "EMPRESA" | "PERSONA"; demo?: boolean };
  certificado: string | null;
  pendiente: string;
  requiereMiAccion: boolean;
  updatedAt: string;
}

/** Contacto de la contraparte: la API solo lo envía cuando el acuerdo ya fue aceptado (ACORDADO o posterior). */
export interface ContactoContraparte {
  nombre: string | null;
  telefono: string | null;
  whatsappUrl: string | null;
  mensajeSugerido?: string;
}

// ---------- Swapit para intermediarios (B2B2B) ----------

export type PosicionPrecio = "DEBAJO" | "DENTRO" | "ENCIMA";
export type EstadoMaterial = "REPORTADO" | "COTIZADO" | "ACOPIADO" | "DESPACHADO" | "RECHAZADO";
export type Unidad = "ton" | "kg" | "und";

export interface Rango { p25: number; p50: number; p75: number }

export interface Estimacion {
  categoria: { codigo: string; nombre: string; familia: string | null };
  unidad: Unidad;
  cantidadTon: number;
  rango: Rango | null;
  rangoPorTon: Rango | null;
  n: number;
  confianza: "ALTA" | "MEDIA" | "BAJA" | "NINGUNA";
  rangoOrientativo: boolean;
  esSemilla: boolean;
  nota: string;
  comparables: { fecha: string; precio: number; cantidadTon: number; fuente: "SEMILLA" | "ACOPIO" | "CSV"; categoriaCodigo: string; score: number; distanciaKm: number | null }[];
}

export interface Material {
  id: string;
  titulo: string;
  descripcion: string;
  cantidad: number;
  unidad: Unidad;
  estado: EstadoMaterial;
  etiquetaEstado: string;
  precioEsperado: number | null;
  precioOfrecido: number | null;
  precioFinal: number | null;
  cantidadAcopiada: number | null;
  posicionPrecio: PosicionPrecio | null;
  reportadoVia: "PORTAL" | "WHATSAPP" | "INTERMEDIARIO" | null;
  clienteDestino: string | null;
  clienteDestinoRuc: string | null;
  acopiadoAt: string | null;
  despachadoAt: string | null;
  createdAt: string;
  iaSugerencia?: { modo?: string; confianza?: number; requiereRevision?: boolean } | null;
  categoriaCodigo: string;
  categoriaNombre: string;
  familia: string | null;
  proveedorId: string;
  proveedor: string;
  telefono: string | null;
  contactoNombre: string | null;
  ubicacion: { lat: number; lng: number } | null;
  imagenes: string[];
  certificado: string | null;
  /** Residuo de la base de cadenas (id) y cómo viene el material. */
  residuoRef?: string | null;
  presentacion?: string | null;
  destinoId?: string | null;
  destinoNombre?: string | null;
  acuerdoId?: string | null;
  sector?: string | null;
  tipoActor?: string | null;
  benchmark?: Estimacion | null;
  veredictos?: { esperado: PosicionPrecio | null; ofrecido: PosicionPrecio | null } | null;
}

export interface Proveedor {
  id: string;
  razonSocial: string;
  ruc: string | null;
  ciiu: string | null;
  direccion: string;
  contactoNombre: string | null;
  telefono: string | null;
  contactoEmail: string | null;
  notasInternas: string | null;
  sector?: string | null;
  tipoActor?: string | null;
  activo: boolean;
  tokenCaptacion: string | null;
  createdAt: string;
  ubicacion: { lat: number; lng: number } | null;
  lotes: number;
  pendientes: number;
  ultimoReporte: string | null;
}

export interface ResumenIntermediario {
  proveedoresActivos: number;
  destinosActivos?: number;
  acuerdosVigentes?: number;
  /** Primeros pasos: cada uno es verdadero cuando ya se hizo al menos una vez. */
  inicio?: { proveedor: boolean; reporte: boolean; cotizacion: boolean; acopio: boolean; destino: boolean; certificado: boolean };
  porEstado: Record<EstadoMaterial, number>;
  pendientes: number;
  porDespachar: number;
  acopiadoMesTon: number;
  pagadoMes: number;
  certificadosMes: number;
  semaforo: Record<PosicionPrecio, number>;
  pctPrecioJusto: number | null;
  suscripcionActiva: boolean;
  vigenteHasta: string | null;
  porCategoria: { nombre: string; toneladas: number }[];
  ultimos: { id: string; titulo: string; proveedor: string; estado: EstadoMaterial; etiquetaEstado: string; fecha: string; reportadoVia: string | null }[];
}

/** Destino del directorio del intermediario (a quién entrega o vende). */
export interface Destino {
  id: string;
  nombre: string;
  tipo: string;
  materiales: string | null;
  zona: string | null;
  contactoNombre: string | null;
  telefono: string | null;
  notas: string | null;
  activo: boolean;
  despachos: number;
  ultimoDespacho: string | null;
}

/** Tipos de comprador de un residuo, con los destinos del directorio que lo reciben. */
export interface DestinosSugeridos {
  residuo: { id: string; nombre: string };
  tipos: { destino: string; nombre: string; usos: string[]; destinos: { id: string; nombre: string; zona: string | null; telefono: string | null }[] }[];
}

export type EstadoAcuerdo = "VIGENTE" | "CUMPLIDO" | "CANCELADO";

/** Acuerdo de temporada: precio y fecha de recojo pactados antes de la campaña. */
export interface Acuerdo {
  id: string;
  descripcion: string;
  residuoRef: string | null;
  residuoNombre: string | null;
  cantidadEstimada: number;
  unidad: Unidad;
  precioPactado: number;
  fechaRecojo: string | null;
  estado: EstadoAcuerdo;
  notas: string | null;
  recogido: number;
  avance: number;
  proveedor: { id: string; razonSocial: string; telefono: string | null; contactoNombre: string | null };
  destino: { id: string; nombre: string; tipo: string } | null;
  recojos: { loteId: string; cantidad: number | null; precio: number | null; fecha: string | null }[];
}
