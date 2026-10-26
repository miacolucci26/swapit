import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { INestApplication } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { FACTORES_IMPACTO, construirRuc } from '@swapit/shared';
import { PrismaService } from '../../src/prisma/prisma.service';
import { iniciarDb } from '../db';
import { Cliente, crearApp } from '../http';

let app: INestApplication;
let db: { detener(): Promise<void> };
let prisma: PrismaService;
let norte: Cliente;
let sur: Cliente;
let pequeno: { id: string; tokenCaptacion: string };
let exportador: { id: string };
let provSur: { id: string };
let planta: { id: string };

const registrar = (c: Cliente, n: string, email: string, razon: string) =>
  c.post('/auth/registro', {
    tipo: 'EMPRESA',
    empresa: { ruc: construirRuc(n), razonSocial: razon, direccion: 'Zona Industrial, Piura', representanteLegal: 'Rep Legal' },
    usuario: { nombre: 'Gerente', email, password: 'clave-segura-1' },
  });

before(async () => {
  db = await iniciarDb(5616);
  const { app: a, base } = await crearApp();
  app = a;
  prisma = app.get(PrismaService);
  const f = FACTORES_IMPACTO;
  for (const [codigo, nombre, sector] of [['ORGANICO_AGRO', 'Residuos orgánicos agroindustriales', 'Agroindustria'], ['BIOMASA', 'Biomasa', 'Agroindustria'], ['OTROS', 'Otros subproductos industriales', 'General']] as const) {
    await prisma.categoriaResiduo.create({ data: { codigo, nombre, sector, codigoLer: null, usoTipico: null, factorCo2PorTon: f[codigo].co2PorTon, factorCreditosPorTon: f[codigo].creditosPorTon } });
  }
  await prisma.configPlataforma.create({ data: { id: 1 } });
  norte = new Cliente(base);
  sur = new Cliente(base);
  assert.equal((await registrar(norte, '2096000001', 'norte-d@test.pe', 'Acopios del Norte SAC')).status, 201);
  assert.equal((await registrar(sur, '2096000002', 'sur-d@test.pe', 'Reciclajes del Sur SAC')).status, 201);
  provSur = (await sur.post('/empresas/proveedores', { razonSocial: 'Proveedor del Sur', direccion: 'Sullana', contactoNombre: 'Sur' })).data;
});
after(async () => {
  await app.close();
  await db.detener();
});

test('proveedores: sector y tipo de proveedor se guardan, se validan y filtran la red', async () => {
  const p1 = await norte.post('/empresas/proveedores', { razonSocial: 'Finca Pequeña', direccion: 'Chulucanas', contactoNombre: 'Ana', sector: 'AGRO', tipoActor: 'PEQUENO_PRODUCTOR' });
  assert.equal(p1.status, 201);
  assert.equal(p1.data.sector, 'AGRO');
  pequeno = p1.data;
  exportador = (await norte.post('/empresas/proveedores', { razonSocial: 'Agroexportadora Piura', direccion: 'Piura', contactoNombre: 'Luis', sector: 'AGRO', tipoActor: 'PRODUCTOR_EXPORTADOR' })).data;
  assert.equal((await norte.post('/empresas/proveedores', { razonSocial: 'Mal clasificado', direccion: 'Piura', contactoNombre: 'X', sector: 'MARCIANO' })).status, 400);
  assert.equal((await norte.get('/empresas/proveedores')).data.length, 2);
  assert.equal((await norte.get('/empresas/proveedores?sector=AGRO')).data.length, 2);
  assert.deepEqual((await norte.get('/empresas/proveedores?tipoActor=PEQUENO_PRODUCTOR')).data.map((p: { razonSocial: string }) => p.razonSocial), ['Finca Pequeña']);
  assert.equal((await norte.get('/empresas/proveedores?sector=PESCA')).data.length, 0);
  const cambio = await norte.patch(`/empresas/proveedores/${exportador.id}`, { tipoActor: 'ASOCIACION' });
  assert.equal(cambio.data.tipoActor, 'ASOCIACION');
});

