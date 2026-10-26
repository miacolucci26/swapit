// Suite del modo MARKETPLACE (producto anterior, hoy detrás del interruptor SWAPIT_MODO). Se retira junto con ese código.
process.env.SWAPIT_MODO = 'MARKETPLACE';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { INestApplication } from '@nestjs/common';
import { construirRuc } from '@swapit/shared';
import { iniciarDb } from '../db';
import { Cliente, crearApp } from '../http';

let app: INestApplication;
let base: string;
let db: { detener(): Promise<void> };
let ana: Cliente;

const registro = (ruc: string, email: string, direccion = 'Zona Industrial Mz. B, Piura') => ({
  empresa: { ruc, razonSocial: 'Agro Piura SAC', rol: 'OFERTANTE', direccion, representanteLegal: 'Ana Torres' },
  usuario: { nombre: 'Ana Torres', email, password: 'clave-segura-1' },
});
const RUC_OK = construirRuc('2060000011');

before(async () => {
  db = await iniciarDb(5601);
  ({ app, base } = await crearApp());
  ana = new Cliente(base);
});
after(async () => {
  await app.close();
  await db.detener();
});

test('registro: crea empresa, geocodifica con PostGIS (Piura), KYB verificada y cookie httpOnly', async () => {
  const r = await ana.post('/auth/registro', registro(RUC_OK, 'ana@agropiura.pe'));
  assert.equal(r.status, 201);
  assert.match(r.set ?? '', /swapit_token=.*HttpOnly/i);
  assert.equal(r.data.passwordHash, undefined);
  assert.equal(r.data.empresa.estadoKyb, 'VERIFICADA');
  const mi = await ana.get('/empresas/mi');
  assert.ok(Math.abs(mi.data.ubicacion.lat - -5.19) < 0.05, 'lat en Piura');
});

test('registro: RUC con dígito verificador inválido -> 400 con detalle por campo', async () => {
  const r = await new Cliente(base).post('/auth/registro', registro('20131312956', 'x@x.pe'));
  assert.equal(r.status, 400);
  assert.equal(r.data.errores[0].campo, 'empresa.ruc');
});

test('registro: RUC o email duplicado -> 409', async () => {
  const c = new Cliente(base);
  assert.equal((await c.post('/auth/registro', registro(RUC_OK, 'otro@x.pe'))).status, 409);
  assert.equal((await c.post('/auth/registro', registro(construirRuc('2060000021'), 'ana@agropiura.pe'))).status, 409);
});

test('registro: RUC dado de baja en SUNAT (mock) -> KYB RECHAZADA', async () => {
  const r = await new Cliente(base).post('/auth/registro', registro(construirRuc('2060000100'), 'baja@x.pe'));
  assert.equal(r.status, 201);
  assert.equal(r.data.empresa.estadoKyb, 'RECHAZADA');
});

test('auth: /me 401 sin cookie, login correcto/incorrecto, logout', async () => {
  assert.equal((await new Cliente(base).get('/auth/me')).status, 401);
  assert.equal((await ana.get('/auth/me')).data.email, 'ana@agropiura.pe');
  assert.equal((await new Cliente(base).post('/auth/login', { email: 'ana@agropiura.pe', password: 'mala' })).status, 401);
  assert.equal((await new Cliente(base).post('/auth/login', { email: 'ana@agropiura.pe', password: 'clave-segura-1' })).status, 200);
});

test('empresas: PATCH dirección re-geocodifica; fuera de zona deja null sin romper', async () => {
  const c = await ana.patch('/empresas/mi', { direccion: 'Parque Industrial, Chiclayo' });
  assert.ok(c.data.ubicacion.lat < -6.7);
  const l = await ana.patch('/empresas/mi', { direccion: 'Av. Arequipa 1000, Lima' });
  assert.equal(l.data.ubicacion, null);
  await ana.patch('/empresas/mi', { direccion: 'Zona Industrial Mz. B, Piura' });
});

test('perfil público sin RUC ni representante; requiere sesión; certificaciones', async () => {
  const mi = (await ana.get('/empresas/mi')).data;
  assert.equal((await new Cliente(base).get(`/empresas/${mi.id}`)).status, 401);
  const p = await ana.get(`/empresas/${mi.id}`);
  assert.equal(p.data.ruc, undefined);
  assert.equal(p.data.representanteLegal, undefined);
  const c = await ana.post('/empresas/mi/certificaciones', { nombre: 'ISO 14001' });
  assert.equal(c.status, 201);
  assert.equal((await ana.del(`/empresas/mi/certificaciones/${c.data.id}`)).status, 204);
  assert.equal((await ana.del(`/empresas/mi/certificaciones/${c.data.id}`)).status, 404);
});

test('rol ADMIN: un usuario de empresa no accede a moderación', async () => {
  assert.equal((await ana.get('/admin/incidencias')).status, 403);
});

test('sesión de un usuario inexistente (token vigente) -> 401, no 500', async () => {
  const c = new Cliente(base);
  await c.post('/auth/registro', registro(construirRuc('2060000031'), 'efimero@x.pe'));
  const { PrismaService } = await import('../../src/prisma/prisma.service');
  const prisma = app.get(PrismaService);
  const u = await prisma.usuario.findUniqueOrThrow({ where: { email: 'efimero@x.pe' } });
  await prisma.usuario.delete({ where: { id: u.id } });
  assert.equal((await c.get('/auth/me')).status, 401);
});

test('logout limpia la cookie', async () => {
  const c = new Cliente(base);
  await c.post('/auth/login', { email: 'ana@agropiura.pe', password: 'clave-segura-1' });
  const r = await c.post('/auth/logout');
  assert.equal(r.status, 204);
  assert.match(r.set ?? '', /swapit_token=;/);
});
