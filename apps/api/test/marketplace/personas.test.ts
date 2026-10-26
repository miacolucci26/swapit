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
let base: string;
let db: { detener(): Promise<void> };
let prisma: PrismaService;
let camila: Cliente; // persona (Piura)
let diego: Cliente; // persona (Castilla, Piura)
let agro: Cliente; // empresa (Piura)
let ids: { camila: string; agro: string };

const registrarPersona = (c: Cliente, nombre: string, email: string, direccion = 'Urb. San Eduardo, Piura') =>
  c.post('/auth/registro', { tipo: 'PERSONA', persona: { direccion }, usuario: { nombre, email, password: 'clave-segura-1' } });

const registrarEmpresa = (c: Cliente, n: string, email: string) =>
  c.post('/auth/registro', {
    tipo: 'EMPRESA',
    empresa: { ruc: construirRuc(n), razonSocial: 'Agro Norte SAC', rol: 'AMBOS', direccion: 'Zona Industrial, Piura', representanteLegal: 'Rep Legal' },
    usuario: { nombre: 'Gerente', email, password: 'clave-segura-1' },
  });

before(async () => {
  db = await iniciarDb(5603);
  ({ app, base } = await crearApp());
  prisma = app.get(PrismaService);
  const f = FACTORES_IMPACTO;
  await prisma.categoriaResiduo.createMany({
    data: [
      { codigo: 'ARTICULOS_PERSONALES', nombre: 'Artículos personales en desuso (ropa, libros, útiles)', sector: 'Personas', codigoLer: null, usoTipico: 'Reúso directo', factorCo2PorTon: f.ARTICULOS_PERSONALES.co2PorTon, factorCreditosPorTon: f.ARTICULOS_PERSONALES.creditosPorTon, unidadBase: 'und', kgPorUnidad: 1.5 },
      { codigo: 'VIDRIO_CERAMICA', nombre: 'Vidrio y cerámica (botellas, frascos)', sector: 'Manufactura / Artesanía', codigoLer: '15 01 07', usoTipico: 'Reúso de envases', factorCo2PorTon: f.VIDRIO_CERAMICA.co2PorTon, factorCreditosPorTon: f.VIDRIO_CERAMICA.creditosPorTon, unidadBase: 'ton', kgPorUnidad: 0.3 },
      { codigo: 'RAEE', nombre: 'Equipos electrónicos fuera de uso (RAEE)', sector: 'Personas / Servicios', codigoLer: '20 01 36', usoTipico: 'Reacondicionamiento', factorCo2PorTon: f.RAEE.co2PorTon, factorCreditosPorTon: f.RAEE.creditosPorTon, unidadBase: 'und', kgPorUnidad: 5 },
      { codigo: 'BIOMASA', nombre: 'Biomasa (cascarilla de arroz, poda)', sector: 'Agroindustria', codigoLer: '02 01 03', usoTipico: 'Energía', factorCo2PorTon: f.BIOMASA.co2PorTon, factorCreditosPorTon: f.BIOMASA.creditosPorTon, unidadBase: 'ton', kgPorUnidad: null },
      { codigo: 'ORGANICO_AGRO', nombre: 'Residuos orgánicos agroindustriales', sector: 'Agroindustria', codigoLer: '02 03 04', usoTipico: 'Compost', factorCo2PorTon: f.ORGANICO_AGRO.co2PorTon, factorCreditosPorTon: f.ORGANICO_AGRO.creditosPorTon, unidadBase: 'ton', kgPorUnidad: null },
    ],
  });
  await prisma.configPlataforma.create({ data: { id: 1 } });
  camila = new Cliente(base);
  diego = new Cliente(base);
  agro = new Cliente(base);
});
after(async () => {
  await app.close();
  await db.detener();
});

