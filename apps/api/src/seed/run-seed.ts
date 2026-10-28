/**
 * Seed de demostración. Conduce los servicios reales (lotes, matching, transacciones), por lo que
 * créditos, certificados, calificaciones y matches quedan consistentes con las reglas del sistema.
 *   node dist/seed/run-seed.js            (omite si ya hay datos)
 *   SEED_RESET=1 node dist/seed/run-seed.js   (borra todo y vuelve a sembrar)
 * SEED_PERSONAS=1 añade además los lotes y transacciones de personas naturales (por defecto la demo es solo de empresas).
 * Todas las cuentas de demo usan la contraseña "demo1234" (admin: "admin12345"). Solo para desarrollo.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcryptjs';
import { FACTORES_IMPACTO, SUBTIPOS_PLASTICO, UNIDAD_POR_CATEGORIA, construirRuc, familiaDe, nombrePublico } from '@swapit/shared';
import type { CrearLoteInput } from '@swapit/shared';
import { AppModule } from '../app.module';
import type { JwtPayload } from '../auth/auth.guard';
import { CreditosService } from '../creditos/creditos.service';
import { LotesService } from '../lotes/lotes.service';
import { modo } from '../common/modo';
import { MatchingService } from '../matching/matching.service';
import { PrismaService } from '../prisma/prisma.service';
import { TransaccionesService } from '../transacciones/transacciones.service';
import { UPLOADS_DIR } from '../common/uploads';
import { LocalStorageDriver, crearDriver, fijarStorage, storage } from '../storage/storage';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { escribirImagenesDemo } from './imagenes-demo';
import type { FotoLote } from './imagenes-demo';
import { sembrarB2B } from './seed-b2b';

export const CATEGORIAS = [
  { codigo: 'ORGANICO_AGRO', nombre: 'Residuos orgánicos agroindustriales (cáscara, pulpa, bagazo)', sector: 'Agroindustria', codigoLer: '02 03 04', usoTipico: 'Compost, alimento animal, biofertilizante' },
  { codigo: 'BIOMASA', nombre: 'Biomasa (cascarilla de arroz, raquis, poda)', sector: 'Agroindustria', codigoLer: '02 01 03', usoTipico: 'Energía en calderas, pellets' },
  { codigo: 'TEXTIL', nombre: 'Recortes y mermas textiles', sector: 'Textil', codigoLer: '04 02 09', usoTipico: 'Reciclado textil, relleno, trapos industriales' },
  { codigo: 'PLASTICO', nombre: 'Plásticos (PET, PEAD, film)', sector: 'Manufactura', codigoLer: '07 02 13', usoTipico: 'Reciclado mecánico' },
  // Subtipos: el precio cambia mucho según el polímero.
  ...SUBTIPOS_PLASTICO.map((s) => ({ codigo: s.codigo, nombre: s.nombre, sector: 'Manufactura', codigoLer: s.codigoLer, usoTipico: 'Reciclado mecánico' })),
  { codigo: 'METAL', nombre: 'Chatarra y metales', sector: 'Construcción / Manufactura', codigoLer: '17 04 07', usoTipico: 'Fundición' },
  { codigo: 'PAPEL_CARTON', nombre: 'Papel y cartón', sector: 'Manufactura', codigoLer: '15 01 01', usoTipico: 'Reciclado de papel, empaques' },
  { codigo: 'CONSTRUCCION', nombre: 'Excedentes de construcción y demolición', sector: 'Construcción', codigoLer: '17 01 07', usoTipico: 'Agregados reciclados, rellenos' },
  { codigo: 'MAQUINARIA_EQUIPOS', nombre: 'Maquinaria y equipos industriales excedentes', sector: 'Manufactura', codigoLer: null, usoTipico: 'Reuso productivo, repuestos, reacondicionamiento' },
  { codigo: 'INSUMOS_RECICLADOS', nombre: 'Insumos y productos ya reciclados o reprocesados', sector: 'General', codigoLer: null, usoTipico: 'Reingreso como materia prima en nuevos procesos' },
  { codigo: 'ARTICULOS_PERSONALES', nombre: 'Artículos personales en desuso (ropa, libros, útiles, electrodomésticos, muebles)', sector: 'Personas', codigoLer: null, usoTipico: 'Reúso directo por otra persona' },
  { codigo: 'PESCA_MARISCOS', nombre: 'Conchas y residuos de pesca y acuicultura (concha de abanico, escamas)', sector: 'Pesca y acuicultura', codigoLer: null, usoTipico: 'Calcio, agregado para concreto y asfalto, tratamiento de agua' },
  { codigo: 'MADERA_PALLETS', nombre: 'Madera, pallets y aserrín', sector: 'Manufactura / Logística', codigoLer: '15 01 03', usoTipico: 'Muebles y reúso, biomasa, tableros' },
  { codigo: 'VIDRIO_CERAMICA', nombre: 'Vidrio y cerámica (botellas, frascos, restos de cerámica)', sector: 'Manufactura / Artesanía', codigoLer: '15 01 07', usoTipico: 'Reúso de envases, reciclaje de vidrio, mosaicos' },
  { codigo: 'ACEITES_USADOS', nombre: 'Aceite de cocina usado', sector: 'Alimentos y restaurantes', codigoLer: '20 01 25', usoTipico: 'Jabón artesanal, velas, biodiésel' },
  { codigo: 'RAEE', nombre: 'Equipos electrónicos y eléctricos fuera de uso (RAEE)', sector: 'Personas / Servicios', codigoLer: '20 01 36', usoTipico: 'Reacondicionamiento, repuestos, gestor autorizado' },
  { codigo: 'OTROS', nombre: 'Otros subproductos industriales', sector: 'General', codigoLer: null, usoTipico: null },
];

interface EmpresaSeed {
  clave: string;
  base: string; // 10 primeros dígitos del RUC
  razonSocial: string;
  ciiu: string;
  rol: 'OFERTANTE' | 'RECEPTOR' | 'AMBOS';
  direccion: string;
  lat: number;
  lng: number;
  rep: string;
  usuario: { nombre: string; email: string };
  certs?: string[];
  /** Se muestra como «Empresa confidencial» hasta que responde una solicitud. */
  confidencial?: boolean;
}

