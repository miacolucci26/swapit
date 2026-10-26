import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { INestApplication } from '@nestjs/common';
import { FACTORES_IMPACTO, SUBTIPOS_PLASTICO, construirRuc } from '@swapit/shared';
import { BenchmarkService } from '../../src/benchmark/benchmark.service';
import { reiniciarLimites } from '../../src/common/limite-tasa';
import { PrismaService } from '../../src/prisma/prisma.service';
import { iniciarDb } from '../db';
import { Cliente, crearApp } from '../http';

let app: INestApplication;
let db: { detener(): Promise<void> };
let prisma: PrismaService;
let base: string;
let norte: Cliente;
let anonimo: Cliente;
let provA: { id: string; tokenCaptacion: string };
let provB: { id: string; tokenCaptacion: string };

const registrar = (c: Cliente, n: string, email: string, razon: string) =>
  c.post('/auth/registro', { tipo: 'EMPRESA', empresa: { ruc: construirRuc(n), razonSocial: razon, direccion: 'Zona Industrial, Piura', representanteLegal: 'Rep' }, usuario: { nombre: 'Gerente', email, password: 'clave-segura-1' } });

before(async () => {
  db = await iniciarDb(5613);
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
  anonimo = new Cliente(base);
  await registrar(norte, '2098000001', 'norte@test.pe', 'Acopios del Norte SAC');
  provA = (await norte.post('/empresas/proveedores', { razonSocial: 'Plásticos Ganoza SAC', direccion: 'Zona Industrial, Piura', contactoNombre: 'Manuel G.', telefono: '900000101' })).data;
  provB = (await norte.post('/empresas/proveedores', { razonSocial: 'Don Pepe Recolector', direccion: 'Sullana', contactoNombre: 'Pepe', telefono: '900000102' })).data;
});
after(async () => {
  await app.close();
  await db.detener();
});

const api = (ruta: string) => anonimo.get(ruta);

test('portal: un enlace válido muestra el nombre del proveedor y la marca del intermediario, sin pedir sesión', async () => {
  const r = await api(`/captacion/${provA.tokenCaptacion}`);
  assert.equal(r.status, 200);
  assert.equal(r.data.proveedor.nombre, 'Plásticos Ganoza SAC');
  assert.equal(r.data.intermediario.razonSocial, 'Acopios del Norte SAC');
  assert.ok(r.data.categorias.some((c: { codigo: string }) => c.codigo === 'PLASTICO_PET'));
  assert.ok(!r.data.categorias.some((c: { codigo: string }) => c.codigo === 'ARTICULOS_PERSONALES'));
  assert.equal(r.data.intermediario.id, undefined, 'no expone ids internos');
});

test('portal: enlace inválido, rotado o de un proveedor desactivado responde 404 igual', async () => {
  assert.equal((await api('/captacion/token-inexistente')).status, 404);
  const viejo = provB.tokenCaptacion;
  const nuevo = (await norte.post(`/empresas/proveedores/${provB.id}/rotar-enlace`)).data.tokenCaptacion;
  assert.equal((await api(`/captacion/${viejo}`)).status, 404, 'el enlace anterior deja de servir');
  assert.equal((await api(`/captacion/${nuevo}`)).status, 200);
  provB.tokenCaptacion = nuevo;
  await norte.patch(`/empresas/proveedores/${provB.id}`, { activo: false });
  assert.equal((await api(`/captacion/${nuevo}`)).status, 404, 'desactivado = sin acceso');
  await norte.patch(`/empresas/proveedores/${provB.id}`, { activo: true });
  assert.equal((await api(`/captacion/${nuevo}`)).status, 200);
});

test('reporte: la IA sugiere el subtipo y el proveedor recibe el rango de referencia (rotulado como ejemplo) y el semáforo', async () => {
  const r = await anonimo.post(`/captacion/${provA.tokenCaptacion}/reporte`, { descripcion: 'Botellas PET transparentes prensadas, unas 800 kg al mes', cantidad: 800, unidad: 'kg', precioEsperado: 9 });
  assert.equal(r.status, 201);
  assert.equal(r.data.categoria.codigo, 'PLASTICO_PET');
  assert.equal(r.data.estado, 'REPORTADO');
  assert.equal(r.data.requiereRevision, false);
  assert.equal(r.data.posicionPrecio, 'ENCIMA', 'S/ 9 por kilo está muy por encima del rango de ejemplo');
  assert.equal(r.data.benchmark.esSemilla, true);
  assert.equal(r.data.benchmark.unidad, 'kg');
  assert.ok(r.data.benchmark.rango.p50 > 1 && r.data.benchmark.rango.p50 < 3);
  assert.match(r.data.benchmark.nota, /datos de ejemplo/);
  // El intermediario lo ve en su lista, marcado como reportado por el portal.
  const lista = (await norte.get('/material?estado=REPORTADO')).data;
  assert.equal(lista.length, 1);
  assert.equal(lista[0].reportadoVia, 'PORTAL');
  assert.equal(lista[0].proveedor, 'Plásticos Ganoza SAC');
});

