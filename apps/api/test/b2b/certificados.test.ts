import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { INestApplication } from '@nestjs/common';
import { FACTORES_IMPACTO, SUBTIPOS_PLASTICO, construirRuc } from '@swapit/shared';
import { BillingProvider } from '../../src/common/billing/billing.provider';
import { UPLOADS_DIR } from '../../src/common/uploads';
import { PrismaService } from '../../src/prisma/prisma.service';
import { iniciarDb } from '../db';
import { Cliente, crearApp } from '../http';

let app: INestApplication;
let db: { detener(): Promise<void> };
let prisma: PrismaService;
let base: string;
let norte: Cliente;
let sur: Cliente;
let provId: string;
let idNorte: string;
let lote1: string;
let codigo: string;

const registrar = (c: Cliente, n: string, email: string, razon: string) =>
  c.post('/auth/registro', { tipo: 'EMPRESA', empresa: { ruc: construirRuc(n), razonSocial: razon, direccion: 'Zona Industrial, Piura', representanteLegal: 'Rep' }, usuario: { nombre: 'Gerente', email, password: 'clave-segura-1' } });

/** Lleva un lote hasta DESPACHADO y devuelve su id. */
async function despachado(c: Cliente, titulo: string, cliente = 'Reciclados Lima SAC') {
  const l = (await c.post('/material', { proveedorId: provId, categoriaCodigo: 'PLASTICO_PET', descripcion: titulo, cantidad: 1000, unidad: 'kg' })).data;
  await c.post(`/material/${l.id}/cotizar`, { precioOfrecido: 1.4 });
  await c.post(`/material/${l.id}/acopiar`, { cantidadAcopiada: 950, precioFinal: 1.4 });
  await c.post(`/material/${l.id}/despachar`, { clienteDestino: cliente, clienteDestinoRuc: construirRuc('2097200001') });
  return l.id as string;
}

before(async () => {
  db = await iniciarDb(5612);
  ({ app, base } = await crearApp());
  prisma = app.get(PrismaService);
  const f = FACTORES_IMPACTO;
  for (const s of SUBTIPOS_PLASTICO.slice(0, 1)) {
    await prisma.categoriaResiduo.create({ data: { codigo: s.codigo, nombre: s.nombre, sector: 'Manufactura', familia: 'PLASTICO', codigoLer: s.codigoLer, usoTipico: 'Reciclado mecánico', factorCo2PorTon: f[s.codigo].co2PorTon, factorCreditosPorTon: f[s.codigo].creditosPorTon } });
  }
  await prisma.configPlataforma.create({ data: { id: 1 } });
  norte = new Cliente(base);
  sur = new Cliente(base);
  idNorte = (await registrar(norte, '2097000001', 'norte@test.pe', 'Acopios del Norte SAC')).data.empresa.id;
  await registrar(sur, '2097000002', 'sur@test.pe', 'Reciclajes del Sur SAC');
  provId = (await norte.post('/empresas/proveedores', { razonSocial: 'Plásticos Ganoza SAC', direccion: 'Zona Industrial, Piura', contactoNombre: 'Manuel G.' })).data.id;
});
after(async () => {
  await app.close();
  await db.detener();
});

test('certificado: sin suscripción activa no se emite, aunque el material esté despachado', async () => {
  lote1 = await despachado(norte, 'Botellas PET prensadas, lote 1');
  const r = await norte.post(`/material/${lote1}/certificado`, {});
  assert.equal(r.status, 409);
  assert.match(r.data.message, /suscripción activa/);
  assert.equal((await prisma.certificado.count()), 0);
});

test('facturación: suscribirse es idempotente y muestra plan, precio y fees (cobros simulados)', async () => {
  const a = (await norte.post('/facturacion/suscribir')).data;
  assert.equal(a.suscripcion.estado, 'ACTIVA');
  assert.equal(a.yaActiva, false);
  assert.equal(a.plan.precioMensual, 199, 'precio de ejemplo configurable');
  const b = (await norte.post('/facturacion/suscribir')).data;
  assert.equal(b.yaActiva, true);
  assert.equal(await prisma.suscripcion.count({ where: { empresaId: idNorte } }), 1, 'no se duplica ni se cobra de nuevo');
  assert.match(a.aviso, /simulados/);
  assert.equal((await sur.get('/facturacion')).data.suscripcion, null, 'cada intermediario ve la suya');
});

test('certificado: solo de material despachado, y de la red propia', async () => {
  const l = (await norte.post('/material', { proveedorId: provId, categoriaCodigo: 'PLASTICO_PET', descripcion: 'Botellas PET sin despachar', cantidad: 100, unidad: 'kg' })).data;
  assert.equal((await norte.post(`/material/${l.id}/certificado`, {})).status, 400);
  assert.equal((await sur.post(`/material/${lote1}/certificado`, {})).status, 404, 'otro intermediario no puede certificar material ajeno');
});

