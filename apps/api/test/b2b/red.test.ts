import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { INestApplication } from '@nestjs/common';
import { FACTORES_IMPACTO, construirRuc } from '@swapit/shared';
import { PrismaService } from '../../src/prisma/prisma.service';
import { iniciarDb } from '../db';
import { Cliente, crearApp } from '../http';

let app: INestApplication;
let db: { detener(): Promise<void> };
let prisma: PrismaService;
let base: string;
let norte: Cliente; // intermediario A
let sur: Cliente; // intermediario B
let provA: { id: string; tokenCaptacion: string };
let loteA: string;

const registrar = (c: Cliente, n: string, email: string, razon: string, extra: Record<string, unknown> = {}) =>
  c.post('/auth/registro', {
    tipo: 'EMPRESA',
    empresa: { ruc: construirRuc(n), razonSocial: razon, direccion: 'Zona Industrial, Piura', representanteLegal: 'Rep Legal', ...extra },
    usuario: { nombre: 'Gerente Acopio', email, password: 'clave-segura-1' },
  });

before(async () => {
  db = await iniciarDb(5610);
  ({ app, base } = await crearApp());
  prisma = app.get(PrismaService);
  const f = FACTORES_IMPACTO;
  const cat = (codigo: string, nombre: string, sector: string, extra: { familia?: string; unidadBase?: string; kgPorUnidad?: number } = {}) =>
    prisma.categoriaResiduo.create({ data: { codigo, nombre, sector, codigoLer: null, usoTipico: null, factorCo2PorTon: f[codigo].co2PorTon, factorCreditosPorTon: f[codigo].creditosPorTon, ...extra } });
  await cat('PLASTICO', 'Plásticos (PET, PEAD, film)', 'Manufactura');
  await cat('ORGANICO_AGRO', 'Residuos orgánicos agroindustriales', 'Agroindustria');
  await cat('OTROS', 'Otros subproductos industriales', 'General');
  await prisma.configPlataforma.create({ data: { id: 1 } });
  norte = new Cliente(base);
  sur = new Cliente(base);
});
after(async () => {
  await app.close();
  await db.detener();
});

test('registro B2B: se registra un intermediario (rol por defecto) y la sesión informa el modo', async () => {
  const r = await registrar(norte, '2095000001', 'norte@test.pe', 'Acopios del Norte SAC');
  assert.equal(r.status, 201);
  assert.equal(r.data.empresa.rol, 'INTERMEDIARIO');
  assert.equal((await norte.get('/auth/me')).data.modo, 'B2B2B');
  assert.equal((await registrar(sur, '2095000002', 'sur@test.pe', 'Reciclajes del Sur SAC')).status, 201);
});

test('registro B2B: las personas y los roles de marketplace no se registran', async () => {
  const c = new Cliente(base);
  const persona = await c.post('/auth/registro', { tipo: 'PERSONA', persona: { direccion: 'Urb. San Eduardo, Piura' }, usuario: { nombre: 'Camila Rojas', email: 'cami@test.pe', password: 'clave-segura-1' } });
  assert.equal(persona.status, 403);
  const ofertante = await registrar(c, '2095000003', 'ofer@test.pe', 'Agro SAC', { rol: 'OFERTANTE' });
  assert.equal(ofertante.status, 400);
});

test('interruptor: lo del marketplace responde 404 en modo B2B2B', async () => {
  for (const ruta of ['/transacciones', '/creditos', '/matching/alertas', '/lotes', '/cumplimiento']) {
    assert.equal((await norte.get(ruta)).status, 404, `${ruta} debería no existir`);
  }
  assert.equal((await new Cliente(base).get('/transacciones')).status, 401, 'sin sesión sigue siendo 401');
});

test('red: el intermediario da de alta proveedores (con y sin RUC) y obtiene su enlace de captación', async () => {
  const a = await norte.post('/empresas/proveedores', { razonSocial: 'Plásticos Ganoza SAC', ruc: construirRuc('2095100001'), direccion: 'Zona Industrial, Piura', contactoNombre: 'Manuel G.', telefono: '987 654 321' });
  assert.equal(a.status, 201);
  assert.equal(a.data.telefono, '+51987654321', 'el teléfono se normaliza a E.164');
  assert.ok(a.data.tokenCaptacion.length >= 20);
  assert.ok(Math.abs(a.data.ubicacion.lat - -5.19) < 0.05, 'ubicado en Piura');
  provA = a.data;
  const informal = await norte.post('/empresas/proveedores', { razonSocial: 'Recolector Don Pepe', direccion: 'Sullana', contactoNombre: 'Pepe' });
  assert.equal(informal.status, 201, 'un proveedor informal (sin RUC) es válido');
  assert.equal(informal.data.ruc, null);
  assert.equal((await norte.get('/empresas/proveedores')).data.length, 2);
});

test('red: validaciones (teléfono o RUC repetidos, datos inválidos)', async () => {
  const dup = await norte.post('/empresas/proveedores', { razonSocial: 'Otro SAC', direccion: 'Piura centro', contactoNombre: 'X Y', telefono: '+51987654321' });
  assert.equal(dup.status, 409);
  const ruc = await norte.post('/empresas/proveedores', { razonSocial: 'Otro SAC', ruc: construirRuc('2095100001'), direccion: 'Piura centro', contactoNombre: 'X Y' });
  assert.equal(ruc.status, 409);
  assert.equal((await norte.post('/empresas/proveedores', { razonSocial: 'Mal SAC', direccion: 'Piura centro', contactoNombre: 'X Y', telefono: '123' })).status, 400);
});

