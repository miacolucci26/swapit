// Modos comprador y vendedor (docs/diseno/estructura-web.md): registro por modo, activar el otro desde el perfil,
// publicar con pin en el mapa, editar, pausar y reanudar.
process.env.SWAPIT_MODO = 'MARKETPLACE';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { INestApplication } from '@nestjs/common';
import { FACTORES_IMPACTO } from '@swapit/shared';
import { PrismaService } from '../../src/prisma/prisma.service';
import { iniciarDb } from '../db';
import { Cliente, crearApp } from '../http';

let app: INestApplication;
let base: string;
let db: { detener(): Promise<void> };
let compradora: Cliente;
let vendedor: Cliente;
let loteId: string;

const tienda = { nombre: 'Bazar de Rosa', cobroMetodo: 'YAPE', cobroCuenta: '987654321' };
const registrar = (c: Cliente, nombre: string, email: string, extra: Record<string, unknown>) =>
  c.post('/auth/registro', { tipo: 'PERSONA', persona: { direccion: 'Urb. San Eduardo, Piura' }, usuario: { nombre, email, password: 'clave-segura-1' }, ...extra });
const publicar = (c: Cliente, extra: Record<string, unknown> = {}) =>
  c.post('/lotes', { categoriaCodigo: 'ARTICULOS_PERSONALES', titulo: 'Silla de madera', descripcion: 'Silla de madera en buen estado', cantidad: 1, unidad: 'und', modalidad: 'VENTA', precio: 50, ...extra });

before(async () => {
  db = await iniciarDb(5632);
  ({ app, base } = await crearApp());
  const prisma = app.get(PrismaService);
  const f = FACTORES_IMPACTO.ARTICULOS_PERSONALES;
  await prisma.categoriaResiduo.create({
    data: { codigo: 'ARTICULOS_PERSONALES', nombre: 'Artículos personales', sector: 'Personas', usoTipico: 'Reúso', factorCo2PorTon: f.co2PorTon, factorCreditosPorTon: f.creditosPorTon, unidadBase: 'und', kgPorUnidad: 1.5 },
  });
  await prisma.configPlataforma.create({ data: { id: 1 } });
  compradora = new Cliente(base);
  vendedor = new Cliente(base);
});
after(async () => {
  await app.close();
  await db.detener();
});

test('registro por modo: comprador queda solo comprador; vendedor exige tienda y queda solo vendedor', async () => {
  const c = await registrar(compradora, 'Carla Ruiz', 'carla@test.pe', { modo: 'COMPRADOR' });
  assert.equal(c.status, 201);
  assert.equal(c.data.empresa.rol, 'RECEPTOR');

  assert.equal((await registrar(new Cliente(base), 'Rosa Paz', 'sin-tienda@test.pe', { modo: 'VENDEDOR' })).status, 400, 'sin datos de tienda');
  const v = await registrar(vendedor, 'Rosa Paz', 'rosa@test.pe', { modo: 'VENDEDOR', tienda });
  assert.equal(v.status, 201);
  assert.equal(v.data.empresa.rol, 'OFERTANTE');
  assert.equal(v.data.empresa.nombreTienda, 'Bazar de Rosa');
});

test('cada modo solo hace lo suyo hasta activarse el otro desde el perfil', async () => {
  assert.equal((await publicar(compradora)).status, 403, 'un comprador no publica');
  const activar = await compradora.post('/empresas/mi/activar-modo', { modo: 'VENDEDOR', tienda: { ...tienda, nombre: 'Tienda de Carla' } });
  assert.equal(activar.status, 200);
  assert.equal(activar.data.rol, 'AMBOS');
  assert.equal(activar.data.nombreTienda, 'Tienda de Carla');
  assert.equal((await compradora.post('/empresas/mi/activar-modo', { modo: 'VENDEDOR', tienda })).status, 400, 'ya lo tiene');
  assert.equal((await compradora.post('/empresas/mi/activar-modo', { modo: 'COMPRADOR' })).status, 400, 'ya lo tiene');
});

test('publicar con pin: la oferta se ubica donde lo puso el vendedor y se muestra con el nombre de la tienda', async () => {
  const r = await publicar(vendedor, { ubicacion: { lat: -4.9031, lng: -80.6853 } });
  assert.equal(r.status, 201);
  loteId = r.data.id;
  assert.ok(Math.abs(r.data.ubicacion.lat - -4.9) < 0.01, 'en Sullana, no en la zona de la cuenta (Piura)');
  assert.equal(r.data.razonSocial, 'Bazar de Rosa');
  assert.equal((await publicar(vendedor, { ubicacion: { lat: 40.4, lng: -3.7 } })).status, 400, 'fuera del Perú');
  assert.equal((await vendedor.get('/lotes/geocodificar?q=Sullana')).data.aproximada, true);
});

test('editar, pausar y reanudar: solo el dueño; pausada no se ve en el marketplace', async () => {
  assert.equal((await compradora.patch(`/lotes/${loteId}`, { precio: 1 })).status, 403);
  const e = await vendedor.patch(`/lotes/${loteId}`, { titulo: 'Silla de madera tallada', precio: 45 });
  assert.equal(e.status, 200);
  assert.equal(e.data.precio, 45);

  assert.equal((await vendedor.post(`/lotes/${loteId}/pausar`)).data.estado, 'PAUSADO');
  const visibles = (await compradora.get('/lotes')).data.map((l: { id: string }) => l.id);
  assert.ok(!visibles.includes(loteId), 'pausada no aparece');
  assert.equal((await compradora.post('/transacciones', { loteId, cantidad: 1 })).status, 400, 'no se puede pedir');
  assert.equal((await vendedor.post(`/lotes/${loteId}/pausar`)).status, 400, 'ya está pausada');

  assert.equal((await vendedor.post(`/lotes/${loteId}/reanudar`)).data.estado, 'PUBLICADO');
  assert.ok((await compradora.get('/lotes')).data.some((l: { id: string }) => l.id === loteId));
});

test('el chat del comprador muestra el nombre de la tienda', async () => {
  const t = await compradora.post('/transacciones', { loteId, cantidad: 1, mensaje: 'Hola, ¿sigue disponible?' });
  assert.equal(t.status, 201);
  const lista = (await compradora.get('/transacciones')).data;
  assert.equal(lista[0].contraparte.razonSocial, 'Bazar de Rosa');
});
