import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { INestApplication } from '@nestjs/common';
import { FACTORES_IMPACTO, construirRuc } from '@swapit/shared';
import { PrismaService } from '../../src/prisma/prisma.service';
import { iniciarDb } from '../db';
import { Cliente, crearApp } from '../http';

// Dos intermediarios reales (A y B) en el mismo servidor: lo de uno jamás debe ser legible ni modificable por el otro.
let app: INestApplication;
let db: { detener(): Promise<void> };
let prisma: PrismaService;
let base: string;
let A: Cliente;
let B: Cliente;
let anonimo: Cliente;
let idA: string;
let idB: string;
let provA: { id: string; tokenCaptacion: string };
let provB: { id: string; tokenCaptacion: string };
let matA: { id: string };
let matB: { id: string };
let destinoA: { id: string };
let destinoB: { id: string };
let acuerdoA: { id: string };
let codigoCert: string;

const registrar = (c: Cliente, n: string, email: string, razon: string, extra: object = {}) =>
  c.post('/auth/registro', { tipo: 'EMPRESA', empresa: { ruc: construirRuc(n), razonSocial: razon, direccion: 'Zona Industrial, Piura', representanteLegal: 'Representante Secreto', ...extra }, usuario: { nombre: 'Gerente Secreto', email, password: 'clave-segura-1' } });

const PRIVADOS = ['passwordHash', 'tokenCaptacion', 'representanteLegal', 'Representante Secreto', 'notasInternas', 'whatsappPhoneId', 'contactoEmail', '"email"', '$2'];
const sinPrivados = (obj: unknown, permitidos: string[] = []) => {
  const txt = JSON.stringify(obj);
  for (const p of PRIVADOS.filter((x) => !permitidos.includes(x))) assert.ok(!txt.includes(p), `la respuesta no debe contener «${p}»: ${txt.slice(0, 300)}`);
};

before(async () => {
  db = await iniciarDb(5621);
  ({ app, base } = await crearApp());
  prisma = app.get(PrismaService);
  const f = FACTORES_IMPACTO;
  await prisma.categoriaResiduo.create({ data: { codigo: 'OTROS', nombre: 'Otros subproductos industriales', sector: 'General', codigoLer: null, usoTipico: null, factorCo2PorTon: f.OTROS.co2PorTon, factorCreditosPorTon: f.OTROS.creditosPorTon } });
  await prisma.configPlataforma.create({ data: { id: 1 } });
  A = new Cliente(base);
  B = new Cliente(base);
  anonimo = new Cliente(base);
  idA = (await registrar(A, '2092000001', 'a@idor.pe', 'Acopios A SAC')).data.empresa.id;
  idB = (await registrar(B, '2092000002', 'b@idor.pe', 'Reciclajes B SAC')).data.empresa.id;
  provA = (await A.post('/empresas/proveedores', { razonSocial: 'Proveedor de A', direccion: 'Sullana', contactoNombre: 'Pedro Pérez', telefono: '900000301', contactoEmail: 'pedro@prov-a.pe', notasInternas: 'nota privada de A' })).data;
  provB = (await B.post('/empresas/proveedores', { razonSocial: 'Proveedor de B', direccion: 'Paita', contactoNombre: 'Beatriz', telefono: '900000302' })).data;
  matA = (await A.post('/material', { proveedorId: provA.id, descripcion: 'Retazos varios del proveedor de A', categoriaCodigo: 'OTROS', cantidad: 100, unidad: 'kg', precioEsperado: 2 })).data;
  matB = (await B.post('/material', { proveedorId: provB.id, descripcion: 'Retazos varios del proveedor de B', categoriaCodigo: 'OTROS', cantidad: 50, unidad: 'kg' })).data;
  destinoA = (await A.post('/destinos', { nombre: 'Planta de A', tipo: 'GESTOR_AUTORIZADO', telefono: '900000401' })).data;
  destinoB = (await B.post('/destinos', { nombre: 'Planta de B', tipo: 'GESTOR_AUTORIZADO', telefono: '900000402' })).data;
  acuerdoA = (await A.post('/acuerdos', { proveedorId: provA.id, descripcion: 'Retazos de temporada', cantidadEstimada: 1000, unidad: 'kg', precioPactado: 1.5, destinoId: destinoA.id })).data;
  for (const [k, v] of Object.entries({ matA, matB, destinoA, destinoB, acuerdoA, provA, provB })) assert.ok(v?.id, `fixture ${k} no se creó`);
});
after(async () => {
  await app.close();
  await db.detener();
});

