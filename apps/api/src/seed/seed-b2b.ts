/**
 * Seed de demostración del modelo B2B2B (Swapit para intermediarios). TODOS los datos son ficticios: empresas, RUC,
 * teléfonos, precios y logos. Los precios de referencia vienen de la «semilla» del benchmark (datos de ejemplo) y de
 * los acopios de esta misma demo; no son precios de mercado.
 * Cuentas (contraseña demo1234): gerencia@acopiostallanes.pe (suscripción activa) · operaciones@reciclajesnorte.pe (sin suscripción).
 */
import type { INestApplicationContext } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { construirRuc, normalizarTelefono, type CrearProveedorInput, type DestinoInput, type ReporteCaptacionInput } from '@swapit/shared';
import { BenchmarkService } from '../benchmark/benchmark.service';
import { AcuerdosService } from '../acuerdos/acuerdos.service';
import { CertificadosService } from '../certificados/certificados.service';
import { DestinosService } from '../destinos/destinos.service';
import { UPLOADS_DIR, urlArchivo } from '../common/uploads';
import { EmpresasService } from '../empresas/empresas.service';
import { FacturacionService } from '../facturacion/facturacion.service';
import { MaterialService } from '../material/material.service';
import { PrismaService } from '../prisma/prisma.service';

// ---------- Logos de demostración (PNG generado, sin dependencias) ----------

const crcTabla = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (b: Buffer) => {
  let c = 0xffffffff;
  for (const x of b) c = crcTabla[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (tipo: string, datos: Buffer) => {
  const t = Buffer.from(tipo, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(datos.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, datos])));
  return Buffer.concat([len, t, datos, crc]);
};

/** Emblema simple (cuadrado redondeado con un anillo blanco) del color de la marca. */
function logoPng(hex: string, size = 120): Buffer {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const filas: Buffer[] = [];
  const c = size / 2;
  for (let y = 0; y < size; y++) {
    const fila = Buffer.alloc(1 + size * 4);
    for (let x = 0; x < size; x++) {
      const dx = x - c + 0.5;
      const dy = y - c + 0.5;
      const d = Math.hypot(dx, dy);
      const esquina = Math.max(Math.abs(dx), Math.abs(dy)) > c - 4 && Math.hypot(Math.max(Math.abs(dx) - (c - 22), 0), Math.max(Math.abs(dy) - (c - 22), 0)) > 18;
      const anillo = d > size * 0.2 && d < size * 0.34;
      const punto = d < size * 0.09;
      const o = 1 + x * 4;
      if (esquina) fila.writeUInt32BE(0, o);
      else if (anillo || punto) fila.writeUInt32BE(0xffffffff, o);
      else {
        fila[o] = r;
        fila[o + 1] = g;
        fila[o + 2] = b;
        fila[o + 3] = 255;
      }
    }
    filas.push(fila);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.concat(filas))), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- Datos ----------

interface IntermediarioSeed {
  clave: string;
  base: string;
  razonSocial: string;
  direccion: string;
  lat: number;
  lng: number;
  email: string;
  nombre: string;
  color: string;
}
const INTERMEDIARIOS: IntermediarioSeed[] = [
  { clave: 'tallanes', base: '2061000001', razonSocial: 'Acopios Tallanes SAC', direccion: 'Av. Sánchez Cerro 1850, Piura', lat: -5.1861, lng: -80.6422, email: 'gerencia@acopiostallanes.pe', nombre: 'Rosa Ipanaqué', color: '#0f766e' },
  { clave: 'norte', base: '2061000002', razonSocial: 'Reciclajes del Norte SAC', direccion: 'Zona Industrial, Sullana', lat: -4.9012, lng: -80.6924, email: 'operaciones@reciclajesnorte.pe', nombre: 'Julio Chávez', color: '#1d4ed8' },
];