test('registro de persona: sin RUC ni KYB, nombre público sin apellido completo y ubicación aproximada', async () => {
  const r = await registrarPersona(camila, 'Camila Rojas Vílchez', 'camila@test.pe');
  assert.equal(r.status, 201);
  assert.equal(r.data.empresa.tipo, 'PERSONA');
  assert.equal(r.data.empresa.ruc, null);
  assert.equal(r.data.empresa.estadoKyb, 'NO_APLICA');
  assert.equal(r.data.empresa.razonSocial, 'Camila R.', 'el apellido completo no es público');
  assert.equal(r.data.nombre, 'Camila Rojas Vílchez', 'el nombre real queda solo en el usuario');
  ids = { camila: r.data.empresa.id, agro: '' };
  const mi = (await camila.get('/empresas/mi')).data;
  const { lat, lng } = mi.ubicacion;
  assert.ok(Math.abs(lat - -5.19) < 0.05, 'ubicada en Piura');
  assert.equal(lat, Math.round(lat * 100) / 100, 'latitud redondeada a ~1 km');
  assert.equal(lng, Math.round(lng * 100) / 100, 'longitud redondeada a ~1 km');
});

test('registro de persona: validaciones y compatibilidad del formato anterior (sin tipo = empresa)', async () => {
  const c = new Cliente(base);
  assert.equal((await c.post('/auth/registro', { tipo: 'PERSONA', persona: { direccion: 'x' }, usuario: { nombre: 'Ana Pérez', email: 'a@b.pe', password: 'clave-segura-1' } })).status, 400);
  assert.equal((await registrarPersona(c, 'Ana', 'corto@test.pe')).status, 400, 'pide nombre y apellido');
  assert.equal((await registrarPersona(c, 'Camila Otra', 'camila@test.pe')).status, 409, 'email duplicado');
  // Formato anterior de la API (sin `tipo`): sigue registrando una empresa.
  const e = await c.post('/auth/registro', {
    empresa: { ruc: construirRuc('2080000001'), razonSocial: 'Empresa Antigua SAC', rol: 'OFERTANTE', direccion: 'Zona Industrial, Piura', representanteLegal: 'Rep' },
    usuario: { nombre: 'Rep Legal', email: 'antigua@test.pe', password: 'clave-segura-1' },
  });
  assert.equal(e.status, 201);
  assert.equal(e.data.empresa.tipo, 'EMPRESA');
  assert.equal(e.data.empresa.estadoKyb, 'VERIFICADA');
});

test('base de datos: la restricción CHECK impide personas con RUC y empresas sin RUC', async () => {
  await assert.rejects(prisma.empresa.create({ data: { tipo: 'PERSONA', ruc: construirRuc('2080000002'), razonSocial: 'X Y.', rol: 'AMBOS', direccion: 'Piura' } }));
  await assert.rejects(prisma.empresa.create({ data: { tipo: 'EMPRESA', razonSocial: 'Sin RUC SAC', rol: 'AMBOS', direccion: 'Piura' } }));
  // PGlite cierra la conexión tras un error de SQL: se descarta aquí para que no la herede la siguiente prueba (P1017).
  for (let i = 0; i < 2; i++) await prisma.$queryRaw`SELECT 1`.catch(() => undefined);
});

test('permisos por tipo: KYB, certificaciones y cumplimiento REP son solo de empresas', async () => {
  assert.equal((await camila.post('/empresas/mi/verificar-kyb')).status, 403);
  assert.equal((await camila.post('/empresas/mi/certificaciones', { nombre: 'ISO 14001' })).status, 403);
  assert.equal((await camila.get('/cumplimiento')).status, 403);
  assert.equal((await camila.get('/cumplimiento/export.xlsx')).status, 403);
  const r = await registrarEmpresa(agro, '2080000003', 'agro@test.pe');
  assert.equal(r.status, 201);
  ids.agro = r.data.empresa.id;
  assert.equal((await agro.get('/cumplimiento')).status, 200);
  assert.equal((await agro.post('/empresas/mi/certificaciones', { nombre: 'ISO 14001' })).status, 201);
});

test('privacidad: el perfil público de una persona no expone dirección, RUC ni nombre completo', async () => {
  const pub = (await agro.get(`/empresas/${ids.camila}`)).data;
  assert.equal(pub.tipo, 'PERSONA');
  assert.equal(pub.direccion, null);
  assert.equal(pub.ruc, undefined);
  assert.equal(pub.razonSocial, 'Camila R.');
  const propio = (await camila.get('/empresas/mi')).data;
  assert.equal(propio.direccion, 'Urb. San Eduardo, Piura', 'ella sí ve su dirección');
  // Una persona edita su nombre: el nombre público se recalcula y el real se actualiza.
  const upd = await camila.patch('/empresas/mi', { nombre: 'Camila Rojas Vilchez Paz' });
  assert.equal(upd.data.razonSocial, 'Camila R.');
  assert.equal((await camila.get('/auth/me')).data.nombre, 'Camila Rojas Vilchez Paz');
});