test('material: B no ve, no modifica y no cambia el estado del material de A (siempre 404)', async () => {
  const antes = (await A.get(`/material/${matA.id}`)).data;
  const rutas: [string, string, object?][] = [
    ['GET', `/material/${matA.id}`],
    ['PATCH', `/material/${matA.id}`, { residuoRef: null }],
    ['POST', `/material/${matA.id}/cotizar`, { precioOfrecido: 1 }],
    ['POST', `/material/${matA.id}/acopiar`, { cantidadAcopiada: 100, precioFinal: 1 }],
    ['POST', `/material/${matA.id}/despachar`, { clienteDestino: 'Robo SAC' }],
    ['POST', `/material/${matA.id}/certificado`, {}],
    ['POST', `/material/${matA.id}/rechazar`, {}],
  ];
  for (const [m, ruta, cuerpo] of rutas) {
    const r = await B.req(m, ruta, cuerpo);
    assert.equal(r.status, 404, `${m} ${ruta} debería ser 404`);
    assert.ok(!JSON.stringify(r.data).includes('Proveedor de A'), 'ni siquiera el error revela datos');
  }
  const despues = (await A.get(`/material/${matA.id}`)).data;
  assert.equal(despues.estado, antes.estado);
  assert.equal(despues.precioOfrecido, antes.precioOfrecido);
  const lista = (await B.get('/material')).data as { id: string; proveedor: string }[];
  assert.deepEqual(lista.map((m) => m.id), [matB.id]);
  const excel = await B.get('/material/exportar');
  assert.equal(excel.status, 200);
  assert.ok(!Buffer.from(excel.data as Buffer).toString('latin1').includes('Proveedor de A'));
  assert.equal((await B.get(`/material?proveedorId=${provA.id}`)).data.length, 0, 'filtrar por un proveedor ajeno no devuelve nada');
  assert.equal((await B.get(`/material?q=${encodeURIComponent('Proveedor de A')}`)).data.length, 0);
});

test('material: B no puede crear material a nombre de un proveedor de A ni usar un destino de A', async () => {
  assert.equal((await B.post('/material', { proveedorId: provA.id, descripcion: 'Falso reporte a nombre de A', categoriaCodigo: 'OTROS', cantidad: 1, unidad: 'kg' })).status, 404);
  const cot = await B.post(`/material/${matB.id}/cotizar`, { precioOfrecido: 1 });
  assert.equal(cot.status, 200);
  assert.equal((await B.post(`/material/${matB.id}/acopiar`, { cantidadAcopiada: 50, precioFinal: 1 })).status, 200);
  assert.equal((await B.post(`/material/${matB.id}/despachar`, { destinoId: destinoA.id })).status, 404, 'despachar hacia el destino de A');
  assert.equal(await prisma.lote.count({ where: { destinoId: destinoA.id } }), 0);
});

test('red de proveedores: B no lee, edita ni rota el enlace de los proveedores de A', async () => {
  assert.equal((await B.get(`/empresas/proveedores/${provA.id}`)).status, 404);
  assert.equal((await B.patch(`/empresas/proveedores/${provA.id}`, { razonSocial: 'Secuestrado', activo: false })).status, 404);
  assert.equal((await B.post(`/empresas/proveedores/${provA.id}/rotar-enlace`)).status, 404);
  assert.equal((await anonimo.get(`/captacion/${provA.tokenCaptacion}`)).status, 200, 'el enlace de A sigue vigente');
  const mios = (await B.get('/empresas/proveedores')).data as { id: string }[];
  assert.deepEqual(mios.map((p) => p.id), [provB.id]);
  assert.equal((await A.get(`/empresas/proveedores/${provA.id}`)).data.razonSocial, 'Proveedor de A');
});