interface ProveedorSeed extends CrearProveedorInput {
  clave: string;
  intermediario: string;
}
const PROVEEDORES: ProveedorSeed[] = [
  { clave: 'pacifico', intermediario: 'tallanes', razonSocial: 'Plásticos del Pacífico SAC', ruc: construirRuc('2062000001'), direccion: 'Zona Industrial, Sechura', contactoNombre: 'Gabriela Farfán', telefono: '900000101', ciiu: '2220', sector: 'MANUFACTURA', tipoActor: 'PLANTA_PROCESADORA' },
  { clave: 'bebidas', intermediario: 'tallanes', razonSocial: 'Bebidas Tallán del Norte SA', ruc: construirRuc('2062000002'), direccion: 'Av. Chulucanas 1100, Piura', contactoNombre: 'Fernando Lama', telefono: '900000102', ciiu: '1104', sector: 'MANUFACTURA', tipoActor: 'PLANTA_PROCESADORA' },
  { clave: 'olivos', intermediario: 'tallanes', razonSocial: 'Agrícola Los Olivos SAC', ruc: construirRuc('2062000003'), direccion: 'Carretera Piura - Catacaos km 12, Piura', contactoNombre: 'Luis Ramírez', telefono: '900000103', ciiu: '0126', sector: 'AGRO', tipoActor: 'PRODUCTOR_EXPORTADOR' },
  { clave: 'textil', intermediario: 'tallanes', razonSocial: 'Textiles Piura Pima SAC', ruc: construirRuc('2062000004'), direccion: 'Av. Sánchez Cerro 1450, Piura', contactoNombre: 'Milagros Neyra', telefono: '900000104', ciiu: '1313', sector: 'TEXTIL', tipoActor: 'PLANTA_PROCESADORA' },
  { clave: 'bahia', intermediario: 'tallanes', razonSocial: 'Acuícola Bahía de Sechura SAC', ruc: construirRuc('2062000005'), direccion: 'Puerto de Parachique, Sechura', contactoNombre: 'Nelly Ipanaqué', telefono: '900000105', ciiu: '0321', sector: 'PESCA', tipoActor: 'PLANTA_PROCESADORA' },
  { clave: 'pepe', intermediario: 'tallanes', razonSocial: 'Recolector Don Pepe', direccion: 'Sullana, Piura', contactoNombre: 'José Pepe Alburqueque', telefono: '900000106', notasInternas: 'Recolector independiente, sin RUC; recoge botellas y latas en Sullana.', sector: 'OTRO', tipoActor: 'ACOPIADOR' },
  { clave: 'mango', intermediario: 'tallanes', razonSocial: 'Mangos del Valle SAC', ruc: construirRuc('2062000008'), direccion: 'Valle de San Lorenzo, Piura', contactoNombre: 'Patricia Gómez', telefono: '900000107', sector: 'AGRO', tipoActor: 'PRODUCTOR_EXPORTADOR' },
  { clave: 'asociacion', intermediario: 'tallanes', razonSocial: 'Asociación de Productores del Alto Piura', direccion: 'Chulucanas, Morropón', contactoNombre: 'Teodoro Vilela', telefono: '900000108', sector: 'AGRO', tipoActor: 'ASOCIACION', notasInternas: 'Reúne a pequeños productores de mango y limón; acuerdan precio y recojo antes de la campaña.' },
  { clave: 'chiclayo', intermediario: 'norte', razonSocial: 'Plásticos Chiclayo SRL', ruc: construirRuc('2062000006'), direccion: 'Parque Industrial José Leonardo Ortiz, Chiclayo', contactoNombre: 'Andrea Cubas', telefono: '900000201', sector: 'MANUFACTURA', tipoActor: 'PLANTA_PROCESADORA' },
  { clave: 'empaques', intermediario: 'norte', razonSocial: 'Empaques del Norte SAC', ruc: construirRuc('2062000007'), direccion: 'Zona Industrial, Sullana', contactoNombre: 'Manuel Ruiz', telefono: '900000202', sector: 'MANUFACTURA', tipoActor: 'PLANTA_PROCESADORA' },
];

