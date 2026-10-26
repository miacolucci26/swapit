import { z } from 'zod';
import { RolEmpresa } from './enums';
import { validarRuc } from './ruc';
import { CODIGOS_PRESENTACION, CODIGOS_SECTOR, CODIGOS_TIPO_ACTOR, CODIGOS_TIPO_DESTINO } from './sectores';

/** Nombre de un archivo ya subido (lo devolvió /uploads): sin rutas, sin barras, sin «..». Evita apuntar fuera de la carpeta de imágenes. */
export const nombreArchivoSchema = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/, 'Nombre de archivo inválido')
  .refine((n) => !n.includes('..'), 'Nombre de archivo inválido');

export const rucSchema = z.string().refine(validarRuc, 'RUC inválido (11 dígitos con dígito verificador correcto)');

/** Teléfono opcional de contacto, siempre guardado en E.164 (ej. +51987654321). Un celular peruano de 9 dígitos recibe +51. */
const telefonoContactoOpcional = z
  .string()
  .max(30)
  .transform((t) => normalizarTelefono(t))
  .refine((t) => /^\+\d{8,15}$/.test(t), 'Teléfono inválido (ej. 987654321 o +51987654321)')
  .optional();

const usuarioRegistroSchema = z.object({
  nombre: z.string().min(2).max(120),
  email: z.string().email(),
  // Mínimo 10 caracteres para cuentas nuevas (la política completa —sin contraseñas comunes ni el propio correo— la aplica la API).
  password: z.string().min(10, 'La contraseña debe tener al menos 10 caracteres').max(100),
});

export const registroEmpresaSchema = z.object({
  tipo: z.literal('EMPRESA'),
  empresa: z.object({
    ruc: rucSchema,
    razonSocial: z.string().min(3).max(200),
    ciiu: z.string().min(4).max(6).optional(),
    // En Swapit B2B2B quien se registra es un intermediario; los proveedores los da de alta él.
    rol: z.enum(RolEmpresa).default('INTERMEDIARIO'),
    direccion: z.string().min(5).max(250),
    representanteLegal: z.string().min(3).max(150),
    /** Contacto para coordinar tras el acuerdo (opcional). Solo lo ve la contraparte cuando la transacción está acordada. */
    contactoNombre: z.string().min(2).max(120).optional(),
    telefono: telefonoContactoOpcional,
  }),
  usuario: usuarioRegistroSchema,
});

/** Persona natural: sin RUC, rubro ni KYB. Solo necesita su ubicación (barrio y ciudad) para ver lo que hay cerca. */
export const registroPersonaSchema = z.object({
  tipo: z.literal('PERSONA'),
  persona: z.object({ direccion: z.string().min(5, 'Indica tu barrio y ciudad (ej. «Urb. San Eduardo, Piura»)').max(250) }),
  usuario: usuarioRegistroSchema.extend({
    nombre: z
      .string()
      .max(120)
      .refine((n) => n.trim().split(/\s+/).length >= 2, 'Escribe tu nombre y apellido'),
  }),
});

