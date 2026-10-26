// Acceso cruzado en el modo MARKETPLACE (producto anterior, hoy detrás del interruptor SWAPIT_MODO). Se retira junto con ese código.
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
let base: string;
let A: Cliente; // ofertante
let B: Cliente; // receptor
let C: Cliente; // tercero sin relación con A ni B
let ADM: Cliente;
let ids: { A: string; B: string; C: string };
let loteDon: string;
let loteVenta: string;
let txDon: string;
let txVenta: string;

const TELEFONO = '987654321';
const TELEFONO_E164 = '+51987654321';

const alta = async (c: Cliente, n: string, rol: string, dir: string, email: string, extra: object = {}) => {
  const r = await c.post('/auth/registro', {
    empresa: { ruc: construirRuc(n), razonSocial: `Empresa SAC ${n}`, rol, direccion: dir, representanteLegal: 'Rep Legal', ...extra },
    usuario: { nombre: 'Usuario Prueba', email, password: 'clave-segura-1' },
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  return r.data.empresa.id as string;
};
const lote = (extra: object) => ({
  categoriaCodigo: 'ORGANICO_AGRO', titulo: 'Cáscara y pulpa de arándano', descripcion: 'Cáscara y pulpa de arándano de la línea de proceso, material húmedo sin aditivos.',
  keywords: ['arándano'], cantidad: 50, modalidad: 'VENTA', precio: 100, ...extra,
});
const sinTelefono = (resp: unknown, donde: string) => {
  const t = JSON.stringify(resp);
  assert.ok(!t.includes(TELEFONO) && !t.includes(TELEFONO_E164), `${donde} no debe contener el teléfono de A`);
};

before(async () => {
  db = await iniciarDb(5622);
  ({ app, base } = await crearApp());
  prisma = app.get(PrismaService);
  const f = FACTORES_IMPACTO.ORGANICO_AGRO;
  await prisma.categoriaResiduo.create({ data: { codigo: 'ORGANICO_AGRO', nombre: 'Residuos orgánicos agroindustriales (cáscara, pulpa, bagazo)', sector: 'Agroindustria', codigoLer: '02 03 04', usoTipico: 'Compost', factorCo2PorTon: f.co2PorTon, factorCreditosPorTon: f.creditosPorTon } });
  await prisma.configPlataforma.create({ data: { id: 1 } });
  A = new Cliente(base); B = new Cliente(base); C = new Cliente(base); ADM = new Cliente(base);
  ids = {
    A: await alta(A, '2091000001', 'OFERTANTE', 'Zona Industrial, Piura', 'a@mk.pe', { contactoNombre: 'Ana Torres', telefono: TELEFONO }),
    B: await alta(B, '2091000002', 'RECEPTOR', 'Parque Industrial, Chiclayo', 'b@mk.pe'),
    C: await alta(C, '2091000003', 'AMBOS', 'Zona Industrial, Piura', 'c@mk.pe'),
  };
  await alta(ADM, '2091000004', 'AMBOS', 'Zona Industrial, Piura', 'admin@mk.pe');
  await prisma.usuario.update({ where: { email: 'admin@mk.pe' }, data: { rol: 'ADMIN' } });
  assert.equal((await ADM.post('/auth/login', { email: 'admin@mk.pe', password: 'clave-segura-1' })).status, 200);
  loteDon = (await A.post('/lotes', lote({ modalidad: 'DONACION', precio: undefined }))).data.id;
  loteVenta = (await A.post('/lotes', lote({ titulo: 'Bagazo de arándano para compost', precio: 10 }))).data.id;
  txDon = (await B.post('/transacciones', { loteId: loteDon, cantidad: 10, mensaje: 'Hola, me interesa' })).data.id;
  txVenta = (await B.post('/transacciones', { loteId: loteVenta, cantidad: 10, precioOfertado: 9 })).data.id;
  assert.ok(loteDon && loteVenta && txDon && txVenta);
});
after(async () => {
  await app.close();
  await db.detener();
});

test('transacciones: un tercero no lee ni opera sobre la negociación ajena (404 en todas las rutas)', async () => {
  const rutas: [string, string, object?][] = [
    ['GET', `/transacciones/${txDon}`],
    ['GET', `/transacciones/${txDon}/mensajes`],
    ['POST', `/transacciones/${txDon}/mensajes`, { texto: 'intruso' }],
    ['PUT', `/transacciones/${txDon}/terminos`, { cantidad: 1 }],
    ['POST', `/transacciones/${txDon}/aceptar`],
    ['POST', `/transacciones/${txDon}/pagar`],
    ['POST', `/transacciones/${txDon}/recojo`, { fechaRecojo: new Date().toISOString(), responsableRecojo: 'Intruso' }],
    ['POST', `/transacciones/${txDon}/firmar`, {}],
    ['POST', `/transacciones/${txDon}/calificar`, { estrellas: 1 }],
    ['POST', `/transacciones/${txDon}/cancelar`, { motivo: 'intruso' }],
    ['POST', `/transacciones/${txDon}/incidencias`, { tipo: 'OTRO', detalle: 'intruso reporta' }],
  ];
  for (const [m, ruta, cuerpo] of rutas) {
    const r = await C.req(m, ruta, cuerpo);
    assert.equal(r.status, 404, `${m} ${ruta}`);
  }
  assert.deepEqual((await C.get('/transacciones')).data, []);
  const t = (await B.get(`/transacciones/${txDon}`)).data;
  assert.equal(t.estado, 'SOLICITADO', 'el intruso no cambió el estado');
  assert.ok(!t.mensajes.some((m: { texto: string }) => m.texto.includes('intruso')));
  assert.equal(await prisma.incidencia.count(), 0);
});

test('privacidad: el teléfono y el contacto de A no aparecen en ninguna respuesta antes del acuerdo', async () => {
  for (const [nombre, cli] of [['B', B], ['C', C]] as const) {
    sinTelefono((await cli.get('/lotes')).data, `lotes (${nombre})`);
    sinTelefono((await cli.get(`/lotes/${loteDon}`)).data, `lote (${nombre})`);
    sinTelefono((await cli.get(`/empresas/${ids.A}`)).data, `perfil de A (${nombre})`);
    sinTelefono((await cli.get('/matching/buscar?texto=cáscara de arándano para compost&radioKm=500')).data, `matching (${nombre})`);
    sinTelefono((await cli.get('/impacto/publico')).data, `impacto público (${nombre})`);
    sinTelefono((await cli.get('/categorias')).data, `categorías (${nombre})`);
  }
  const t = await B.get(`/transacciones/${txDon}`);
  sinTelefono(t.data, 'detalle de la transacción SOLICITADA (B)');
  sinTelefono((await B.get('/transacciones')).data, 'lista de transacciones (B)');
  sinTelefono((await B.get(`/transacciones/${txDon}/mensajes`)).data, 'mensajes (B)');
  sinTelefono((await new Cliente(base).get(`/empresas/${ids.A}`)).data, 'perfil anónimo');
  // Ni A ni B ven el hash, el correo ni la contraseña del otro.
  for (const resp of [(await B.get(`/empresas/${ids.A}`)).data, t.data]) {
    const txt = JSON.stringify(resp);
    for (const p of ['a@mk.pe', 'passwordHash', 'Representante', 'Rep Legal']) assert.ok(!txt.includes(p), `no debe contener ${p}: ${txt.slice(0, 400)}`);
  }
});

test('privacidad: tras el acuerdo solo las dos partes reciben el contacto; el tercero sigue sin verlo', async () => {
  assert.equal((await A.post(`/transacciones/${txDon}/mensajes`, { texto: 'Claro, coordinemos' })).status, 201);
  assert.equal((await A.put(`/transacciones/${txDon}/terminos`, { cantidad: 10 })).status, 200);
  assert.equal((await C.post(`/transacciones/${txDon}/aceptar`)).status, 404, 'el tercero no puede aceptar por B');
  assert.equal((await A.post(`/transacciones/${txDon}/aceptar`)).status, 400, 'quien propone no puede aceptar su propia propuesta');
  assert.equal((await B.post(`/transacciones/${txDon}/aceptar`)).status, 200);
  const deB = (await B.get(`/transacciones/${txDon}`)).data;
  assert.equal(deB.estado, 'ACORDADO');
  assert.ok(JSON.stringify(deB).includes(TELEFONO_E164) || JSON.stringify(deB).includes(TELEFONO), 'la contraparte sí recibe el contacto una vez acordado');
  assert.equal((await C.get(`/transacciones/${txDon}`)).status, 404);
  sinTelefono((await C.get('/transacciones')).data, 'lista del tercero');
  sinTelefono((await C.get(`/empresas/${ids.A}`)).data, 'perfil visto por el tercero');
  sinTelefono((await C.get('/lotes')).data, 'lotes vistos por el tercero');
});

test('roles dentro de la transacción: solo el receptor paga; el tercero y el ofertante no', async () => {
  assert.equal((await A.put(`/transacciones/${txVenta}/terminos`, { cantidad: 10, precioAcordado: 9 })).status, 200);
  assert.equal((await B.post(`/transacciones/${txVenta}/aceptar`)).status, 200);
  assert.equal((await C.post(`/transacciones/${txVenta}/pagar`)).status, 404);
  assert.equal((await A.post(`/transacciones/${txVenta}/pagar`)).status, 403, 'el ofertante no paga');
  assert.equal((await B.get(`/transacciones/${txVenta}`)).data.pagoEstado, 'PENDIENTE');
  assert.equal((await B.post(`/transacciones/${txVenta}/pagar`)).status, 200);
});

test('lotes: nadie retira lotes ajenos; los lotes del ciclo B2B2B no se ven por la ruta del mercado', async () => {
  assert.equal((await B.del(`/lotes/${loteVenta}`)).status, 403);
  assert.equal((await C.del(`/lotes/${loteVenta}`)).status, 403);
  assert.equal((await prisma.lote.findUniqueOrThrow({ where: { id: loteVenta } })).estado, 'PUBLICADO');
  // un lote REPORTADO de la red de otro intermediario (datos que cotiza y acopia un acopiador)
  const cat = await prisma.categoriaResiduo.findFirstOrThrow();
  const prov = await prisma.empresa.create({ data: { tipo: 'EMPRESA', razonSocial: 'Proveedor de red', ruc: construirRuc('2091000099'), rol: 'GENERADOR', intermediarioId: ids.C, direccion: 'Piura', estadoKyb: 'NO_APLICA' } });
  const privado = await prisma.lote.create({ data: { empresaId: prov.id, categoriaId: cat.id, titulo: 'Material reportado privado', descripcion: 'Material en la red de otro intermediario, aún sin cotizar.', cantidad: 5, cantidadDisponible: 5, unidad: 'kg', modalidad: 'VENTA', estado: 'REPORTADO', precioEsperado: 3 } });
  for (const cli of [A, B]) assert.equal((await cli.get(`/lotes/${privado.id}`)).status, 404, 'otro usuario no ve el lote de la red de un intermediario');
  assert.equal((await B.get('/lotes?empresaId=' + prov.id)).data.length, 0);
  assert.equal((await B.get(`/empresas/${prov.id}`)).status, 404, 'tampoco el perfil del proveedor de otro intermediario');
});

test('consultas de lotes: los parámetros inválidos dan 400 (no errores de la base) y la inyección no devuelve filas', async () => {
  for (const q of ['modalidad=HACKER', 'modalidad=VENTA%27%20OR%201=1', 'radioKm=NaN', 'radioKm=-5', 'radioKm=1e9', 'radioKm=abc']) {
    const r = await B.get(`/lotes?${q}`);
    assert.equal(r.status, 400, q);
    assert.ok(!JSON.stringify(r.data).match(/prisma|select|SQL|postgres/i));
  }
  assert.equal((await B.get(`/lotes?q=${encodeURIComponent("' OR 1=1 --")}`)).data.length, 0);
  assert.equal((await B.get(`/lotes?categoria=${encodeURIComponent("x' OR '1'='1")}`)).data.length, 0);
  assert.equal((await B.get(`/matching/buscar?texto=${encodeURIComponent("'; DROP TABLE \"Lote\"; --")}&radioKm=abc`)).status, 400);
  assert.equal((await B.get(`/matching/buscar?texto=${'a'.repeat(400)}`)).status, 400, 'texto desmesurado');
  assert.ok((await prisma.lote.count()) >= 2);
  const m = await B.get(`/transacciones/${txDon}/mensajes?despues=basura`);
  assert.ok(m.status >= 400 && m.status < 500, `fecha inválida → ${m.status}`);
  assert.ok(!JSON.stringify(m.data).match(/prisma|invalid date|argument/i));
});

test('alertas: cada empresa solo ve y borra las suyas', async () => {
  const a = await B.post('/matching/alertas', { texto: 'cáscara de arándano para compost', radioKm: 500 });
  assert.equal(a.status, 201);
  assert.equal((await C.del(`/matching/alertas/${a.data.id}`)).status, 404);
  assert.deepEqual((await C.get('/matching/alertas')).data, []);
  assert.equal((await B.get('/matching/alertas')).data.length, 1);
  assert.equal((await B.del(`/matching/alertas/${a.data.id}`)).status, 204);
});

test('créditos: el canje exige saldo propio y no afecta a otras cuentas', async () => {
  const antes = (await A.get('/creditos')).data.saldo;
  assert.equal((await C.post('/creditos/canjear', { beneficio: 'BADGE_CIRCULAR' })).status, 400);
  assert.equal((await C.post('/creditos/canjear', { beneficio: 'DESTACAR_LOTE', loteId: loteVenta })).status, 400);
  assert.equal((await A.get('/creditos')).data.saldo, antes);
  assert.equal((await prisma.empresa.findUniqueOrThrow({ where: { id: ids.C } })).badgeCircular, false);
});

test('administración: solo ADMIN; una persona de empresa recibe 403 y un estado inválido no rompe nada', async () => {
  for (const [m, ruta, cuerpo] of [['GET', '/admin/incidencias'], ['POST', '/admin/incidencias/x/estado', { estado: 'RESUELTA' }], ['GET', '/admin/empresas'], ['PATCH', `/admin/empresas/${ids.A}/verificacion`, { estado: 'VERIFICADA' }]] as [string, string, object?][]) {
    assert.equal((await B.req(m, ruta, cuerpo)).status, 403, `${m} ${ruta}`);
    assert.equal((await C.req(m, ruta, cuerpo)).status, 403);
  }
  assert.equal((await ADM.get('/admin/incidencias')).status, 200);
  const malo = await ADM.post('/admin/incidencias/no-existe/estado', { estado: 'INVENTADO' });
  assert.ok(malo.status >= 400 && malo.status < 500, `estado inventado → ${malo.status}`);
  assert.ok(!JSON.stringify(malo.data).match(/prisma|invocation|argument/i));
  assert.equal((await ADM.patch(`/admin/empresas/${ids.A}/verificacion`, { estado: 'CUALQUIERA' })).status, 400);
  // un usuario normal no se vuelve admin pidiéndolo en la petición
  assert.equal((await B.post('/auth/login', { email: 'b@mk.pe', password: 'clave-segura-1', rol: 'ADMIN' })).data.rol, 'EMPRESA');
  assert.equal((await B.get('/admin/incidencias')).status, 403);
});

test('cumplimiento e impacto: cada empresa solo exporta lo suyo', async () => {
  const cumpl = await C.get('/cumplimiento');
  assert.equal(cumpl.status, 200);
  assert.equal(cumpl.data.detalle.length, 0, 'C no tiene operaciones: no ve las de A y B');
  assert.equal((await C.get('/impacto/mi')).data.simbiosis, 0);
});

test('mapa de calor público: ninguna empresa aparece con su ubicación exacta', async () => {
  const calor = (await new Cliente(base).get('/impacto/publico')).data.calor as { lat: number; lng: number }[];
  assert.ok(calor.length > 0);
  for (const p of calor) {
    for (const v of [p.lat, p.lng]) assert.ok(Math.abs(v / 0.05 - Math.round(v / 0.05)) < 1e-6, `${v} debería estar redondeado a una rejilla de ~5 km`);
  }
});
