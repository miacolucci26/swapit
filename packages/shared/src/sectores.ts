/**
 * Catálogos que usan la red de proveedores, los destinos y la base de cadenas productivas.
 * Son listas cerradas a propósito: sirven para filtrar, para recomendar y para que el asistente local
 * (un modelo pequeño) elija entre opciones en lugar de inventar categorías.
 */

export const SECTORES = [
  { id: 'AGRO', nombre: 'Agro y agroexportación', ejemplo: 'Mango, limón, uva, palta, arándano, banano, cacao' },
  { id: 'AGROINDUSTRIA', nombre: 'Agroindustria', ejemplo: 'Arroz, caña de azúcar, molinos' },
  { id: 'PESCA', nombre: 'Pesca y acuicultura', ejemplo: 'Concha de abanico, langostino, pota, pescado' },
  { id: 'TEXTIL', nombre: 'Textil y algodón', ejemplo: 'Algodón, hilandería, confección' },
  { id: 'MANUFACTURA', nombre: 'Manufactura y empaques', ejemplo: 'Envases, plásticos, cartón, madera, metal' },
  { id: 'SERVICIOS', nombre: 'Servicios y comercio', ejemplo: 'Hoteles, restaurantes, mercados' },
  { id: 'OTRO', nombre: 'Otro o varios sectores', ejemplo: '' },
] as const;
export type Sector = (typeof SECTORES)[number]['id'];
export const CODIGOS_SECTOR = SECTORES.map((s) => s.id) as [Sector, ...Sector[]];
export const nombreSector = (id: string | null | undefined) => SECTORES.find((s) => s.id === id)?.nombre ?? null;

/** Quién es el proveedor dentro de la red del intermediario (la plataforma distingue su volumen, su poder de negociación y su forma de entregar). */
export const TIPOS_ACTOR = [
  { id: 'PEQUENO_PRODUCTOR', nombre: 'Pequeño productor' },
  { id: 'PRODUCTOR_EXPORTADOR', nombre: 'Productor o exportador' },
  { id: 'PLANTA_PROCESADORA', nombre: 'Planta de proceso o industria' },
  { id: 'ASOCIACION', nombre: 'Asociación o cooperativa' },
  { id: 'ACOPIADOR', nombre: 'Acopiador o recolector' },
  { id: 'TRANSFORMADOR', nombre: 'Transformador (MYPE)' },
  { id: 'OTRO', nombre: 'Otro' },
] as const;
export type TipoActor = (typeof TIPOS_ACTOR)[number]['id'];
export const CODIGOS_TIPO_ACTOR = TIPOS_ACTOR.map((t) => t.id) as [TipoActor, ...TipoActor[]];
export const nombreTipoActor = (id: string | null | undefined) => TIPOS_ACTOR.find((t) => t.id === id)?.nombre ?? null;

/** A quién se le puede entregar o vender un residuo. Un «destino» concreto del intermediario pertenece a uno de estos tipos. */
export const TIPOS_DESTINO = [
  { id: 'REPROCESO_ALIMENTOS', nombre: 'Planta de congelado, pulpa, deshidratado o jugo', corto: 'Reproceso de alimentos' },
  { id: 'MERCADO_LOCAL', nombre: 'Mercado local, jugueras y comerciantes', corto: 'Mercado local' },
  { id: 'ALIMENTO_ANIMAL', nombre: 'Productor pecuario o fábrica de alimento balanceado', corto: 'Alimento animal' },
  { id: 'COMPOSTAJE', nombre: 'Planta de compost, humus, biofertilizantes o enmiendas', corto: 'Compost y enmiendas' },
  { id: 'ENERGIA', nombre: 'Caldera, horno, planta de biogás o de pellets', corto: 'Energía' },
  { id: 'CONSTRUCCION', nombre: 'Ladrillera, concretera u obra', corto: 'Construcción' },
  { id: 'RECICLADO_MATERIAL', nombre: 'Recicladora (plástico, cartón, metal, vidrio, textil)', corto: 'Reciclaje' },
  { id: 'INGREDIENTES', nombre: 'Industria de extractos, aceites, pectina, fibras o harinas funcionales', corto: 'Ingredientes y extractos' },
  { id: 'PLANTA_HARINAS', nombre: 'Planta de harina, aceite o ensilado de pescado y crustáceos', corto: 'Harinas y ensilados' },
  { id: 'ARTESANIA_MYPE', nombre: 'Taller o MYPE que transforma (artesanía, panadería, cosmética natural)', corto: 'MYPE transformadora' },
  { id: 'GESTOR_AUTORIZADO', nombre: 'Empresa operadora de residuos (EO-RS) autorizada', corto: 'Gestor autorizado' },
] as const;
export type TipoDestino = (typeof TIPOS_DESTINO)[number]['id'];
export const CODIGOS_TIPO_DESTINO = TIPOS_DESTINO.map((t) => t.id) as [TipoDestino, ...TipoDestino[]];
export const nombreTipoDestino = (id: string | null | undefined, corto = false) => {
  const t = TIPOS_DESTINO.find((x) => x.id === id);
  return t ? (corto ? t.corto : t.nombre) : null;
};

/** Cómo viene el material: Frutas, pescado y otros cambian de precio y de comprador según esté fresco, congelado o seco. */
export const PRESENTACIONES = [
  { id: 'FRESCO', nombre: 'Fresco' },
  { id: 'CONGELADO', nombre: 'Congelado' },
  { id: 'SECO', nombre: 'Seco o molido' },
  { id: 'PROCESADO', nombre: 'Procesado' },
  { id: 'OTRO', nombre: 'Otro' },
] as const;
export type Presentacion = (typeof PRESENTACIONES)[number]['id'];
export const CODIGOS_PRESENTACION = PRESENTACIONES.map((p) => p.id) as [Presentacion, ...Presentacion[]];
export const nombrePresentacion = (id: string | null | undefined) => PRESENTACIONES.find((p) => p.id === id)?.nombre ?? null;