test('unidades: la persona publica por unidad (por defecto de la categoría) y no en toneladas', async () => {
  const l = await camila.post('/lotes', {
    categoriaCodigo: 'ARTICULOS_PERSONALES', titulo: 'Libros de ingeniería (5 textos)', descripcion: 'Cinco libros de ingeniería industrial en buen estado, con pocos subrayados.',
    cantidad: 5, modalidad: 'VENTA', precio: 25,
  });
  assert.equal(l.status, 201);
  assert.equal(l.data.unidad, 'und');
  assert.equal(l.data.tipoPublicador, 'PERSONA');
  assert.equal(l.data.fleteEstimado, null, 'no hay flete para artículos de mano');
  // «und» solo es válido si la categoría define un peso promedio.
  const mal = await agro.post('/lotes', { categoriaCodigo: 'ORGANICO_AGRO', unidad: 'und', titulo: 'Cáscara de arándano', descripcion: 'Cáscara y pulpa de arándano de la línea de proceso.', cantidad: 5, modalidad: 'DONACION' });
  assert.equal(mal.status, 400);
  const kg = await agro.post('/lotes', { categoriaCodigo: 'ORGANICO_AGRO', unidad: 'kg', titulo: 'Cáscara de arándano 200 kg', descripcion: 'Cáscara y pulpa de arándano de la línea de proceso.', cantidad: 200, modalidad: 'VENTA', precio: 0.1 });
  assert.equal(kg.status, 201);
  assert.equal(kg.data.unidad, 'kg');
  assert.equal((await agro.post('/lotes', { categoriaCodigo: 'ARTICULOS_PERSONALES', titulo: 'Libros sin precio', descripcion: 'Libros usados en buen estado, sin precio.', cantidad: 2, modalidad: 'VENTA' })).status, 400);
});

test('catálogo unificado: empresas y personas se ven entre sí, con el tipo de publicador como dato', async () => {
  const paraAgro = (await agro.get('/lotes')).data;
  const libros = paraAgro.find((l: { titulo: string }) => l.titulo.startsWith('Libros de ingeniería'));
  assert.equal(libros.tipoPublicador, 'PERSONA');
  assert.equal(libros.razonSocial, 'Camila R.');
  assert.ok(libros.distanciaKm < 20);
  const paraCamila = (await camila.get('/lotes')).data;
  assert.equal(paraCamila.find((l: { titulo: string }) => l.titulo.startsWith('Cáscara de arándano')).tipoPublicador, 'EMPRESA');
  assert.equal((await agro.get('/lotes?categoria=ARTICULOS_PERSONALES')).data.length, 1, 'se filtra por categoría, no por tipo de publicador');
});

test('matching: la búsqueda con IA encuentra artículos de personas por afinidad y cercanía', async () => {
  const r = (await agro.get('/matching/buscar?texto=libros de ingeniería industrial&radioKm=50')).data;
  assert.ok(r.length >= 1);
  assert.equal(r[0].tipoPublicador, 'PERSONA');
  assert.equal(r[0].unidad, 'und');
  assert.equal(r[0].fleteEstimado, null);
});

test('clasificador local: reconoce artículos personales y sugiere la unidad y el precio por unidad', async () => {
  const r = (await camila.post('/ia/clasificar', { descripcion: 'Ropa de abrigo, casacas y polos que ya no uso', imagenes: [] })).data;
  assert.equal(r.categoriaCodigo, 'ARTICULOS_PERSONALES');
  assert.equal(r.unidadBase, 'und');
  assert.equal(r.modo, 'demo');
  assert.ok(!/Subproducto del sector/i.test(r.descripcion), 'no usa la redacción industrial');
  const e = (await agro.post('/ia/clasificar', { descripcion: 'Cáscara y pulpa de arándano de la planta de proceso', imagenes: [] })).data;
  assert.equal(e.categoriaCodigo, 'ORGANICO_AGRO');
  assert.equal(e.unidadBase, 'ton');
});