test('perfiles: el proveedor de A es invisible para B; el perfil público de A no filtra datos privados', async () => {
  assert.equal((await B.get(`/empresas/${provA.id}`)).status, 404);
  const perfilA = await B.get(`/empresas/${idA}`);
  assert.equal(perfilA.status, 200);
  sinPrivados(perfilA.data);
  const txt = JSON.stringify(perfilA.data);
  for (const p of ['"ruc"', 'telefono', 'a@idor.pe', 'Gerente Secreto']) assert.ok(!txt.includes(p), `el perfil público no debe contener ${p}`);
  assert.equal((await anonimo.get(`/empresas/${idA}`)).status, 401);
});

test('mi sesión y mi perfil: sin hash ni enlace de captación; el listado propio sí incluye mis enlaces', async () => {
  sinPrivados((await A.get('/auth/me')).data, ['representanteLegal', 'Representante Secreto', '"email"', 'whatsappPhoneId', 'contactoEmail']);
  sinPrivados((await A.get('/empresas/mi')).data, ['representanteLegal', 'Representante Secreto', '"email"', 'whatsappPhoneId', 'contactoEmail']);
  const mios = await A.get('/empresas/proveedores');
  assert.ok(JSON.stringify(mios.data).includes(provA.tokenCaptacion), 'el dueño ve el enlace de sus proveedores');
  assert.ok(!JSON.stringify((await B.get('/empresas/proveedores')).data).includes(provA.tokenCaptacion));
});

test('destinos y acuerdos: B no los lee ni los modifica; no puede crear acuerdos con recursos de A', async () => {
  assert.equal((await B.get(`/destinos/${destinoA.id}`)).status, 404);
  assert.equal((await B.patch(`/destinos/${destinoA.id}`, { nombre: 'Hackeado', activo: false })).status, 404);
  assert.deepEqual(((await B.get('/destinos')).data as { id: string }[]).map((d) => d.id), [destinoB.id]);
  assert.equal((await A.get(`/destinos/${destinoA.id}`)).data.nombre, 'Planta de A');

  assert.equal((await B.get(`/acuerdos/${acuerdoA.id}`)).status, 404);
  assert.equal((await B.patch(`/acuerdos/${acuerdoA.id}`, { estado: 'CANCELADO', precioPactado: 0 })).status, 404);
  assert.equal((await B.post(`/acuerdos/${acuerdoA.id}/recojo`, { cantidad: 10 })).status, 404);
  assert.equal((await B.get('/acuerdos')).data.length, 0);
  assert.equal((await B.post('/acuerdos', { proveedorId: provA.id, descripcion: 'Acuerdo ajeno', cantidadEstimada: 10, unidad: 'kg', precioPactado: 1 })).status, 404, 'proveedor de A');
  assert.equal((await B.post('/acuerdos', { proveedorId: provB.id, descripcion: 'Acuerdo con destino ajeno', cantidadEstimada: 10, unidad: 'kg', precioPactado: 1, destinoId: destinoA.id })).status, 404, 'destino de A');
  const a = (await A.get(`/acuerdos/${acuerdoA.id}`)).data;
  assert.equal(a.estado, 'VIGENTE');
  assert.equal(a.precioPactado, 1.5);
  assert.equal(a.recojos.length, 0);
});

test('benchmark y simulador de WhatsApp: acotados al intermediario', async () => {
  assert.equal((await B.get(`/benchmark?categoria=OTROS&proveedorId=${provA.id}`)).status, 404, 'distancia desde un proveedor ajeno');
  assert.equal((await B.get('/benchmark?categoria=OTROS')).status, 200);
  // A conversa «como» el teléfono de su proveedor; B no puede leer ni borrar esa conversación.
  assert.equal((await A.post('/whatsapp/simular', { telefono: '900000301', texto: 'hola' })).status, 200);
  assert.ok((await A.get('/whatsapp/simular/mensajes?telefono=900000301')).data.length > 0);
  assert.deepEqual((await B.get('/whatsapp/simular/mensajes?telefono=900000301')).data, []);
  await B.del('/whatsapp/simular?telefono=900000301');
  assert.ok((await A.get('/whatsapp/simular/mensajes?telefono=900000301')).data.length > 0, 'B no pudo borrar la conversación de A');
});