type Etapa = 'REPORTADO' | 'COTIZADO' | 'ACOPIADO' | 'DESPACHADO' | 'CERTIFICADO' | 'RECHAZADO';
interface LoteSeed {
  proveedor: string;
  via: 'PORTAL' | 'WHATSAPP' | 'INTERMEDIARIO';
  etapa: Etapa;
  dias: number;
  reporte: ReporteCaptacionInput;
  ofrecido?: number;
  acopio?: { cantidad: number; precio: number };
  cliente?: { nombre: string; ruc?: string };
  /** Clave del destino del directorio al que se despacha. */
  destino?: string;
}
const rep = (descripcion: string, cantidad: number, unidad: 'kg' | 'ton', categoriaCodigo: string | undefined, precioEsperado?: number): ReporteCaptacionInput => ({ descripcion, cantidad, unidad, categoriaCodigo, precioEsperado, imagenes: [] });
const LOTES: LoteSeed[] = [
  // Mangos del Valle y asociación del Alto Piura: descarte, cáscara y pepa (cadena del mango)
  { proveedor: 'mango', via: 'PORTAL', etapa: 'COTIZADO', dias: 2, reporte: { ...rep('Descarte de mango Kent de selección, fuera de calibre, fruta sana', 3000, 'kg', 'ORGANICO_AGRO', 0.35), presentacion: 'FRESCO' }, ofrecido: 0.32 },
  { proveedor: 'mango', via: 'INTERMEDIARIO', etapa: 'DESPACHADO', dias: 9, reporte: { ...rep('Cáscara de mango de planta de congelado, refrigerada', 1500, 'kg', 'ORGANICO_AGRO', 0.2), presentacion: 'FRESCO' }, ofrecido: 0.18, acopio: { cantidad: 1500, precio: 0.18 }, cliente: { nombre: 'Extractos Naturales del Norte SAC' }, destino: 'extractos' },
  { proveedor: 'asociacion', via: 'WHATSAPP', etapa: 'REPORTADO', dias: 1, reporte: { ...rep('Descarte de mango de pequeños productores, sobremaduro', 1800, 'kg', 'ORGANICO_AGRO', 0.25), presentacion: 'FRESCO' } },
  // Plásticos del Pacífico
  { proveedor: 'pacifico', via: 'PORTAL', etapa: 'CERTIFICADO', dias: 10, reporte: rep('Botellas PET transparentes prensadas en pacas, producción semanal de la línea de envasado', 1200, 'kg', 'PLASTICO_PET', 1.45), ofrecido: 1.4, acopio: { cantidad: 1150, precio: 1.4 }, cliente: { nombre: 'Recicladora Andina SAC', ruc: construirRuc('2063000001') }, destino: 'andina' },
  { proveedor: 'pacifico', via: 'INTERMEDIARIO', etapa: 'ACOPIADO', dias: 6, reporte: rep('Bidones de PEAD azules de 20 litros enjuagados', 800, 'kg', 'PLASTICO_PEAD', 1.9), ofrecido: 1.85, acopio: { cantidad: 780, precio: 1.8 } },
  { proveedor: 'pacifico', via: 'WHATSAPP', etapa: 'REPORTADO', dias: 1, reporte: rep('Film stretch usado de paletizado, limpio, en bolas de 20 kg', 500, 'kg', undefined, 3.5) },
  // Bebidas Tallán
  { proveedor: 'bebidas', via: 'PORTAL', etapa: 'COTIZADO', dias: 3, reporte: rep('Preformas y botellas PET descartadas de línea, sin etiqueta', 2, 'ton', 'PLASTICO_PET', 1500), ofrecido: 900 },
  { proveedor: 'bebidas', via: 'PORTAL', etapa: 'COTIZADO', dias: 2, reporte: rep('Tapas de PEAD de colores, separadas de las botellas', 300, 'kg', 'PLASTICO_PEAD', 1.7), ofrecido: 1.75 },
  // Agrícola Los Olivos
  { proveedor: 'olivos', via: 'PORTAL', etapa: 'REPORTADO', dias: 2, reporte: rep('Cáscara y pulpa de aceituna del prensado, material húmedo', 12, 'ton', undefined, 85) },
  { proveedor: 'olivos', via: 'INTERMEDIARIO', etapa: 'DESPACHADO', dias: 9, reporte: rep('Poda de olivo triturada en trozos de 5 a 10 cm', 20, 'ton', 'BIOMASA', 140), ofrecido: 130, acopio: { cantidad: 20, precio: 130 }, cliente: { nombre: 'Energía Verde Lambayeque SAC', ruc: construirRuc('2063000002') } },
  // Textiles Piura Pima
  { proveedor: 'textil', via: 'INTERMEDIARIO', etapa: 'RECHAZADO', dias: 8, reporte: rep('Retazos de algodón pima en color crudo, con restos de aceite de máquina', 1.5, 'ton', 'TEXTIL', 480) },
  { proveedor: 'textil', via: 'WHATSAPP', etapa: 'CERTIFICADO', dias: 11, reporte: rep('Mermas de hilo y fibra corta de algodón mezcladas con pelusa', 0.8, 'ton', 'TEXTIL', 400), ofrecido: 380, acopio: { cantidad: 0.78, precio: 380 }, cliente: { nombre: 'Reciclaje Textil Sullana SAC', ruc: construirRuc('2063000003') } },
  // Bahía de Sechura
  { proveedor: 'bahia', via: 'PORTAL', etapa: 'COTIZADO', dias: 4, reporte: rep('Valvas de concha de abanico trituradas, lavadas y secas', 25, 'ton', 'PESCA_MARISCOS', 60), ofrecido: 55 },
  // Don Pepe (sin RUC)
  { proveedor: 'pepe', via: 'WHATSAPP', etapa: 'ACOPIADO', dias: 5, reporte: rep('Botellas PET recolectadas en Sullana, sin prensar', 300, 'kg', 'PLASTICO_PET', 0.8), ofrecido: 0.75, acopio: { cantidad: 290, precio: 0.75 } },
  { proveedor: 'pepe', via: 'WHATSAPP', etapa: 'REPORTADO', dias: 0, reporte: rep('Latas de aluminio prensadas, unos 150 kg', 150, 'kg', 'METAL', 6) },
  // Segundo intermediario (para mostrar el aislamiento entre redes)
  { proveedor: 'chiclayo', via: 'PORTAL', etapa: 'REPORTADO', dias: 1, reporte: rep('Film agrícola de riego usado, limpio de tierra gruesa', 900, 'kg', 'PLASTICO_FILM', 0.9) },
  { proveedor: 'empaques', via: 'INTERMEDIARIO', etapa: 'COTIZADO', dias: 2, reporte: rep('Cartón corrugado limpio compactado en pacas', 4, 'ton', 'PAPEL_CARTON', 340), ofrecido: 320 },
];