const EMPRESAS: EmpresaSeed[] = [
  { clave: 'vallesol', base: '2060123401', razonSocial: 'Agroexport Vallesol SAC', ciiu: '0113', rol: 'AMBOS', direccion: 'Zona Industrial Mz. B Lt. 4, Piura', lat: -5.1738, lng: -80.6561, rep: 'Ana Torres Quispe', usuario: { nombre: 'Ana Torres', email: 'ana@vallesol.pe' }, certs: ['ISO 14001', 'GlobalG.A.P.'] },
  { clave: 'losandes', base: '2060123402', razonSocial: 'Frutícola Los Andes SAC', ciiu: '0122', rol: 'OFERTANTE', direccion: 'Carretera Sullana - Tambogrande km 8, Sullana', lat: -4.9121, lng: -80.6612, rep: 'Luis Ramírez Chunga', usuario: { nombre: 'Luis Ramírez', email: 'luis@losandes.pe' }, certs: ['BPA (Buenas Prácticas Agrícolas)'] },
  { clave: 'hualtaco', base: '2060123403', razonSocial: 'Agrícola Hualtaco SAC', ciiu: '0122', rol: 'OFERTANTE', direccion: 'Fundo Hualtaco, Olmos, Lambayeque', lat: -5.9871, lng: -79.7402, rep: 'Rosa Cárdenas Flores', usuario: { nombre: 'Rosa Cárdenas', email: 'rosa@hualtaco.pe' }, certs: ['GlobalG.A.P.'] },
  { clave: 'molinos', base: '2060123404', razonSocial: 'Molinos Norte del Perú SAC', ciiu: '1061', rol: 'OFERTANTE', direccion: 'Parque Industrial, Lambayeque', lat: -6.7042, lng: -79.9012, rep: 'Jorge Salazar Vidaurre', usuario: { nombre: 'Jorge Salazar', email: 'jorge@molinosnorte.pe' }, certs: ['ISO 9001'] },
  { clave: 'pima', base: '2060123405', razonSocial: 'Textiles Pima Piura SAC', ciiu: '1313', rol: 'OFERTANTE', direccion: 'Av. Sánchez Cerro 1450, Piura', lat: -5.1861, lng: -80.6422, rep: 'Milagros Neyra Alama', usuario: { nombre: 'Milagros Neyra', email: 'milagros@pimapiura.pe' }, certs: ['Oeko-Tex Standard 100'], confidencial: true },
  { clave: 'confecciones', base: '2060123406', razonSocial: 'Confecciones del Norte EIRL', ciiu: '1410', rol: 'AMBOS', direccion: 'Calle Los Pinos 220, Chiclayo', lat: -6.7702, lng: -79.8437, rep: 'Pedro Gonzales Bances', usuario: { nombre: 'Pedro Gonzales', email: 'pedro@confeccionesnorte.pe' } },
  { clave: 'norandina', base: '2060123407', razonSocial: 'Constructora Norandina SA', ciiu: '4100', rol: 'OFERTANTE', direccion: 'Urb. Miraflores Mz. C, Castilla, Piura', lat: -5.2004, lng: -80.6069, rep: 'Ricardo Paz Merino', usuario: { nombre: 'Ricardo Paz', email: 'ricardo@norandina.pe' }, certs: ['ISO 14001'] },
  { clave: 'empaques', base: '2060123408', razonSocial: 'Empaques Amazonas SAC', ciiu: '1702', rol: 'AMBOS', direccion: 'Zona Industrial II Etapa, Piura', lat: -5.1702, lng: -80.6503, rep: 'Diana Saavedra Ruiz', usuario: { nombre: 'Diana Saavedra', email: 'diana@empaquesamazonas.pe' } },
  { clave: 'bebidas', base: '2060123409', razonSocial: 'Distribuidora Bebidas del Norte SA', ciiu: '4630', rol: 'AMBOS', direccion: 'Av. Chulucanas 1100, Piura', lat: -5.1919, lng: -80.6247, rep: 'Fernando Lama Ortiz', usuario: { nombre: 'Fernando Lama', email: 'fernando@bebidasnorte.pe' }, certs: ['ISO 14001', 'Registro REP — envases'] },
  { clave: 'biocompost', base: '2060123410', razonSocial: 'BioCompost Piura SAC', ciiu: '3821', rol: 'RECEPTOR', direccion: 'Km 12 Carretera Piura - Catacaos, Piura', lat: -5.2412, lng: -80.6608, rep: 'Carlos Mendoza Silupú', usuario: { nombre: 'Carlos Mendoza', email: 'carlos@biocompost.pe' }, certs: ['Registro EO-RS (residuos sólidos)'] },
  { clave: 'energia', base: '2060123411', razonSocial: 'Energía Verde Lambayeque SAC', ciiu: '3510', rol: 'RECEPTOR', direccion: 'Carretera Lambayeque - Mochumí km 3, Lambayeque', lat: -6.6812, lng: -79.9205, rep: 'Sandra Vílchez Torres', usuario: { nombre: 'Sandra Vílchez', email: 'sandra@energiaverde.pe' } },
  { clave: 'ecoempaques', base: '2060123412', razonSocial: 'EcoEmpaques del Norte SAC', ciiu: '1702', rol: 'RECEPTOR', direccion: 'Parque Industrial José Leonardo Ortiz, Chiclayo', lat: -6.7563, lng: -79.8391, rep: 'Andrea Cubas Díaz', usuario: { nombre: 'Andrea Cubas', email: 'andrea@ecoempaques.pe' }, certs: ['FSC Cadena de custodia'] },
  { clave: 'textilrec', base: '2060123413', razonSocial: 'Reciclaje Textil Sullana SAC', ciiu: '3830', rol: 'RECEPTOR', direccion: 'Zona Industrial, Sullana', lat: -4.9012, lng: -80.6924, rep: 'Manuel Ruiz Zapata', usuario: { nombre: 'Manuel Ruiz', email: 'manuel@textilsullana.pe' } },
  { clave: 'metalica', base: '2060123414', razonSocial: 'Recicladora Metálica Paita SAC', ciiu: '3830', rol: 'RECEPTOR', direccion: 'Zona Industrial Paita, Paita', lat: -5.0871, lng: -81.1032, rep: 'Víctor Chávez Yarleque', usuario: { nombre: 'Víctor Chávez', email: 'victor@metalicapaita.pe' }, certs: ['Registro EO-RS (residuos sólidos)'] },
  { clave: 'forraje', base: '2060123415', razonSocial: 'AgroForraje San Miguel SAC', ciiu: '1080', rol: 'RECEPTOR', direccion: 'Carretera a Sechura km 5, Piura', lat: -5.2531, lng: -80.6942, rep: 'Elena Rojas Palacios', usuario: { nombre: 'Elena Rojas', email: 'elena@forrajesanmiguel.pe' } },
  { clave: 'arfp', base: '2060123416', razonSocial: 'Asociación de Recicladores Formalizados de Piura', ciiu: '3830', rol: 'AMBOS', direccion: 'AA.HH. Nueva Esperanza, Castilla, Piura', lat: -5.2103, lng: -80.6178, rep: 'Teodoro Alburqueque Reyes', usuario: { nombre: 'Teodoro Alburqueque', email: 'teodoro@arfp.pe' }, certs: ['Formalización Ley 29419'] },
  { clave: 'bahia', base: '2060123418', razonSocial: 'Acuícola Bahía de Sechura SAC', ciiu: '0321', rol: 'OFERTANTE', direccion: 'Puerto de Parachique, Sechura', lat: -5.5, lng: -80.8333, rep: 'Nelly Ipanaqué Vega', usuario: { nombre: 'Nelly Ipanaqué', email: 'nelly@bahiasechura.pe' }, certs: ['Registro sanitario de planta (demo)'] },
  { clave: 'sabores', base: '2060123419', razonSocial: 'Grupo Gastronómico Sabores del Norte SAC', ciiu: '5610', rol: 'OFERTANTE', direccion: 'Av. Country 450, Piura', lat: -5.1816, lng: -80.6354, rep: 'Iván Castillo Peña', usuario: { nombre: 'Iván Castillo', email: 'ivan@saboresnorte.pe' } },
  { clave: 'plasticos', base: '2060123417', razonSocial: 'Plásticos del Pacífico SAC', ciiu: '2220', rol: 'AMBOS', direccion: 'Zona Industrial, Sechura', lat: -5.5544, lng: -80.8168, rep: 'Gabriela Farfán Gómez', usuario: { nombre: 'Gabriela Farfán', email: 'gabriela@plasticospacifico.pe' } },
  { clave: 'canaverde', base: '2060123420', razonSocial: 'Agroindustrial Caña Verde SAC', ciiu: '1072', rol: 'OFERTANTE', direccion: 'Carretera a Pimentel km 4, Chiclayo', lat: -6.8012, lng: -79.8695, rep: 'Hernán Bances Cajusol', usuario: { nombre: 'Hernán Bances', email: 'hernan@canaverde.pe' }, certs: ['ISO 14001'] },
  { clave: 'tumbesagro', base: '2060123421', razonSocial: 'Agrícola Valle de Tumbes SAC', ciiu: '0122', rol: 'OFERTANTE', direccion: 'Fundo La Peña, Corrales, Tumbes', lat: -3.6028, lng: -80.4735, rep: 'Katherine Jiménez Mogollón', usuario: { nombre: 'Katherine Jiménez', email: 'katherine@valletumbes.pe' }, certs: ['Certificación orgánica (demo)'] },
  { clave: 'tumbesmar', base: '2060123422', razonSocial: 'Pesquera Langostino Tumbes SAC', ciiu: '1020', rol: 'OFERTANTE', direccion: 'Puerto Pizarro, Tumbes', lat: -3.4833, lng: -80.3833, rep: 'Óscar Zapata Ruesta', usuario: { nombre: 'Óscar Zapata', email: 'oscar@langostinotumbes.pe' }, certs: ['Registro sanitario de planta (demo)'] },
  { clave: 'mardegrau', base: '2060123423', razonSocial: 'Procesadora Mar de Grau SAC', ciiu: '1020', rol: 'OFERTANTE', direccion: 'Zona Industrial Paita, Paita', lat: -5.0950, lng: -81.1100, rep: 'Lucía Chero Palacios', usuario: { nombre: 'Lucía Chero', email: 'lucia@mardegrau.pe' }, certs: ['Plan HACCP (demo)'] },
  { clave: 'talara', base: '2060123424', razonSocial: 'Servicios Industriales Talara SAC', ciiu: '3312', rol: 'OFERTANTE', direccion: 'Zona Industrial Pariñas, Talara', lat: -4.5780, lng: -81.2680, rep: 'Wilmer Ancajima Seminario', usuario: { nombre: 'Wilmer Ancajima', email: 'wilmer@sitalara.pe' }, confidencial: true },
  { clave: 'tallan', base: '2060123425', razonSocial: 'Agroexportadora Tallán SAC', ciiu: '0122', rol: 'AMBOS', direccion: 'Fundo San Isidro, Sullana', lat: -4.8802, lng: -80.7011, rep: 'Patricia Atoche Neira', usuario: { nombre: 'Patricia Atoche', email: 'patricia@agrotallan.pe' }, certs: ['GlobalG.A.P.'] },
  { clave: 'recipla', base: '2060123426', razonSocial: 'PlastiRecicla Norte SAC', ciiu: '3830', rol: 'RECEPTOR', direccion: 'Km 4 Carretera Piura - Sullana, Piura', lat: -5.1500, lng: -80.6600, rep: 'Henry Palacios Sernaqué', usuario: { nombre: 'Henry Palacios', email: 'henry@plastirecicla.pe' }, certs: ['Registro EO-RS (residuos sólidos)'] },
  { clave: 'cal', base: '2060123427', razonSocial: 'Calizas y Enmiendas Sechura SAC', ciiu: '2394', rol: 'RECEPTOR', direccion: 'Zona Industrial, Sechura', lat: -5.5600, lng: -80.8200, rep: 'Rocío Sánchez Aguilar', usuario: { nombre: 'Rocío Sánchez', email: 'rocio@calizassechura.pe' } },
];

type L = Omit<CrearLoteInput, 'imagenes' | 'keywords' | 'aceptaCreditos' | 'frecuencia' | 'entrega'> & { keywords?: string[]; aceptaCreditos?: boolean; frecuencia?: CrearLoteInput['frecuencia']; entrega?: CrearLoteInput['entrega'] };
/** Lote de empresa para la demo de intercambio: `id` estable (para las transacciones), ilustración y nº de imágenes (1–3). */
type LoteSeed = L & { id: string; foto: FotoLote; fotos: number };

/** Color de fondo de la ilustración según la categoría (tokens de la web: agro, pesca, textil, plástico, otros, marino, sol). */
const COLOR_CATEGORIA: Record<string, string> = {
  ORGANICO_AGRO: '#2B8412', BIOMASA: '#2B8412', PESCA_MARISCOS: '#0A7F96', TEXTIL: '#C42885', PLASTICO: '#8B3FD9', PAPEL_CARTON: '#8B5A2B',
  MADERA_PALLETS: '#8B5A2B', METAL: '#2459D6', ACEITES_USADOS: '#E87500', INSUMOS_RECICLADOS: '#2459D6', CONSTRUCCION: '#8B5A2B', MAQUINARIA_EQUIPOS: '#2459D6',
};
const colorDe = (cat: string) => COLOR_CATEGORIA[cat] ?? (cat.startsWith('PLASTICO') ? '#8B3FD9' : '#8B5A2B');