test('portal de captación: un enlace solo da acceso al propio proveedor y no expone datos internos', async () => {
  const inicio = await anonimo.get(`/captacion/${provA.tokenCaptacion}`);
  assert.equal(inicio.status, 200);
  sinPrivados(inicio.data);
  const txt = JSON.stringify(inicio.data);
  for (const p of ['900000301', 'pedro@prov-a.pe', 'nota privada', idA, provA.id, 'a@idor.pe']) assert.ok(!txt.includes(p), `el portal no debe exponer ${p}`);
  const estado = (await anonimo.get(`/captacion/${provA.tokenCaptacion}/estado`)).data as { id: string }[];
  assert.ok(estado.length >= 1 && estado.every((e) => e.id === matA.id), 'solo los reportes de ese proveedor');
  assert.ok(!JSON.stringify(estado).includes('Proveedor de B'));
  sinPrivados(estado);
  assert.equal((await anonimo.get(`/captacion/${provA.tokenCaptacion}x`)).status, 404);
  assert.equal((await anonimo.get(`/captacion/${provA.tokenCaptacion.slice(0, -1)}`)).status, 404);
  assert.ok(provA.tokenCaptacion.length >= 24, 'el token tiene al menos 144 bits de entropía');
  assert.notEqual(provA.tokenCaptacion, provB.tokenCaptacion);
});

test('rotación del enlace: el anterior deja de funcionar y el nuevo es distinto', async () => {
  const viejo = provB.tokenCaptacion;
  const nuevo = (await B.post(`/empresas/proveedores/${provB.id}/rotar-enlace`)).data.tokenCaptacion;
  assert.notEqual(nuevo, viejo);
  assert.equal((await anonimo.get(`/captacion/${viejo}`)).status, 404);
  assert.equal((await anonimo.get(`/captacion/${nuevo}`)).status, 200);
  provB.tokenCaptacion = nuevo;
});

test('certificados: B no emite ni lista los de A; la verificación pública no filtra datos privados', async () => {
  assert.equal((await A.post(`/material/${matA.id}/cotizar`, { precioOfrecido: 2 })).status, 200);
  assert.equal((await A.post(`/material/${matA.id}/acopiar`, { cantidadAcopiada: 100, precioFinal: 2 })).status, 200);
  assert.equal((await A.post(`/material/${matA.id}/despachar`, { clienteDestino: 'Cliente Final SAC' })).status, 200);
  assert.equal((await A.post('/facturacion/suscribir')).status, 200);
  const emitido = await A.post(`/material/${matA.id}/certificado`, {});
  assert.equal(emitido.status, 200);
  codigoCert = emitido.data.codigo;
  assert.deepEqual((await B.get('/certificados')).data, []);
  assert.equal((await A.get('/certificados')).data.length, 1);
  assert.equal((await B.post(`/material/${matA.id}/certificado`, {})).status, 404);
  const pub = await anonimo.get(`/verificar/${codigoCert}`);
  assert.equal(pub.status, 200);
  assert.equal(pub.data.valido, true);
  sinPrivados(pub.data);
  const txt = JSON.stringify(pub.data);
  for (const p of ['900000301', 'pedro@prov-a.pe', 'nota privada', 'a@idor.pe', 'Pedro']) assert.ok(!txt.includes(p), `la verificación pública no debe exponer ${p}`);
  assert.equal((await anonimo.get(`/verificar/${codigoCert}/pdf`)).status, 200);
  assert.equal((await anonimo.get('/verificar/SWP-2000-FFFFFFFF')).status, 404);
  assert.equal((await B.get('/facturacion')).data.recientes.length, 0, 'B no ve los cobros de A');
});

