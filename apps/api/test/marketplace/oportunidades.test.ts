// Publicar › «¿Quién podría aprovechar esto?»: usos posibles del material (Gemini o base local) y compradores con alertas parecidas.
process.env.SWAPIT_MODO = 'MARKETPLACE';
// Estas pruebas nunca llaman a Gemini de verdad: la clave de un apps/api/.env local no debe gastar cuota ni volver la suite frágil.
process.env.OPORTUNIDADES_IA = 'off';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { INestApplication } from '@nestjs/common';
import { FACTORES_IMPACTO, construirRuc } from '@swapit/shared';
import { GeminiService } from '../../src/ia/gemini.service';
import { OportunidadesModule } from '../../src/oportunidades/oportunidades.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { iniciarDb } from '../db';
import { Cliente, crearApp } from '../http';

let app: INestApplication;
let base: string;
let db: { detener(): Promise<void> };
let vende: Cliente;
let compost: Cliente;
let chatarra: Cliente;
let lejos: Cliente;

const registrar = (c: Cliente, n: string, email: string, razon: string, direccion: string) =>
  c.post('/auth/registro', {
    tipo: 'EMPRESA',
    empresa: { ruc: construirRuc(n), razonSocial: razon, rol: 'AMBOS', direccion, representanteLegal: 'Rep Legal' },
    usuario: { nombre: 'Gerente', email, password: 'clave-segura-1' },
  });

const CASCARA = { titulo: 'Cáscara de mango', descripcion: 'Cáscara de mango de la línea de pulpa, fresca y limpia, 3 toneladas por semana.' };

before(async () => {
  db = await iniciarDb(5607);
  ({ app, base } = await crearApp());
  const prisma = app.get(PrismaService);
  const f = FACTORES_IMPACTO;
  await prisma.categoriaResiduo.create({ data: { codigo: 'ORGANICO_AGRO', nombre: 'Residuos orgánicos agroindustriales', sector: 'Agroindustria', codigoLer: '02 03 04', usoTipico: 'Compost', factorCo2PorTon: f.ORGANICO_AGRO.co2PorTon, factorCreditosPorTon: f.ORGANICO_AGRO.creditosPorTon } });
  await prisma.categoriaResiduo.create({ data: { codigo: 'METAL', nombre: 'Chatarra y metales', sector: 'Manufactura', codigoLer: '17 04 07', usoTipico: 'Fundición de acero', factorCo2PorTon: f.METAL.co2PorTon, factorCreditosPorTon: f.METAL.creditosPorTon } });
  await prisma.configPlataforma.create({ data: { id: 1 } });
  vende = new Cliente(base);
  compost = new Cliente(base);
  chatarra = new Cliente(base);
  lejos = new Cliente(base);
  await registrar(vende, '2090000011', 'mango@test.pe', 'Pulpas del Norte SAC', 'Zona Industrial, Piura');
  await registrar(compost, '2090000012', 'compost@test.pe', 'BioCompost Piura SAC', 'Av. Grau, Piura');
  await registrar(chatarra, '2090000013', 'fierro@test.pe', 'Fundición Norte SAC', 'Parque Industrial, Chiclayo');
  await registrar(lejos, '2090000014', 'lejos@test.pe', 'Abonos Chiclayo SAC', 'Parque Industrial, Chiclayo');
  assert.equal((await compost.post('/matching/alertas', { texto: 'Cáscara, pulpa y descartes de fruta para compostaje', categoriaCodigo: 'ORGANICO_AGRO', radioKm: 300 })).status, 201);
  assert.equal((await chatarra.post('/matching/alertas', { texto: 'Chatarra de acero, varillas y fierro', categoriaCodigo: 'METAL', radioKm: 400 })).status, 201);
  // Busca lo mismo, pero solo a 20 km de Chiclayo: un vendedor de Piura (~190 km) queda fuera de su radio.
  assert.equal((await lejos.post('/matching/alertas', { texto: 'Cáscara y descartes de fruta para abono', categoriaCodigo: 'ORGANICO_AGRO', radioKm: 20 })).status, 201);
});
after(async () => {
  await app.close();
  await db.detener();
});