test('clasificador local para personas: una cuna de madera no es biomasa y los frascos se cuentan en unidades', async () => {
  const cuna = (await camila.post('/ia/clasificar', { descripcion: 'Cuna de madera en buen estado', imagenes: [] })).data;
  assert.equal(cuna.categoriaCodigo, 'ARTICULOS_PERSONALES');
  assert.ok(!cuna.titulo.includes(' — '), 'el título de una persona no lleva sufijo de sector industrial');
  const frascos = (await camila.post('/ia/clasificar', { descripcion: 'Frascos de vidrio con tapa', imagenes: [] })).data;
  assert.equal(frascos.categoriaCodigo, 'VIDRIO_CERAMICA');
  assert.equal(frascos.unidadBase, 'und', 'una persona cuenta frascos, no toneladas');
  assert.equal(frascos.precioReferencia, null, 'no se sugiere un precio por tonelada para unidades');
  const laptop = (await camila.post('/ia/clasificar', { descripcion: 'Laptop con pantalla rota para repuestos', imagenes: [] })).data;
  assert.equal(laptop.categoriaCodigo, 'RAEE');
  // La misma palabra en una empresa sigue el criterio industrial.
  const madera = (await agro.post('/ia/clasificar', { descripcion: 'Cascarilla de arroz y poda para biomasa', imagenes: [] })).data;
  assert.equal(madera.categoriaCodigo, 'BIOMASA');
});

let venta: string;
test('persona vende a empresa: flujo completo, escrow y comisión sobre unidades', async () => {
  const lote = (await agro.get('/lotes?categoria=ARTICULOS_PERSONALES')).data[0];
  const s = await agro.post('/transacciones', { loteId: lote.id, cantidad: 3 });
  assert.equal(s.status, 201);
  venta = s.data.id;
  await camila.post(`/transacciones/${venta}/mensajes`, { texto: 'Hola, sí está disponible' });
  assert.equal((await camila.put(`/transacciones/${venta}/terminos`, { cantidad: 3, precioAcordado: 25 })).status, 200);
  assert.equal((await agro.post(`/transacciones/${venta}/aceptar`)).status, 200);
  const t = (await agro.get(`/transacciones/${venta}`)).data;
  assert.equal(t.total, 75);
  assert.equal(t.comision, 4.5, '6% de S/ 75');
  assert.equal(t.lote.unidad, 'und');
  assert.equal(t.ofertante.tipo, 'PERSONA');
  assert.match(t.mensajes.at(-1).texto, /3 und\./, 'los mensajes hablan en unidades, no en toneladas');
  assert.equal((await agro.post(`/transacciones/${venta}/pagar`)).status, 200);
  await agro.post(`/transacciones/${venta}/recojo`, { fechaRecojo: new Date().toISOString(), responsableRecojo: 'Punto de encuentro' });
  await camila.post(`/transacciones/${venta}/firmar`, {});
  await agro.post(`/transacciones/${venta}/firmar`, { usoFinalDeclarado: 'Biblioteca de la empresa' });
  assert.equal((await agro.get(`/transacciones/${venta}`)).data.estado, 'ENTREGADO');
});

test('certificado de una persona: sin RUC, masa convertida a toneladas, íntegro y con PDF', async () => {
  const cod = (await agro.get(`/transacciones/${venta}`)).data.certificado.codigo;
  const v = (await new Cliente(base).get(`/verificar/${cod}`)).data;
  assert.equal(v.valido, true);
  assert.equal(v.ofertante.tipo, 'PERSONA');
  assert.equal(v.ofertante.ruc, null);
  assert.equal(v.ofertante.razonSocial, 'Camila R.');
  assert.equal(v.toneladas, 0.0045, '3 und × 1,5 kg');
  assert.equal(v.cantidad, '3 und.');
  assert.equal(v.co2EvitadoTon, 0.0135, '0,0045 t × 3000 kg CO₂eq/t');
  const pdf = await new Cliente(base).get(`/verificar/${cod}/pdf`);
  assert.equal(pdf.status, 200);
  assert.equal((pdf.data as Buffer).subarray(0, 5).toString(), '%PDF-');
  // La verificación sigue detectando cualquier alteración.
  await prisma.certificado.update({ where: { codigo: cod }, data: { ton: 9 } });
  assert.equal((await new Cliente(base).get(`/verificar/${cod}`)).data.valido, false);
  await prisma.certificado.update({ where: { codigo: cod }, data: { ton: 0.0045 } });
});