test('material: se vincula solo al residuo de la base de cadenas cuando la descripción es clara, y no cuando es ambigua', async () => {
  const claro = await norte.post('/material', { proveedorId: pequeno.id, categoriaCodigo: 'ORGANICO_AGRO', descripcion: 'Descarte de mango fuera de calibre', cantidad: 800, unidad: 'kg', precioEsperado: 0.3, presentacion: 'FRESCO' });
  assert.equal(claro.status, 201);
  assert.equal(claro.data.residuoRef, 'mango-descarte');
  assert.equal(claro.data.presentacion, 'FRESCO');
  assert.equal(claro.data.sector, 'AGRO');
  const ambiguo = await norte.post('/material', { proveedorId: pequeno.id, categoriaCodigo: 'ORGANICO_AGRO', descripcion: 'Tengo mango de varias cosas', cantidad: 100, unidad: 'kg' });
  assert.equal(ambiguo.data.residuoRef, null);
  const explicito = await norte.post('/material', { proveedorId: exportador.id, categoriaCodigo: 'ORGANICO_AGRO', descripcion: 'Material de planta', cantidad: 300, unidad: 'kg', residuoRef: 'mango-cascara' });
  assert.equal(explicito.data.residuoRef, 'mango-cascara');
  const inventado = await norte.post('/material', { proveedorId: exportador.id, categoriaCodigo: 'ORGANICO_AGRO', descripcion: 'Residuo raro de planta', cantidad: 50, unidad: 'kg', residuoRef: 'no-existe' });
  assert.equal(inventado.data.residuoRef, null, 'una referencia que no existe en la base se ignora');
  // Corregir a mano.
  const fijado = await norte.patch(`/material/${ambiguo.data.id}`, { residuoRef: 'mango-pepa' });
  assert.equal(fijado.data.residuoRef, 'mango-pepa');
  assert.equal((await norte.patch(`/material/${ambiguo.data.id}`, { residuoRef: 'otra-cosa' })).status, 400);
  assert.equal((await norte.patch(`/material/${ambiguo.data.id}`, { residuoRef: null })).data.residuoRef, null);
});

test('material: filtros por sector, tipo de proveedor, residuo, presentación y texto; el otro intermediario no ve nada', async () => {
  const ids = async (qs: string) => (await norte.get(`/material?${qs}`)).data.map((m: { titulo: string }) => m.titulo);
  assert.equal((await ids('sector=AGRO')).length, 4);
  assert.equal((await ids('residuoRef=mango-descarte')).length, 1);
  assert.equal((await ids('presentacion=FRESCO')).length, 1);
  assert.equal((await ids('tipoActor=PEQUENO_PRODUCTOR')).length, 2);
  assert.equal((await ids('q=calibre')).length, 1);
  assert.equal((await ids('q=PLANTA')).length, 2, 'la búsqueda no distingue mayúsculas y mira también el proveedor');
  assert.equal((await ids("q=%25")).length, 0, 'los comodines del usuario no cuentan como comodines');
  assert.equal((await sur.get('/material?residuoRef=mango-descarte')).data.length, 0);
  assert.equal((await sur.get('/material?sector=AGRO')).data.length, 0);
});

test('destinos: directorio propio con tipo y aislamiento entre intermediarios', async () => {
  const d = await norte.post('/destinos', { nombre: 'Planta de congelado Valle', tipo: 'REPROCESO_ALIMENTOS', materiales: 'descarte de mango, pulpa', zona: 'Piura', telefono: '987654321', contactoNombre: 'Jefa de compras' });
  assert.equal(d.status, 201);
  assert.equal(d.data.telefono, '+51987654321');
  planta = d.data;
  assert.equal((await norte.post('/destinos', { nombre: 'Otra planta', tipo: 'REPROCESO_ALIMENTOS', telefono: '987654321' })).status, 409, 'teléfono repetido');
  assert.equal((await norte.post('/destinos', { nombre: 'Mal tipo', tipo: 'INVENTADO' })).status, 400);
  await norte.post('/destinos', { nombre: 'Criadero Los Cuyes', tipo: 'ALIMENTO_ANIMAL', zona: 'Sullana' });
  assert.equal((await norte.get('/destinos')).data.length, 2);
  assert.deepEqual((await norte.get('/destinos?tipo=ALIMENTO_ANIMAL')).data.map((x: { nombre: string }) => x.nombre), ['Criadero Los Cuyes']);
  // El otro intermediario ni los ve ni los toca (404, no «prohibido»).
  assert.equal((await sur.get('/destinos')).data.length, 0);
  assert.equal((await sur.get(`/destinos/${planta.id}`)).status, 404);
  assert.equal((await sur.patch(`/destinos/${planta.id}`, { nombre: 'Hackeado' })).status, 404);
  assert.equal((await norte.patch(`/destinos/${planta.id}`, { zona: 'Piura y Sullana' })).data.zona, 'Piura y Sullana');
});

