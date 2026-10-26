import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { after, before, test } from 'node:test';
import { INestApplication } from '@nestjs/common';
import { construirRuc } from '@swapit/shared';
import { reiniciarLimites } from '../../src/common/limite-tasa';
import { PrismaService } from '../../src/prisma/prisma.service';
import { iniciarDb } from '../db';
import { Cliente, crearApp } from '../http';

let app: INestApplication;
let db: { detener(): Promise<void> };
let prisma: PrismaService;
let base: string;
let idInter: string;

const SECRETO = 'secreto-de-app-de-meta-para-pruebas';
const PHONE_ID = 'PHONE-ID-SEG';
const payload = (texto = 'hola', from = '51900000201') =>
  JSON.stringify({ entry: [{ changes: [{ value: { metadata: { phone_number_id: PHONE_ID }, messages: [{ from, type: 'text', text: { body: texto } }] } }] }] });
const firmar = (cuerpo: string, secreto = SECRETO) => `sha256=${createHmac('sha256', secreto).update(cuerpo).digest('hex')}`;
const post = (cuerpo: string, firma?: string) =>
  fetch(`${base}/api/whatsapp/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(firma !== undefined ? { 'X-Hub-Signature-256': firma } : {}) }, body: cuerpo });
const entrantes = () => prisma.mensajeWhatsapp.count({ where: { intermediarioId: idInter, direccion: 'ENTRANTE' } });
const produccion = async <T>(fn: () => Promise<T>) => {
  process.env.NODE_ENV = 'production';
  try {
    return await fn();
  } finally {
    delete process.env.NODE_ENV;
  }
};

before(async () => {
  db = await iniciarDb(5625);
  ({ app, base } = await crearApp());
  prisma = app.get(PrismaService);
  const c = new Cliente(base);
  const r = await c.post('/auth/registro', { tipo: 'EMPRESA', empresa: { ruc: construirRuc('2094000001'), razonSocial: 'Acopios Webhook SAC', direccion: 'Zona Industrial, Piura', representanteLegal: 'Rep' }, usuario: { nombre: 'Gerente', email: 'wh@test.pe', password: 'clave-segura-1' } });
  idInter = r.data.empresa.id;
  await prisma.empresa.update({ where: { id: idInter }, data: { whatsappPhoneId: PHONE_ID } });
  assert.equal((await c.post('/empresas/proveedores', { razonSocial: 'Proveedor WA', direccion: 'Sullana', contactoNombre: 'Pepe', telefono: '900000201' })).status, 201);
  delete process.env.WHATSAPP_APP_SECRET;
  delete process.env.WHATSAPP_VERIFY_TOKEN;
});
after(async () => {
  delete process.env.WHATSAPP_APP_SECRET;
  delete process.env.WHATSAPP_VERIFY_TOKEN;
  await app.close();
  await db.detener();
});

test('producción SIN WHATSAPP_APP_SECRET: el webhook responde 503 y no procesa nada', async () => {
  reiniciarLimites();
  const antes = await entrantes();
  const r = await produccion(() => post(payload(), firmar(payload())));
  assert.equal(r.status, 503);
  assert.equal(await entrantes(), antes, 'ningún mensaje se procesó');
  const sinFirma = await produccion(() => post(payload()));
  assert.equal(sinFirma.status, 503);
});

test('producción: la verificación del webhook exige WHATSAPP_VERIFY_TOKEN propio (el token «swapit-demo» no vale)', async () => {
  const url = (t: string) => `${base}/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${t}&hub.challenge=555`;
  assert.equal((await produccion(() => fetch(url('swapit-demo')))).status, 503);
  process.env.WHATSAPP_VERIFY_TOKEN = 'token-propio-de-produccion-9f3a';
  try {
    assert.equal((await produccion(() => fetch(url('swapit-demo')))).status, 403);
    assert.equal((await produccion(() => fetch(url('token-propio-de-produccion-9f3b')))).status, 403, 'un carácter distinto');
    const ok = await produccion(() => fetch(url('token-propio-de-produccion-9f3a')));
    assert.equal(ok.status, 200);
    assert.equal(await ok.text(), '555');
  } finally {
    delete process.env.WHATSAPP_VERIFY_TOKEN;
  }
});

test('verificación: el reto se devuelve saneado (no puede inyectar HTML) y es obligatorio', async () => {
  const r = await fetch(`${base}/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=swapit-demo&hub.challenge=${encodeURIComponent('<script>alert(1)</script>123')}`);
  assert.equal(r.status, 200);
  const t = await r.text();
  assert.ok(!/[<>()]/.test(t));
  assert.equal((await fetch(`${base}/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=swapit-demo`)).status, 403);
  assert.equal((await fetch(`${base}/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=swapit-demo&hub.challenge=${'9'.repeat(500)}`)).status, 403, 'reto desmesurado');
  assert.equal((await fetch(`${base}/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token[]=a&hub.verify_token[]=b&hub.challenge=1`)).status, 403, 'parámetro repetido (arreglo)');
});

test('con secreto: sin firma, firma errónea, de otro cuerpo, de otro secreto o mal formada → 403 sin procesar', async () => {
  reiniciarLimites();
  process.env.WHATSAPP_APP_SECRET = SECRETO;
  try {
    const antes = await entrantes();
    const cuerpo = payload('hola');
    const malas = [undefined, '', 'sha256=', 'basura', firmar(payload('otro texto')), firmar(cuerpo, 'otro-secreto'), firmar(cuerpo).toUpperCase(), `${firmar(cuerpo)}00`, firmar(cuerpo).slice(0, -2)];
    for (const f of malas) assert.equal((await produccion(() => post(cuerpo, f))).status, 403, `firma ${JSON.stringify(f)}`);
    assert.equal((await post(cuerpo)).status, 403, 'también fuera de producción, si hay secreto, se exige');
    assert.equal(await entrantes(), antes);
  } finally {
    delete process.env.WHATSAPP_APP_SECRET;
  }
});

test('con secreto y firma válida: 200 y el mensaje se procesa (en producción)', async () => {
  reiniciarLimites();
  process.env.WHATSAPP_APP_SECRET = SECRETO;
  try {
    const antes = await entrantes();
    const cuerpo = payload('hola');
    const r = await produccion(() => post(cuerpo, firmar(cuerpo)));
    assert.equal(r.status, 200);
    assert.equal(await entrantes(), antes + 1);
  } finally {
    delete process.env.WHATSAPP_APP_SECRET;
  }
});

test('payload: se valida su forma y se acotan los textos y los números', async () => {
  reiniciarLimites();
  process.env.WHATSAPP_APP_SECRET = SECRETO;
  try {
    const enviar = (cuerpo: string) => post(cuerpo, firmar(cuerpo));
    assert.equal((await enviar('[]')).status, 400, 'arreglo en la raíz');
    assert.equal((await enviar('"texto"')).status, 400);
    assert.equal((await enviar('{"entry":"x"}')).status, 400, 'entry no es lista');
    assert.equal((await enviar('{}')).status, 200, 'sin entradas: nada que hacer');
    const antes = await entrantes();
    // teléfonos que no son dígitos se ignoran
    for (const from of ['abc', '51900000201; DROP TABLE', '<b>', '1', '5190000020199999999999']) assert.equal((await enviar(payload('hola', from))).status, 200);
    assert.equal(await entrantes(), antes, 'ningún mensaje con remitente inválido se procesó');
    // un texto enorme se recorta
    const enorme = 'a'.repeat(100_000);
    assert.equal((await enviar(payload(enorme))).status, 200);
    const ultimo = await prisma.mensajeWhatsapp.findFirst({ where: { intermediarioId: idInter, direccion: 'ENTRANTE' }, orderBy: { createdAt: 'desc' } });
    assert.ok((ultimo?.texto.length ?? 0) <= 1000);
    // objetos anidados raros no rompen el servidor
    assert.equal((await enviar('{"entry":[null,1,"x",{"changes":[null,{"value":{"messages":[null,{"from":123}]}}]}]}')).status, 200);
  } finally {
    delete process.env.WHATSAPP_APP_SECRET;
  }
});

test('límite de tasa del webhook: 300 llamadas por minuto por IP', async () => {
  const lim = await import('../../src/common/limite-tasa');
  lim.reiniciarLimites();
  // El tope real se prueba con la regla del middleware (en pruebas está multiplicado x1000): se verifica que la regla existe y es estricta.
  const { REGLAS } = await import('../../src/common/seguridad');
  const regla = REGLAS.find((r) => r.nombre === 'webhook');
  assert.ok(regla && regla.max <= 300 && regla.aplica('POST', '/api/whatsapp/webhook'));
});
