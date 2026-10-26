import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { INestApplication } from '@nestjs/common';
import {
  FACTORES_IMPACTO, PESOS_BENCHMARK, SUBTIPOS_PLASTICO, construirRuc, estimarRango, generarSemilla, percentilPonderado, posicionPrecio, precioEnUnidad, precioPorTon, familiaDe,
  type Observacion,
} from '@swapit/shared';
import { BenchmarkService } from '../../src/benchmark/benchmark.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { iniciarDb } from '../db';
import { Cliente, crearApp } from '../http';

// ---- Funciones puras ----

test('pesos del benchmark: suman 1 y la reputación ya no interviene', () => {
  const suma = Object.values(PESOS_BENCHMARK).reduce((s, x) => s + x, 0);
  assert.ok(Math.abs(suma - 1) < 1e-9);
  assert.deepEqual(Object.keys(PESOS_BENCHMARK).sort(), ['cercania', 'material', 'recencia', 'volumen']);
});

test('percentil ponderado: sin pesos iguales se inclina hacia lo que más pesa', () => {
  const parejo = [10, 20, 30, 40, 50].map((v) => ({ v, w: 1 }));
  assert.equal(percentilPonderado(parejo, 0.5), 30);
  const sesgado = [{ v: 10, w: 1 }, { v: 20, w: 1 }, { v: 100, w: 8 }];
  assert.ok((percentilPonderado(sesgado, 0.5) as number) > 50, 'la mediana se va al dato de mayor peso');
  assert.equal(percentilPonderado([], 0.5), null);
  assert.equal(percentilPonderado([{ v: 7, w: 1 }], 0.9), 7);
});

test('unidades: precio por tonelada ↔ por kilo y por unidad', () => {
  assert.equal(precioPorTon(1.4, 'kg'), 1400);
  assert.equal(precioEnUnidad(1400, 'kg'), 1.4);
  assert.equal(precioPorTon(30, 'und', 1.5), 20000);
  assert.equal(precioPorTon(900, 'ton'), 900);
});

const obs = (precio: number, extra: Partial<Observacion> = {}): Observacion => ({
  precioPorTon: precio, cantidadTon: 2, fecha: new Date(), fuente: 'ACOPIO', categoriaCodigo: 'PLASTICO_PET', similitud: 0.8, distanciaKm: 10, ...extra,
});

test('estimarRango: rango ordenado, confianza por cantidad de comparables y marca de datos de ejemplo', () => {
  const muchas = Array.from({ length: 14 }, (_, i) => obs(1300 + i * 20));
  const r = estimarRango(muchas, { categoriaCodigo: 'PLASTICO_PET', cantidadTon: 2 });
  assert.ok(r.rango && r.rango.p25 < r.rango.p50 && r.rango.p50 < r.rango.p75);
  assert.equal(r.confianza, 'ALTA');
  assert.equal(r.esSemilla, false);
  const pocas = estimarRango(muchas.slice(0, 3), { categoriaCodigo: 'PLASTICO_PET', cantidadTon: 2 });
  assert.equal(pocas.rangoOrientativo, true);
  assert.equal(pocas.confianza, 'BAJA');
  const semilla = estimarRango(muchas.map((o) => ({ ...o, fuente: 'SEMILLA' as const })), { categoriaCodigo: 'PLASTICO_PET', cantidadTon: 2 });
  assert.equal(semilla.esSemilla, true);
  assert.equal(estimarRango([], { categoriaCodigo: 'PLASTICO_PET', cantidadTon: 2 }).confianza, 'NINGUNA');
});

test('estimarRango: otro subtipo de la misma familia pesa mucho menos que el mismo subtipo', () => {
  const mismos = Array.from({ length: 6 }, () => obs(1400));
  const otros = Array.from({ length: 6 }, () => obs(2600, { categoriaCodigo: 'PLASTICO_PEAD' }));
  const r = estimarRango([...mismos, ...otros], { categoriaCodigo: 'PLASTICO_PET', cantidadTon: 2 });
  assert.ok((r.rango as { p50: number }).p50 < 1700, 'la mediana se queda cerca del precio del mismo subtipo');
});