test('reporte: un plástico sin subtipo pide revisión y las validaciones rechazan datos absurdos', async () => {
  const r = await anonimo.post(`/captacion/${provA.tokenCaptacion}/reporte`, { descripcion: 'Plástico de la planta, no sé qué tipo es', cantidad: 2, unidad: 'ton' });
  assert.equal(r.data.categoria.codigo, 'PLASTICO');
  assert.equal(r.data.requiereRevision, true);
  assert.equal((await anonimo.post(`/captacion/${provA.tokenCaptacion}/reporte`, { descripcion: 'ok', cantidad: 2, unidad: 'ton' })).status, 400);
  assert.equal((await anonimo.post(`/captacion/${provA.tokenCaptacion}/reporte`, { descripcion: 'Botellas PET limpias', cantidad: -5, unidad: 'kg' })).status, 400);
  assert.equal((await anonimo.post('/captacion/token-falso/reporte', { descripcion: 'Botellas PET limpias', cantidad: 5, unidad: 'kg' })).status, 404);
});

test('estado: cada proveedor ve solo sus reportes y lo que el intermediario ofreció', async () => {
  await anonimo.post(`/captacion/${provB.tokenCaptacion}/reporte`, { descripcion: 'Latas de aluminio recolectadas', categoriaCodigo: 'OTROS', cantidad: 120, unidad: 'kg', precioEsperado: 5 });
  const propios = (await api(`/captacion/${provA.tokenCaptacion}/estado`)).data;
  assert.equal(propios.length, 2);
  assert.ok(propios.every((l: { titulo: string }) => !l.titulo.includes('aluminio')), 'no se ven los reportes de otro proveedor');
  // El intermediario cotiza y el proveedor lo ve.
  const id = propios.find((l: { titulo: string }) => /PET|Botellas/i.test(l.titulo)).id;
  await norte.post(`/material/${id}/cotizar`, { precioOfrecido: 1.45 });
  const despues = (await api(`/captacion/${provA.tokenCaptacion}/estado`)).data.find((l: { id: string }) => l.id === id);
  assert.equal(despues.estado, 'COTIZADO');
  assert.equal(despues.precioOfrecido, 1.45);
  const claves = Object.keys(despues).sort();
  assert.deepEqual(claves, ['categoria', 'cantidad', 'estado', 'etiquetaEstado', 'fecha', 'id', 'imagenes', 'precioEsperado', 'precioFinal', 'precioOfrecido', 'titulo', 'unidad'].sort(), 'solo datos del propio proveedor');
});

test('benchmark por enlace: el proveedor consulta el rango sin tener cuenta', async () => {
  const r = await api(`/captacion/${provA.tokenCaptacion}/benchmark?categoria=PLASTICO_PEAD&cantidad=500&unidad=kg`);
  assert.equal(r.status, 200);
  assert.equal(r.data.categoria.codigo, 'PLASTICO_PEAD');
  assert.ok(r.data.rango.p25 < r.data.rango.p75);
  assert.equal((await api(`/captacion/falso/benchmark?categoria=PLASTICO_PEAD&cantidad=500&unidad=kg`)).status, 404);
});

test('fotos: el proveedor adjunta una imagen por el portal y el intermediario la ve; no se aceptan otros formatos', async () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const subir = async (nombre: string, tipo: string, token = provA.tokenCaptacion) => {
    const fd = new FormData();
    fd.append('file', new Blob([png], { type: tipo }), nombre);
    const res = await fetch(`${base}/api/captacion/${token}/fotos`, { method: 'POST', body: fd });
    return { status: res.status, data: await res.json() };
  };
  const ok = await subir('foto.png', 'image/png');
  assert.equal(ok.status, 201);
  assert.match(ok.data.url, /^\/api\/uploads\//);
  assert.equal((await subir('virus.exe', 'application/octet-stream')).status, 400);
  assert.equal((await subir('foto.png', 'image/png', 'falso')).status, 404);
  const r = await anonimo.post(`/captacion/${provA.tokenCaptacion}/reporte`, { descripcion: 'Film stretch usado con foto', cantidad: 300, unidad: 'kg', imagenes: [ok.data.nombre] });
  assert.equal((await norte.get(`/material/${r.data.id}`)).data.imagenes[0], ok.data.url);
});

test('límite de tasa: tras muchos reportes seguidos de un mismo enlace responde 429', async () => {
  reiniciarLimites();
  let ultimo = 0;
  for (let i = 0; i < 22; i++) {
    ultimo = (await anonimo.post(`/captacion/${provB.tokenCaptacion}/reporte`, { descripcion: `Latas de aluminio, remesa ${i}`, categoriaCodigo: 'OTROS', cantidad: 10, unidad: 'kg' })).status;
    if (ultimo === 429) break;
  }
  assert.equal(ultimo, 429);
  reiniciarLimites();
});

test('panel: el resumen cuenta material por estado y el semáforo de precios', async () => {
  const r = (await norte.get('/material/resumen')).data;
  assert.equal(r.proveedoresActivos, 2);
  assert.ok(r.porEstado.REPORTADO >= 3);
  assert.equal(r.porEstado.COTIZADO, 1);
  assert.equal(r.suscripcionActiva, false);
  assert.ok(r.ultimos.length > 0 && r.ultimos[0].proveedor);
  assert.equal(r.pctPrecioJusto, 100, 'la única cotización (S/ 1,45/kg) cae dentro del rango de ejemplo');
});