test('privacidad: el chat muestra a la persona como «Camila R.», no con sus apellidos completos', async () => {
  const lote = (await agro.get('/lotes?categoria=ARTICULOS_PERSONALES')).data[0];
  const { data: { id } } = await agro.post('/transacciones', { loteId: lote.id, cantidad: 1, mensaje: 'Hola, me interesa' });
  await camila.post(`/transacciones/${id}/mensajes`, { texto: 'Claro, coordinemos' });
  const msgs = (await agro.get(`/transacciones/${id}/mensajes`)).data as { autorNombre: string; texto: string }[];
  const deCamila = msgs.find((m) => m.texto === 'Claro, coordinemos')!;
  assert.equal(deCamila.autorNombre, 'Camila R.');
  assert.ok(!JSON.stringify(msgs).includes('Vilchez'), 'ningún apellido completo en la respuesta');
  const detalle = (await agro.get(`/transacciones/${id}`)).data;
  assert.ok(!JSON.stringify(detalle).includes('Vilchez'));
  assert.equal(msgs.find((m) => m.texto === 'Hola, me interesa')!.autorNombre, 'Gerente', 'una empresa sigue mostrando el nombre de su usuario');
  await camila.post(`/transacciones/${id}/cancelar`, {});
});

test('donación entre personas: los créditos se calculan sobre el peso equivalente', async () => {
  await diego.post('/auth/registro', { tipo: 'PERSONA', persona: { direccion: 'Urb. Miraflores, Castilla, Piura' }, usuario: { nombre: 'Diego Farfán Ruiz', email: 'diego@test.pe', password: 'clave-segura-1' } });
  const l = (await camila.post('/lotes', { categoriaCodigo: 'ARTICULOS_PERSONALES', titulo: 'Ropa de abrigo talla S y M', descripcion: 'Ocho prendas de abrigo en buen estado, lavadas.', cantidad: 8, modalidad: 'DONACION' })).data;
  const { data: { id } } = await diego.post('/transacciones', { loteId: l.id, cantidad: 4 });
  await camila.post(`/transacciones/${id}/mensajes`, { texto: 'ok' });
  await diego.put(`/transacciones/${id}/terminos`, { cantidad: 4 });
  await camila.post(`/transacciones/${id}/aceptar`);
  await camila.post(`/transacciones/${id}/recojo`, { fechaRecojo: new Date().toISOString(), responsableRecojo: 'Punto de encuentro' });
  await camila.post(`/transacciones/${id}/firmar`, {});
  await diego.post(`/transacciones/${id}/firmar`, {});
  const c = (await camila.get('/creditos')).data;
  assert.equal(c.saldo, 18, '4 und × 1,5 kg = 6 kg = 0,006 t × 3000 créditos/t');
  assert.equal(c.movimientos[0].tipo, 'GANADO_DONACION');
  assert.match(c.movimientos[0].descripcion, /4 und\./);
});

test('impacto: las cantidades en unidades se agregan en toneladas y se cuentan personas y empresas', async () => {
  const i = (await new Cliente(base).get('/impacto/publico')).data;
  assert.equal(i.toneladas, 0.0105, '0,0045 t (venta) + 0,006 t (donación)');
  assert.equal(i.simbiosis, 2);
  assert.equal(i.personasRegistradas, 2);
  assert.ok(i.empresasRegistradas >= 2);
  assert.equal(i.participantesActivos, 3, 'camila, agro y diego');
  assert.equal(i.porCategoria[0].codigo, 'ARTICULOS_PERSONALES');
  const mia = (await camila.get('/impacto/mi')).data;
  assert.equal(mia.toneladas, 0.0105);
});

test('sesión: el perfil de sesión distingue persona y empresa', async () => {
  const me = (await camila.get('/auth/me')).data;
  assert.equal(me.empresa.tipo, 'PERSONA');
  assert.equal((await agro.get('/auth/me')).data.empresa.tipo, 'EMPRESA');
});