interface DestinoSeed {
  clave: string;
  intermediario: string;
  nombre: string;
  tipo: DestinoInput['tipo'];
  materiales: string;
  zona: string;
  telefono: string;
  contactoNombre: string;
}
const DESTINOS: DestinoSeed[] = [
  { clave: 'congelados', intermediario: 'tallanes', nombre: 'Congelados del Valle (planta)', tipo: 'REPROCESO_ALIMENTOS', materiales: 'descarte de mango, pulpa', zona: 'Piura', telefono: '900000301', contactoNombre: 'Jefatura de compras' },
  { clave: 'pulpas', intermediario: 'tallanes', nombre: 'Pulpas y Jugos Tambogrande', tipo: 'REPROCESO_ALIMENTOS', materiales: 'mango, limón', zona: 'Tambogrande', telefono: '900000302', contactoNombre: 'Carmen Rentería' },
  { clave: 'cuyes', intermediario: 'tallanes', nombre: 'Criadero de Cuyes San Jacinto', tipo: 'ALIMENTO_ANIMAL', materiales: 'cáscaras y descarte de fruta', zona: 'Sullana', telefono: '900000303', contactoNombre: 'Hugo Palacios' },
  { clave: 'abonos', intermediario: 'tallanes', nombre: 'Abonos Orgánicos del Chira', tipo: 'COMPOSTAJE', materiales: 'residuos orgánicos, poda', zona: 'Sullana', telefono: '900000304', contactoNombre: 'Ing. Lucía Cruz' },
  { clave: 'calderas', intermediario: 'tallanes', nombre: 'Molino y Calderas Santa Rosa', tipo: 'ENERGIA', materiales: 'cascarilla de arroz, poda triturada', zona: 'Piura', telefono: '900000305', contactoNombre: 'Walter Zapata' },
  { clave: 'andina', intermediario: 'tallanes', nombre: 'Recicladora Andina SAC', tipo: 'RECICLADO_MATERIAL', materiales: 'PET, PEAD, film, cartón', zona: 'Piura', telefono: '900000306', contactoNombre: 'Mesa de partes' },
  { clave: 'extractos', intermediario: 'tallanes', nombre: 'Extractos Naturales del Norte SAC', tipo: 'INGREDIENTES', materiales: 'cáscara de cítricos y de mango', zona: 'Piura', telefono: '900000307', contactoNombre: 'Dra. Rosario Silva' },
  { clave: 'conchas', intermediario: 'tallanes', nombre: 'Artesanías de Concha Sechura', tipo: 'ARTESANIA_MYPE', materiales: 'conchas de abanico lavadas', zona: 'Sechura', telefono: '900000308', contactoNombre: 'Doña Nelly' },
  { clave: 'norte-reciclaje', intermediario: 'norte', nombre: 'Recicladora Chiclayo Norte', tipo: 'RECICLADO_MATERIAL', materiales: 'plástico y cartón', zona: 'Chiclayo', telefono: '900000401', contactoNombre: 'Operaciones' },
  { clave: 'norte-fundicion', intermediario: 'norte', nombre: 'Fundición del Norte', tipo: 'RECICLADO_MATERIAL', materiales: 'chatarra y aluminio', zona: 'Chiclayo', telefono: '900000402', contactoNombre: 'Compras' },
];