test('oportunidades: sin IA usa la base local y encuentra al comprador de compost, anónimo y con distancia aproximada', async () => {
  const r = await vende.post('/oportunidades/sugerir', { ...CASCARA, categoriaCodigo: 'ORGANICO_AGRO' });
  assert.equal(r.status, 200);
  assert.equal(r.data.modo, 'local');
  assert.equal(r.data.aviso, undefined, 'apagada a propósito: no se avisa de un fallo');
  assert.ok(r.data.usos.some((u: { titulo: string }) => u.titulo === 'Pectina y dulces de fruta'), 'la base local conoce la cáscara de mango');
  assert.ok(r.data.usos.length <= 4);
  assert.deepEqual(r.data.industrias, []);
  assert.equal(r.data.compradores.length, 1, JSON.stringify(r.data.compradores));
  const c = r.data.compradores[0];
  assert.match(c.necesidad, /compostaje/);
  assert.equal(c.tipo, 'EMPRESA');
  assert.equal(c.distanciaKm % 5, 0, 'distancia redondeada a 5 km');
  assert.ok(c.afinidad > 0 && c.afinidad <= 100);
  // Nada que identifique a quien busca.
  assert.ok(!JSON.stringify(r.data).includes('BioCompost'));
  assert.equal(c.empresaId, undefined);
});

test('oportunidades: no muestra alertas de otra categoría ni las propias', async () => {
  // Con categoría METAL elegida, la alerta de compost (ORGANICO_AGRO) no recibiría el lote: no se muestra.
  const r = await vende.post('/oportunidades/sugerir', { ...CASCARA, categoriaCodigo: 'METAL' });
  assert.ok(!r.data.compradores.some((c: { necesidad: string }) => /compostaje/.test(c.necesidad)));
  // Quien creó la alerta no se ve a sí mismo como comprador.
  const propia = await compost.post('/oportunidades/sugerir', { descripcion: 'Cáscara y pulpa de fruta para compostaje, fresca.' });
  assert.ok(!propia.data.compradores.some((c: { necesidad: string }) => /compostaje/.test(c.necesidad)));
});

test('oportunidades: sin usos conocidos cae a los usos típicos de la categoría', async () => {
  const r = await vende.post('/oportunidades/sugerir', { descripcion: 'Restos variados del almacén, consultar por fotos.', categoriaCodigo: 'METAL' });
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.usos, [{ titulo: 'Usos habituales: Chatarra y metales', detalle: 'Fundición de acero', cuidado: '' }]);
});

test('oportunidades: con Gemini devuelve sus usos, guarda la respuesta y, si falla, avisa y usa la base local', async () => {
  // WhatsApp tiene su propia instancia: se toma la del módulo de oportunidades.
  const g = app.select(OportunidadesModule).get(GeminiService, { strict: true });
  const original = { hab: g.oportunidadesHabilitadas, sug: g.sugerirUsos };
  let llamadas = 0;
  g.oportunidadesHabilitadas = () => true;
  g.sugerirUsos = async () => {
    llamadas++;
    return { usos: [{ titulo: 'Harina de cáscara de mango', detalle: 'Se seca y muele como fibra para panificación.', cuidado: 'Requiere registro sanitario.' }], industrias: ['Panificadoras', 'Alimentos balanceados'] };
  };
  try {
    const r = await vende.post('/oportunidades/sugerir', CASCARA);
    assert.equal(r.data.modo, 'gemini');
    assert.equal(r.data.usos[0].titulo, 'Harina de cáscara de mango');
    assert.deepEqual(r.data.industrias, ['Panificadoras', 'Alimentos balanceados']);
    assert.match(r.data.aviso, /Gemini/);
    // Mismo texto (con otros espacios y mayúsculas): sale de la caché, sin otra llamada.
    await vende.post('/oportunidades/sugerir', { titulo: CASCARA.titulo.toUpperCase(), descripcion: `  ${CASCARA.descripcion}` });
    assert.equal(llamadas, 1);

    g.sugerirUsos = async () => null; // Gemini caído o respuesta inválida
    const f = await vende.post('/oportunidades/sugerir', { descripcion: 'Otra cáscara de mango distinta, seca.' });
    assert.equal(f.data.modo, 'local');
    assert.match(f.data.aviso, /no respondió/);
    assert.ok(f.data.usos.length > 0);
  } finally {
    g.oportunidadesHabilitadas = original.hab;
    g.sugerirUsos = original.sug;
  }
});

// ---- Ficha › «¿En qué te puede servir?» (comprador) ----

let loteMango = '';
const publicarMango = async () => {
  if (loteMango) return loteMango;
  const r = await vende.post('/lotes', { ...CASCARA, categoriaCodigo: 'ORGANICO_AGRO', cantidad: 3, unidad: 'ton', modalidad: 'DONACION' });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  loteMango = r.data.id;
  return loteMango;
};

