// Despliegue real con dos empresas: empresas demo, verificación honesta, contacto tras el acuerdo, etapas y subida de imágenes.
process.env.SWAPIT_MODO = 'MARKETPLACE';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { INestApplication } from '@nestjs/common';
import { FACTORES_IMPACTO, construirRuc } from '@swapit/shared';
import { PrismaService } from '../../src/prisma/prisma.service';
import { fijarStorage, type StorageDriver } from '../../src/storage/storage';
import { iniciarDb } from '../db';
import { Cliente, crearApp } from '../http';

let app: INestApplication;
let db: { detener(): Promise<void> };
let prisma: PrismaService;
let base: string;
let A: Cliente; // ofertante real (con contacto)
let B: Cliente; // receptor real (con contacto)
let C: Cliente; // tercero (sin contacto)
let D: Cliente; // empresa demo
let ADM: Cliente;
let ids: Record<'A' | 'B' | 'C' | 'D', string> = { A: '', B: '', C: '', D: '' };
const guardados = new Map<string, Buffer>();
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

const driverFalso: StorageDriver = {
  tipo: 'supabase',
  async guardar(n, d) { guardados.set(n, d); },
  async leer(n) { return guardados.get(n) ?? null; },
  urlPublica: (n) => `https://falso.supabase.co/storage/v1/object/public/lotes/${n}`,
};