test('asignación masiva: campos que el cliente no debe poder fijar se ignoran', async () => {
  // Perfil propio
  const r = await B.patch('/empresas/mi', { estadoKyb: 'VERIFICADA', tokenCaptacion: 'robado', intermediarioId: idA, ruc: construirRuc('2092999999'), nTransacciones: 999, ratingProm: 5, badgeCircular: true, activo: false, rol: 'GENERADOR', razonSocial: 'Reciclajes B Renombrada' });
  assert.equal(r.status, 200);
  const e = await prisma.empresa.findUniqueOrThrow({ where: { id: idB } });
  assert.equal(e.razonSocial, 'Reciclajes B Renombrada', 'el campo legítimo sí cambia');
  assert.equal(e.rol, 'INTERMEDIARIO', 'el rol B2B no se cambia desde el perfil');
  assert.equal(e.intermediarioId, null);
  assert.equal(e.tokenCaptacion, null);
  assert.equal(e.ruc, construirRuc('2092000002'));
  assert.equal(e.nTransacciones, 0);
  assert.equal(e.ratingProm, 0);
  assert.equal(e.badgeCircular, false);
  assert.equal(e.activo, true);
  // Proveedor
  const p = await B.patch(`/empresas/proveedores/${provB.id}`, { tokenCaptacion: 'token-impuesto-por-el-cliente', intermediarioId: idA, rol: 'INTERMEDIARIO', estadoKyb: 'VERIFICADA', contactoNombre: 'Beatriz Díaz' });
  assert.equal(p.status, 200);
  const prov = await prisma.empresa.findUniqueOrThrow({ where: { id: provB.id } });
  assert.equal(prov.intermediarioId, idB);
  assert.equal(prov.rol, 'GENERADOR');
  assert.notEqual(prov.tokenCaptacion, 'token-impuesto-por-el-cliente');
  assert.equal(prov.estadoKyb, 'NO_APLICA');
  // Alta de proveedor con intermediarioId ajeno
  const nuevo = await B.post('/empresas/proveedores', { razonSocial: 'Proveedor Colado', direccion: 'Paita', contactoNombre: 'Colado', intermediarioId: idA, tokenCaptacion: 'fijo' });
  assert.equal(nuevo.status, 201);
  assert.equal((await prisma.empresa.findUniqueOrThrow({ where: { id: nuevo.data.id } })).intermediarioId, idB);
  assert.equal((await A.get('/empresas/proveedores')).data.length, 1, 'A no recibió el proveedor');
  // Material y acuerdo
  await B.patch(`/material/${matB.id}`, { estado: 'REPORTADO', empresaId: provA.id, precioFinal: 0, presentacion: null });
  const m = await prisma.lote.findUniqueOrThrow({ where: { id: matB.id } });
  assert.equal(m.empresaId, provB.id);
  assert.equal(m.estado, 'ACOPIADO');
});

test('registro: no se puede registrar un usuario ADMIN ni elegir la empresa por el cuerpo', async () => {
  const c = new Cliente(base);
  const r = await c.post('/auth/registro', { tipo: 'EMPRESA', empresa: { ruc: construirRuc('2092000003'), razonSocial: 'Intento Admin SAC', direccion: 'Zona Industrial, Piura', representanteLegal: 'Rep', intermediarioId: idA, estadoKyb: 'VERIFICADA', activo: false }, usuario: { nombre: 'Hacker Pérez', email: 'admin2@idor.pe', password: 'clave-segura-1', rol: 'ADMIN', empresaId: idA } });
  assert.equal(r.status, 201);
  const u = await prisma.usuario.findUniqueOrThrow({ where: { email: 'admin2@idor.pe' }, include: { empresa: true } });
  assert.equal(u.rol, 'EMPRESA');
  assert.notEqual(u.empresaId, idA);
  assert.equal(u.empresa.intermediarioId, null);
  assert.equal(u.empresa.activo, true);
  assert.equal(r.data.rol, 'EMPRESA');
  // y un token de ADMIN no se consigue pidiendo el rol en el login
  const l = await new Cliente(base).post('/auth/login', { email: 'admin2@idor.pe', password: 'clave-segura-1', rol: 'ADMIN' });
  assert.equal(l.data.rol, 'EMPRESA');
});

