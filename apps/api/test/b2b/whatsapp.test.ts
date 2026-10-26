import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { after, before, test } from 'node:test';
import { INestApplication } from '@nestjs/common';
import { FACTORES_IMPACTO, SUBTIPOS_PLASTICO, construirRuc } from '@swapit/shared';
import { BenchmarkService } from '../../src/benchmark/benchmark.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { iniciarDb } from '../db';
import { Cliente, crearApp } from '../http';

let app: INestApplication;
let db: { detener(): Promise<void> };
let prisma: PrismaService;
let base: string;
let norte: Cliente;
let sur: Cliente;
let idNorte: string;
const TEL = '900000301';
const TEL_E164 = '+51900000301';

const registrar = (c: Cliente, n: string, email: string, razon: string) =>
  c.post('/auth/registro', { tipo: 'EMPRESA', empresa: { ruc: construirRuc(n), razonSocial: razon, direccion: 'Zona Industrial, Piura', representanteLegal: 'Rep' }, usuario: { nombre: 'Gerente', email, password: 'clave-segura-1' } });

/** Escribe un mensaje «como» el proveedor y devuelve las respuestas nuevas del bot. */
async function decir(texto: string, tel = TEL, c: Cliente = norte) {
  const antes = (await c.get(`/whatsapp/simular/mensajes?telefono=${tel}`)).data.length;
  const r = await c.post('/whatsapp/simular', { telefono: tel, texto });
  assert.equal(r.status, 200);
  return (r.data.mensajes as { direccion: string; texto: string }[]).slice(antes + 1).map((m) => m.texto).join('\n');
}

before(async () => {
  db = await iniciarDb(5615);
  ({ app, base } = await crearApp());
  prisma = app.get(PrismaService);
  const f = FACTORES_IMPACTO;
  const cat = (codigo: string, nombre: string, familia: string | null = null) =>
    prisma.categoriaResiduo.create({ data: { codigo, nombre, sector: 'Manufactura', familia, codigoLer: null, usoTipico: null, factorCo2PorTon: f[codigo].co2PorTon, factorCreditosPorTon: f[codigo].creditosPorTon } });
  await cat('PLASTICO', 'Plásticos (PET, PEAD, film)', 'PLASTICO');
  for (const s of SUBTIPOS_PLASTICO) await cat(s.codigo, s.nombre, 'PLASTICO');
  await cat('OTROS', 'Otros subproductos industriales');
  await prisma.configPlataforma.create({ data: { id: 1 } });
  await app.get(BenchmarkService).sembrar();
  norte = new Cliente(base);
  sur = new Cliente(base);
  idNorte = (await registrar(norte, '2099100001', 'norte@test.pe', 'Acopios del Norte SAC')).data.empresa.id;
  await registrar(sur, '2099100002', 'sur@test.pe', 'Reciclajes del Sur SAC');
  await norte.post('/empresas/proveedores', { razonSocial: 'Plásticos Ganoza SAC', direccion: 'Zona Industrial, Piura', contactoNombre: 'Manuel Ganoza', telefono: TEL });
  await sur.post('/empresas/proveedores', { razonSocial: 'Empaques del Sur SAC', direccion: 'Sullana', contactoNombre: 'Ana Ruiz', telefono: '900000302' });
});
after(async () => {
  delete process.env.WHATSAPP_APP_SECRET;
  await app.close();
  await db.detener();
});

test('webhook: la verificación devuelve el reto solo con el token correcto', async () => {
  const ok = await new Cliente(base).get('/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=swapit-demo&hub.challenge=987654');
  assert.equal(ok.status, 200);
  assert.equal(String(ok.data), '987654');
  assert.equal((await new Cliente(base).get('/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=malo&hub.challenge=1')).status, 403);
  assert.equal((await new Cliente(base).get('/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=swapit-demo')).status, 403, 'sin reto no hay respuesta');
});

test('simulador: solo lo usa un intermediario con sesión', async () => {
  assert.equal((await new Cliente(base).post('/whatsapp/simular', { telefono: TEL, texto: 'hola' })).status, 401);
});

test('número desconocido: pide que el acopiador lo registre y no guarda ninguna conversación', async () => {
  const r = await decir('hola', '900000999');
  assert.match(r, /todavía no está registrado/);
  assert.equal(await prisma.conversacionWhatsapp.count({ where: { telefono: '+51900000999' } }), 0);
});

test('aislamiento: el proveedor de otro intermediario no es reconocido', async () => {
  assert.match(await decir('hola', '900000302'), /todavía no está registrado/);
  assert.match(await decir('hola', '900000302', sur), /asistente de Reciclajes del Sur SAC/);
});

