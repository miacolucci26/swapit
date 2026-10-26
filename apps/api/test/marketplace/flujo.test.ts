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
let A: Cliente; // ofertante (Piura)
let B: Cliente; // receptor (Chiclayo)
let ids: { A: string; B: string };

const alta = async (c: Cliente, n: string, rol: string, dir: string, email: string) => {
  const r = await c.post('/auth/registro', {
    empresa: { ruc: construirRuc(n), razonSocial: `Empresa ${email}`, rol, direccion: dir, representanteLegal: 'Rep Legal' },
    usuario: { nombre: 'Usuario', email, password: 'clave-segura-1' },
  });
  assert.equal(r.status, 201);
  return r.data.empresa.id as string;
};
const lote = (extra: object) => ({
  categoriaCodigo: 'ORGANICO_AGRO', titulo: 'Cáscara y pulpa de arándano', descripcion: 'Cáscara y pulpa de arándano de la línea de proceso, material húmedo sin aditivos.',
  keywords: ['arándano', 'cáscara'], cantidad: 50, modalidad: 'VENTA', precio: 100, ...extra,
});
const estado = async (c: Cliente, id: string) => (await c.get(`/transacciones/${id}`)).data;

before(async () => {
  db = await iniciarDb(5602);
  const { app: a, base } = await crearApp();
  app = a;
  const prisma = app.get(PrismaService);
  const f = FACTORES_IMPACTO.ORGANICO_AGRO;
  await prisma.categoriaResiduo.create({ data: { codigo: 'ORGANICO_AGRO', nombre: 'Residuos orgánicos agroindustriales (cáscara, pulpa, bagazo)', sector: 'Agroindustria', codigoLer: '02 03 04', usoTipico: 'Compost', factorCo2PorTon: f.co2PorTon, factorCreditosPorTon: f.creditosPorTon } });
  await prisma.configPlataforma.create({ data: { id: 1 } });
  A = new Cliente(base);
  B = new Cliente(base);
  ids = { A: await alta(A, '2070000001', 'OFERTANTE', 'Zona Industrial, Piura', 'a@flujo.pe'), B: await alta(B, '2070000002', 'RECEPTOR', 'Parque Industrial, Chiclayo', 'b@flujo.pe') };
});
after(async () => {
  await app.close();
  await db.detener();
});

test('lotes: publicar con embedding; el receptor ve distancia (PostGIS) y flete; filtro por radio', async () => {
  const r = await A.post('/lotes', lote({}));
  assert.equal(r.status, 201);
  assert.equal(r.data.esMio, true);
  const lista = (await B.get('/lotes')).data;
  assert.equal(lista.length, 1);
  assert.ok(lista[0].distanciaKm > 150 && lista[0].distanciaKm < 260, `Piura–Chiclayo ≈ 190 km, fue ${lista[0].distanciaKm}`);
  assert.ok(lista[0].fleteEstimado > 0);
  assert.equal((await B.get('/lotes?radioKm=50')).data.length, 0, 'fuera de 50 km');
  assert.equal((await B.get('/lotes?radioKm=300')).data.length, 1);
  assert.equal((await B.get('/lotes?q=arándano')).data.length, 1);
  assert.equal((await B.get('/lotes?q=chatarra')).data.length, 0);
});

test('lotes: validaciones (venta sin precio, receptor no puede publicar)', async () => {
  assert.equal((await A.post('/lotes', lote({ precio: undefined }))).status, 400);
  assert.equal((await B.post('/lotes', lote({}))).status, 403);
});

test('matching: pgvector rankea el lote afín y descarta lo irrelevante', async () => {
  const r = (await B.get('/matching/buscar?texto=cáscara de arándano para compost&radioKm=300')).data;
  assert.equal(r.length >= 1, true);
  assert.ok(r[0].score >= 50 && r[0].explicacion.includes('afinidad'));
  assert.equal((await B.get('/matching/buscar?texto=chatarra de acero&radioKm=300')).data.length, 0);
});