const LOTES: Record<string, LoteSeed[]> = {
  vallesol: [
    { id: 'arandano', categoriaCodigo: 'ORGANICO_AGRO', titulo: 'Cáscara y pulpa de arándano', descripcion: 'Orujo de la línea de jugo (variedades Biloxi y Ventura), sin aditivos y con humedad cercana al 75%. Se recoge a diario en volquete; ideal para compost o biofertilizante.', cantidad: 45, modalidad: 'VENTA', precio: 85, keywords: ['arándano', 'cáscara', 'pulpa', 'compost'], frecuencia: 'ESTACIONAL', foto: { escena: 'monton', obj: '#5B3A8C', alt: '#7A55AD' }, fotos: 3 },
    { id: 'uva', categoriaCodigo: 'ORGANICO_AGRO', titulo: 'Descarte de uva de mesa', descripcion: 'Uva Sweet Globe descartada por calibre y color, sin residuos fuera de norma. Camiones completos durante la campaña; apta para forraje, biogás o compostaje.', cantidad: 30, modalidad: 'DONACION', keywords: ['uva', 'descarte', 'forraje'], frecuencia: 'ESTACIONAL', foto: { escena: 'fruta', obj: '#6B3FA0', tipo: 'uva' }, fotos: 2 },
    { id: 'esparrago', categoriaCodigo: 'ORGANICO_AGRO', titulo: 'Bagazo de espárrago verde', descripcion: 'Puntas y bases de espárrago prensadas, con unos 60% de humedad y fibra larga. Disponible cada semana durante todo el año.', cantidad: 55, modalidad: 'VENTA', precio: 60, keywords: ['espárrago', 'bagazo', 'fibra'], frecuencia: 'RECURRENTE', foto: { escena: 'monton', obj: '#7FA33B', alt: '#A5C55A' }, fotos: 2 },
  ],
  losandes: [
    { id: 'limon', categoriaCodigo: 'ORGANICO_AGRO', titulo: 'Cáscara de limón sutil', descripcion: 'Cáscara del extractor de jugo y aceite esencial, rica en fibra y aceites residuales. Útil para compost, pectina o alimento animal en mezcla.', cantidad: 35, modalidad: 'VENTA', precio: 90, keywords: ['limón', 'cáscara', 'pectina'], frecuencia: 'RECURRENTE', foto: { escena: 'cajas', obj: '#9BD43B', tipo: 'limon' }, fotos: 3 },
    { id: 'mango', categoriaCodigo: 'ORGANICO_AGRO', titulo: 'Mango Kent de descarte en jabas', descripcion: 'Fruta con defectos de piel o calibre bajo, apta para pulpa, deshidratado o compost. Se entrega en jabas de campo durante la campaña de verano.', cantidad: 28, modalidad: 'VENTA', precio: 40, keywords: ['mango', 'descarte', 'pulpa'], frecuencia: 'ESTACIONAL', foto: { escena: 'cajas', obj: '#F2A93B', tipo: 'mango' }, fotos: 3 },
  ],
  molinos: [
    { id: 'cascarilla', categoriaCodigo: 'BIOMASA', titulo: 'Cascarilla de arroz a granel', descripcion: 'Cascarilla limpia de molino, con humedad menor al 12%. Producción continua todo el año; despacho en camión tolva.', cantidad: 120, modalidad: 'VENTA', precio: 130, keywords: ['cascarilla', 'arroz', 'biomasa', 'caldera'], frecuencia: 'RECURRENTE', foto: { escena: 'monton', obj: '#D9B44A' }, fotos: 3 },
    { id: 'polvillo', categoriaCodigo: 'ORGANICO_AGRO', titulo: 'Polvillo de arroz en sacos de 40 kg', descripcion: 'Subproducto del pulido, rico en fibra y grasa, empacado en sacos de polipropileno. Apto para formular alimento balanceado.', cantidad: 35, modalidad: 'VENTA', precio: 200, keywords: ['polvillo', 'arroz', 'alimento animal'], frecuencia: 'RECURRENTE', foto: { escena: 'sacos', obj: '#E9D8A6', alt: '#2459D6' }, fotos: 2 },
  ],
  pima: [
    { id: 'pima-retazos', categoriaCodigo: 'TEXTIL', titulo: 'Retazos de algodón pima crudo', descripcion: 'Recortes de corte industrial, 100% algodón pima sin estampar, de 20 a 80 cm. Se entrega en fardos de 25 kg.', cantidad: 6, modalidad: 'VENTA', precio: 520, keywords: ['algodón', 'pima', 'retazos', 'tela'], frecuencia: 'RECURRENTE', foto: { escena: 'rollos', obj: '#F1DDC4', alt: '#E7B3D4' }, fotos: 3 },
    { id: 'pima-mermas', categoriaCodigo: 'TEXTIL', titulo: 'Mermas de hilo y fibra de algodón', descripcion: 'Fibra corta y mermas de hilatura con algo de pelusa. Sirven como relleno, trapos industriales o reciclado textil.', cantidad: 2.5, modalidad: 'DONACION', keywords: ['hilo', 'fibra', 'merma'], foto: { escena: 'pacas', obj: '#E7B3D4', tipo: 'textil' }, fotos: 2 },
  ],
  bebidas: [
    { id: 'film', categoriaCodigo: 'PLASTICO_FILM', titulo: 'Film stretch usado en pacas', descripcion: 'Film de polietileno del paletizado de bebidas, limpio y enfardado en pacas de 250 kg. Buen material para reciclado mecánico.', cantidad: 8, modalidad: 'VENTA', precio: 800, keywords: ['film', 'stretch', 'polietileno'], frecuencia: 'RECURRENTE', foto: { escena: 'pacas', obj: '#DCE9F5', tipo: 'film' }, fotos: 3 },
    { id: 'bidones', categoriaCodigo: 'PLASTICO_PEAD', titulo: 'Bidones de PEAD de 20 L enjuagados', descripcion: 'Bidones de polietileno de alta densidad ya enjuagados, sin tapa. Con certificado de destino final para cumplimiento REP de envases.', cantidad: 4, modalidad: 'VENTA', precio: 850, keywords: ['pead', 'bidones', 'envases'], foto: { escena: 'bidones', obj: '#2B7DE9' }, fotos: 2 },
    { id: 'pallets', categoriaCodigo: 'MADERA_PALLETS', unidad: 'und', titulo: 'Tarimas de madera fuera de norma', descripcion: 'Pallets dañados o fuera de norma retirados del centro de distribución. Aptos para carpintería, trituración o biomasa; salida cada mes.', cantidad: 120, modalidad: 'DONACION', keywords: ['pallets', 'tarimas', 'madera'], frecuencia: 'RECURRENTE', foto: { escena: 'tarimas', obj: '#C99A63' }, fotos: 2 },
  ],
  arfp: [
    { id: 'pet', categoriaCodigo: 'PLASTICO_PET', titulo: 'Botellas PET prensadas en pacas', descripcion: 'Botellas post-consumo clasificadas por color y prensadas en pacas de 200 kg. Lavado pendiente; entrega semanal.', cantidad: 15, modalidad: 'VENTA', precio: 950, keywords: ['pet', 'botellas', 'reciclaje'], frecuencia: 'RECURRENTE', foto: { escena: 'pacas', obj: '#6FBF8F', tipo: 'pet' }, fotos: 3 },
    { id: 'carton', categoriaCodigo: 'PAPEL_CARTON', titulo: 'Cartón corrugado clasificado', descripcion: 'Cartón post-consumo recolectado y clasificado, en pacas de 250 kg, seco y sin contaminantes.', cantidad: 10, modalidad: 'VENTA', precio: 300, keywords: ['cartón', 'post-consumo', 'pacas'], frecuencia: 'RECURRENTE', foto: { escena: 'pacas', obj: '#C8A06B', tipo: 'carton' }, fotos: 2 },
    { id: 'latas', categoriaCodigo: 'METAL', titulo: 'Latas de aluminio prensadas', descripcion: 'Latas de bebidas recolectadas y prensadas en fardos de 20 kg. Alto valor de recuperación.', cantidad: 3, modalidad: 'VENTA', precio: 1800, keywords: ['aluminio', 'latas', 'metal'], foto: { escena: 'pacas', obj: '#9AA5B5', tipo: 'metal' }, fotos: 2 },
  ],
  bahia: [
    { id: 'valvas-trituradas', categoriaCodigo: 'PESCA_MARISCOS', titulo: 'Valvas de concha de abanico trituradas', descripcion: 'Valvas lavadas y trituradas en trozos de 1 a 3 cm. Aptas para cal agrícola, concreto permeable o suplemento de calcio tras molienda.', cantidad: 25, modalidad: 'VENTA', precio: 55, keywords: ['concha', 'abanico', 'valvas', 'calcio'], frecuencia: 'RECURRENTE', foto: { escena: 'conchas', obj: '#F4B6A8' }, fotos: 3 },
    { id: 'valvas-enteras', categoriaCodigo: 'PESCA_MARISCOS', titulo: 'Valvas enteras de concha de abanico', descripcion: 'Valvas recién desconchadas, con restos orgánicos; requieren lavado y secado. Se entregan sin costo a quien las recoja en el muelle de Parachique.', cantidad: 40, modalidad: 'DONACION', keywords: ['concha', 'valvas', 'sechura'], frecuencia: 'RECURRENTE', foto: { escena: 'conchas', obj: '#E8A090', alt: '#F7D2C6' }, fotos: 2 },
  ],
  sabores: [
    { id: 'aceite', categoriaCodigo: 'ACEITES_USADOS', unidad: 'kg', titulo: 'Aceite de cocina usado de freidoras', descripcion: 'Aceite vegetal de las freidoras de tres locales, filtrado y guardado en bidones cerrados. Sin mezcla con aceite mineral; disponible cada semana.', cantidad: 220, modalidad: 'VENTA', precio: 0.9, keywords: ['aceite', 'freidora', 'jabón', 'biodiésel'], frecuencia: 'RECURRENTE', foto: { escena: 'bidones', obj: '#D99A1E' }, fotos: 2 },
  ],
  plasticos: [
    { id: 'film-agricola', categoriaCodigo: 'PLASTICO_FILM', titulo: 'Film y cinta de riego agrícola', descripcion: 'Film de cobertura y cintas de goteo retirados de campos, triturados y sin tierra gruesa. Aptos para reciclado mecánico.', cantidad: 9, modalidad: 'INTERCAMBIO', notaIntercambio: 'Cartón, pallets o big bags para nuestra línea de embalaje', keywords: ['film', 'agrícola', 'riego', 'intercambio'], foto: { escena: 'pacas', obj: '#BFD8C8', tipo: 'film' }, fotos: 2 },
  ],
  canaverde: [
    { id: 'bagazo-cana', categoriaCodigo: 'BIOMASA', titulo: 'Bagazo de caña de azúcar', descripcion: 'Bagazo de trapiche con 48–50% de humedad, listo para calderas o pellets. Zafra de mayo a noviembre; despacho en volquete.', cantidad: 180, modalidad: 'VENTA', precio: 95, keywords: ['bagazo', 'caña', 'biomasa', 'caldera'], frecuencia: 'ESTACIONAL', foto: { escena: 'monton', obj: '#B89B5E', alt: '#D1B77C' }, fotos: 3 },
    { id: 'cachaza', categoriaCodigo: 'ORGANICO_AGRO', titulo: 'Cachaza de ingenio azucarero', descripcion: 'Torta de filtro rica en materia orgánica y fósforo, ideal para compost y enmienda de suelos. Se paga con créditos circulares.', cantidad: 60, modalidad: 'CREDITOS', precio: 30, aceptaCreditos: true, keywords: ['cachaza', 'compost', 'caña'], frecuencia: 'ESTACIONAL', foto: { escena: 'monton', obj: '#4A3A2A', alt: '#6B5640' }, fotos: 2 },
  ],
  tumbesagro: [
    { id: 'banano', categoriaCodigo: 'ORGANICO_AGRO', titulo: 'Banano orgánico de rechazo', descripcion: 'Dedos con manchas o calibre bajo, sin tratamiento poscosecha. Sirve para harina, alimento animal o compost; recojo dos veces por semana.', cantidad: 22, modalidad: 'VENTA', precio: 45, keywords: ['banano', 'rechazo', 'orgánico'], frecuencia: 'RECURRENTE', foto: { escena: 'fruta', obj: '#F2C81F', tipo: 'banano' }, fotos: 3 },
    { id: 'raquis-banano', categoriaCodigo: 'BIOMASA', titulo: 'Raquis y pseudotallo de banano', descripcion: 'Raquis y pseudotallo triturados y secados al aire. Útiles como biomasa, fibra o estructurante de compost.', cantidad: 40, modalidad: 'CREDITOS', precio: 25, aceptaCreditos: true, keywords: ['raquis', 'pseudotallo', 'fibra'], frecuencia: 'RECURRENTE', foto: { escena: 'monton', obj: '#8DA24B', alt: '#B1C46B' }, fotos: 2 },
    { id: 'cacao', categoriaCodigo: 'ORGANICO_AGRO', titulo: 'Cáscara de cacao fresca', descripcion: 'Mazorcas abiertas tras el desgrane, cáscara fresca de cacao fino de aroma. Buena para compost y alimento de ganado en mezcla.', cantidad: 15, modalidad: 'VENTA', precio: 70, keywords: ['cacao', 'cáscara', 'compost'], frecuencia: 'ESTACIONAL', foto: { escena: 'sacos', obj: '#B07A44', alt: '#7A4A1F' }, fotos: 2 },
  ],
  tumbesmar: [
    { id: 'langostino', categoriaCodigo: 'PESCA_MARISCOS', titulo: 'Cabezas y caparazones de langostino', descripcion: 'Residuo del pelado, refrigerado en bandejas, apto para quitina, harina o abono. Retiro semanal desde Puerto Pizarro.', cantidad: 18, modalidad: 'VENTA', precio: 65, keywords: ['langostino', 'caparazón', 'quitina'], frecuencia: 'RECURRENTE', foto: { escena: 'marisco', obj: '#F08A5D', tipo: 'langostino' }, fotos: 3 },
  ],
  mardegrau: [
    { id: 'pota', categoriaCodigo: 'PESCA_MARISCOS', titulo: 'Pieles y recortes de pota', descripcion: 'Pieles, aletas y recortes de la línea de filete, congelados en cajas de 20 kg. Útiles para harina de pescado o ensilado.', cantidad: 30, modalidad: 'VENTA', precio: 40, keywords: ['pota', 'recortes', 'harina de pescado'], frecuencia: 'RECURRENTE', foto: { escena: 'marisco', obj: '#B0587A', tipo: 'pota' }, fotos: 2 },
  ],
  talara: [
    { id: 'chatarra', categoriaCodigo: 'METAL', titulo: 'Chatarra de acero y planchas navales', descripcion: 'Planchas, perfiles y cortes de acero de mantenimiento industrial, sin aceite ni residuos peligrosos. Retiro con grúa en Talara.', cantidad: 25, modalidad: 'VENTA', precio: 1050, keywords: ['acero', 'planchas', 'chatarra'], foto: { escena: 'chatarra', obj: '#8591A6' }, fotos: 3 },
    { id: 'tambores', categoriaCodigo: 'METAL', titulo: 'Tambores metálicos de 200 L', descripcion: 'Tambores de acero usados y vaciados, con tapa. Los cambiamos por pallets o bidones de PEAD en buen estado.', cantidad: 4, modalidad: 'INTERCAMBIO', notaIntercambio: 'Tarimas de madera o bidones de PEAD', keywords: ['tambores', 'acero', 'intercambio'], foto: { escena: 'bidones', obj: '#6F7C93' }, fotos: 2 },
  ],
  tallan: [
    { id: 'jabas', categoriaCodigo: 'PLASTICO_PEAD', titulo: 'Jabas plásticas de cosecha usadas', descripcion: 'Unas 4 000 jabas de PEAD de 20 kg, algunas rotas, lavadas con agua. Sirven para reúso o reciclado mecánico.', cantidad: 6, modalidad: 'VENTA', precio: 780, keywords: ['jabas', 'pead', 'cosecha'], frecuencia: 'ESTACIONAL', foto: { escena: 'jabas', obj: '#E87500', alt: '#2459D6' }, fotos: 3 },
    { id: 'bigbags', categoriaCodigo: 'PLASTICO_PP', titulo: 'Big bags de polipropileno de 1 t', descripcion: 'Sacos grandes con asas, usados una vez para fertilizante, limpios y sin roturas. Los cambiamos por cartón o cajas de fruta.', cantidad: 3, modalidad: 'INTERCAMBIO', notaIntercambio: 'Cartón corrugado o cajas de fruta', keywords: ['big bags', 'polipropileno', 'sacos'], foto: { escena: 'bigbag', obj: '#EDE8D8', alt: '#E8C547' }, fotos: 2 },
    { id: 'film-cobertura', categoriaCodigo: 'PLASTICO_FILM', titulo: 'Film de cobertura de mango y arándano', descripcion: 'Film de polietileno de cobertura y malla antigranizo, retirado al final de campaña, seco y enrollado.', cantidad: 5, modalidad: 'VENTA', precio: 650, keywords: ['film', 'cobertura', 'polietileno'], frecuencia: 'ESTACIONAL', foto: { escena: 'pacas', obj: '#C9DEE8', tipo: 'film' }, fotos: 2 },
    { id: 'cajas-mango', categoriaCodigo: 'PAPEL_CARTON', titulo: 'Cajas de cartón de mango descartadas', descripcion: 'Cajas de exportación con daños leves, secas y sin restos de fruta, apiladas en pallets de 300 unidades.', cantidad: 8, modalidad: 'DONACION', keywords: ['cartón', 'cajas', 'mango'], foto: { escena: 'cajas', obj: '#F2A93B', tipo: 'mango' }, fotos: 1 },
  ],
};
/** Lote que se publica después de crear las alertas: aparece como coincidencia «nueva». */
const LOTE_NUEVO: LoteSeed = { id: 'mandarina', categoriaCodigo: 'ORGANICO_AGRO', titulo: 'Descarte de mandarina y naranja', descripcion: 'Cítricos descartados por calibre, sin tratamiento poscosecha. Ideal para compost y alimento animal.', cantidad: 25, modalidad: 'DONACION', keywords: ['mandarina', 'naranja', 'cítricos', 'descarte'], frecuencia: 'ESTACIONAL', foto: { escena: 'cajas', obj: '#FF9A1F', tipo: 'mandarina' }, fotos: 2 };