test('estimarRango: con pocos datos del subtipo se apoya en la familia, con confianza menor', () => {
  const pocos = Array.from({ length: 2 }, () => obs(1400));
  const otros = Array.from({ length: 8 }, (_, i) => obs(1000 + i * 30, { categoriaCodigo: 'PLASTICO_PP' }));
  const r = estimarRango([...pocos, ...otros], { categoriaCodigo: 'PLASTICO_PET', cantidadTon: 2 });
  assert.ok(r.n >= 5, 'usa los comparables de la familia');
  assert.notEqual(r.confianza, 'ALTA');
});

test('posición del precio frente al rango', () => {
  const rango = { p25: 1300, p75: 1500 };
  assert.equal(posicionPrecio(1000, rango), 'DEBAJO');
  assert.equal(posicionPrecio(1400, rango), 'DENTRO');
  assert.equal(posicionPrecio(1800, rango), 'ENCIMA');
  assert.equal(posicionPrecio(1400, null), null);
});

test('semilla: determinista, con todos los subtipos de plástico y rotulada como ejemplo', () => {
  const a = generarSemilla(new Date('2026-10-15'));
  const b = generarSemilla(new Date('2026-10-15'));
  assert.deepEqual(a, b);
  for (const s of SUBTIPOS_PLASTICO) assert.ok(a.some((x) => x.categoriaCodigo === s.codigo), `falta ${s.codigo}`);
  assert.ok(a.every((x) => x.descripcion.startsWith('Dato de ejemplo')));
  assert.equal(familiaDe('PLASTICO_PET'), 'PLASTICO');
  assert.equal(familiaDe('METAL'), null);
});

// ---- Integración ----

let app: INestApplication;
let db: { detener(): Promise<void> };
let prisma: PrismaService;
let bench: BenchmarkService;
let norte: Cliente;
let sur: Cliente;
let provN: string;

const registrar = (c: Cliente, n: string, email: string, razon: string) =>
  c.post('/auth/registro', { tipo: 'EMPRESA', empresa: { ruc: construirRuc(n), razonSocial: razon, direccion: 'Zona Industrial, Piura', representanteLegal: 'Rep' }, usuario: { nombre: 'Gerente', email, password: 'clave-segura-1' } });

before(async () => {
  db = await iniciarDb(5611);
  let base: string;
  ({ app, base } = await crearApp());
  prisma = app.get(PrismaService);
  bench = app.get(BenchmarkService);
  const f = FACTORES_IMPACTO;
  const cat = (codigo: string, nombre: string, familia: string | null = null) =>
    prisma.categoriaResiduo.create({ data: { codigo, nombre, sector: 'Manufactura', familia, codigoLer: null, usoTipico: null, factorCo2PorTon: f[codigo].co2PorTon, factorCreditosPorTon: f[codigo].creditosPorTon } });
  await cat('PLASTICO', 'Plásticos (PET, PEAD, film)', 'PLASTICO');
  for (const s of SUBTIPOS_PLASTICO) await cat(s.codigo, s.nombre, 'PLASTICO');
  await cat('OTROS', 'Otros subproductos industriales');
  await prisma.configPlataforma.create({ data: { id: 1 } });
  norte = new Cliente(base);
  sur = new Cliente(base);
  await registrar(norte, '2096000001', 'norte@test.pe', 'Acopios del Norte SAC');
  await registrar(sur, '2096000002', 'sur@test.pe', 'Reciclajes del Sur SAC');
  provN = (await norte.post('/empresas/proveedores', { razonSocial: 'Plásticos Ganoza SAC', direccion: 'Zona Industrial, Piura', contactoNombre: 'Manuel G.' })).data.id;
});
after(async () => {
  await app.close();
  await db.detener();
});