test('certificado: se emite a nombre del intermediario, con la cadena generador → intermediario → cliente', async () => {
  const r = await norte.post(`/material/${lote1}/certificado`, { usoFinal: 'Reciclaje mecánico en hojuela' });
  assert.equal(r.status, 200);
  codigo = r.data.codigo;
  assert.match(codigo, /^SWP-\d{4}-[0-9A-F]{8}$/);
  const v = (await new Cliente(base).get(`/verificar/${codigo}`)).data;
  assert.equal(v.valido, true);
  assert.equal(v.emisor.razonSocial, 'Acopios del Norte SAC');
  assert.equal(v.ofertante.razonSocial, 'Plásticos Ganoza SAC');
  assert.equal(v.ofertante.ruc, null, 'el proveedor es informal: sin RUC');
  assert.equal(v.receptor.razonSocial, 'Reciclados Lima SAC');
  assert.equal(v.cantidad, '950 kg');
  assert.equal(v.toneladas, 0.95);
  assert.equal(v.usoFinalDeclarado, 'Reciclaje mecánico en hojuela');
  assert.equal((await norte.get(`/material/${lote1}`)).data.certificado, codigo, 'el material muestra su certificado');
});

test('certificado: idempotente (mismo código) y cobra un solo fee', async () => {
  const otra = await norte.post(`/material/${lote1}/certificado`, {});
  assert.equal(otra.data.codigo, codigo);
  assert.equal(await prisma.cobroFee.count({ where: { empresaId: idNorte } }), 1);
  const f = (await norte.get('/facturacion')).data;
  assert.equal(f.feesDelMes.cantidad, 1);
  assert.equal(f.feesDelMes.monto, 5);
  assert.equal(f.recientes[0].estado, 'COBRADO');
  assert.equal(f.recientes[0].certificado, codigo);
});

test('certificado: detecta manipulación, como el de marketplace', async () => {
  await prisma.certificado.update({ where: { codigo }, data: { ton: 9 } });
  assert.equal((await new Cliente(base).get(`/verificar/${codigo}`)).data.valido, false);
  await prisma.certificado.update({ where: { codigo }, data: { ton: 0.95 } });
  assert.equal((await new Cliente(base).get(`/verificar/${codigo}`)).data.valido, true);
  // Cambiar al cliente destino también rompe el hash (la cadena de custodia no se puede reescribir).
  await prisma.certificado.update({ where: { codigo }, data: { clienteRuc: construirRuc('2097200009') } });
  assert.equal((await new Cliente(base).get(`/verificar/${codigo}`)).data.valido, false);
  await prisma.certificado.update({ where: { codigo }, data: { clienteRuc: construirRuc('2097200001') } });
  assert.equal((await new Cliente(base).get(`/verificar/${codigo}`)).data.valido, true);
});

const imagenesEnPdf = (b: Buffer) => (b.toString('latin1').match(/\/Subtype \/Image/g) ?? []).length;

test('PDF co-marcado: con el logo del intermediario se dibuja y sin él no', async () => {
  const sinLogo = (await new Cliente(base).get(`/verificar/${codigo}/pdf`)).data as Buffer;
  assert.equal(sinLogo.subarray(0, 5).toString(), '%PDF-');
  const base1 = imagenesEnPdf(sinLogo); // el QR
  // PNG de 1×1 píxel, suficiente para comprobar que el logo se dibuja.
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  writeFileSync(join(UPLOADS_DIR, 'logo-prueba.png'), png);
  const up = await norte.patch('/empresas/mi', { logoUrl: '/api/uploads/logo-prueba.png', colorMarca: '#1d4ed8' });
  assert.equal(up.data.colorMarca, '#1d4ed8');
  const conLogo = (await new Cliente(base).get(`/verificar/${codigo}/pdf`)).data as Buffer;
  assert.ok(imagenesEnPdf(conLogo) > base1, 'el logo se dibuja (un PNG con transparencia añade imagen y máscara)');
  assert.equal((await norte.patch('/empresas/mi', { colorMarca: 'azul' })).status, 400, 'el color debe ser hexadecimal');
});

test('certificados emitidos: cada intermediario ve solo los suyos', async () => {
  const mios = (await norte.get('/certificados')).data;
  assert.equal(mios.length, 1);
  assert.equal(mios[0].receptor, 'Reciclados Lima SAC');
  assert.equal(mios[0].ofertante, 'Plásticos Ganoza SAC');
  assert.equal((await sur.get('/certificados')).data.length, 0);
});

test('si la pasarela falla, el certificado se emite igual y el fee queda FALLIDO para reintentar', async () => {
  const lote2 = await despachado(norte, 'Botellas PET prensadas, lote 2', 'Otra Recicladora SAC');
  const billing = app.get(BillingProvider);
  const original = billing.cobrarFee.bind(billing);
  billing.cobrarFee = async () => {
    throw new Error('pasarela caída');
  };
  try {
    const r = await norte.post(`/material/${lote2}/certificado`, {});
    assert.equal(r.status, 200);
    const fee = await prisma.cobroFee.findFirstOrThrow({ where: { certificado: { loteId: lote2 } } });
    assert.equal(fee.estado, 'FALLIDO');
  } finally {
    billing.cobrarFee = original;
  }
});

test('cancelar la suscripción vuelve a bloquear la emisión', async () => {
  const lote3 = await despachado(norte, 'Botellas PET prensadas, lote 3', 'Tercera Recicladora SAC');
  assert.equal((await norte.post('/facturacion/cancelar')).data.suscripcion, null);
  assert.equal((await norte.post(`/material/${lote3}/certificado`, {})).status, 409);
});