/** Personas naturales (estudiantes de Piura): sin RUC ni KYB. Las coordenadas ya vienen aproximadas a ~1 km, como las guarda la app. */
interface PersonaSeed {
  clave: string;
  nombre: string;
  email: string;
  direccion: string;
  lat: number;
  lng: number;
}
const PERSONAS: PersonaSeed[] = [
  { clave: 'camila', nombre: 'Camila Rojas Vílchez', email: 'camila@estudiantes.demo.pe', direccion: 'Urb. San Eduardo, Piura', lat: -5.18, lng: -80.64 },
  { clave: 'diego', nombre: 'Diego Farfán Ruiz', email: 'diego@estudiantes.demo.pe', direccion: 'Urb. Miraflores, Castilla, Piura', lat: -5.2, lng: -80.61 },
  { clave: 'valeria', nombre: 'Valeria Chunga Neira', email: 'valeria@estudiantes.demo.pe', direccion: 'Av. Grau, centro de Piura', lat: -5.19, lng: -80.63 },
  { clave: 'luis', nombre: 'Luis Zapata Correa', email: 'luis@estudiantes.demo.pe', direccion: 'Urb. Santa Isabel, Piura', lat: -5.18, lng: -80.65 },
  { clave: 'andrea', nombre: 'Andrea Silupú Marchena', email: 'andrea@estudiantes.demo.pe', direccion: 'Urb. Los Ejidos del Norte, Piura', lat: -5.17, lng: -80.66 },
];
const LOTES_PERSONAS: Record<string, L[]> = {
  camila: [
    { categoriaCodigo: 'ARTICULOS_PERSONALES', titulo: 'Libros de ingeniería industrial (5 textos)', descripcion: 'Cinco libros de ingeniería industrial usados durante dos ciclos: estadística, investigación de operaciones y procesos de manufactura. Buen estado, con pocos subrayados a lápiz.', cantidad: 5, modalidad: 'VENTA', precio: 25, keywords: ['libros', 'ingeniería', 'texto', 'universidad'] },
    { categoriaCodigo: 'ARTICULOS_PERSONALES', titulo: 'Ropa de abrigo talla S y M', descripcion: 'Ocho prendas de abrigo (casacas, polos manga larga y un chaleco) en buen estado, lavadas. Las dono por cambio de ciudad.', cantidad: 8, modalidad: 'DONACION', keywords: ['ropa', 'abrigo', 'casacas', 'donación'] },
  ],
  diego: [
    { categoriaCodigo: 'ARTICULOS_PERSONALES', titulo: 'Frigobar 90 L en buen estado', descripcion: 'Frigobar de 90 litros, funciona perfecto y enfría bien. Lo vendo porque me mudé a un departamento amoblado. Entrega en Castilla.', cantidad: 1, modalidad: 'VENTA', precio: 280, keywords: ['frigobar', 'refrigeradora', 'electrodoméstico'] },
    { categoriaCodigo: 'ARTICULOS_PERSONALES', titulo: 'Escritorio plegable de cuarto', descripcion: 'Escritorio plegable de melamina, ideal para cuartos pequeños. Resistente y fácil de trasladar.', cantidad: 1, modalidad: 'CREDITOS', precio: 60, keywords: ['escritorio', 'mueble', 'cuarto'] },
  ],
  valeria: [
    { categoriaCodigo: 'VIDRIO_CERAMICA', unidad: 'und', titulo: 'Frascos de vidrio con tapa (30 unidades)', descripcion: 'Treinta frascos de vidrio con tapa, lavados, de mermelada y conservas. Sirven para guardar alimentos o hacer manualidades.', cantidad: 30, modalidad: 'DONACION', keywords: ['frascos', 'vidrio', 'tapa'], condicion: 'BUEN_ESTADO' },
    { categoriaCodigo: 'ARTICULOS_PERSONALES', titulo: 'Útiles y cuadernos del semestre pasado', descripcion: 'Doce cuadernos, resaltadores, reglas y carpetas del semestre pasado, la mayoría sin usar. Ideales para quien empieza el ciclo.', cantidad: 12, modalidad: 'DONACION', keywords: ['útiles', 'cuadernos', 'semestre'] },
    { categoriaCodigo: 'ARTICULOS_PERSONALES', titulo: 'Zapatillas de running talla 38', descripcion: 'Zapatillas de running talla 38, usadas pocas veces y en muy buen estado.', cantidad: 1, modalidad: 'INTERCAMBIO', notaIntercambio: 'Busco libros de ciencias o un ventilador pequeño.', keywords: ['zapatillas', 'running', 'deporte'] },
  ],
  luis: [
    { categoriaCodigo: 'RAEE', unidad: 'und', titulo: 'Laptop con pantalla rota (para repuestos)', descripcion: 'Laptop de 2018 con la pantalla rota; la placa, el teclado y el disco funcionan. Se vende como repuestos o para reparar. Borraré los datos antes de entregarla.', cantidad: 1, modalidad: 'VENTA', precio: 120, keywords: ['laptop', 'repuestos', 'raee'], condicion: 'PARA_REPARAR' },
    { categoriaCodigo: 'ARTICULOS_PERSONALES', titulo: 'Silla ergonómica de estudio', descripcion: 'Silla ergonómica con respaldo regulable, cómoda para largas horas de estudio. Ligero desgaste en los brazos.', cantidad: 1, modalidad: 'VENTA', precio: 90, keywords: ['silla', 'ergonómica', 'estudio'] },
    { categoriaCodigo: 'ARTICULOS_PERSONALES', titulo: 'Ventilador de pie', descripcion: 'Ventilador de pie con tres velocidades y altura regulable, funciona muy bien. Útil para el calor de Piura.', cantidad: 1, modalidad: 'VENTA', precio: 60, keywords: ['ventilador', 'electrodoméstico'] },
    { categoriaCodigo: 'ARTICULOS_PERSONALES', titulo: 'Hervidor eléctrico y licuadora pequeña', descripcion: 'Un hervidor eléctrico de 1,7 L y una licuadora pequeña, ambos funcionando. Ideales para un cuarto de estudiante.', cantidad: 2, modalidad: 'INTERCAMBIO', notaIntercambio: 'Acepto útiles de cocina, libros o zapatillas.', keywords: ['hervidor', 'licuadora', 'cocina'] },
  ],
  andrea: [
    { categoriaCodigo: 'ARTICULOS_PERSONALES', titulo: 'Vestidos y blusas talla M (12 prendas)', descripcion: 'Doce prendas talla M (vestidos y blusas) en muy buen estado. Las cambio por ropa de otra talla o por útiles de dibujo.', cantidad: 12, modalidad: 'INTERCAMBIO', notaIntercambio: 'Busco ropa talla S o útiles de dibujo técnico.', keywords: ['ropa', 'vestidos', 'blusas', 'talla M'] },
    { categoriaCodigo: 'ARTICULOS_PERSONALES', titulo: 'Calculadora científica Casio fx-991', descripcion: 'Calculadora científica Casio fx-991 en buen estado, con su tapa. La usé en estadística y cálculo.', cantidad: 1, modalidad: 'VENTA', precio: 45, keywords: ['calculadora', 'casio', 'útiles'] },
  ],
};