test('para comprador: sin IA da los usos del material y, si una búsqueda suya calza, se lo dice', async () => {
  const id = await publicarMango();
  const r = await compost.post('/oportunidades/para-comprador', { loteId: id });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.modo, 'local');
  assert.ok(r.data.usos.length >= 1 && r.data.usos.length <= 3);
  assert.equal(r.data.usaPerfil, true);
  assert.match(r.data.encaje, /compostaje/, 'cita su búsqueda');
  assert.match(r.data.encaje, /compost y biofertilizantes/);
  // Quien busca chatarra no recibe un «encaje» inventado.
  const otro = await chatarra.post('/oportunidades/para-comprador', { loteId: id });
  assert.equal(otro.data.encaje, '');
  assert.equal(otro.data.usaPerfil, false);
});

test('para comprador: no sobre la propia oferta, 404 si no existe y valida el texto del negocio', async () => {
  const id = await publicarMango();
  assert.equal((await vende.post('/oportunidades/para-comprador', { loteId: id })).status, 400);
  assert.equal((await compost.post('/oportunidades/para-comprador', { loteId: 'no-existe' })).status, 404);
  assert.equal((await compost.post('/oportunidades/para-comprador', { loteId: id, negocio: 'x'.repeat(201) })).status, 400);
  assert.equal((await new Cliente(base).post('/oportunidades/para-comprador', { loteId: id })).status, 401);
});

test('para comprador: con Gemini envía el material y el negocio sin nombres, y guarda la respuesta por oferta y negocio', async () => {
  const id = await publicarMango();
  const g = app.select(OportunidadesModule).get(GeminiService, { strict: true });
  const original = { hab: g.oportunidadesHabilitadas, rec: g.recomendarParaComprador };
  const pedidos: { material: string; perfil: string | null }[] = [];
  g.oportunidadesHabilitadas = () => true;
  g.recomendarParaComprador = async (material: string, perfil: string | null) => {
    pedidos.push({ material, perfil });
    return { usos: [{ titulo: 'Cama para aves', detalle: 'Se seca y se usa como cama en galpones.', cuidado: '' }], encaje: 'Te sirve: tu granja usa cama absorbente.' };
  };
  try {
    const r = await compost.post('/oportunidades/para-comprador', { loteId: id, negocio: 'Granja avícola' });
    assert.equal(r.data.modo, 'gemini');
    assert.equal(r.data.usaPerfil, true);
    assert.equal(r.data.encaje, 'Te sirve: tu granja usa cama absorbente.');
    assert.match(pedidos[0].material, /^Cáscara de mango\. .*Categoría: Residuos orgánicos/);
    assert.match(pedidos[0].perfil ?? '', /Se dedica a: Granja avícola/);
    assert.match(pedidos[0].perfil ?? '', /Busca: Cáscara, pulpa y descartes de fruta para compostaje/);
    // Ni el nombre del comprador ni el del vendedor salen hacia la IA.
    assert.ok(!JSON.stringify(pedidos).includes('BioCompost') && !JSON.stringify(pedidos).includes('Pulpas del Norte'));
    await compost.post('/oportunidades/para-comprador', { loteId: id, negocio: 'Granja avícola' });
    assert.equal(pedidos.length, 1, 'misma oferta y mismo negocio: sale de la caché');
    await compost.post('/oportunidades/para-comprador', { loteId: id, negocio: 'Ladrillera' });
    assert.equal(pedidos.length, 2, 'otro negocio: otra consulta');
  } finally {
    g.oportunidadesHabilitadas = original.hab;
    g.recomendarParaComprador = original.rec;
  }
});

test('oportunidades: exige sesión, valida la descripción y no existe en modo acopiadores', async () => {
  assert.equal((await lejos.post('/oportunidades/sugerir', { descripcion: 'corta' })).status, 400);
  assert.equal((await lejos.post('/oportunidades/sugerir', { descripcion: 'x'.repeat(2001) })).status, 400);
  assert.equal((await new Cliente(base).post('/oportunidades/sugerir', CASCARA)).status, 401);
  process.env.SWAPIT_ACOPIADORES = '1';
  try {
    assert.equal((await vende.post('/oportunidades/sugerir', CASCARA)).status, 404);
  } finally {
    delete process.env.SWAPIT_ACOPIADORES;
  }
});