const enDias = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

export async function sembrarB2B(app: INestApplicationContext) {
  const prisma = app.get(PrismaService);
  const empresas = app.get(EmpresasService);
  const material = app.get(MaterialService);
  const certificados = app.get(CertificadosService);
  const destinosSvc = app.get(DestinosService);
  const acuerdosSvc = app.get(AcuerdosService);
  const facturacion = app.get(FacturacionService);
  const benchmark = app.get(BenchmarkService);
  const hash = await bcrypt.hash('demo1234', 10);

  console.log(`✓ ${await benchmark.sembrar()} precios de ejemplo para el benchmark`);

  const intermediarioId: Record<string, string> = {};
  for (const i of INTERMEDIARIOS) {
    const e = await prisma.empresa.create({
      data: { tipo: 'EMPRESA', rol: 'INTERMEDIARIO', ruc: construirRuc(i.base), razonSocial: i.razonSocial, direccion: i.direccion, representanteLegal: i.nombre, estadoKyb: 'VERIFICADA', metodoKyb: 'SIMULADA', esDemo: true, colorMarca: i.color },
    });
    await prisma.$executeRaw`UPDATE "Empresa" SET ubicacion = ST_SetSRID(ST_MakePoint(${i.lng}, ${i.lat}), 4326)::geography WHERE id = ${e.id}`;
    await prisma.usuario.create({ data: { empresaId: e.id, email: i.email, nombre: i.nombre, passwordHash: hash } });
    const archivo = `logo-${i.clave}.png`;
    writeFileSync(join(UPLOADS_DIR, archivo), logoPng(i.color));
    await prisma.empresa.update({ where: { id: e.id }, data: { logoUrl: urlArchivo(archivo) } });
    intermediarioId[i.clave] = e.id;
  }
  console.log(`✓ ${INTERMEDIARIOS.length} intermediarios`);

  const proveedorId: Record<string, string> = {};
  for (const { clave, intermediario, ...datos } of PROVEEDORES) {
    proveedorId[clave] = (await empresas.crearProveedor(intermediarioId[intermediario], { ...datos, telefono: datos.telefono ? normalizarTelefono(datos.telefono) : undefined })).id;
  }
  console.log(`✓ ${PROVEEDORES.length} proveedores`);

  const destinoId: Record<string, string> = {};
  for (const { clave, intermediario, ...datos } of DESTINOS) destinoId[clave] = (await destinosSvc.crear(intermediarioId[intermediario], { ...datos, telefono: normalizarTelefono(datos.telefono) })).id;
  console.log(`✓ ${DESTINOS.length} destinos en el directorio`);

  // Solo el primer intermediario tiene suscripción: el segundo muestra el bloqueo al emitir certificados.
  await facturacion.suscribir(intermediarioId.tallanes);

  const interDe = (clave: string) => intermediarioId[PROVEEDORES.find((p) => p.clave === clave)!.intermediario];
  const retro = (id: string, dias: number) =>
    prisma.$executeRaw`
      UPDATE "Lote" SET "createdAt" = now() - make_interval(days => ${dias}::int),
        "acopiadoAt" = CASE WHEN "acopiadoAt" IS NOT NULL THEN now() - make_interval(days => ${Math.max(dias - 2, 0)}::int) END,
        "despachadoAt" = CASE WHEN "despachadoAt" IS NOT NULL THEN now() - make_interval(days => ${Math.max(dias - 4, 0)}::int) END
      WHERE id = ${id}`;

  for (const l of LOTES) {
    const inter = interDe(l.proveedor);
    const creado = await material.reportar(proveedorId[l.proveedor], l.reporte, l.via, inter);
    const id = creado.id;
    if (l.etapa === 'RECHAZADO') await material.rechazar(inter, id);
    if (l.ofrecido != null && ['COTIZADO', 'ACOPIADO', 'DESPACHADO', 'CERTIFICADO'].includes(l.etapa)) await material.cotizar(inter, id, l.ofrecido);
    if (l.acopio) await material.acopiar(inter, id, { cantidadAcopiada: l.acopio.cantidad, precioFinal: l.acopio.precio });
    if (l.cliente) await material.despachar(inter, id, { clienteDestino: l.cliente.nombre, clienteDestinoRuc: l.cliente.ruc, destinoId: l.destino ? destinoId[l.destino] : undefined });
    if (l.etapa === 'CERTIFICADO') await certificados.emitirDesdeLote(inter, id, 'Reciclaje mecánico o aprovechamiento energético según el cliente');
    await retro(id, l.dias);
  }
  console.log(`✓ ${LOTES.length} lotes en todos los estados`);

  // Acuerdos de temporada: pactados antes de la campaña; uno ya tiene un recojo.
  const a1 = await acuerdosSvc.crear(intermediarioId.tallanes, { proveedorId: proveedorId.mango, descripcion: 'Descarte de mango de la campaña 2026-27', residuoRef: 'mango-descarte', cantidadEstimada: 20000, unidad: 'kg', precioPactado: 0.3, fechaRecojo: enDias(14), destinoId: destinoId.congelados });
  await acuerdosSvc.registrarRecojo(intermediarioId.tallanes, a1.id, { cantidad: 4000 });
  await acuerdosSvc.crear(intermediarioId.tallanes, { proveedorId: proveedorId.asociacion, descripcion: 'Descarte de mango de los socios, entrega semanal', residuoRef: 'mango-descarte', cantidadEstimada: 6000, unidad: 'kg', precioPactado: 0.25, fechaRecojo: enDias(30), destinoId: destinoId.pulpas });
  console.log('✓ 2 acuerdos de temporada');

  const [nCert, nObs] = await Promise.all([prisma.certificado.count(), prisma.precioObservado.count()]);
  console.log(`Seed B2B OK — intermediarios: ${INTERMEDIARIOS.length}, proveedores: ${PROVEEDORES.length}, lotes: ${LOTES.length}, certificados: ${nCert}, precios observados: ${nObs}`);
  console.log('Cuentas demo (contraseña demo1234): gerencia@acopiostallanes.pe (suscripción activa) · operaciones@reciclajesnorte.pe (sin suscripción)');
  // Enlaces del portal de captación para probar sin buscar el token.
  const enlaces = await prisma.empresa.findMany({ where: { rol: 'GENERADOR' }, select: { razonSocial: true, tokenCaptacion: true }, orderBy: { razonSocial: 'asc' } });
  for (const e of enlaces.slice(0, 3)) console.log(`  Portal de ${e.razonSocial}: http://localhost:3000/captacion/${e.tokenCaptacion}`);
}