/** Solo con SEED_PERSONAS=1 (la experiencia por defecto es de empresas): lotes de empresa que piden las personas del seed. */
const LOTES_PERSONAS_EMPRESA: L = { categoriaCodigo: 'MAQUINARIA_EQUIPOS', unidad: 'und', titulo: 'Escritorios y sillas de oficina en desuso', descripcion: 'Catorce escritorios y sillas de oficina retirados por renovación, en buen estado funcional. Ideales para talleres, estudiantes o pequeñas oficinas.', cantidad: 14, modalidad: 'VENTA', precio: 70, keywords: ['escritorios', 'sillas', 'mobiliario', 'oficina'] };

/** Demandantes con alertas de búsqueda (empresas que buscan materia prima). */
const ALERTAS: { empresa: string; texto: string; categoria?: string; radioKm: number }[] = [
  { empresa: 'biocompost', texto: 'Cáscara, pulpa, cachaza y descartes de fruta para compostaje', categoria: 'ORGANICO_AGRO', radioKm: 300 },
  { empresa: 'energia', texto: 'Cascarilla de arroz, bagazo de caña y biomasa para calderas', categoria: 'BIOMASA', radioKm: 250 },
  { empresa: 'metalica', texto: 'Chatarra de acero, tambores, aluminio y metales', categoria: 'METAL', radioKm: 400 },
  { empresa: 'textilrec', texto: 'Retazos y recortes de tela de algodón', categoria: 'TEXTIL', radioKm: 200 },
  { empresa: 'recipla', texto: 'Film, bidones, jabas, big bags y botellas PET para reciclado mecánico', radioKm: 400 },
  { empresa: 'cal', texto: 'Conchas de abanico, valvas y caparazones para cal y enmiendas de calcio', categoria: 'PESCA_MARISCOS', radioKm: 500 },
];
const ALERTAS_PERSONAS: typeof ALERTAS = [
  { empresa: 'diego', texto: 'Escritorio y silla para estudiar en mi cuarto', categoria: 'ARTICULOS_PERSONALES', radioKm: 20 },
  { empresa: 'valeria', texto: 'Libros de ciencias, matemática o física', categoria: 'ARTICULOS_PERSONALES', radioKm: 20 },
];

/**
 * Catálogo base que necesita la plataforma para funcionar (categorías de residuo y configuración). NO son datos de demostración:
 * es idempotente y también lo usa la primera carga de producción (`primera-carga.ts`).
 */