test('clasificador: reconoce el subtipo de plástico y pide revisión cuando no puede distinguirlo', async () => {
  const c = async (descripcion: string) => (await norte.post('/ia/clasificar', { descripcion, imagenes: [] })).data;
  const pet = await c('Botellas PET transparentes prensadas');
  assert.equal(pet.categoriaCodigo, 'PLASTICO_PET');
  assert.equal(pet.subtipo, 'PET');
  assert.equal(pet.familia, 'PLASTICO');
  assert.equal(pet.requiereRevision, false);
  assert.equal((await c('Bidones de PEAD azules de 20 litros')).categoriaCodigo, 'PLASTICO_PEAD');
  assert.equal((await c('Film stretch usado de paletizado')).categoriaCodigo, 'PLASTICO_FILM');
  assert.equal((await c('Tuberías de PVC de obra')).categoriaCodigo, 'PLASTICO_PVC');
  const mixto = await c('Botellas PET con tapas de PEAD, todo revuelto');
  assert.equal(mixto.categoriaCodigo, 'PLASTICO_MIXTO');
  assert.equal(mixto.requiereRevision, true);
  const generico = await c('Plástico de planta, no sé qué tipo es');
  assert.equal(generico.categoriaCodigo, 'PLASTICO');
  assert.equal(generico.requiereRevision, true, 'sin subtipo, una persona debe confirmar');
  assert.ok(generico.confianza < 0.65);
});

test('semilla: se inserta una sola vez', async () => {
  assert.ok((await bench.sembrar()) > 50);
  assert.equal(await bench.sembrar(), 0);
});

test('benchmark: devuelve un rango por subtipo, rotulado como datos de ejemplo, y distingue polímeros', async () => {
  const pet = (await norte.get('/benchmark?categoria=PLASTICO_PET&cantidad=2&unidad=ton')).data;
  assert.ok(pet.rango.p25 < pet.rango.p50 && pet.rango.p50 < pet.rango.p75);
  assert.equal(pet.esSemilla, true);
  assert.match(pet.nota, /datos de ejemplo/);
  assert.ok(pet.n >= 5);
  const pvc = (await norte.get('/benchmark?categoria=PLASTICO_PVC&cantidad=2&unidad=ton')).data;
  const pead = (await norte.get('/benchmark?categoria=PLASTICO_PEAD&cantidad=2&unidad=ton')).data;
  assert.ok(pead.rango.p50 > pet.rango.p50 && pet.rango.p50 > pvc.rango.p50, 'PEAD > PET > PVC en los datos de ejemplo');
  const kg = (await norte.get('/benchmark?categoria=PLASTICO_PET&cantidad=2000&unidad=kg')).data;
  assert.ok(Math.abs(kg.rango.p50 * 1000 - pet.rangoPorTon.p50) < pet.rangoPorTon.p50 * 0.25, 'en kilos el rango es ~1/1000 (el volumen cambia el peso de los comparables)');
  assert.equal((await norte.get('/benchmark?categoria=NO_EXISTE&cantidad=1')).status, 400);
});