const alta = async (c: Cliente, n: string, rol: string, email: string, extra: object = {}) => {
  const r = await c.post('/auth/registro', {
    empresa: { ruc: construirRuc(n), razonSocial: `Empresa ${email}`, rol, direccion: 'Zona Industrial, Piura', representanteLegal: 'Rep Legal', ...extra },
    usuario: { nombre: 'Usuario Prueba', email, password: 'clave-segura-1' },
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  return r.data;
};
const lote = (extra: object) => ({
  categoriaCodigo: 'ORGANICO_AGRO', titulo: 'Descarte de uva de mesa', descripcion: 'Uva de mesa descartada por calibre, lista para recojo.',
  keywords: ['uva'], cantidad: 20, modalidad: 'DONACION', ...extra,
});
const detalle = async (c: Cliente, id: string) => (await c.get(`/transacciones/${id}`)).data;
const subir = async (c: Cliente, nombre: string, datos: Buffer, tipo: string) => {
  const fd = new FormData();
  fd.append('file', new Blob([new Uint8Array(datos)], { type: tipo }), nombre);
  const res = await fetch(`${base}/api/uploads`, { method: 'POST', body: fd, headers: { Cookie: c.cookie } });
  return { status: res.status, data: await res.json().catch(() => ({})) };
};

before(async () => {
  db = await iniciarDb(5630);
  fijarStorage(driverFalso);
  ({ app, base } = await crearApp());
  prisma = app.get(PrismaService);
  const f = FACTORES_IMPACTO.ORGANICO_AGRO;
  await prisma.categoriaResiduo.create({ data: { codigo: 'ORGANICO_AGRO', nombre: 'Residuos orgánicos agroindustriales (cáscara, pulpa, bagazo)', sector: 'Agroindustria', codigoLer: '02 03 04', usoTipico: 'Compost', factorCo2PorTon: f.co2PorTon, factorCreditosPorTon: f.creditosPorTon } });
  await prisma.configPlataforma.create({ data: { id: 1 } });
  A = new Cliente(base); B = new Cliente(base); C = new Cliente(base); D = new Cliente(base); ADM = new Cliente(base);
  ids.A = (await alta(A, '2080000001', 'OFERTANTE', 'a@real.pe', { contactoNombre: 'Ana Torres', telefono: '987 654 321' })).empresa.id;
  ids.B = (await alta(B, '2080000002', 'RECEPTOR', 'b@real.pe', { contactoNombre: 'Beto Ruiz', telefono: '+51912345678' })).empresa.id;
  ids.C = (await alta(C, '2080000003', 'AMBOS', 'c@real.pe')).empresa.id;
  ids.D = (await alta(D, '2080000004', 'OFERTANTE', 'd@demo.pe')).empresa.id;
  await prisma.empresa.update({ where: { id: ids.D }, data: { esDemo: true } });
  // Un administrador: se promueve a un usuario y se vuelve a iniciar sesión (el rol viaja en el token).
  await alta(ADM, '2080000005', 'AMBOS', 'admin@real.pe');
  await prisma.usuario.update({ where: { email: 'admin@real.pe' }, data: { rol: 'ADMIN' } });
  assert.equal((await ADM.post('/auth/login', { email: 'admin@real.pe', password: 'clave-segura-1' })).status, 200);
});
after(async () => {
  fijarStorage(undefined);
  delete process.env.OCULTAR_DEMO;
  await app.close();
  await db.detener();
});

test('health: comprueba la base de datos y las extensiones', async () => {
  const r = await new Cliente(base).get('/health');
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
  assert.equal(r.data.postgis, true);
  assert.equal(r.data.pgvector, true);
});

test('subida: imagen válida → driver de almacenamiento (falso), nombre aleatorio y URL pública; no se acepta otra cosa', async () => {
  const ok = await subir(A, 'mi foto.png', PNG, 'image/png');
  assert.equal(ok.status, 201, JSON.stringify(ok.data));
  assert.match(ok.data.nombre, /^[0-9a-f]{24}\.png$/);
  assert.equal(ok.data.url, `https://falso.supabase.co/storage/v1/object/public/lotes/${ok.data.nombre}`);
  assert.deepEqual(guardados.get(ok.data.nombre), PNG);
  assert.equal((await subir(A, 'virus.exe', PNG, 'application/octet-stream')).status, 400);
  assert.equal((await subir(A, 'falso.png', Buffer.from('<?php echo 1; ?>'), 'image/png')).status, 400, 'una extensión .png con contenido que no es imagen se rechaza');
  const grande = await subir(A, 'enorme.png', Buffer.concat([PNG, Buffer.alloc(6 * 1024 * 1024)]), 'image/png');
  assert.ok(grande.status === 413 || grande.status === 400, `fue ${grande.status}`);
  assert.equal(await prisma.loteImagen.count(), 0);
  // sin sesión no se sube
  assert.equal((await subir(new Cliente(base), 'a.png', PNG, 'image/png')).status, 401);
  // La imagen subida se enlaza al lote con la URL del driver.
  const l = await A.post('/lotes', lote({ imagenes: [ok.data.nombre] }));
  assert.equal(l.status, 201, JSON.stringify(l.data));
  assert.equal(l.data.imagenes[0], ok.data.url);
});

test('empresa demo: lotes y detalle exponen demo; OCULTAR_DEMO=1 los quita de la lista pública y del mapa pero no de «mis lotes»', async () => {
  const ld = await D.post('/lotes', lote({ titulo: 'Lote de empresa de demostración' }));
  assert.equal(ld.status, 201);
  assert.equal(ld.data.demo, true);
  const reales = (await B.get('/lotes')).data as { titulo: string; demo: boolean }[];
  assert.ok(reales.some((x) => x.titulo === 'Lote de empresa de demostración' && x.demo === true));
  assert.ok(reales.some((x) => x.demo === false));
  process.env.OCULTAR_DEMO = '1';
  try {
    const filtradas = (await B.get('/lotes')).data as { demo: boolean }[];
    assert.ok(filtradas.length > 0 && filtradas.every((x) => x.demo === false), 'sin lotes demo en la lista pública');
    assert.equal((await B.get('/lotes?radioKm=300')).data.filter((x: { demo: boolean }) => x.demo).length, 0, 'ni en la búsqueda por radio (mapa)');
    assert.equal((await D.get('/lotes?mios=1')).data.length, 1, 'la propia empresa demo sigue viendo sus lotes');
    assert.equal((await B.get(`/lotes/${ld.data.id}`)).data.demo, true, 'el detalle directo existe y dice que es demo');
  } finally {
    delete process.env.OCULTAR_DEMO;
  }
});

test('perfil: expone demo y el método de verificación (no «oficial» si es simulada)', async () => {
  const pd = (await B.get(`/empresas/${ids.D}`)).data;
  assert.equal(pd.demo, true);
  const pa = (await B.get(`/empresas/${ids.A}`)).data;
  assert.equal(pa.demo, false);
  assert.equal(pa.estadoKyb, 'VERIFICADA');
  assert.equal(pa.metodoVerificacion, 'SIMULADA', 'fuera de producción el validador es el simulado');
  assert.equal(pa.telefono, undefined, 'el teléfono no es público');
  assert.equal(pa.contactoNombre, undefined);
});

let don: string;
test('contacto: no se filtra antes del acuerdo y aparece después, con wa.me, solo para las dos partes', async () => {
  const l = (await A.post('/lotes', lote({ titulo: 'Uva de descarte para contacto' }))).data;
  const s = await B.post('/transacciones', { loteId: l.id, cantidad: 5 });
  assert.equal(s.status, 201);
  don = s.data.id;

  // SOLICITADO
  let t = await detalle(B, don);
  assert.equal(t.estado, 'SOLICITADO');
  assert.equal(t.etapa, 'PROPUESTA');
  assert.equal(t.contactoContraparte, null);
  assert.equal((await detalle(A, don)).contactoContraparte, null);

  // EN_NEGOCIACION
  await A.post(`/transacciones/${don}/mensajes`, { texto: 'Hola, ¿cuándo pueden recoger?' });
  await B.put(`/transacciones/${don}/terminos`, { cantidad: 5 });
  t = await detalle(A, don);
  assert.equal(t.estado, 'EN_NEGOCIACION');
  assert.equal(t.etapa, 'PROPUESTA');
  assert.equal(t.contactoContraparte, null);
  assert.equal((await detalle(B, don)).contactoContraparte, null);
  const crudo = JSON.stringify([t, (await B.get('/transacciones')).data]);
  assert.ok(!crudo.includes('912345678') && !crudo.includes('987654321'), 'ningún teléfono en las respuestas antes del acuerdo');

  // ACORDADO
  assert.equal((await A.post(`/transacciones/${don}/aceptar`)).status, 200);
  const deA = await detalle(A, don);
  assert.equal(deA.estado, 'ACORDADO');
  assert.equal(deA.etapa, 'ACEPTADA');
  assert.equal(deA.etiquetaEtapa, 'Aceptada');
  assert.equal(deA.contactoContraparte.nombre, 'Beto Ruiz');
  assert.equal(deA.contactoContraparte.telefono, '+51912345678');
  assert.match(deA.contactoContraparte.whatsappUrl, /^https:\/\/wa\.me\/51912345678\?text=/);
  assert.match(decodeURIComponent(deA.contactoContraparte.whatsappUrl), /Uva de descarte para contacto/);
  const deB = await detalle(B, don);
  assert.equal(deB.contactoContraparte.nombre, 'Ana Torres');
  assert.equal(deB.contactoContraparte.telefono, '+51987654321', 'se guardó en E.164 aunque se escribió «987 654 321»');
  assert.match(deB.contactoContraparte.whatsappUrl, /^https:\/\/wa\.me\/51987654321\?text=/);

  // Un tercero no ve la transacción ni el contacto.
  const deC = await C.get(`/transacciones/${don}`);
  assert.equal(deC.status, 404);
  assert.ok(!JSON.stringify(deC.data).includes('987654321'));
  // Un administrador ajeno a la operación tampoco recibe los datos por este camino.
  const deAdmin = await ADM.get(`/transacciones/${don}`);
  assert.equal(deAdmin.status === 200 ? deAdmin.data.contactoContraparte : null, null);
  // Y el perfil público de la contraparte sigue sin teléfono.
  assert.ok(!JSON.stringify((await A.get(`/empresas/${ids.B}`)).data).includes('912345678'));
});

test('demo en transacciones: la lista y el detalle indican si la contraparte es de demostración', async () => {
  const lst = (await B.get('/transacciones')).data as { id: string; contraparte: { demo: boolean }; etapa: string; etiquetaEtapa: string }[];
  const fila = lst.find((x) => x.id === don)!;
  assert.equal(fila.contraparte.demo, false);
  assert.equal(fila.etapa, 'ACEPTADA');
  const d = await detalle(B, don);
  assert.equal(d.ofertante.demo, false);
  assert.equal(d.receptor.demo, false);
});

test('contacto: una operación cancelada tras el acuerdo vuelve a ocultarlo; sin teléfono registrado, el enlace es null', async () => {
  const l = (await A.post('/lotes', lote({ titulo: 'Uva de descarte para cancelar' }))).data;
  const id = (await B.post('/transacciones', { loteId: l.id, cantidad: 2 })).data.id;
  await A.post(`/transacciones/${id}/mensajes`, { texto: 'ok' });
  await B.put(`/transacciones/${id}/terminos`, { cantidad: 2 });
  await A.post(`/transacciones/${id}/aceptar`);
  assert.ok((await detalle(A, id)).contactoContraparte);
  assert.equal((await A.post(`/transacciones/${id}/cancelar`, { motivo: 'prueba' })).status, 200);
  const c = await detalle(A, id);
  assert.equal(c.estado, 'CANCELADO');
  assert.equal(c.etapa, 'CANCELADA');
  assert.equal(c.contactoContraparte, null);

  // C no registró teléfono: tras el acuerdo se ve el contacto vacío, sin enlace.
  const l2 = (await A.post('/lotes', lote({ titulo: 'Uva de descarte para el tercero' }))).data;
  const id2 = (await C.post('/transacciones', { loteId: l2.id, cantidad: 2 })).data.id;
  await A.post(`/transacciones/${id2}/mensajes`, { texto: 'ok' });
  await C.put(`/transacciones/${id2}/terminos`, { cantidad: 2 });
  await A.post(`/transacciones/${id2}/aceptar`);
  const sinTel = (await detalle(A, id2)).contactoContraparte;
  assert.equal(sinTel.telefono, null);
  assert.equal(sinTel.whatsappUrl, null);
});

test('perfil: actualizar teléfono y contacto con validación E.164', async () => {
  assert.equal((await C.patch('/empresas/mi', { telefono: '12345' })).status, 400);
  assert.equal((await C.patch('/empresas/mi', { telefono: 'hola' })).status, 400);
  const ok = await C.patch('/empresas/mi', { telefono: '999 111 222', contactoNombre: 'Carla Soto' });
  assert.equal(ok.status, 200, JSON.stringify(ok.data));
  assert.equal(ok.data.telefono, '+51999111222');
  assert.equal(ok.data.contactoNombre, 'Carla Soto');
});

test('foto de entrega: la URL sale del driver de almacenamiento', async () => {
  const sub = await subir(A, 'entrega.png', PNG, 'image/png');
  await A.post(`/transacciones/${don}/recojo`, { fechaRecojo: new Date().toISOString(), responsableRecojo: 'Transportes Norte' });
  assert.equal((await A.post(`/transacciones/${don}/firmar`, { fotoEntrega: sub.data.nombre })).status, 200);
  assert.equal((await detalle(A, don)).fotoEntregaUrl, sub.data.url);
});

test('verificación honesta: en producción sin SUNAT_PROVIDER la empresa queda PENDIENTE y un ADMIN la verifica a mano con auditoría', async () => {
  const antes = process.env.NODE_ENV;
  const E = new Cliente(base);
  process.env.NODE_ENV = 'production';
  let idE = '';
  try {
    const r = await alta(E, '2080000006', 'AMBOS', 'e@real.pe');
    idE = r.empresa.id;
    assert.equal(r.empresa.estadoKyb, 'PENDIENTE', 'nunca VERIFICADA sin una comprobación real');
    const p = (await B.get(`/empresas/${idE}`)).data;
    assert.equal(p.estadoKyb, 'PENDIENTE');
    assert.equal(p.metodoVerificacion, 'MANUAL');
    const v = await E.post('/empresas/mi/verificar-kyb');
    assert.equal(v.data.estadoKyb, 'PENDIENTE', 'pedir la verificación no la concede');
    assert.equal(v.data.metodoVerificacion, 'MANUAL');
  } finally {
    process.env.NODE_ENV = antes;
  }

  // Solo un ADMIN verifica.
  assert.equal((await E.patch(`/admin/empresas/${idE}/verificacion`, { estado: 'VERIFICADA' })).status, 403);
  assert.equal((await B.patch(`/admin/empresas/${idE}/verificacion`, { estado: 'VERIFICADA' })).status, 403);
  assert.equal((await new Cliente(base).patch(`/admin/empresas/${idE}/verificacion`, { estado: 'VERIFICADA' })).status, 401);
  assert.equal((await ADM.patch(`/admin/empresas/${idE}/verificacion`, { estado: 'LISTO' })).status, 400);
  assert.equal((await ADM.patch('/admin/empresas/no-existe/verificacion', { estado: 'VERIFICADA' })).status, 404);

  const pendientes = (await ADM.get('/admin/empresas')).data as { id: string }[];
  assert.ok(pendientes.some((x) => x.id === idE));

  const ok = await ADM.patch(`/admin/empresas/${idE}/verificacion`, { estado: 'VERIFICADA', nota: 'Ficha RUC: activo y habido' });
  assert.equal(ok.status, 200, JSON.stringify(ok.data));
  assert.equal(ok.data.estadoKyb, 'VERIFICADA');
  assert.equal(ok.data.metodoVerificacion, 'MANUAL');
  const aud = await prisma.auditoriaAdmin.findMany({ where: { entidadId: idE } });
  assert.equal(aud.length, 1);
  assert.equal(aud[0].accion, 'EMPRESA_VERIFICACION');
  assert.deepEqual((aud[0].detalle as { desde: string; hacia: string; nota: string }), { desde: 'PENDIENTE', hacia: 'VERIFICADA', nota: 'Ficha RUC: activo y habido' });
  assert.equal(((await ADM.get('/admin/empresas')).data as { id: string }[]).some((x) => x.id === idE), false);

  // La decisión manual no se revierte al volver a pedir la verificación en producción.
  process.env.NODE_ENV = 'production';
  try {
    assert.equal((await E.post('/empresas/mi/verificar-kyb')).data.estadoKyb, 'VERIFICADA');
  } finally {
    process.env.NODE_ENV = antes;
  }
  assert.equal((await B.get(`/empresas/${idE}`)).data.metodoVerificacion, 'MANUAL');
});