export async function sincronizarCatalogo(prisma: PrismaService) {
  for (const c of CATEGORIAS) {
    const f = FACTORES_IMPACTO[c.codigo];
    const u = UNIDAD_POR_CATEGORIA[c.codigo];
    const datos = { factorCo2PorTon: f.co2PorTon, factorCreditosPorTon: f.creditosPorTon, unidadBase: u?.unidadBase ?? 'ton', kgPorUnidad: u?.kgPorUnidad ?? null, familia: familiaDe(c.codigo) };
    await prisma.categoriaResiduo.upsert({ where: { codigo: c.codigo }, update: datos, create: { ...c, ...datos } });
  }
  await prisma.configPlataforma.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

/**
 * Protección: el seed BORRA datos (con SEED_RESET=1) y crea cuentas con contraseñas conocidas. En producción no debe correr por
 * accidente (por ejemplo, con la DATABASE_URL de Supabase pegada en la terminal): hace falta SEED_PERMITIR_PRODUCCION=1.
 */
export function exigirPermisoSeed(env: Record<string, string | undefined> = process.env) {
  if (env.NODE_ENV === 'production' && env.SEED_PERMITIR_PRODUCCION !== '1') {
    throw new Error('El seed de demostración no se ejecuta en producción (NODE_ENV=production). Si de verdad lo necesitas, define SEED_PERMITIR_PRODUCCION=1.');
  }
}

/** Todo lo que sembró esta ejecución es de demostración: se marca para poder ocultarlo (OCULTAR_DEMO=1). */
async function marcarDemo(prisma: PrismaService, desde: Date) {
  await prisma.empresa.updateMany({ where: { createdAt: { gte: desde } }, data: { esDemo: true } });
  await prisma.empresa.updateMany({ where: { createdAt: { gte: desde }, estadoKyb: { in: ['VERIFICADA', 'RECHAZADA'] }, metodoKyb: null }, data: { metodoKyb: 'SIMULADA' } });
}

async function main() {
  exigirPermisoSeed();
  // SEED_AGREGAR_MARKETPLACE=1: suma las cuentas y ofertas de demo del marketplace a una base que ya tiene datos (p. ej. la
  // de producción con la demo de acopiadores), sin borrar nada. Con STORAGE_DRIVER=supabase sube además las ilustraciones al
  // bucket, porque en Vercel no se sirven archivos del disco.
  const agregar = process.env.SEED_AGREGAR_MARKETPLACE === '1';
  const subirImagenes = agregar && process.env.STORAGE_DRIVER === 'supabase';
  // El seed escribe las ilustraciones en disco (driver local); al agregar en producción las URLs apuntan a Supabase Storage.
  fijarStorage(subirImagenes ? crearDriver(process.env, UPLOADS_DIR) : new LocalStorageDriver(UPLOADS_DIR));
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);
  // Hora de la base de datos (no del equipo): así el marcado de demo no depende de relojes distintos.
  const [{ ahora: inicio }] = await prisma.$queryRaw<{ ahora: Date }[]>`SELECT now() AS ahora`;
  const lotes = app.get(LotesService);
  const matching = app.get(MatchingService);
  const tx = app.get(TransaccionesService);
  const creditos = app.get(CreditosService);

  if (process.env.SEED_RESET === '1') {
    console.log('Borrando datos existentes…');
    await prisma.$executeRawUnsafe(
      'TRUNCATE "AuditoriaAdmin","Match","AlertaBusqueda","Incidencia","Calificacion","Certificado","CreditoMovimiento","MensajeChat","Transaccion","LoteImagen","Lote","EmpresaCertificacion","Usuario","Empresa","CategoriaResiduo","ConfigPlataforma" RESTART IDENTITY CASCADE',
    );
  }

  // Categorías, configuración y admin
  // Las categorías se sincronizan siempre (idempotente): así una base existente recibe las nuevas y sus unidades.
  await sincronizarCatalogo(prisma);
  if (agregar && (await prisma.usuario.findFirst({ where: { email: 'carlos@biocompost.pe' } }))) {
    console.log('Las cuentas de demo del marketplace ya existen. Nada más que hacer.');
    return app.close();
  }
  if (!agregar && process.env.SEED_RESET !== '1' && (await prisma.lote.count()) > 0) {
    console.log('La base ya tiene datos de demo (categorías sincronizadas); usa SEED_RESET=1 para recrearlos. Nada más que hacer.');
    return app.close();
  }
  // Modo B2B2B (por defecto): demostración para intermediarios. El seed de abajo es el del marketplace.
  if (modo() === 'B2B2B' && !agregar) {
    await sembrarB2B(app);
    await marcarDemo(prisma, inicio);
    return app.close();
  }
  const hash = await bcrypt.hash('demo1234', 10);
  if (!(await prisma.usuario.findFirst({ where: { email: 'admin@swapit.pe' } }))) {
    const adminEmp = await prisma.empresa.create({ data: { ruc: construirRuc('2000000001'), razonSocial: 'Swap It Moderación', rol: 'AMBOS', direccion: 'Piura, Perú', representanteLegal: 'Equipo Swap It', estadoKyb: 'VERIFICADA', metodoKyb: 'SIMULADA', esDemo: true } });
    await prisma.usuario.create({ data: { email: 'admin@swapit.pe', nombre: 'Admin Swap It', passwordHash: await bcrypt.hash('admin12345', 10), rol: 'ADMIN', empresaId: adminEmp.id } });
  }

  // Empresas
  const actor: Record<string, JwtPayload> = {};
  const empresaId: Record<string, string> = {};
  for (const e of EMPRESAS) {
    const emp = await prisma.empresa.create({
      data: {
        ruc: construirRuc(e.base), razonSocial: e.razonSocial, ciiu: e.ciiu, rol: e.rol, direccion: e.direccion, representanteLegal: e.rep, estadoKyb: 'VERIFICADA', metodoKyb: 'SIMULADA', esDemo: true, confidencial: !!e.confidencial,
        // Contacto ficticio (para ver el intercambio de contacto tras el acuerdo): +51 900 000 0NN.
        contactoNombre: e.usuario.nombre, telefono: `+519000000${String(EMPRESAS.indexOf(e) + 10).padStart(2, '0')}`,
        certificaciones: { create: (e.certs ?? []).map((nombre) => ({ nombre })) },
      },
    });
    await prisma.$executeRaw`UPDATE "Empresa" SET ubicacion = ST_SetSRID(ST_MakePoint(${e.lng}, ${e.lat}), 4326)::geography WHERE id = ${emp.id}`;
    const u = await prisma.usuario.create({ data: { empresaId: emp.id, email: e.usuario.email, nombre: e.usuario.nombre, passwordHash: hash } });
    actor[e.clave] = { sub: u.id, empresaId: emp.id, rol: 'EMPRESA' };
    empresaId[e.clave] = emp.id;
    // Ajuste inicial de demostración: permite probar pagos con créditos desde el primer día.
    if (e.rol !== 'OFERTANTE') await creditos.registrar({ empresaId: emp.id, tipo: 'AJUSTE', monto: 200, descripcion: 'Bono de bienvenida circular (demo)', clave: `bienvenida:${emp.id}` });
  }
  console.log(`✓ ${EMPRESAS.length} empresas`);

  // Personas naturales: cuenta sin RUC ni KYB; el nombre público oculta el apellido completo.
  for (const p of PERSONAS) {
    const emp = await prisma.empresa.create({ data: { tipo: 'PERSONA', razonSocial: nombrePublico(p.nombre), rol: 'AMBOS', direccion: p.direccion, estadoKyb: 'NO_APLICA', esDemo: true } });
    await prisma.$executeRaw`UPDATE "Empresa" SET ubicacion = ST_SetSRID(ST_MakePoint(${p.lng}, ${p.lat}), 4326)::geography WHERE id = ${emp.id}`;
    const u = await prisma.usuario.create({ data: { empresaId: emp.id, email: p.email, nombre: p.nombre, passwordHash: hash } });
    actor[p.clave] = { sub: u.id, empresaId: emp.id, rol: 'EMPRESA', tipo: 'PERSONA' };
    empresaId[p.clave] = emp.id;
    await creditos.registrar({ empresaId: emp.id, tipo: 'AJUSTE', monto: 50, descripcion: 'Bono de bienvenida circular (demo)', clave: `bienvenida:${emp.id}` });
  }
  console.log(`✓ ${PERSONAS.length} personas`);

  // Lotes de empresas, con sus ilustraciones SVG (1–3 por lote) en UPLOADS_DIR
  const conPersonas = process.env.SEED_PERSONAS === '1'; // por defecto la demo es solo de empresas (los lotes de personas no se publican)
  const loteId: Record<string, string> = {};
  const crearLoteEmpresa = async (clave: string, l: LoteSeed) => {
    const { id, foto, fotos, ...datos } = l;
    const imagenes = escribirImagenesDemo(`${clave}-${id}`, foto, colorDe(l.categoriaCodigo), fotos, l.titulo);
    if (subirImagenes) {
      for (const n of imagenes) await storage().guardar(n, readFileSync(join(UPLOADS_DIR, n)), 'image/svg+xml').catch((e) => console.warn(`No se pudo subir ${n}: ${(e as Error).message}`));
    }
    const creado = await lotes.crear(empresaId[clave], { keywords: [], aceptaCreditos: false, frecuencia: 'UNICO', imagenes, entrega: 'RECOJO_RECEPTOR', ...datos });
    loteId[`${clave}:${id}`] = creado.id;
    return creado.id;
  };
  let nImagenes = 0;
  for (const [clave, lista] of Object.entries(LOTES)) for (const l of lista) { await crearLoteEmpresa(clave, l); nImagenes += l.fotos; }
  const idLote = (clave: string, id: string) => {
    const v = loteId[`${clave}:${id}`];
    if (!v) throw new Error(`Lote no encontrado: ${clave}:${id}`);
    return v;
  };
  let nLotesSembrados = Object.values(LOTES).flat().length;
  if (conPersonas) {
    for (const [clave, lista] of Object.entries(LOTES_PERSONAS)) {
      for (const l of lista) {
        const creado = await lotes.crear(empresaId[clave], { keywords: [], aceptaCreditos: false, frecuencia: 'UNICO', imagenes: [], entrega: 'PUNTO_ENCUENTRO', condicion: 'BUEN_ESTADO', ...l });
        loteId[`${clave}:${l.titulo.slice(0, 22)}`] = creado.id;
        nLotesSembrados++;
      }
    }
    const esc = await lotes.crear(empresaId['norandina'], { keywords: [], aceptaCreditos: false, frecuencia: 'UNICO', imagenes: [], entrega: 'RECOJO_RECEPTOR', ...LOTES_PERSONAS_EMPRESA });
    loteId['norandina:escritorios'] = esc.id;
    nLotesSembrados++;
  }
  const idLoteP = (clave: string, inicio: string) => {
    const k = Object.keys(loteId).find((x) => x.startsWith(`${clave}:${inicio.slice(0, 22)}`));
    if (!k) throw new Error(`Lote no encontrado: ${clave} ${inicio}`);
    return loteId[k];
  };
  console.log(`✓ ${nLotesSembrados} lotes (${Object.values(LOTES).flat().length} de empresas con ${nImagenes} imágenes)`);

  // ---------- Transacciones (conducidas por el servicio real) ----------
  const ago = (dias: number) => new Date(Date.now() - dias * 86400_000).toISOString();
  const retro = async (id: string, dias: number) => {
    await prisma.$executeRaw`UPDATE "Transaccion" SET "createdAt" = now() - make_interval(days => (${dias + 3})::int), "updatedAt" = now() - make_interval(days => (${dias})::int) WHERE id = ${id}`;
    await prisma.$executeRaw`UPDATE "Certificado" SET "createdAt" = now() - make_interval(days => (${dias})::int) WHERE "transaccionId" = ${id}`;
    await prisma.$executeRaw`UPDATE "CreditoMovimiento" SET "createdAt" = now() - make_interval(days => (${dias})::int) WHERE "transaccionId" = ${id}`;
    await prisma.$executeRaw`UPDATE "Calificacion" SET "createdAt" = now() - make_interval(days => (${dias})::int) WHERE "transaccionId" = ${id}`;
    await prisma.$executeRaw`UPDATE "MensajeChat" SET "createdAt" = "createdAt" - make_interval(days => (${dias})::int) WHERE "transaccionId" = ${id}`;
  };

  /** Recorre el flujo hasta el estado pedido (por defecto, hasta la entrega firmada y las calificaciones). `ofertado`: precio que ofrece el demandante en la solicitud. */
  async function flujo(o: { receptor: string; ofertante: string; lote: string; cantidad: number; precio?: number; ofertado?: number; dias: number; uso?: string; comisionConCreditos?: boolean; loteIntercambioId?: string; calificar?: [number, string, number, string]; hasta?: 'solicitado' | 'negociacion' | 'acordado' | 'pago' | 'recojo' | 'firma1' | 'entregado' | 'cerrado'; propone?: 'OFERTANTE' | 'RECEPTOR'; mensaje?: string }) {
    const hasta = o.hasta ?? 'cerrado';
    const R = actor[o.receptor];
    const O = actor[o.ofertante];
    const casual = PERSONAS.some((p) => p.clave === o.receptor || p.clave === o.ofertante);
    const { id } = await tx.solicitar(R, { loteId: o.lote, cantidad: o.cantidad, precioOfertado: o.ofertado, mensaje: o.mensaje ?? (casual ? 'Hola, ¿todavía está disponible? Me interesa, ¿coordinamos la entrega?' : 'Buenos días, nos interesa este lote para nuestra operación. ¿Podemos coordinar cantidad y recojo?') });
    if (hasta === 'solicitado') return id;
    await tx.mensaje(O, id, casual ? 'Hola, sí, sigue disponible. Te propongo estas condiciones y coordinamos un punto de encuentro.' : 'Hola, gracias por el interés. Sí, tenemos disponibilidad. Te comparto una propuesta de condiciones.');
    if (hasta === 'negociacion') {
      await tx.proponer(O, id, { cantidad: o.cantidad, precioAcordado: o.precio, fechaRecojo: ago(-5), responsableRecojo: 'Transportista del receptor', pagarComisionConCreditos: o.comisionConCreditos, loteIntercambioId: o.loteIntercambioId });
      return id;
    }
    const propone = o.propone ?? 'OFERTANTE';
    await tx.proponer(actor[propone === 'OFERTANTE' ? o.ofertante : o.receptor], id, { cantidad: o.cantidad, precioAcordado: o.precio, fechaRecojo: ago(o.dias - 2), responsableRecojo: 'Transportista del receptor', pagarComisionConCreditos: o.comisionConCreditos, loteIntercambioId: o.loteIntercambioId });
    await tx.aceptar(propone === 'OFERTANTE' ? R : O, id);
    if (hasta === 'acordado') return id;
    const lote = await prisma.lote.findUniqueOrThrow({ where: { id: o.lote } });
    if (lote.modalidad !== 'DONACION' && lote.modalidad !== 'INTERCAMBIO') await tx.pagar(R, id);
    if (hasta === 'pago') return id;
    await tx.confirmarRecojo(R, id, { fechaRecojo: ago(o.dias - 2), responsableRecojo: 'Transportista del receptor' });
    if (hasta === 'recojo') return id;
    await tx.firmarEntrega(O, id, {});
    if (hasta === 'firma1') return id;
    await tx.firmarEntrega(R, id, { usoFinalDeclarado: o.uso });
    if (hasta === 'entregado') return id;
    if (o.calificar) {
      await tx.calificar(R, id, { estrellas: o.calificar[0], comentario: o.calificar[1] });
      await tx.calificar(O, id, { estrellas: o.calificar[2], comentario: o.calificar[3] });
    }
    return id;
  }

  // Cerradas y retro-fechadas (alimentan el impacto, los créditos, los certificados y la reputación): cerca de 200 t intercambiadas
  const cerradas: Parameters<typeof flujo>[0][] = [
    { receptor: 'forraje', ofertante: 'vallesol', lote: idLote('vallesol', 'uva'), cantidad: 8, dias: 150, uso: 'Formulación de alimento para ganado lechero', calificar: [5, 'Material fresco y bien presentado, recojo puntual.', 5, 'Excelente comunicación, siguen las pautas de higiene.'] },
    { receptor: 'biocompost', ofertante: 'vallesol', lote: idLote('vallesol', 'arandano'), cantidad: 12, precio: 85, ofertado: 80, dias: 120, uso: 'Compostaje industrial y biofertilizante', comisionConCreditos: true, calificar: [5, 'Cáscara de arándano de muy buena calidad para nuestro compost.', 4, 'Cumplieron con el pago y la hora de recojo.'] },
    { receptor: 'energia', ofertante: 'molinos', lote: idLote('molinos', 'cascarilla'), cantidad: 40, precio: 130, ofertado: 125, dias: 95, uso: 'Combustible para caldera de biomasa', calificar: [5, 'Cascarilla seca, exactamente como se describió.', 5, 'Cliente serio y pagos en garantía sin observaciones.'] },
    { receptor: 'metalica', ofertante: 'talara', lote: idLote('talara', 'chatarra'), cantidad: 6, precio: 1050, dias: 80, uso: 'Fundición y laminado', calificar: [4, 'Buena chatarra, algo de óxido superficial.', 5, 'Retiraron todo en el día acordado.'] },
    { receptor: 'ecoempaques', ofertante: 'vallesol', lote: idLote('vallesol', 'esparrago'), cantidad: 20, precio: 60, dias: 62, uso: 'Fibra para empaques biodegradables', calificar: [5, 'Fibra consistente, muy útil para nuestra línea de bandejas.', 5, 'Proceso rápido y ordenado.'] },
    { receptor: 'recipla', ofertante: 'arfp', lote: idLote('arfp', 'pet'), cantidad: 10, precio: 950, ofertado: 920, dias: 45, uso: 'Reciclado mecánico a hojuela de PET', calificar: [5, 'Pacas bien clasificadas y prensadas.', 5, 'Compradores formales, todo con certificado.'] },
    { receptor: 'biocompost', ofertante: 'canaverde', lote: idLote('canaverde', 'cachaza'), cantidad: 4, precio: 30, dias: 40, uso: 'Enmienda orgánica para compost', calificar: [4, 'Cachaza bien madurada; pagamos con créditos sin problema.', 5, 'Muy buena coordinación.'] },
    { receptor: 'cal', ofertante: 'bahia', lote: idLote('bahia', 'valvas-trituradas'), cantidad: 15, precio: 55, dias: 38, uso: 'Molienda para cal agrícola', calificar: [5, 'Valvas limpias y con el tamaño que pedimos.', 5, 'Recojo ordenado en Parachique.'] },
    { receptor: 'recipla', ofertante: 'bebidas', lote: idLote('bebidas', 'film'), cantidad: 6, precio: 800, dias: 33, uso: 'Peletizado de film', calificar: [5, 'Film limpio y bien enfardado.', 5, 'Cliente puntual.'] },
    { receptor: 'textilrec', ofertante: 'pima', lote: idLote('pima', 'pima-retazos'), cantidad: 2.5, precio: 520, dias: 27, uso: 'Reciclado textil y relleno', calificar: [5, 'Algodón de gran calidad, tal como se describió.', 5, 'Proceso formal y rápido.'] },
    { receptor: 'ecoempaques', ofertante: 'tumbesagro', lote: idLote('tumbesagro', 'cacao'), cantidad: 6, precio: 70, dias: 22, uso: 'Fibra para empaques biodegradables', calificar: [5, 'Cáscara fresca, buen aporte de fibra.', 5, 'Cliente serio.'] },
    { receptor: 'tallan', ofertante: 'plasticos', lote: idLote('plasticos', 'film-agricola'), cantidad: 4, dias: 18, uso: 'Reciclado mecánico y reúso de film', loteIntercambioId: idLote('tallan', 'bigbags'), calificar: [5, 'El film llegó limpio; buen intercambio por los big bags.', 5, 'Big bags en buen estado, tal como se describieron.'] },
    { receptor: 'energia', ofertante: 'canaverde', lote: idLote('canaverde', 'bagazo-cana'), cantidad: 60, precio: 95, dias: 14, uso: 'Combustible para caldera de biomasa', calificar: [5, 'Bagazo con la humedad prometida.', 5, 'Pagos en garantía sin observaciones.'] },
    { receptor: 'recipla', ofertante: 'tallan', lote: idLote('tallan', 'film-cobertura'), cantidad: 3, precio: 650, dias: 9, uso: 'Reciclado mecánico de film agrícola', calificar: [5, 'Film seco y enrollado, sin tierra.', 5, 'Todo formal y con certificado de destino final.'] },
  ];
  if (conPersonas) {
    cerradas.push(
      { receptor: 'diego', ofertante: 'camila', lote: idLoteP('camila', 'Libros de ingeniería industrial'), cantidad: 3, precio: 25, dias: 40, uso: 'Estudio personal', calificar: [5, 'Los libros estaban tal cual la descripción. Muy amable.', 5, 'Diego llegó puntual al punto de encuentro.'] },
      { receptor: 'valeria', ofertante: 'camila', lote: idLoteP('camila', 'Ropa de abrigo talla S'), cantidad: 4, dias: 25, uso: 'Uso personal', calificar: [5, 'Ropa en muy buen estado, ¡gracias!', 5, 'Todo bien coordinado.'] },
      { receptor: 'luis', ofertante: 'valeria', lote: idLoteP('valeria', 'Zapatillas de running talla 38'), cantidad: 1, dias: 12, uso: 'Uso personal', loteIntercambioId: idLoteP('luis', 'Hervidor eléctrico y licuadora'), calificar: [4, 'Buen intercambio, las zapatillas están como nuevas.', 5, 'Rápida y confiable.'] },
      { receptor: 'luis', ofertante: 'norandina', lote: idLote('norandina', 'escritorios'), cantidad: 2, precio: 70, dias: 8, uso: 'Uso personal (estudio)', calificar: [5, 'Escritorio resistente; el retiro fue ordenado.', 5, 'Comprador amable y puntual.'] },
      { receptor: 'textilrec', ofertante: 'camila', lote: idLoteP('camila', 'Ropa de abrigo talla S'), cantidad: 4, dias: 6, uso: 'Reúso y reciclado textil', calificar: [5, 'Prendas limpias y bien clasificadas, gracias por la donación.', 5, 'Buena atención de la empresa, todo formal.'] },
    );
  }
  for (const o of cerradas) {
    const id = await flujo(o);
    await retro(id, o.dias);
  }
  // Incidencia de ejemplo (visible solo para moderación)
  const tIncidencia = await prisma.transaccion.findFirst({ where: { ofertanteId: empresaId['talara'] }, select: { id: true } });
  if (tIncidencia) await tx.reportarIncidencia(actor['metalica'], tIncidencia.id, { tipo: 'MATERIAL_NO_CORRESPONDE', detalle: 'Aproximadamente 5% de la carga tenía óxido y restos de pintura naval; se acordó un descuento verbal.' });

  // En curso: una por cada estado, para mostrar el flujo en vivo
  // Solicitadas con precio ofertado por el demandante (aún sin respuesta)
  await flujo({ receptor: 'forraje', ofertante: 'molinos', lote: idLote('molinos', 'polvillo'), cantidad: 10, ofertado: 190, dias: 0, hasta: 'solicitado', mensaje: 'Buenos días, ofrecemos S/ 190 por tonelada de polvillo, con recojo propio cada semana. ¿Les parece?' });
  await flujo({ receptor: 'recipla', ofertante: 'tallan', lote: idLote('tallan', 'jabas'), cantidad: 3, ofertado: 740, dias: 0, hasta: 'solicitado', mensaje: 'Nos interesan 3 t de jabas para molienda; ofrecemos S/ 740 por tonelada.' });
  await flujo({ receptor: 'metalica', ofertante: 'arfp', lote: idLote('arfp', 'latas'), cantidad: 2, ofertado: 1700, dias: 0, hasta: 'solicitado', mensaje: 'Nos interesa el aluminio; ofrecemos S/ 1 700 por tonelada, ¿hay más disponibilidad este mes?' });
  await flujo({ receptor: 'ecoempaques', ofertante: 'canaverde', lote: idLote('canaverde', 'bagazo-cana'), cantidad: 20, ofertado: 90, dias: 0, hasta: 'solicitado' });
  // En negociación
  await flujo({ receptor: 'biocompost', ofertante: 'losandes', lote: idLote('losandes', 'limon'), cantidad: 15, precio: 88, ofertado: 85, dias: 0, hasta: 'negociacion' });
  await flujo({ receptor: 'cal', ofertante: 'tumbesmar', lote: idLote('tumbesmar', 'langostino'), cantidad: 8, precio: 60, ofertado: 55, dias: 0, hasta: 'negociacion' });
  // Acordadas (a la espera del pago en garantía)
  await flujo({ receptor: 'textilrec', ofertante: 'pima', lote: idLote('pima', 'pima-retazos'), cantidad: 3, precio: 500, dias: 4, hasta: 'acordado', propone: 'RECEPTOR' });
  await flujo({ receptor: 'bebidas', ofertante: 'talara', lote: idLote('talara', 'tambores'), cantidad: 2, dias: 5, hasta: 'acordado', loteIntercambioId: idLote('bebidas', 'pallets') });
  // Pagada en garantía, recojo y firma
  await flujo({ receptor: 'forraje', ofertante: 'tumbesagro', lote: idLote('tumbesagro', 'banano'), cantidad: 10, precio: 45, dias: 6, hasta: 'pago' });
  await flujo({ receptor: 'energia', ofertante: 'molinos', lote: idLote('molinos', 'cascarilla'), cantidad: 30, precio: 128, dias: 3, hasta: 'firma1' });
  await flujo({ receptor: 'textilrec', ofertante: 'pima', lote: idLote('pima', 'pima-mermas'), cantidad: 2, dias: 2, hasta: 'entregado', uso: 'Relleno textil' });
  const cancelada = await flujo({ receptor: 'forraje', ofertante: 'losandes', lote: idLote('losandes', 'mango'), cantidad: 10, precio: 40, dias: 5, hasta: 'acordado' });
  await tx.cancelar(actor['forraje'], cancelada, 'cambió el calendario de producción');
  if (conPersonas) {
    await flujo({ receptor: 'diego', ofertante: 'luis', lote: idLoteP('luis', 'Ventilador de pie'), cantidad: 1, precio: 60, dias: 3, hasta: 'pago' });
    await flujo({ receptor: 'andrea', ofertante: 'luis', lote: idLoteP('luis', 'Silla ergonómica de estudio'), cantidad: 1, precio: 80, dias: 0, hasta: 'negociacion' });
    await tx.solicitar(actor['andrea'], { loteId: idLoteP('diego', 'Frigobar 90 L'), cantidad: 1, mensaje: 'Hola Diego, ¿todavía tienes el frigobar? Podría recogerlo el fin de semana.' });
  }
  console.log('✓ transacciones en todos los estados');

  // Alertas de búsqueda (generan matches sobre los lotes publicados)
  for (const a of [...ALERTAS, ...(conPersonas ? ALERTAS_PERSONAS : [])]) await matching.crearAlerta(empresaId[a.empresa], { texto: a.texto, categoriaCodigo: a.categoria, radioKm: a.radioKm });
  // Un lote nuevo tras crearse las alertas: aparece como match «nuevo» (notificación)
  await crearLoteEmpresa('losandes', LOTE_NUEVO);
  nLotesSembrados++;
  nImagenes += LOTE_NUEVO.fotos;
  if (conPersonas) await lotes.crear(empresaId['andrea'], { categoriaCodigo: 'ARTICULOS_PERSONALES', titulo: 'Libros de cálculo y álgebra (4 textos)', descripcion: 'Cuatro libros de cálculo diferencial, álgebra lineal y física general, en buen estado. Los vendo al terminar el ciclo.', cantidad: 4, modalidad: 'VENTA', precio: 20, keywords: ['libros', 'cálculo', 'álgebra', 'física'], aceptaCreditos: false, frecuencia: 'UNICO', imagenes: [], entrega: 'PUNTO_ENCUENTRO', condicion: 'BUEN_ESTADO' });
  console.log(`✓ ${ALERTAS.length} alertas de búsqueda de empresas demandantes; ${nImagenes} imágenes SVG en UPLOADS_DIR`);

  const [nEmp, nPers, nLotes, nTx, nCert] = await Promise.all([prisma.empresa.count({ where: { tipo: 'EMPRESA' } }), prisma.empresa.count({ where: { tipo: 'PERSONA' } }), prisma.lote.count(), prisma.transaccion.count(), prisma.certificado.count()]);
  console.log(`Seed OK — empresas: ${nEmp}, personas: ${nPers}, lotes: ${nLotes}, transacciones: ${nTx}, certificados: ${nCert}`);
  console.log('Cuentas demo (contraseña demo1234): OFERTANTES ana@vallesol.pe · luis@losandes.pe · jorge@molinosnorte.pe · patricia@agrotallan.pe · wilmer@sitalara.pe (confidencial) · DEMANDANTES carlos@biocompost.pe · henry@plastirecicla.pe · sandra@energiaverde.pe · rocio@calizassechura.pe · admin@swapit.pe (admin12345)');
  await marcarDemo(prisma, inicio);
  console.log('Cuentas de personas (sin lotes salvo SEED_PERSONAS=1): camila@estudiantes.demo.pe · diego@estudiantes.demo.pe');
  await app.close();
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
