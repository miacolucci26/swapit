// Suite del modo MARKETPLACE (producto anterior, hoy detrás del interruptor SWAPIT_MODO). Se retira junto con ese código.
process.env.SWAPIT_MODO = 'MARKETPLACE';
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
let secreta: Cliente; // empresa confidencial, ofertante
let compra: Cliente; // empresa abierta, receptora
let tercera: Cliente; // otra empresa abierta
let ids: { secreta: string; compra: string };
let loteId: string;
let txId: string;

const registrar = (c: Cliente, n: string, email: string, razon: string, direccion: string) =>
  c.post('/auth/registro', {
    tipo: 'EMPRESA',
    empresa: { ruc: construirRuc(n), razonSocial: razon, rol: 'AMBOS', direccion, representanteLegal: 'Rep Legal' },
    usuario: { nombre: 'Gerente Apellido', email, password: 'clave-segura-1' },
  });

before(async () => {
  db = await iniciarDb(5605);
  let base: string;
  ({ app, base } = await crearApp());
  prisma = app.get(PrismaService);
  const f = FACTORES_IMPACTO;
  await prisma.categoriaResiduo.create({ data: { codigo: 'ORGANICO_AGRO', nombre: 'Residuos orgánicos agroindustriales', sector: 'Agroindustria', codigoLer: '02 03 04', usoTipico: 'Compost', factorCo2PorTon: f.ORGANICO_AGRO.co2PorTon, factorCreditosPorTon: f.ORGANICO_AGRO.creditosPorTon } });
  await prisma.configPlataforma.create({ data: { id: 1 } });
  secreta = new Cliente(base);
  compra = new Cliente(base);
  tercera = new Cliente(base);
  const a = await registrar(secreta, '2091000001', 'secreta@test.pe', 'Agrícola Reservada SAC', 'Zona Industrial, Piura');
  const b = await registrar(compra, '2091000002', 'compra@test.pe', 'Compostera Abierta SAC', 'Av. Grau, Piura');
  await registrar(tercera, '2091000003', 'tercera@test.pe', 'Forrajes Abiertos SAC', 'Castilla, Piura');
  ids = { secreta: a.data.empresa.id, compra: b.data.empresa.id };
});
after(async () => {
  await app.close();
  await db.detener();
});

test('modo confidencial: solo las empresas pueden activarlo, y se guarda', async () => {
  assert.equal((await secreta.patch('/empresas/mi', { confidencial: true })).data.confidencial, true);
});

test('lote: guarda condición y forma de entrega, y rechaza valores desconocidos', async () => {
  const base = { categoriaCodigo: 'ORGANICO_AGRO', titulo: 'Cáscara de mango Kent', descripcion: 'Cáscara de mango del despulpado, húmeda y sin aditivos.', cantidad: 20, modalidad: 'DONACION' };
  assert.equal((await secreta.post('/lotes', { ...base, condicion: 'ROTO' })).status, 400);
  const ok = await secreta.post('/lotes', { ...base, condicion: 'BUEN_ESTADO', entrega: 'ENVIO_OFERTANTE' });
  assert.equal(ok.status, 201);
  loteId = ok.data.id;
  assert.equal(ok.data.condicion, 'BUEN_ESTADO');
  assert.equal(ok.data.entrega, 'ENVIO_OFERTANTE');
  const sinDatos = await compra.post('/lotes', { ...base, titulo: 'Cáscara de limón' });
  assert.equal(sinDatos.data.entrega, 'RECOJO_RECEPTOR', 'por defecto lo recoge quien lo recibe');
  assert.equal(sinDatos.data.condicion, null);
});

test('catálogo: otra empresa ve «Empresa confidencial · sector», ubicación aproximada y sigue viendo la verificación', async () => {
  const l = (await compra.get('/lotes')).data.find((x: { id: string }) => x.id === loteId);
  assert.equal(l.razonSocial, 'Empresa confidencial · Agroindustria');
  assert.equal(l.identidadOculta, true);
  assert.equal(l.estadoKyb, 'VERIFICADA', 'la verificación y la reputación no se ocultan');
  assert.ok(Math.abs(l.ubicacion.lat / 0.05 - Math.round(l.ubicacion.lat / 0.05)) < 1e-6, 'ubicación en rejilla de ~5 km');
  // El dueño sí se ve a sí mismo con su nombre.
  const propio = (await secreta.get(`/lotes/${loteId}`)).data;
  assert.equal(propio.razonSocial, 'Agrícola Reservada SAC');
  assert.equal(propio.identidadOculta, false);
});