test('destinos sugeridos: para un residuo se muestran los tipos de comprador y cuáles ya están en el directorio', async () => {
  const r = await norte.get('/destinos/sugeridos?residuoRef=mango-descarte');
  assert.equal(r.status, 200);
  const congelado = r.data.tipos.find((t: { destino: string }) => t.destino === 'REPROCESO_ALIMENTOS');
  assert.deepEqual(congelado.destinos.map((x: { nombre: string }) => x.nombre), ['Planta de congelado Valle']);
  assert.ok(r.data.tipos.find((t: { destino: string }) => t.destino === 'ALIMENTO_ANIMAL').destinos.length === 1);
  assert.equal(r.data.tipos.find((t: { destino: string }) => t.destino === 'COMPOSTAJE').destinos.length, 0);
  assert.equal((await norte.get('/destinos/sugeridos?residuoRef=nada')).status, 404);
  assert.equal((await sur.get('/destinos/sugeridos?residuoRef=mango-descarte')).data.tipos.every((t: { destinos: unknown[] }) => t.destinos.length === 0), true);
});

test('despacho a un destino del directorio: usa su nombre, lo vincula y no acepta destinos ajenos', async () => {
  const m = (await norte.get('/material?residuoRef=mango-descarte')).data[0];
  await norte.post(`/material/${m.id}/cotizar`, { precioOfrecido: 0.3 });
  await norte.post(`/material/${m.id}/acopiar`, { cantidadAcopiada: 800 });
  assert.equal((await norte.post(`/material/${m.id}/despachar`, {})).status, 400, 'sin cliente ni destino');
  const ajeno = (await sur.post('/destinos', { nombre: 'Destino del Sur', tipo: 'ENERGIA' })).data;
  assert.equal((await norte.post(`/material/${m.id}/despachar`, { destinoId: ajeno.id })).status, 404);
  const ok = await norte.post(`/material/${m.id}/despachar`, { destinoId: planta.id });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.clienteDestino, 'Planta de congelado Valle');
  assert.equal(ok.data.destinoNombre, 'Planta de congelado Valle');
  const listado = (await norte.get('/destinos')).data.find((x: { id: string }) => x.id === planta.id);
  assert.equal(listado.despachos, 1);
  assert.ok(listado.ultimoDespacho);
});

test('acuerdos de temporada: precio y fecha pactados antes, recojos que los saldan y aislamiento por intermediario', async () => {
  const mal = await norte.post('/acuerdos', { proveedorId: provSur.id, descripcion: 'Descarte de mango de temporada', cantidadEstimada: 5000, unidad: 'kg', precioPactado: 0.35 });
  assert.equal(mal.status, 404, 'no se puede pactar con el proveedor de otro intermediario');
  assert.equal((await norte.post('/acuerdos', { proveedorId: exportador.id, descripcion: 'Descarte de mango de temporada', cantidadEstimada: 5000, unidad: 'kg', precioPactado: 0.35, fechaRecojo: '01/12/2026' })).status, 400);
  const a = await norte.post('/acuerdos', { proveedorId: exportador.id, descripcion: 'Descarte de mango de temporada', residuoRef: 'mango-descarte', cantidadEstimada: 5000, unidad: 'kg', precioPactado: 0.35, fechaRecojo: '2026-12-01', destinoId: planta.id });
  assert.equal(a.status, 201);
  assert.equal(a.data.estado, 'VIGENTE');
  assert.equal(a.data.avance, 0);
  assert.equal(a.data.residuoNombre, 'Descarte de mango (fuera de calibre, con manchas o sobremaduro)');
  assert.equal(a.data.destino.nombre, 'Planta de congelado Valle');
  assert.equal((await sur.get(`/acuerdos/${a.data.id}`)).status, 404);
  assert.equal((await sur.get('/acuerdos')).data.length, 0);
  assert.equal((await sur.post(`/acuerdos/${a.data.id}/recojo`, { cantidad: 100 })).status, 404);

  const r1 = await norte.post(`/acuerdos/${a.data.id}/recojo`, { cantidad: 2000 });
  assert.equal(r1.status, 200);
  assert.equal(r1.data.acuerdo.recogido, 2000);
  assert.equal(r1.data.acuerdo.avance, 40);
  const lote = (await norte.get(`/material/${r1.data.loteId}`)).data;
  assert.equal(lote.estado, 'ACOPIADO');
  assert.equal(lote.precioFinal, 0.35, 'se paga el precio pactado');
  assert.equal(lote.cantidadAcopiada, 2000);
  assert.equal(lote.acuerdoId, a.data.id);
  assert.equal(lote.destinoNombre, 'Planta de congelado Valle');
  assert.equal(lote.residuoRef, 'mango-descarte');
  const r2 = await norte.post(`/acuerdos/${a.data.id}/recojo`, { cantidad: 3000, precio: 0.4 });
  assert.equal(r2.data.acuerdo.avance, 100);
  assert.equal(r2.data.acuerdo.recojos.length, 2);
  assert.equal((await norte.get(`/material/${r2.data.loteId}`)).data.precioFinal, 0.4, 'un recojo puede pagarse a otro precio');

  const cumplido = await norte.patch(`/acuerdos/${a.data.id}`, { estado: 'CUMPLIDO' });
  assert.equal(cumplido.data.estado, 'CUMPLIDO');
  assert.equal((await norte.post(`/acuerdos/${a.data.id}/recojo`, { cantidad: 10 })).status, 409, 'un acuerdo cumplido no admite más recojos');
  assert.equal((await norte.get('/acuerdos?estado=VIGENTE')).data.length, 0);
  assert.equal((await norte.get('/acuerdos?estado=CUMPLIDO')).data.length, 1);
});