test('conversación guiada: material → cantidad → precio → confirmación crea el lote REPORTADO por WhatsApp', async () => {
  assert.match(await decir('hola'), /asistente de Acopios del Norte SAC[\s\S]*¿Qué material tienes\?/);
  assert.match(await decir('Bidones de PEAD azules de 20 litros enjuagados'), /«Plástico PEAD[^»]*»[\s\S]*¿Cuánto tienes\?/);
  assert.match(await decir('mucho'), /No entendí la cantidad/, 'si no entiende, vuelve a preguntar sin avanzar');
  assert.match(await decir('800 kg'), /800 kg[\s\S]*soles por kilo/);
  assert.match(await decir('abc'), /No entendí el precio/);
  const resumen = await decir('1,70');
  assert.match(resumen, /Precio de referencia: S\/ \d\.\d\d a S\/ \d\.\d\d por kilo \(datos de ejemplo\)/);
  assert.match(resumen, /Tu precio está dentro de lo habitual/);
  assert.match(resumen, /¿Lo envío a Acopios del Norte SAC\? Responde SÍ o NO/);
  assert.match(await decir('quizás'), /Responde SÍ para enviar/);
  assert.match(await decir('sí'), /Registré tu reporte/);
  const l = (await norte.get('/material')).data[0];
  assert.equal(l.reportadoVia, 'WHATSAPP');
  assert.equal(l.estado, 'REPORTADO');
  assert.equal(l.categoriaCodigo, 'PLASTICO_PEAD');
  assert.equal(l.cantidad, 800);
  assert.equal(l.unidad, 'kg');
  assert.equal(l.precioEsperado, 1.7);
  assert.equal(l.proveedor, 'Plásticos Ganoza SAC');
});

test('conversación: «no sé» de precio, descartar, cancelar y estado', async () => {
  await decir('hola');
  await decir('Botellas PET transparentes prensadas');
  await decir('2 toneladas');
  const sinPrecio = await decir('no sé');
  assert.doesNotMatch(sinPrecio, /Tu precio/);
  assert.match(sinPrecio, /Resumen: Plástico PET[^.]*2 t\./);
  assert.match(await decir('no'), /no lo envié/);
  assert.equal((await norte.get('/material')).data.length, 1, 'descartar no crea nada');
  await decir('hola');
  await decir('Film stretch usado');
  assert.match(await decir('cancelar'), /cancelé/);
  assert.match(await decir('estado'), /Tus últimos reportes:\n1\. .*Bidones.*Reportado/);
  assert.match(await decir('ayuda'), /«hola» para reportar material/);
});

test('webhook en formato Meta: identifica al intermediario por el número de WhatsApp Business y responde 200', async () => {
  await prisma.empresa.update({ where: { id: idNorte }, data: { whatsappPhoneId: 'PHONE-ID-DEMO' } });
  const payload = { entry: [{ changes: [{ value: { metadata: { phone_number_id: 'PHONE-ID-DEMO' }, messages: [{ from: '51900000301', type: 'text', text: { body: 'hola' } }] } }] }] };
  const r = await new Cliente(base).post('/whatsapp/webhook', payload);
  assert.equal(r.status, 200);
  assert.deepEqual(r.data, { ok: true });
  const msgs = (await norte.get(`/whatsapp/simular/mensajes?telefono=${TEL_E164.replace('+', '%2B')}`)).data;
  assert.ok(msgs.some((m: { direccion: string; texto: string }) => m.direccion === 'SALIENTE' && /¿Qué material tienes\?/.test(m.texto)), 'el bot respondió al mensaje del webhook');
  // Un mensaje que no es texto (foto, audio) no rompe nada: se responde con la ayuda.
  const foto = { entry: [{ changes: [{ value: { metadata: { phone_number_id: 'PHONE-ID-DEMO' }, messages: [{ from: '51900000301', type: 'image' }] } }] }] };
  assert.equal((await new Cliente(base).post('/whatsapp/webhook', foto)).status, 200);
  // Número de WhatsApp Business desconocido: se ignora sin error.
  const ajeno = { entry: [{ changes: [{ value: { metadata: { phone_number_id: 'OTRO' }, messages: [{ from: '51900000301', type: 'text', text: { body: 'hola' } }] } }] }] };
  assert.equal((await new Cliente(base).post('/whatsapp/webhook', ajeno)).status, 200);
});

test('webhook: con WHATSAPP_APP_SECRET exige la firma X-Hub-Signature-256 sobre el cuerpo original', async () => {
  process.env.WHATSAPP_APP_SECRET = 'secreto-de-prueba';
  const cuerpo = JSON.stringify({ entry: [{ changes: [{ value: { metadata: { phone_number_id: 'PHONE-ID-DEMO' }, messages: [{ from: '51900000301', type: 'text', text: { body: 'estado' } }] } }] }] });
  const enviar = (firma?: string) =>
    fetch(`${base}/api/whatsapp/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(firma ? { 'X-Hub-Signature-256': firma } : {}) }, body: cuerpo });
  assert.equal((await enviar()).status, 403, 'sin firma');
  assert.equal((await enviar('sha256=' + '0'.repeat(64))).status, 403, 'firma incorrecta');
  const buena = 'sha256=' + createHmac('sha256', 'secreto-de-prueba').update(cuerpo).digest('hex');
  assert.equal((await enviar(buena)).status, 200);
  delete process.env.WHATSAPP_APP_SECRET;
});

test('simulador: reiniciar borra la conversación y los mensajes de ese número', async () => {
  assert.equal((await norte.del(`/whatsapp/simular?telefono=${TEL}`)).status, 204);
  assert.equal((await norte.get(`/whatsapp/simular/mensajes?telefono=${TEL}`)).data.length, 0);
  assert.match(await decir('hola'), /¿Qué material tienes\?/, 'vuelve a empezar desde el saludo');
});