/** `tipo` es opcional por compatibilidad: sin él se asume EMPRESA (formato anterior de la API). */
export const registroSchema = z.preprocess(
  (v) => (v && typeof v === 'object' && !('tipo' in v) ? { ...(v as object), tipo: 'EMPRESA' } : v),
  z.discriminatedUnion('tipo', [registroEmpresaSchema, registroPersonaSchema]),
);
export type RegistroInput = z.output<typeof registroEmpresaSchema> | z.output<typeof registroPersonaSchema>;

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const actualizarEmpresaSchema = z.object({
  /** Solo personas: nombre completo (el nombre público se deriva de él). */
  nombre: z.string().min(3).max(120).optional(),
  razonSocial: z.string().min(3).max(200).optional(),
  ciiu: z.string().min(4).max(6).optional(),
  rol: z.enum(RolEmpresa).optional(),
  direccion: z.string().min(5).max(250).optional(),
  representanteLegal: z.string().min(3).max(150).optional(),
  /** Persona de contacto y teléfono (E.164) para coordinar tras el acuerdo. */
  contactoNombre: z.string().min(2).max(120).optional(),
  telefono: telefonoContactoOpcional,
  /** Solo empresas: ocultar nombre y ubicación exacta hasta que el ofertante responda una solicitud. */
  confidencial: z.boolean().optional(),
  /** Marca del intermediario para co-marcar sus certificados. */
  // Solo un archivo subido a la plataforma o una URL https: nunca javascript:, data: ni rutas relativas arbitrarias.
  logoUrl: z.string().max(300).regex(/^(\/api\/uploads\/[A-Za-z0-9._-]+|https:\/\/[^\s"'<>]+)$/, 'Logo inválido').optional(),
  colorMarca: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Usa un color hexadecimal, ej. #047857').optional(),
});
export type ActualizarEmpresaInput = z.infer<typeof actualizarEmpresaSchema>;

export const certificacionSchema = z.object({
  nombre: z.string().min(2).max(120),
});

// ---------- Lotes ----------
import { Modalidad, FrecuenciaLote, UnidadLote, CondicionLote, EntregaLote } from './enums';

export const crearLoteSchema = z.object({
  categoriaCodigo: z.string().min(2),
  titulo: z.string().min(5).max(140),
  descripcion: z.string().min(10).max(2000),
  keywords: z.array(z.string().min(2).max(40)).max(12).default([]),
  cantidad: z.number().positive().max(1_000_000),
  /** Si se omite, se usa la unidad por defecto de la categoría (toneladas o unidades). */
  unidad: z.enum(UnidadLote).optional(),
  modalidad: z.enum(Modalidad),
  precio: z.number().nonnegative().optional(),
  precioReferencia: z.number().nonnegative().optional(),
  aceptaCreditos: z.boolean().default(false),
  frecuencia: z.enum(FrecuenciaLote).default('UNICO'),
  /** Estado del artículo; opcional (no aplica a un residuo). */
  condicion: z.enum(CondicionLote).optional(),
  entrega: z.enum(EntregaLote).default('RECOJO_RECEPTOR'),
  imagenes: z.array(nombreArchivoSchema).max(3).default([]),
  iaSugerencia: z.unknown().optional(),
  // Solo aplica a modalidad INTERCAMBIO: qué categorías/ítems aceptaría el publicador a cambio.
  notaIntercambio: z.string().max(300).optional(),
});
export type CrearLoteInput = z.infer<typeof crearLoteSchema>;

export const clasificarSchema = z.object({
  descripcion: z.string().min(3).max(2000),
  imagenes: z.array(nombreArchivoSchema).max(3).default([]), // nombres de archivos ya subidos
});

// ---------- Alertas / matching ----------
export const crearAlertaSchema = z.object({
  texto: z.string().min(3).max(300),
  categoriaCodigo: z.string().optional(),
  radioKm: z.number().min(1).max(2000).default(50),
});

// ---------- Transacciones ----------
export const solicitarSchema = z.object({
  loteId: z.string(),
  cantidad: z.number().positive(),
  mensaje: z.string().max(1000).optional(),
  /** Oferta de precio por unidad del lote, hecha dentro de la plataforma desde la primera solicitud (antes de tener contacto). */
  precioOfertado: z.number().positive().max(1_000_000).optional(),
});
export const terminosSchema = z.object({
  cantidad: z.number().positive(),
  precioAcordado: z.number().nonnegative().optional(),
  fechaRecojo: z.string().datetime().optional(),
  responsableRecojo: z.string().max(150).optional(),
  pagarComisionConCreditos: z.boolean().optional(),
  // Solo aplica a modalidad INTERCAMBIO: el lote que el receptor ofrece a cambio.
  loteIntercambioId: z.string().optional(),
});
export const mensajeSchema = z.object({ texto: z.string().min(1).max(2000) });
export const recojoSchema = z.object({
  fechaRecojo: z.string().datetime(),
  responsableRecojo: z.string().min(2).max(150),
});
export const firmaSchema = z.object({ fotoEntrega: nombreArchivoSchema.optional(), usoFinalDeclarado: z.string().max(300).optional() });
export const calificarSchema = z.object({
  estrellas: z.number().int().min(1).max(5),
  comentario: z.string().max(500).optional(),
});
export const incidenciaSchema = z.object({
  tipo: z.enum(['MATERIAL_NO_CORRESPONDE', 'NO_SE_PRESENTO', 'PRECIO_DISTINTO', 'OTRO']),
  detalle: z.string().min(5).max(1000),
});

// ---------- Créditos ----------
export const canjeSchema = z.object({
  beneficio: z.enum(['DESTACAR_LOTE', 'BADGE_CIRCULAR', 'REPORTE_SOSTENIBILIDAD']),
  loteId: z.string().optional(),
});
export const BENEFICIOS = {
  DESTACAR_LOTE: { costo: 50, dias: 7, etiqueta: 'Destacar un lote por 7 días' },
  BADGE_CIRCULAR: { costo: 200, dias: 0, etiqueta: 'Badge «Empresa circular verificada»' },
  REPORTE_SOSTENIBILIDAD: { costo: 30, dias: 0, etiqueta: 'Reporte de sostenibilidad exportable' },
} as const;

// ---------- B2B2B: red de proveedores, material reportado, acopio ----------

/** Teléfono en formato E.164. Acepta un celular peruano de 9 dígitos («987 654 321») y le antepone +51. */
export function normalizarTelefono(t: string): string {
  const limpio = t.replace(/[\s().-]/g, '');
  if (/^9\d{8}$/.test(limpio)) return `+51${limpio}`;
  return limpio.startsWith('00') ? `+${limpio.slice(2)}` : limpio;
}
export const telefonoSchema = z.string().transform(normalizarTelefono).refine((t) => /^\+\d{8,15}$/.test(t), 'Teléfono inválido (ej. 987654321 o +51987654321)');

/** Alta de un proveedor (generador) en la red del intermediario. El RUC es opcional: hay proveedores informales. */
export const crearProveedorSchema = z.object({
  razonSocial: z.string().min(2).max(200),
  ruc: rucSchema.optional(),
  ciiu: z.string().min(4).max(6).optional(),
  direccion: z.string().min(5).max(250),
  contactoNombre: z.string().min(2).max(120),
  telefono: telefonoSchema.optional(),
  contactoEmail: z.string().email().optional(),
  notasInternas: z.string().max(500).optional(),
  /** Cómo se clasifica el proveedor en la red (filtros y recomendaciones). */
  sector: z.enum(CODIGOS_SECTOR).optional(),
  tipoActor: z.enum(CODIGOS_TIPO_ACTOR).optional(),
});
export type CrearProveedorInput = z.output<typeof crearProveedorSchema>;
export const actualizarProveedorSchema = crearProveedorSchema.partial().extend({ activo: z.boolean().optional() });
export type ActualizarProveedorInput = z.output<typeof actualizarProveedorSchema>;

const unidadReporte = z.enum(UnidadLote).default('kg');

/** Reporte de material de un proveedor por el portal o por WhatsApp. Si no indica categoría, la IA la sugiere. */
export const reporteCaptacionSchema = z.object({
  descripcion: z.string().min(5).max(1000),
  categoriaCodigo: z.string().min(2).optional(),
  cantidad: z.number().positive().max(1_000_000),
  unidad: unidadReporte,
  precioEsperado: z.number().nonnegative().optional(),
  imagenes: z.array(nombreArchivoSchema).max(3).default([]),
  /** Residuo de la base de cadenas (ver `cadenas.ts`); si no se indica, se intenta deducir de la descripción. */
  residuoRef: z.string().max(80).optional(),
  presentacion: z.enum(CODIGOS_PRESENTACION).optional(),
});
export type ReporteCaptacionInput = z.output<typeof reporteCaptacionSchema>;

/** El intermediario registra material en nombre de un proveedor (p. ej. tras una llamada o una visita). */
export const crearMaterialSchema = reporteCaptacionSchema.extend({ proveedorId: z.string().min(1) });
export type CrearMaterialInput = z.output<typeof crearMaterialSchema>;

export const cotizarSchema = z.object({ precioOfrecido: z.number().positive() });
export const acopioSchema = z.object({ cantidadAcopiada: z.number().positive(), precioFinal: z.number().nonnegative().optional() });
export const despachoSchema = z
  .object({
    clienteDestino: z.string().min(2).max(200).optional(),
    clienteDestinoRuc: rucSchema.optional(),
    /** Destino del directorio del intermediario; si no se indica el nombre, se usa el del destino. */
    destinoId: z.string().min(1).optional(),
  })
  .refine((d) => d.clienteDestino || d.destinoId, { message: 'Indica el cliente o elige un destino del directorio', path: ['clienteDestino'] });
export type DespachoInput = z.output<typeof despachoSchema>;
/** Corregir cómo se clasificó un material (null borra el vínculo). */
export const actualizarMaterialSchema = z.object({
  residuoRef: z.string().max(80).nullable().optional(),
  presentacion: z.enum(CODIGOS_PRESENTACION).nullable().optional(),
});
export const certificadoLoteSchema = z.object({ usoFinal: z.string().max(300).optional() });

// ---------- Benchmark de precios ----------
export const consultaBenchmarkSchema = z.object({
  categoria: z.string().min(2),
  descripcion: z.string().max(500).optional(),
  cantidad: z.coerce.number().positive().default(1),
  unidad: z.enum(UnidadLote).default('ton'),
  /** Si se indica, la distancia a los comparables se mide desde este proveedor. */
  proveedorId: z.string().optional(),
});
export const importarPreciosSchema = z.object({ csv: z.string().min(10).max(900_000) });
export const compartirPreciosSchema = z.object({ compartir: z.boolean() });

// ---------- WhatsApp (simulador) ----------
export const simularWhatsappSchema = z.object({ telefono: telefonoSchema, texto: z.string().min(1).max(1000) });

// ---------- Directorio de destinos y acuerdos de temporada ----------
export const destinoSchema = z.object({
  nombre: z.string().min(2).max(160),
  tipo: z.enum(CODIGOS_TIPO_DESTINO),
  /** Qué materiales recibe, con sus palabras (ej. «descarte de mango, pulpa»). */
  materiales: z.string().max(300).optional(),
  zona: z.string().max(120).optional(),
  contactoNombre: z.string().max(120).optional(),
  telefono: telefonoSchema.optional(),
  notas: z.string().max(500).optional(),
});
export type DestinoInput = z.output<typeof destinoSchema>;
export const actualizarDestinoSchema = destinoSchema.partial().extend({ activo: z.boolean().optional() });
export type ActualizarDestinoInput = z.output<typeof actualizarDestinoSchema>;

const fechaIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (AAAA-MM-DD)');
export const acuerdoSchema = z.object({
  proveedorId: z.string().min(1),
  descripcion: z.string().min(3).max(300),
  residuoRef: z.string().max(80).optional(),
  cantidadEstimada: z.number().positive().max(1_000_000),
  unidad: unidadReporte,
  /** Por unidad (kg o t), tal como se pactó antes de la campaña. */
  precioPactado: z.number().nonnegative(),
  fechaRecojo: fechaIso.optional(),
  destinoId: z.string().min(1).optional(),
  notas: z.string().max(500).optional(),
});
export type AcuerdoInput = z.output<typeof acuerdoSchema>;
export const EstadosAcuerdo = ['VIGENTE', 'CUMPLIDO', 'CANCELADO'] as const;
export const actualizarAcuerdoSchema = z.object({
  estado: z.enum(EstadosAcuerdo).optional(),
  precioPactado: z.number().nonnegative().optional(),
  cantidadEstimada: z.number().positive().max(1_000_000).optional(),
  fechaRecojo: fechaIso.nullable().optional(),
  destinoId: z.string().min(1).nullable().optional(),
  notas: z.string().max(500).optional(),
});
export type ActualizarAcuerdoInput = z.output<typeof actualizarAcuerdoSchema>;
/** Un recojo concreto contra un acuerdo: crea el material ya acopiado. */
export const recojoAcuerdoSchema = z.object({ cantidad: z.number().positive().max(1_000_000), precio: z.number().nonnegative().optional() });

// ---------- Transacciones: validaciones menores ----------
export const cancelarSchema = z.object({ motivo: z.string().trim().max(200).optional() });
export const estadoIncidenciaSchema = z.object({ estado: z.enum(['ABIERTA', 'EN_REVISION', 'RESUELTA']) });