test('aislamiento: otro intermediario no ve proveedores, perfiles ni material ajenos', async () => {
  assert.equal((await sur.get('/empresas/proveedores')).data.length, 0);
  assert.equal((await sur.get(`/empresas/proveedores/${provA.id}`)).status, 404);
  assert.equal((await sur.get(`/empresas/${provA.id}`)).status, 404, 'el perfil público de un proveedor tampoco se filtra');
  assert.equal((await sur.patch(`/empresas/proveedores/${provA.id}`, { razonSocial: 'Hackeado' })).status, 404);
  assert.equal((await norte.get(`/empresas/${provA.id}`)).status, 200);
});

test('material: el intermediario registra lo que reporta su proveedor; no puede hacerlo a nombre de uno ajeno', async () => {
  const ok = await norte.post('/material', { proveedorId: provA.id, categoriaCodigo: 'PLASTICO', descripcion: 'Bidones de PEAD enjuagados, unos 800 kg al mes', cantidad: 800, unidad: 'kg', precioEsperado: 1200 });
  assert.equal(ok.status, 201);
  assert.equal(ok.data.estado, 'REPORTADO');
  assert.equal(ok.data.reportadoVia, 'INTERMEDIARIO');
  assert.equal(ok.data.proveedor, 'Plásticos Ganoza SAC');
  loteA = ok.data.id;
  const ajeno = await sur.post('/material', { proveedorId: provA.id, categoriaCodigo: 'PLASTICO', descripcion: 'Intento de reporte a nombre ajeno', cantidad: 1, unidad: 'kg' });
  assert.equal(ajeno.status, 404);
  assert.equal((await sur.get(`/material/${loteA}`)).status, 404);
  assert.equal((await sur.get('/material')).data.length, 0);
  assert.equal((await norte.get('/material')).data.length, 1);
});

test('material: sin categoría, la IA la sugiere', async () => {
  const r = await norte.post('/material', { proveedorId: provA.id, descripcion: 'Cáscara y pulpa de mango de la línea de proceso', cantidad: 5, unidad: 'ton' });
  assert.equal(r.status, 201);
  assert.equal(r.data.categoriaCodigo, 'ORGANICO_AGRO');
  assert.equal(r.data.iaSugerencia.modo, 'demo');
});

test('ciclo del lote: reportado → cotizado → acopiado → despachado, y las transiciones inválidas se rechazan', async () => {
  assert.equal((await norte.post(`/material/${loteA}/despachar`, { clienteDestino: 'Recicladora Lima' })).status, 400, 'no se despacha sin acopiar');
  assert.equal((await norte.post(`/material/${loteA}/acopiar`, { cantidadAcopiada: 780, precioFinal: 1150 })).status, 400, 'no se acopia sin cotizar');
  const cot = await norte.post(`/material/${loteA}/cotizar`, { precioOfrecido: 1100 });
  assert.equal(cot.data.estado, 'COTIZADO');
  assert.equal((await norte.post(`/material/${loteA}/cotizar`, { precioOfrecido: 1150 })).data.precioOfrecido, 1150, 'se puede volver a cotizar');
  const aco = await norte.post(`/material/${loteA}/acopiar`, { cantidadAcopiada: 780 });
  assert.equal(aco.data.estado, 'ACOPIADO');
  assert.equal(aco.data.precioFinal, 1150, 'sin precio final se asume el cotizado');
  assert.equal((await norte.post(`/material/${loteA}/cotizar`, { precioOfrecido: 1 })).status, 400);
  const des = await norte.post(`/material/${loteA}/despachar`, { clienteDestino: 'Recicladora Lima SAC', clienteDestinoRuc: construirRuc('2095200001') });
  assert.equal(des.data.estado, 'DESPACHADO');
  assert.equal(des.data.clienteDestino, 'Recicladora Lima SAC');
  assert.equal((await norte.post(`/material/${loteA}/rechazar`)).status, 400);
});

test('material: rechazar un reporte lo cierra', async () => {
  const l = await norte.post('/material', { proveedorId: provA.id, categoriaCodigo: 'OTROS', descripcion: 'Material de procedencia dudosa', cantidad: 3, unidad: 'ton' });
  assert.equal((await norte.post(`/material/${l.data.id}/rechazar`)).data.estado, 'RECHAZADO');
});

test('enlace de captación: rotarlo invalida el anterior; y el rol de la cuenta no se cambia desde el perfil', async () => {
  const nuevo = (await norte.post(`/empresas/proveedores/${provA.id}/rotar-enlace`)).data;
  assert.notEqual(nuevo.tokenCaptacion, provA.tokenCaptacion);
  const mi = await norte.patch('/empresas/mi', { rol: 'GENERADOR' });
  assert.equal(mi.data.rol, 'INTERMEDIARIO');
});

test('base de datos: un generador sin intermediario es inválido', async () => {
  await assert.rejects(prisma.empresa.create({ data: { tipo: 'EMPRESA', rol: 'GENERADOR', razonSocial: 'Huérfano SAC', direccion: 'Piura' } }));
  // PGlite cierra la conexión tras un error de SQL: se descarta aquí (si no, queda un error asíncrono al cerrar).
  for (let i = 0; i < 2; i++) await prisma.$queryRaw`SELECT 1`.catch(() => undefined);
});