test('alertas: una alerta genera match con lotes nuevos', async () => {
  const a = await B.post('/matching/alertas', { texto: 'bagazo de espárrago para compostaje', radioKm: 300 });
  assert.equal(a.status, 201);
  await A.post('/lotes', lote({ titulo: 'Bagazo de espárrago verde', descripcion: 'Bagazo y puntas de espárrago verde prensado, apto para compostaje.', keywords: ['espárrago', 'bagazo'], cantidad: 20, precio: 60 }));
  const lista = (await B.get('/matching/alertas')).data;
  assert.equal(lista[0].nuevos >= 1, true);
  assert.equal(lista[0].matches[0].titulo, 'Bagazo de espárrago verde');
});

let venta: string;
test('venta: solicitud → negociación → acuerdo → pago retenido → recojo → doble firma → certificado', async () => {
  const lotes = (await B.get('/lotes?q=arándano')).data;
  const s = await B.post('/transacciones', { loteId: lotes[0].id, cantidad: 10 });
  assert.equal(s.status, 201);
  venta = s.data.id;
  assert.equal((await estado(A, venta)).estado, 'SOLICITADO');

  await A.post(`/transacciones/${venta}/mensajes`, { texto: 'Hola, tenemos disponibilidad' });
  assert.equal((await estado(A, venta)).estado, 'EN_NEGOCIACION');

  assert.equal((await A.put(`/transacciones/${venta}/terminos`, { cantidad: 10, precioAcordado: 100 })).status, 200);
  assert.equal((await A.post(`/transacciones/${venta}/aceptar`)).status, 400, 'quien propone no puede aceptar su propia propuesta');
  assert.equal((await B.post(`/transacciones/${venta}/aceptar`)).status, 200);
  const acordada = await estado(B, venta);
  assert.equal(acordada.estado, 'ACORDADO');
  assert.equal(acordada.total, 1000);
  assert.equal(acordada.comision, 60, '6% de S/ 1000');
  assert.equal(acordada.contrato.total, 1000);
  assert.equal((await A.get(`/lotes/${lotes[0].id}`)).data.cantidadDisponible, 40, 'reserva 10 t');

  assert.equal((await A.post(`/transacciones/${venta}/pagar`)).status, 403, 'solo el receptor paga');
  assert.equal((await B.post(`/transacciones/${venta}/pagar`)).status, 200);
  assert.equal((await estado(B, venta)).pagoEstado, 'RETENIDO');
  assert.equal((await B.post(`/transacciones/${venta}/pagar`)).status, 400, 'no se paga dos veces');

  assert.equal((await B.post(`/transacciones/${venta}/recojo`, { fechaRecojo: new Date().toISOString(), responsableRecojo: 'Transportes Norte' })).status, 200);
  assert.equal((await B.post(`/transacciones/${venta}/firmar`, { usoFinalDeclarado: 'Compostaje industrial' })).status, 200);
  assert.equal((await estado(B, venta)).estado, 'RECOJO_CONFIRMADO', 'falta la firma del ofertante');
  assert.equal((await B.post(`/transacciones/${venta}/firmar`, {})).status, 400, 'no se firma dos veces');
  assert.equal((await A.post(`/transacciones/${venta}/firmar`, {})).status, 200);

  const e = await estado(A, venta);
  assert.equal(e.estado, 'ENTREGADO');
  assert.equal(e.pagoEstado, 'LIBERADO');
  assert.ok(e.certificado.codigo.startsWith('SWP-'));
});