test('benchmark: los datos propios importados por CSV mueven el rango del dueño, no el de otro intermediario', async () => {
  const antesN = (await norte.get('/benchmark?categoria=PLASTICO_PET&cantidad=2&unidad=ton')).data.rangoPorTon.p50;
  const antesS = (await sur.get('/benchmark?categoria=PLASTICO_PET&cantidad=2&unidad=ton')).data.rangoPorTon.p50;
  const filas = Array.from({ length: 12 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')},PLASTICO_PET,2,ton,${3000 + i * 10},compra de ${i}`).join('\n');
  const imp = await norte.post('/benchmark/importar', { csv: `fecha,categoria,cantidad,unidad,precio,descripcion\n${filas}\n2026-09-30,NO_EXISTE,1,ton,100,x\n2026-13-45,PLASTICO_PET,1,ton,100,x\n2026-09-30,PLASTICO_PET,1,ton,0,x` });
  assert.equal(imp.status, 200);
  assert.equal(imp.data.importadas, 12);
  assert.equal(imp.data.totalRechazadas, 3);
  assert.match(imp.data.rechazadas[0].motivo, /Categoría desconocida/);
  const despuesN = (await norte.get('/benchmark?categoria=PLASTICO_PET&cantidad=2&unidad=ton')).data;
  assert.ok(despuesN.rangoPorTon.p50 > antesN * 1.3, 'sus propios precios, mucho más altos, suben su mediana');
  assert.equal(despuesN.esSemilla, false, 'con 12 precios reales del mismo subtipo, los datos de ejemplo se descartan');
  assert.ok(despuesN.comparables.every((c: { fuente: string }) => c.fuente !== 'SEMILLA'));
  assert.equal((await sur.get('/benchmark?categoria=PLASTICO_PET&cantidad=2&unidad=ton')).data.rangoPorTon.p50, antesS, 'el otro intermediario no se entera');
  // Solo con consentimiento sus precios alimentan a otros.
  await norte.put('/benchmark/compartir', { compartir: true });
  assert.ok((await sur.get('/benchmark?categoria=PLASTICO_PET&cantidad=2&unidad=ton')).data.rangoPorTon.p50 > antesS, 'compartir los hace visibles (sin nombre)');
  await norte.put('/benchmark/compartir', { compartir: false });
  assert.equal((await sur.get('/benchmark?categoria=PLASTICO_PET&cantidad=2&unidad=ton')).data.rangoPorTon.p50, antesS, 'y revocar el consentimiento los oculta');
});

test('importación: encabezado incompleto o vacío se rechaza', async () => {
  assert.equal((await norte.post('/benchmark/importar', { csv: 'fecha,categoria\n2026-09-01,PLASTICO_PET' })).status, 400);
  assert.equal((await norte.post('/benchmark/importar', { csv: 'fecha;categoria;cantidad;unidad;precio' })).status, 400);
  const ok = await norte.post('/benchmark/importar', { csv: 'fecha;categoria;cantidad;unidad;precio\n2026-09-01;PLASTICO_PP;500;kg;1,35' });
  assert.equal(ok.data.importadas, 1, 'acepta punto y coma y coma decimal (Excel en español)');
});

test('semáforo de precio: el precio esperado y el cotizado se comparan con el rango', async () => {
  const reportar = (precioEsperado: number) => norte.post('/material', { proveedorId: provN, descripcion: 'Bidones de PEAD azules enjuagados', categoriaCodigo: 'PLASTICO_PEAD', cantidad: 800, unidad: 'kg', precioEsperado });
  const alto = (await reportar(9)).data; // S/ 9 por kilo = 9 000 por tonelada
  const bajo = (await reportar(0.3)).data;
  const justo = (await reportar(1.7)).data;
  assert.equal(alto.posicionPrecio, 'ENCIMA');
  assert.equal(bajo.posicionPrecio, 'DEBAJO');
  assert.equal(justo.posicionPrecio, 'DENTRO');
  assert.equal(alto.veredictos.esperado, 'ENCIMA');
  assert.ok(alto.benchmark.rango.p50 > 1 && alto.benchmark.rango.p50 < 3, 'el rango del lote está expresado en S/ por kilo');
  const cot = (await norte.post(`/material/${bajo.id}/cotizar`, { precioOfrecido: 1.7 })).data;
  assert.equal(cot.posicionPrecio, 'DENTRO', 'al cotizar, el semáforo pasa a evaluar la oferta');
  assert.equal(cot.veredictos.ofrecido, 'DENTRO');
});

test('acopio: el precio pagado se vuelve una observación real del intermediario', async () => {
  const l = (await norte.post('/material', { proveedorId: provN, descripcion: 'Film stretch usado enrollado', categoriaCodigo: 'PLASTICO_FILM', cantidad: 500, unidad: 'kg' })).data;
  await norte.post(`/material/${l.id}/cotizar`, { precioOfrecido: 0.9 });
  const antes = (await norte.get('/benchmark/mis-datos')).data.propias.ACOPIO ?? 0;
  const aco = (await norte.post(`/material/${l.id}/acopiar`, { cantidadAcopiada: 480, precioFinal: 0.95 })).data;
  assert.equal(aco.benchmark, null, 'ya acopiado no hace falta el rango');
  assert.equal((await norte.get('/benchmark/mis-datos')).data.propias.ACOPIO, antes + 1);
});