test('portal del proveedor: el reporte también se vincula al residuo de la base de cadenas', async () => {
  const r = await norte.post('/material', { proveedorId: pequeno.id, categoriaCodigo: 'BIOMASA', descripcion: 'Cascarilla de arroz seca', cantidad: 2, unidad: 'ton' });
  assert.equal(r.data.residuoRef, 'arroz-cascarilla');
  const portal = await norte.get(`/captacion/${pequeno.tokenCaptacion}`);
  assert.equal(portal.status, 200);
  const rep = await new Cliente(`http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`).post(`/captacion/${pequeno.tokenCaptacion}/reporte`, { descripcion: 'Conchas de abanico lavadas', cantidad: 300, unidad: 'kg', residuoRef: 'concha-valvas' });
  assert.equal(rep.status, 201);
  assert.equal((await norte.get('/material?residuoRef=concha-valvas')).data.length, 1);
});

test('panel: el resumen informa los primeros pasos, destinos y acuerdos', async () => {
  const r = (await norte.get('/material/resumen')).data;
  assert.deepEqual(r.inicio, { proveedor: true, reporte: true, cotizacion: true, acopio: true, destino: true, certificado: false });
  assert.equal(r.destinosActivos, 2);
  assert.equal(r.acuerdosVigentes, 0);
  const vacio = (await sur.get('/material/resumen')).data;
  assert.deepEqual(vacio.inicio, { proveedor: true, reporte: false, cotizacion: false, acopio: false, destino: true, certificado: false });
});

test('exportar: el Excel trae el material con la clasificación y respeta los filtros y el aislamiento', async () => {
  const res = await norte.get('/material/exportar');
  assert.equal(res.status, 200);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(res.data as never);
  const ws = wb.getWorksheet('Material')!;
  const cabecera = (ws.getRow(1).values as unknown[]).slice(1);
  assert.deepEqual(cabecera.slice(0, 8), ['Fecha de reporte', 'Proveedor', 'Sector', 'Tipo de proveedor', 'Material', 'Categoría', 'Residuo (base de cadenas)', 'Presentación']);
  assert.equal(ws.rowCount - 1, (await norte.get('/material')).data.length);
  const fila = ws.getRows(2, ws.rowCount - 1)!.map((r) => r.values as unknown[]).find((v) => String(v[5]).includes('Descarte de mango fuera de calibre'))!;
  assert.equal(fila[2], 'Finca Pequeña');
  assert.equal(fila[3], 'Agro y agroexportación');
  assert.equal(fila[4], 'Pequeño productor');
  assert.equal(fila[6], 'Residuos orgánicos agroindustriales');
  assert.match(String(fila[7]), /Descarte de mango/);
  assert.equal(fila[8], 'Fresco');
  assert.equal(fila[15], 'Planta de congelado Valle');
  const filtrado = new ExcelJS.Workbook();
  await filtrado.xlsx.load((await norte.get('/material/exportar?residuoRef=mango-descarte')).data as never);
  assert.ok(filtrado.getWorksheet('Material')!.rowCount - 1 >= 1);
  const ajeno = new ExcelJS.Workbook();
  await ajeno.xlsx.load((await sur.get('/material/exportar')).data as never);
  assert.equal(ajeno.getWorksheet('Material')!.rowCount, 1, 'el otro intermediario solo ve su cabecera');
});