test('búsqueda con IA y perfil público también respetan la confidencialidad', async () => {
  const r = (await compra.get('/matching/buscar?texto=' + encodeURIComponent('cáscara de mango') + '&radioKm=100')).data;
  const m = r.find((x: { loteId: string }) => x.loteId === loteId);
  assert.ok(m, 'el lote confidencial sigue apareciendo en la búsqueda');
  assert.equal(m.razonSocial, 'Empresa confidencial · Agroindustria');
  assert.equal(m.identidadOculta, true);
  const perfil = (await compra.get(`/empresas/${ids.secreta}`)).data;
  assert.equal(perfil.razonSocial, 'Empresa confidencial');
  assert.equal(perfil.direccion, null);
  assert.equal(perfil.identidadOculta, true);
  assert.equal((await secreta.get(`/empresas/${ids.secreta}`)).data.razonSocial, 'Agrícola Reservada SAC');
});

test('solicitud: el solicitante no conoce a la empresa hasta que esta responde', async () => {
  const s = await compra.post('/transacciones', { loteId, cantidad: 5 });
  assert.equal(s.status, 201);
  txId = s.data.id;
  const lista = (await compra.get('/transacciones')).data.find((t: { id: string }) => t.id === txId);
  assert.equal(lista.contraparte.razonSocial, 'Empresa confidencial');
  const det = (await compra.get(`/transacciones/${txId}`)).data;
  assert.equal(det.ofertante.razonSocial, 'Empresa confidencial');
  assert.equal(det.lote.entrega, 'ENVIO_OFERTANTE');
  // La empresa confidencial sí ve quién le escribe.
  assert.equal((await secreta.get(`/transacciones/${txId}`)).data.receptor.razonSocial, 'Compostera Abierta SAC');
  // Una tercera empresa sin relación sigue sin saber quién es.
  assert.equal((await tercera.get(`/empresas/${ids.secreta}`)).data.razonSocial, 'Empresa confidencial');
});

test('al responder el ofertante, la identidad se revela solo a las partes', async () => {
  assert.equal((await secreta.post(`/transacciones/${txId}/mensajes`, { texto: 'Hola, sí está disponible' })).status, 201);
  const det = (await compra.get(`/transacciones/${txId}`)).data;
  assert.equal(det.estado, 'EN_NEGOCIACION');
  assert.equal(det.ofertante.razonSocial, 'Agrícola Reservada SAC');
  assert.equal((await compra.get('/transacciones')).data.find((t: { id: string }) => t.id === txId).contraparte.razonSocial, 'Agrícola Reservada SAC');
  assert.equal((await compra.get(`/empresas/${ids.secreta}`)).data.razonSocial, 'Agrícola Reservada SAC');
  assert.equal((await compra.get(`/lotes/${loteId}`)).data.razonSocial, 'Agrícola Reservada SAC');
  // El resto del mercado no se entera.
  assert.equal((await tercera.get(`/empresas/${ids.secreta}`)).data.razonSocial, 'Empresa confidencial');
  assert.equal((await tercera.get(`/lotes/${loteId}`)).data.razonSocial, 'Empresa confidencial · Agroindustria');
});

test('empresa confidencial que solicita: el chat no expone el nombre del gerente antes de que respondan', async () => {
  const lote = (await compra.get('/lotes?mios=1')).data[0];
  const s = await secreta.post('/transacciones', { loteId: lote.id, cantidad: 2 });
  assert.equal(s.status, 201);
  const msgs = (await compra.get(`/transacciones/${s.data.id}/mensajes`)).data;
  assert.equal(msgs[0].autorNombre, 'Empresa confidencial');
  assert.equal((await compra.get(`/transacciones/${s.data.id}`)).data.receptor.razonSocial, 'Empresa confidencial');
});

test('el mapa de calor público no revela la ubicación exacta de una empresa confidencial', async () => {
  const exacta = (await secreta.get('/empresas/mi')).data.ubicacion;
  const calor = (await new Cliente(app.getHttpServer().address() ? `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}` : '').get('/impacto/publico')).data.calor as { lat: number; lng: number }[];
  assert.ok(calor.length > 0);
  assert.ok(!calor.some((p) => Math.abs(p.lat - exacta.lat) < 1e-6 && Math.abs(p.lng - exacta.lng) < 1e-6), 'ningún punto coincide con la ubicación exacta');
});