test('certificado: verificación pública íntegra, PDF real y detección de manipulación', async () => {
  const cod = (await estado(A, venta)).certificado.codigo;
  const pub = new Cliente((B as unknown as { base: string }).base);
  const v = await pub.get(`/verificar/${cod}`);
  assert.equal(v.status, 200);
  assert.equal(v.data.valido, true);
  assert.equal(v.data.toneladas, 10);
  assert.equal(v.data.usoFinalDeclarado, 'Compostaje industrial');
  assert.equal(v.data.co2EvitadoTon, 4.5, '10 t × 450 kg/t');
  const pdf = await pub.get(`/verificar/${cod}/pdf`);
  assert.equal(pdf.status, 200);
  assert.equal((pdf.data as Buffer).subarray(0, 5).toString(), '%PDF-');
  // Manipular los datos después de la emisión invalida el certificado
  const prisma = app.get(PrismaService);
  await prisma.certificado.update({ where: { codigo: cod }, data: { ton: 99 } });
  assert.equal((await pub.get(`/verificar/${cod}`)).data.valido, false);
  await prisma.certificado.update({ where: { codigo: cod }, data: { ton: 10 } });
  assert.equal((await pub.get(`/verificar/${cod}`)).data.valido, true);
  assert.equal((await pub.get('/verificar/SWP-0000-NOEXISTE')).status, 404);
});

test('calificaciones: ENTREGADO → CALIFICADO → CERRADO y reputación', async () => {
  assert.equal((await A.post(`/transacciones/${venta}/calificar`, { estrellas: 5, comentario: 'Excelente' })).status, 200);
  assert.equal((await estado(A, venta)).estado, 'CALIFICADO');
  assert.equal((await A.post(`/transacciones/${venta}/calificar`, { estrellas: 1 })).status, 400, 'una sola calificación por parte');
  assert.equal((await B.post(`/transacciones/${venta}/calificar`, { estrellas: 4 })).status, 200);
  assert.equal((await estado(B, venta)).estado, 'CERRADO');
  assert.equal((await A.get(`/empresas/${ids.B}`)).data.ratingProm, 5);
  assert.equal((await B.get(`/empresas/${ids.A}`)).data.ratingProm, 4);
  assert.equal((await A.post(`/transacciones/${venta}/calificar`, { estrellas: 5 })).status, 400);
});

test('donación: al confirmarse la entrega el ofertante gana créditos según categoría', async () => {
  const l = (await A.post('/lotes', lote({ titulo: 'Descarte de uva de mesa', descripcion: 'Uva de mesa descartada por calibre.', modalidad: 'DONACION', precio: undefined, cantidad: 20 }))).data;
  const { data: { id } } = await B.post('/transacciones', { loteId: l.id, cantidad: 5 });
  await A.post(`/transacciones/${id}/mensajes`, { texto: 'ok' });
  await B.put(`/transacciones/${id}/terminos`, { cantidad: 5 });
  assert.equal((await A.post(`/transacciones/${id}/aceptar`)).status, 200);
  const t = await estado(A, id);
  assert.equal(t.comision, 15, 'fee fijo de coordinación');
  assert.equal((await B.post(`/transacciones/${id}/pagar`)).status, 400, 'una donación no se paga');
  await A.post(`/transacciones/${id}/recojo`, { fechaRecojo: new Date().toISOString(), responsableRecojo: 'Receptor' });
  await A.post(`/transacciones/${id}/firmar`, {});
  await B.post(`/transacciones/${id}/firmar`, {});
  assert.equal((await estado(A, id)).estado, 'ENTREGADO');
  const c = (await A.get('/creditos')).data;
  assert.equal(c.saldo, 5 * FACTORES_IMPACTO.ORGANICO_AGRO.creditosPorTon);
  assert.equal(c.movimientos[0].tipo, 'GANADO_DONACION');
});

test('créditos: ledger consistente y canje de beneficios con validación de saldo', async () => {
  const c = (await A.get('/creditos')).data;
  assert.equal(c.saldo, c.movimientos.reduce((s: number, m: { monto: number }) => s + m.monto, 0), 'saldo = suma del ledger');
  assert.equal((await B.post('/creditos/canjear', { beneficio: 'BADGE_CIRCULAR' })).status, 400, 'sin saldo');
  const lotes = (await A.get('/lotes?mios=1')).data.filter((l: { estado: string }) => l.estado === 'PUBLICADO');
  const canje = await A.post('/creditos/canjear', { beneficio: 'DESTACAR_LOTE', loteId: lotes[0].id });
  assert.equal(canje.status, 200);
  assert.equal(canje.data.saldo, 150, '200 − 50 créditos');
  assert.equal((await A.get(`/lotes/${lotes[0].id}`)).data.destacado, true);
  assert.equal((await A.post('/creditos/canjear', { beneficio: 'BADGE_CIRCULAR' })).status, 400, 'badge cuesta 200 y quedan 150');
  assert.equal((await A.post('/creditos/canjear', { beneficio: 'DESTACAR_LOTE', loteId: 'no-existe' })).status, 400);
});

