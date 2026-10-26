// Suite del modo MARKETPLACE (producto anterior, hoy detrás del interruptor SWAPIT_MODO). Se retira junto con ese código.
process.env.SWAPIT_MODO = 'MARKETPLACE';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { INestApplication } from '@nestjs/common';
import { FACTORES_IMPACTO, construirRuc, contiene, expandirConsulta, usosParaMaterial, usosParaNecesidad } from '@swapit/shared';
import { PrismaService } from '../../src/prisma/prisma.service';
import { iniciarDb } from '../db';
import { Cliente, crearApp } from '../http';

test('conocimiento: «gomitas» se traduce a cáscaras de cítricos y mango (pectina)', () => {
  const usos = usosParaNecesidad('necesito cáscaras de fruta para hacer gomitas');
  assert.deepEqual(usos.map((u) => u.uso.id), ['pectina-dulces']);
  const exp = expandirConsulta('necesito cáscaras de fruta para hacer gomitas');
  assert.match(exp.texto, /cascara de limon/);
  assert.match(exp.texto, /cascara de mango/);
  // Sin necesidad conocida la consulta no cambia.
  assert.equal(expandirConsulta('libros de ingeniería').texto, 'libros de ingeniería');
});

test('conocimiento: contiene compara palabras completas por raíz, no subcadenas', () => {
  assert.equal(contiene('Cáscaras de limón', 'cascara de limon'), true);
  assert.equal(contiene('mango kent', 'mango'), true);
  assert.equal(contiene('mangostino', 'mango'), false);
  assert.equal(contiene('compostaje en casa', 'compost'), false, 'compostaje es otra palabra; está en la lista de necesidades por separado');
});

test('conocimiento: de un material a sus usos («¿qué hago con la concha de abanico?»)', () => {
  const ids = usosParaMaterial('tengo concha de abanico triturada').map((u) => u.uso.id);
  assert.ok(ids.includes('conchas-construccion'));
  assert.ok(ids.includes('conchas-calcio'));
  assert.ok(usosParaMaterial('cáscara de mango').some((u) => u.porque === 'cascara de mango'), 'prefiere la frase más específica');
});

// ---- Integración: la búsqueda en lenguaje libre usa la base de conocimiento ----

let app: INestApplication;
let db: { detener(): Promise<void> };
let prisma: PrismaService;
let emp: Cliente;
let busca: Cliente;

const registrar = (c: Cliente, n: string, email: string, razon: string, direccion: string) =>
  c.post('/auth/registro', {
    tipo: 'EMPRESA',
    empresa: { ruc: construirRuc(n), razonSocial: razon, rol: 'AMBOS', direccion, representanteLegal: 'Rep Legal' },
    usuario: { nombre: 'Gerente', email, password: 'clave-segura-1' },
  });

before(async () => {
  db = await iniciarDb(5604);
  let base: string;
  ({ app, base } = await crearApp());
  prisma = app.get(PrismaService);
  const f = FACTORES_IMPACTO;
  await prisma.categoriaResiduo.create({ data: { codigo: 'ORGANICO_AGRO', nombre: 'Residuos orgánicos agroindustriales', sector: 'Agroindustria', codigoLer: '02 03 04', usoTipico: 'Compost', factorCo2PorTon: f.ORGANICO_AGRO.co2PorTon, factorCreditosPorTon: f.ORGANICO_AGRO.creditosPorTon } });
  await prisma.categoriaResiduo.create({ data: { codigo: 'METAL', nombre: 'Chatarra y metales', sector: 'Manufactura', codigoLer: '17 04 07', usoTipico: 'Fundición', factorCo2PorTon: f.METAL.co2PorTon, factorCreditosPorTon: f.METAL.creditosPorTon } });
  await prisma.configPlataforma.create({ data: { id: 1 } });
  emp = new Cliente(base);
  busca = new Cliente(base);
  await registrar(emp, '2090000001', 'lim@test.pe', 'Cítricos del Norte SAC', 'Zona Industrial, Piura');
  await registrar(busca, '2090000002', 'dulces@test.pe', 'Dulces Piura SAC', 'Av. Grau, Piura');
});
after(async () => {
  await app.close();
  await db.detener();
});

test('búsqueda: «cáscaras para gomitas» encuentra la cáscara de limón y explica el uso, no la chatarra', async () => {
  const base = { cantidad: 10, modalidad: 'DONACION' };
  assert.equal((await emp.post('/lotes', { ...base, categoriaCodigo: 'ORGANICO_AGRO', titulo: 'Cáscara de limón sutil', descripcion: 'Cáscara de limón del extractor de jugo, húmeda y limpia.' })).status, 201);
  assert.equal((await emp.post('/lotes', { ...base, categoriaCodigo: 'METAL', titulo: 'Chatarra de fierro y varillas', descripcion: 'Varillas y fierro de demolición, apto para fundición.' })).status, 201);
  const r = (await busca.get('/matching/buscar?texto=' + encodeURIComponent('necesito cáscaras de fruta para hacer gomitas') + '&radioKm=100')).data;
  assert.ok(r.length >= 1, 'hay al menos un resultado');
  assert.equal(r[0].titulo, 'Cáscara de limón sutil');
  assert.equal(r[0].usoSugerido.titulo, 'Pectina y dulces de fruta');
  assert.match(r[0].usoSugerido.cuidado, /plaguicidas/);
  assert.match(r[0].explicacion, /sirve para pectina/);
  assert.ok(!r.some((x: { titulo: string }) => x.titulo.startsWith('Chatarra')), 'la chatarra no es relevante para gomitas');
});