test('registro B2B: las personas y los roles que no son intermediario no pueden registrarse', async () => {
  const c = new Cliente(base);
  assert.equal((await c.post('/auth/registro', { tipo: 'PERSONA', persona: { direccion: 'Urb. San Eduardo, Piura' }, usuario: { nombre: 'Camila Rojas', email: 'cami@idor.pe', password: 'clave-segura-1' } })).status, 403);
  assert.equal((await registrar(c, '2092000004', 'gen@idor.pe', 'Generador Intruso SAC', { rol: 'GENERADOR' })).status, 400);
  assert.equal((await registrar(c, '2092000005', 'amb@idor.pe', 'Ambos Intruso SAC', { rol: 'AMBOS' })).status, 400);
});

test('inyección: SQL, operadores de Prisma y caracteres especiales en filtros y cuerpos no filtran datos ni rompen nada', async () => {
  const antes = await prisma.lote.count();
  const cargas = ["' OR 1=1 --", "x'; DROP TABLE \"Lote\"; --", '%', '_', '\\', '${7*7}', '"; SELECT pg_sleep(5); --'];
  for (const q of cargas) {
    for (const ruta of [`/material?q=${encodeURIComponent(q)}`, `/material?categoria=${encodeURIComponent(q)}`, `/material?residuoRef=${encodeURIComponent(q)}`, `/empresas/proveedores?sector=${encodeURIComponent(q)}`, `/destinos?tipo=${encodeURIComponent(q)}`, `/acuerdos?estado=${encodeURIComponent(q)}`]) {
      const r = await B.get(ruta);
      assert.ok(r.status < 500, `${ruta} → ${r.status}`);
      if (r.status === 200 && Array.isArray(r.data)) assert.ok(!JSON.stringify(r.data).includes('Proveedor de A'), `${ruta} no debe filtrar datos de A`);
    }
  }
  assert.equal(await prisma.lote.count(), antes, 'la tabla sigue íntegra');
  // Objetos en lugar de textos (qs): no deben convertirse en operadores de consulta ni en un 500 con detalles.
  for (const ruta of ['/material?estado[not]=x', '/material?proveedorId[contains]=', '/material?q[a]=1', '/destinos?tipo[in][]=x', '/acuerdos?estado[ne]=VIGENTE']) {
    const r = await B.get(ruta);
    assert.ok(r.status < 500 || !JSON.stringify(r.data).match(/prisma|select|invalid|argument/i), `${ruta} → ${r.status}`);
    if (r.status === 200 && Array.isArray(r.data)) assert.ok(!JSON.stringify(r.data).includes('Proveedor de A'));
  }
  // Operadores en el cuerpo
  assert.equal((await new Cliente(base).post('/auth/login', { email: { contains: '' }, password: { not: 'x' } })).status, 400);
  assert.equal((await new Cliente(base).post('/auth/login', { email: "a@b.pe' OR '1'='1", password: 'x' })).status, 400);
  assert.equal((await B.get("/benchmark?categoria=OTROS'%20OR%201=1")).status, 400);
});

test('el asistente solo consulta: lo único que escribe es crear una alerta (con confirmación); clasificar no guarda nada', async () => {
  const { readdirSync, readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const dir = join(process.cwd(), '..', '..', 'packages', 'shared', 'src', 'agente');
  const escrituras: string[] = [];
  let fuente = '';
  const re = /api(?:<[^>]*>)?\(\s*[`'"]([^`'"?]*)[^)]*method:\s*['"](POST|PUT|PATCH|DELETE)['"]/g;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.ts'))) {
    const txt = readFileSync(join(dir, f), 'utf8');
    fuente += txt;
    for (const m of txt.matchAll(re)) escrituras.push(`${m[2]} ${m[1]}`);
  }
  const unicas = [...new Set(escrituras)].sort();
  assert.deepEqual(unicas, ['POST /ia/clasificar', 'POST /matching/alertas']);
  // la creación de alertas pasa por confirmación explícita de la persona
  assert.match(fuente, /nombre: T\.ALERTA,[\s\S]{0,200}confirmar: true/);
});