test('cancelación: reembolsa el pago retenido y libera la reserva', async () => {
  const l = (await A.get('/lotes?mios=1')).data.find((x: { titulo: string; modalidad: string }) => x.titulo === 'Cáscara y pulpa de arándano' && x.modalidad === 'VENTA');
  const antes = l.cantidadDisponible;
  const sol = await B.post('/transacciones', { loteId: l.id, cantidad: 5 });
  assert.equal(sol.status, 201, JSON.stringify(sol.data));
  const id = sol.data.id;
  assert.equal((await A.post(`/transacciones/${id}/mensajes`, { texto: 'ok' })).status, 201);
  const prop = await A.put(`/transacciones/${id}/terminos`, { cantidad: 5, precioAcordado: 100 });
  assert.equal(prop.status, 200, JSON.stringify(prop.data));
  const ac = await B.post(`/transacciones/${id}/aceptar`);
  assert.equal(ac.status, 200, JSON.stringify(ac.data));
  const pg = await B.post(`/transacciones/${id}/pagar`);
  assert.equal(pg.status, 200, JSON.stringify(pg.data));
  assert.equal((await A.get(`/lotes/${l.id}`)).data.cantidadDisponible, antes - 5);
  assert.equal((await A.post(`/transacciones/${id}/cancelar`, { motivo: 'cambio de planes' })).status, 200);
  const t = await estado(B, id);
  assert.equal(t.estado, 'CANCELADO');
  assert.equal(t.pagoEstado, 'REEMBOLSADO');
  assert.equal((await A.get(`/lotes/${l.id}`)).data.cantidadDisponible, antes);
  assert.equal((await B.post(`/transacciones/${id}/pagar`)).status, 400, 'no se opera sobre una cancelada');
});

test('seguridad: un tercero no ve transacciones ajenas ni puede operar sobre ellas', async () => {
  const C = new Cliente((B as unknown as { base: string }).base);
  await alta(C, '2070000003', 'AMBOS', 'Zona Industrial, Sullana', 'c@flujo.pe');
  assert.equal((await C.get(`/transacciones/${venta}`)).status, 404);
  assert.equal((await C.post(`/transacciones/${venta}/cancelar`)).status, 404);
  assert.equal((await C.get('/transacciones')).data.length, 0);
});

test('incidencias: la contraparte no las ve; solo moderación', async () => {
  const id = venta;
  assert.equal((await A.post(`/transacciones/${id}/incidencias`, { tipo: 'OTRO', detalle: 'Prueba de incidencia' })).status, 201);
  assert.equal((await B.get('/admin/incidencias')).status, 403);
});

test('impacto: agregado público coherente con lo entregado (10 t venta + 5 t donación)', async () => {
  const i = (await new Cliente((B as unknown as { base: string }).base).get('/impacto/publico')).data;
  assert.equal(i.toneladas, 15);
  assert.equal(i.simbiosis, 2);
  assert.equal(i.ingresosSoles, 1000);
  assert.equal(i.certificados, 2);
  assert.equal(i.co2EvitadoTon, Math.round(((15 * 450) / 1000) * 100) / 100);
  const cum = (await A.get('/cumplimiento')).data;
  assert.equal(cum.totalToneladas, 15);
  const xlsx = await A.get('/cumplimiento/export.xlsx');
  assert.equal(xlsx.status, 200);
  assert.equal((xlsx.data as Buffer).subarray(0, 2).toString(), 'PK', 'un .xlsx es un zip');
});
