/**
 * Ilustraciones de «foto de producto» para la demo de intercambio. No hay fotos reales ni generador de imágenes:
 * cada lote recibe 1–3 ilustraciones SVG dibujadas en código (formas planas de 3 tonos —base, luz, sombra—, como los
 * pictogramas de la web), con fondo en degradado del color de la categoría. Sin dependencias; los nombres son estables
 * (`demo-<lote>-<n>.svg`) y se guardan en UPLOADS_DIR, desde donde la API los sirve en /api/uploads/.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { UPLOADS_DIR } from '../common/uploads';

export type Escena = 'pacas' | 'sacos' | 'monton' | 'conchas' | 'rollos' | 'tarimas' | 'bidones' | 'cajas' | 'jabas' | 'fruta' | 'chatarra' | 'marisco' | 'bigbag';

export interface FotoLote {
  escena: Escena;
  /** Color del objeto (hex). */
  obj: string;
  /** Segundo color del objeto (hex), opcional. */
  alt?: string;
  /** Detalle de la escena: film|carton|textil|metal|pet (pacas); mango|limon|mandarina|uva|banano (fruta, cajas); langostino|pota (marisco). */
  tipo?: string;
}

// ---------- Color ----------
const aRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const aHex = (r: number[]) => '#' + r.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mezclar = (a: string, b: string, t: number) => {
  const x = aRgb(a);
  const y = aRgb(b);
  return aHex(x.map((v, i) => v + (y[i] - v) * t));
};
const claro = (c: string, t = 0.32) => mezclar(c, '#FFFFFF', t);
const oscuro = (c: string, t = 0.3) => mezclar(c, '#101828', t);

// ---------- Azar determinista ----------
function semillaDe(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return h >>> 0;
}
function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Ctx {
  r: () => number;
  id: () => string;
  f: FotoLote;
  v: number;
  fondo: string;
}
const ru = (ctx: Ctx, a: number, b: number) => a + (b - a) * ctx.r();
const GROUND = 495;
const MADERA = '#C99A63';
const KRAFT = '#C8A06B';

// ---------- Primitivas ----------
const sombra = (cx: number, cy: number, rx: number, ry = rx * 0.14, op = 0.24) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#101828" opacity="${op}"/>`;

/** Caja en 3D simple: frente, tapa clara y costado oscuro. (x,y) es la esquina superior izquierda del frente. */
function bloque(x: number, y: number, w: number, h: number, d: number, c: string, extra = '') {
  const dy = d * 0.55;
  return `<g><polygon points="${x + w},${y} ${x + w + d},${y - dy} ${x + w + d},${y + h - dy} ${x + w},${y + h}" fill="${oscuro(c)}"/><polygon points="${x},${y} ${x + d},${y - dy} ${x + w + d},${y - dy} ${x + w},${y}" fill="${claro(c)}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${c}"/>${extra}</g>`;
}

/** Cilindro con tapa elíptica. (cx, yTop) es el centro de la tapa. */
function cilindro(ctx: Ctx, cx: number, yTop: number, rx: number, h: number, c: string, opts: { costillas?: number; tapa?: boolean } = {}) {
  const ry = rx * 0.3;
  const k = ctx.id();
  const cuerpo = `M${cx - rx} ${yTop} L${cx - rx} ${yTop + h} A${rx} ${ry} 0 0 0 ${cx + rx} ${yTop + h} L${cx + rx} ${yTop} Z`;
  let s = `<clipPath id="${k}"><path d="${cuerpo}"/></clipPath><path d="${cuerpo}" fill="${c}"/>`;
  s += `<g clip-path="url(#${k})"><rect x="${cx - rx * 0.66}" y="${yTop}" width="${rx * 0.22}" height="${h + ry}" fill="${claro(c, 0.55)}" opacity=".5"/><rect x="${cx + rx * 0.42}" y="${yTop}" width="${rx * 0.6}" height="${h + ry}" fill="${oscuro(c)}" opacity=".42"/>`;
  const n = opts.costillas ?? 0;
  for (let i = 1; i <= n; i++) {
    const y = yTop + (h * i) / (n + 1);
    s += `<path d="M${cx - rx} ${y} A${rx} ${ry} 0 0 0 ${cx + rx} ${y}" fill="none" stroke="${oscuro(c, 0.45)}" stroke-width="5" opacity=".55"/>`;
  }
  s += `</g>`;
  if (opts.tapa !== false) s += `<ellipse cx="${cx}" cy="${yTop}" rx="${rx}" ry="${ry}" fill="${claro(c, 0.38)}"/><ellipse cx="${cx}" cy="${yTop}" rx="${rx * 0.78}" ry="${ry * 0.78}" fill="${c}"/>`;
  return s;
}

/** Montón de material a granel. */
function mont(ctx: Ctx, cx: number, b: number, w: number, h: number, c: string, motas = 80) {
  const path = `M${cx - w / 2} ${b} C${cx - w * 0.38} ${b - h * 0.15} ${cx - w * 0.22} ${b - h} ${cx} ${b - h} C${cx + w * 0.22} ${b - h} ${cx + w * 0.38} ${b - h * 0.15} ${cx + w / 2} ${b} Q${cx} ${b + h * 0.09} ${cx - w / 2} ${b}Z`;
  let s = sombra(cx + w * 0.04, b + h * 0.04, w * 0.58, h * 0.1, 0.22);
  s += `<path d="${path}" fill="${c}"/>`;
  s += `<path d="M${cx + w * 0.06} ${b - h * 0.98} C${cx + w * 0.24} ${b - h * 0.9} ${cx + w * 0.38} ${b - h * 0.15} ${cx + w / 2} ${b} Q${cx + w * 0.1} ${b + h * 0.08} ${cx - w * 0.1} ${b + h * 0.05} C${cx + w * 0.1} ${b - h * 0.3} ${cx + w * 0.12} ${b - h * 0.7} ${cx + w * 0.06} ${b - h * 0.98}Z" fill="${oscuro(c)}" opacity=".45"/>`;
  s += `<path d="M${cx - w * 0.3} ${b - h * 0.3} C${cx - w * 0.22} ${b - h * 0.65} ${cx - w * 0.12} ${b - h * 0.88} ${cx - w * 0.02} ${b - h * 0.95}" stroke="${claro(c, 0.55)}" stroke-width="${Math.max(4, h * 0.05)}" fill="none" stroke-linecap="round" opacity=".5"/>`;
  for (let i = 0; i < motas; i++) {
    const t = Math.pow(ctx.r(), 1.4) * 0.92;
    const hw = (w / 2) * Math.pow(1 - t, 0.78) * 0.92;
    const x = cx + (ctx.r() * 2 - 1) * hw;
    const y = b - t * h - ctx.r() * 4 + h * 0.02;
    const col = ctx.r() < 0.5 ? claro(c, 0.4) : oscuro(c, 0.38);
    const rr = 2 + ctx.r() * 4.5;
    s += ctx.r() < 0.55 ? `<circle cx="${x}" cy="${y}" r="${rr}" fill="${col}" opacity=".75"/>` : `<rect x="${x}" y="${y}" width="${rr * 2.4}" height="${rr * 1.2}" rx="1.5" fill="${col}" opacity=".75" transform="rotate(${ctx.r() * 90 - 45} ${x} ${y})"/>`;
  }
  return s;
}

/** Tarima de madera (vista frontal). */
function tarima(x: number, y: number, w: number, c = MADERA) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="13" rx="2" fill="${c}"/><rect x="${x}" y="${y + 9}" width="${w}" height="4" fill="${oscuro(c)}" opacity=".45"/>`;
  for (let i = 1; i < 6; i++) s += `<line x1="${x + (w * i) / 6}" y1="${y + 1}" x2="${x + (w * i) / 6}" y2="${y + 12}" stroke="${oscuro(c)}" stroke-width="1.6" opacity=".4"/>`;
  for (const bx of [x + 6, x + w / 2 - 15, x + w - 36]) s += `<rect x="${bx}" y="${y + 13}" width="30" height="36" fill="${oscuro(c, 0.12)}"/><rect x="${bx + 22}" y="${y + 13}" width="8" height="36" fill="${oscuro(c, 0.38)}" opacity=".6"/>`;
  s += `<rect x="${x}" y="${y + 49}" width="${w}" height="12" rx="2" fill="${c}"/><rect x="${x}" y="${y + 57}" width="${w}" height="4" fill="${oscuro(c)}" opacity=".45"/>`;
  return s;
}

/** Valva de concha de abanico con (cx,cy) en la charnela. */
function valva(cx: number, cy: number, r: number, rot: number, c: string) {
  const ext = `M0 0 L${-r * 0.95} ${-r * 0.55} A${r} ${r} 0 0 1 ${r * 0.95} ${-r * 0.55} Z`;
  let s = `<g transform="translate(${cx} ${cy}) rotate(${rot})"><path d="${ext}" fill="${c}"/><path d="M0 0 L${r * 0.1} ${-r * 0.55} L${r * 0.95} ${-r * 0.55} A${r} ${r} 0 0 1 ${r * 0.62} ${-r * 0.8} Z" fill="${oscuro(c, 0.22)}" opacity=".5"/>`;
  const cc = -0.238 * r;
  for (let k = -4; k <= 4; k++) {
    const a = (k / 4) * 1.253;
    s += `<line x1="0" y1="0" x2="${Math.sin(a) * r * 0.97}" y2="${cc - Math.cos(a) * r * 0.97}" stroke="${oscuro(c, 0.4)}" stroke-width="${Math.max(1.4, r * 0.05)}" opacity=".5"/>`;
  }
  s += `<path d="M${-r * 0.5} ${-r * 0.28} Q${-r * 0.3} ${-r * 0.78} ${-r * 0.05} ${-r * 0.85}" fill="none" stroke="${claro(c, 0.6)}" stroke-width="${Math.max(2, r * 0.09)}" stroke-linecap="round" opacity=".55"/><rect x="${-r * 0.2}" y="${-r * 0.1}" width="${r * 0.4}" height="${r * 0.16}" rx="2" fill="${oscuro(c, 0.3)}"/></g>`;
  return s;
}

/** Fruta redonda de 3 tonos. */
function fruto(tipo: string, cx: number, cy: number, r: number, ctx: Ctx) {
  const base = ({ mango: '#F2A93B', limon: '#9BD43B', mandarina: '#FF9A1F', uva: '#6B3FA0' } as Record<string, string>)[tipo] ?? '#F2A93B';
  const rx = tipo === 'mango' ? r * 1.12 : tipo === 'uva' ? r * 0.8 : r;
  const ry = tipo === 'mango' ? r * 0.92 : tipo === 'uva' ? r * 0.8 : r * (tipo === 'limon' ? 0.9 : 1);
  const rot = tipo === 'mango' ? ctx.r() * 50 - 25 : 0;
  let s = `<g transform="rotate(${rot} ${cx} ${cy})"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${oscuro(base, 0.32)}"/><ellipse cx="${cx - rx * 0.08}" cy="${cy - ry * 0.1}" rx="${rx * 0.92}" ry="${ry * 0.92}" fill="${base}"/>`;
  if (tipo === 'mango') s += `<ellipse cx="${cx + rx * 0.35}" cy="${cy - ry * 0.1}" rx="${rx * 0.45}" ry="${ry * 0.7}" fill="#E5502D" opacity=".6"/>`;
  s += `<ellipse cx="${cx - rx * 0.35}" cy="${cy - ry * 0.4}" rx="${rx * 0.28}" ry="${ry * 0.16}" fill="#FFFFFF" opacity=".5" transform="rotate(-30 ${cx - rx * 0.35} ${cy - ry * 0.4})"/>`;
  if (tipo !== 'uva') s += `<circle cx="${cx - rx * 0.05}" cy="${cy - ry * 0.9}" r="${Math.max(2, r * 0.1)}" fill="#4B7A1F"/>`;
  return s + '</g>';
}

function bananos(ctx: Ctx, cx: number, cy: number, s: number, rot: number) {
  let g = `<g transform="translate(${cx} ${cy}) rotate(${rot})">`;
  for (let k = -2; k <= 2; k++) {
    const d = `M${k * 13} 0 Q${k * 24} ${-s * 0.55} ${k * 8} ${-s}`;
    g += `<path d="${d}" fill="none" stroke="#C99A12" stroke-width="24" stroke-linecap="round" transform="translate(5 3)"/><path d="${d}" fill="none" stroke="#F2C81F" stroke-width="22" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#FFE680" stroke-width="5" stroke-linecap="round" transform="translate(-6 0)" opacity=".7"/><circle cx="${k * 8}" cy="${-s - 2}" r="4" fill="#5C3A18"/>`;
  }
  return g + `<rect x="-24" y="-6" width="48" height="16" rx="6" fill="#6B8F2A"/><rect x="-16" y="4" width="32" height="12" rx="4" fill="#4F6E1E"/></g>`;
}

/** Camión de carga (vista lateral). El cajón queda en [x+0, x+w]. */
function camion(x: number, b: number, w: number) {
  const hCaj = 120;
  const yCaj = b - 55 - hCaj;
  const marino = '#2459D6';
  let s = sombra(x + w / 2 + 40, b + 4, w * 0.6, 12, 0.22);
  s += `<rect x="${x}" y="${yCaj}" width="${w}" height="${hCaj}" rx="8" fill="${marino}"/><rect x="${x}" y="${yCaj + hCaj - 28}" width="${w}" height="28" fill="${oscuro(marino)}" opacity=".5"/><rect x="${x + 14}" y="${yCaj + 14}" width="${w * 0.4}" height="10" rx="5" fill="#FFFFFF" opacity=".35"/>`;
  s += `<rect x="${x - 10}" y="${b - 62}" width="${w + 150}" height="20" rx="6" fill="#1D2B4A"/>`;
  const cx = x + w + 6;
  s += `<path d="M${cx} ${b - 62} L${cx} ${yCaj + 10} L${cx + 70} ${yCaj + 10} L${cx + 130} ${b - 120} L${cx + 138} ${b - 62} Z" fill="#E87500"/><path d="M${cx + 70} ${yCaj + 10} L${cx + 130} ${b - 120} L${cx + 138} ${b - 62} L${cx + 100} ${b - 62} Z" fill="${oscuro('#E87500')}" opacity=".4"/><path d="M${cx + 14} ${yCaj + 24} L${cx + 62} ${yCaj + 24} L${cx + 104} ${b - 122} L${cx + 14} ${b - 122} Z" fill="#CFE4FF"/>`;
  for (const wx of [x + 70, x + w - 90, cx + 90]) s += `<circle cx="${wx}" cy="${b - 32}" r="34" fill="#1B1F2B"/><circle cx="${wx}" cy="${b - 32}" r="17" fill="#B8C2D1"/><circle cx="${wx}" cy="${b - 32}" r="6" fill="#6B7587"/>`;
  return s;
}

function sacoForma(ctx: Ctx, c: string, cx: number, b: number, w: number, h: number, etiqueta: string | null, malla = false) {
  const cuerpo = `M${cx - w * 0.46} ${b} Q${cx - w * 0.5} ${b - h * 0.5} ${cx - w * 0.44} ${b - h * 0.9} L${cx - w * 0.36} ${b - h} L${cx + w * 0.36} ${b - h} L${cx + w * 0.44} ${b - h * 0.9} Q${cx + w * 0.5} ${b - h * 0.5} ${cx + w * 0.46} ${b} Q${cx} ${b + h * 0.07} ${cx - w * 0.46} ${b}Z`;
  let s = `<path d="${cuerpo}" fill="${c}"/>`;
  s += `<path d="M${cx + w * 0.16} ${b - h * 0.98} Q${cx + w * 0.34} ${b - h * 0.5} ${cx + w * 0.22} ${b + h * 0.04} L${cx + w * 0.46} ${b} Q${cx + w * 0.62} ${b - h * 0.5} ${cx + w * 0.38} ${b - h * 0.86} L${cx + w * 0.2} ${b - h}Z" fill="${oscuro(c)}" opacity=".42"/>`;
  s += `<path d="M${cx - w * 0.33} ${b - h * 0.8} Q${cx - w * 0.5} ${b - h * 0.5} ${cx - w * 0.36} ${b - h * 0.1}" fill="none" stroke="${claro(c, 0.6)}" stroke-width="${w * 0.06}" stroke-linecap="round" opacity=".5"/>`;
  for (let k = 1; k < 8; k++) s += `<line x1="${cx - w * 0.42}" y1="${b - (h * k) / 8}" x2="${cx + w * 0.42}" y2="${b - (h * k) / 8}" stroke="${oscuro(c)}" stroke-width="1.5" opacity="${malla ? 0.32 : 0.12}"/>`;
  if (malla) for (let k = 1; k < 8; k++) s += `<line x1="${cx - w * 0.46 + (w * 0.92 * k) / 8}" y1="${b - h * 0.95}" x2="${cx - w * 0.46 + (w * 0.92 * k) / 8}" y2="${b}" stroke="${oscuro(c)}" stroke-width="1.5" opacity=".28"/>`;
  s += `<rect x="${cx - w * 0.36}" y="${b - h - 5}" width="${w * 0.72}" height="${h * 0.07}" rx="4" fill="${oscuro(c, 0.45)}"/>`;
  if (etiqueta) s += `<rect x="${cx - w * 0.21}" y="${b - h * 0.62}" width="${w * 0.42}" height="${h * 0.26}" rx="5" fill="#FFFFFF" opacity=".92"/><rect x="${cx - w * 0.16}" y="${b - h * 0.57}" width="${w * 0.32}" height="${h * 0.045}" rx="2" fill="${etiqueta}"/><rect x="${cx - w * 0.16}" y="${b - h * 0.49}" width="${w * 0.22}" height="${h * 0.035}" rx="2" fill="${etiqueta}" opacity=".6"/>`;
  return s;
}

// ---------- Escenas ----------
function paca(ctx: Ctx, c: string, x: number, y: number, w: number, h: number, d: number) {
  const r = ctx.r;
  const t = ctx.f.tipo;
  let ex = '';
  if (t === 'carton') {
    for (let yy = y + 10; yy < y + h - 4; yy += 12) ex += `<line x1="${x + 4}" y1="${yy}" x2="${x + w - 4}" y2="${yy}" stroke="${oscuro(c)}" stroke-width="2" opacity=".3"/>`;
  } else if (t === 'film') {
    for (let i = 0; i < 8; i++) ex += `<path d="M${x + w * (0.06 + 0.8 * r())} ${y + h * (0.08 + 0.8 * r())} q ${20 + r() * 30} ${-10 - r() * 14} ${40 + r() * 40} ${r() * 10 - 5}" fill="none" stroke="${claro(c, 0.75)}" stroke-width="${3 + r() * 3}" stroke-linecap="round" opacity=".6"/>`;
  } else if (t === 'textil') {
    const cols = [claro(c, 0.5), oscuro(c, 0.3), '#F7E3EF', '#8FB5E8', '#F2C46B'];
    for (let i = 0; i < 24; i++) ex += `<rect x="${x + 4 + (w - 40) * r()}" y="${y + 4 + (h - 24) * r()}" width="${10 + r() * 24}" height="${6 + r() * 10}" rx="2" fill="${cols[i % cols.length]}" opacity=".8" transform="rotate(${r() * 40 - 20} ${x + w / 2} ${y + h / 2})"/>`;
  } else if (t === 'metal') {
    for (let yy = y + 18; yy < y + h - 8; yy += 30) for (let xx = x + 20; xx < x + w - 10; xx += 30) ex += `<circle cx="${xx}" cy="${yy}" r="11" fill="${claro(c, 0.5)}"/><circle cx="${xx}" cy="${yy}" r="5" fill="${oscuro(c, 0.45)}"/>`;
  } else if (t === 'pet') {
    for (let i = 0; i < 20; i++) ex += `<rect x="${x + 6 + (w - 30) * r()}" y="${y + 6 + (h - 40) * r()}" width="${9 + r() * 4}" height="${24 + r() * 12}" rx="5" fill="${i % 2 ? '#DDF3F6' : claro(c, 0.5)}" opacity=".7" transform="rotate(${r() * 80 - 40} ${x + w / 2} ${y + h / 2})"/>`;
  }
  for (const f of [0.2, 0.5, 0.8]) ex += `<rect x="${x + w * f - 3}" y="${y}" width="6" height="${h}" fill="${oscuro(c, 0.55)}" opacity=".55"/>`;
  return bloque(x, y, w, h, d, c, ex);
}
function pacas(ctx: Ctx): string {
  const c = ctx.f.obj;
  const v = (k: number) => mezclar(c, k % 2 ? '#FFFFFF' : '#101828', 0.05 + 0.04 * ctx.r());
  let s = sombra(400, GROUND + 8, 380, 26, 0.26);
  if (ctx.v === 0) {
    const w = 190, h = 108, d = 46, gap = 10;
    [3, 2, 1].forEach((n, ri) => {
      const y = GROUND - (ri + 1) * h;
      const x0 = 400 - (n * w + (n - 1) * gap) / 2 - d / 2;
      for (let i = 0; i < n; i++) s += paca(ctx, v(i + ri), x0 + i * (w + gap), y, w, h, d);
    });
  } else if (ctx.v === 1) {
    s += tarima(95, GROUND - 28, 640, MADERA);
    s += paca(ctx, c, 110, GROUND - 228, 300, 200, 60);
    s += paca(ctx, v(1), 440, GROUND - 228, 270, 200, 60);
    s += paca(ctx, v(2), 470, GROUND - 228 - 96, 200, 96, 46);
  } else {
    const hz = mezclar(c, ctx.fondo, 0.3);
    for (let i = 0; i < 4; i++) s += paca(ctx, hz, 120 + i * 150, GROUND - 175, 130, 75, 32);
    for (let i = 0; i < 3; i++) s += paca(ctx, v(i), 90 + i * 215, GROUND - 120, 200, 115, 48);
  }
  return s;
}

function sacos(ctx: Ctx): string {
  const c = ctx.f.obj;
  const e = ctx.f.alt ?? '#2459D6';
  let s = sombra(400, GROUND + 8, 360, 24, 0.26);
  if (ctx.v === 0) {
    for (let i = 0; i < 3; i++) s += sacoForma(ctx, mezclar(c, '#FFFFFF', 0.04 * i), 235 + i * 165, GROUND, 175, 175, e);
    for (let i = 0; i < 2; i++) s += sacoForma(ctx, c, 318 + i * 165, GROUND - 95, 175, 175, e);
    s += sacoForma(ctx, claro(c, 0.06), 400, GROUND - 190, 175, 175, e);
  } else if (ctx.v === 1) {
    s += mont(ctx, 200, GROUND, 340, 170, ctx.f.alt ?? claro(c, 0.2), 90);
    for (let i = 0; i < 3; i++) s += sacoForma(ctx, c, 440 + i * 130, GROUND + (i % 2) * 6, 190, 250, e);
  } else {
    s += tarima(120, GROUND - 26, 560, MADERA);
    for (let i = 0; i < 4; i++) s += sacoForma(ctx, c, 215 + i * 123, GROUND - 28, 160, 150, e);
    for (let i = 0; i < 3; i++) s += sacoForma(ctx, claro(c, 0.05), 277 + i * 123, GROUND - 28 - 82, 160, 150, e);
  }
  return s;
}

function montones(ctx: Ctx): string {
  const c = ctx.f.obj;
  const c2 = ctx.f.alt ?? claro(c, 0.18);
  let s = '';
  if (ctx.v === 0) {
    s += mont(ctx, 150, GROUND, 230, 120, c2, 40);
    s += mont(ctx, 665, GROUND, 250, 150, c2, 50);
    s += mont(ctx, 400, GROUND + 6, 540, 270, c, 130);
  } else if (ctx.v === 1) {
    s += camion(70, GROUND, 400);
    s += mont(ctx, 270, GROUND - 175, 330, 120, c, 70);
    s += `<rect x="70" y="${GROUND - 175}" width="400" height="120" rx="8" fill="#2459D6"/><rect x="70" y="${GROUND - 87}" width="400" height="32" fill="${oscuro('#2459D6')}" opacity=".5"/><rect x="84" y="${GROUND - 161}" width="160" height="10" rx="5" fill="#FFFFFF" opacity=".35"/>`;
    s += mont(ctx, 690, GROUND + 4, 190, 90, c2, 40);
  } else {
    s += `<rect x="60" y="${GROUND - 210}" width="680" height="210" fill="${mezclar(ctx.fondo, '#8B93A3', 0.35)}"/>`;
    for (let i = 1; i < 8; i++) s += `<line x1="${60 + i * 85}" y1="${GROUND - 210}" x2="${60 + i * 85}" y2="${GROUND}" stroke="#101828" stroke-width="3" opacity=".12"/>`;
    s += `<rect x="60" y="${GROUND - 222}" width="680" height="16" fill="#8B93A3"/>`;
    s += mont(ctx, 360, GROUND + 6, 560, 260, c, 140);
    s += mont(ctx, 650, GROUND + 6, 200, 110, c2, 40);
  }
  return s;
}

function conchas(ctx: Ctx): string {
  const c = ctx.f.obj;
  const tonos = [c, claro(c, 0.28), ctx.f.alt ?? oscuro(c, 0.12), claro(c, 0.12)];
  const pila = (cx: number, b: number, w: number, h: number, n: number, rMin: number, rMax: number) => {
    const piezas: { x: number; y: number; r: number; rot: number; col: string }[] = [];
    for (let i = 0; i < n; i++) {
      const t = Math.pow(ctx.r(), 1.3) * 0.9;
      const hw = (w / 2) * Math.pow(1 - t, 0.8);
      piezas.push({ x: cx + (ctx.r() * 2 - 1) * hw, y: b - t * h, r: rMin + ctx.r() * (rMax - rMin), rot: ctx.r() * 300 - 150, col: tonos[Math.floor(ctx.r() * tonos.length)] });
    }
    return piezas.sort((a, b2) => a.y - b2.y).map((p) => valva(p.x, p.y + p.r * 0.5, p.r, p.rot, p.col)).join('');
  };
  let s = sombra(400, GROUND + 8, 380, 24, 0.26);
  if (ctx.v === 0) {
    s += `<path d="M120 ${GROUND} Q400 ${GROUND - 330} 680 ${GROUND} Z" fill="${oscuro(c, 0.45)}" opacity=".5"/>`;
    s += pila(400, GROUND - 8, 600, 310, 110, 24, 40);
  } else if (ctx.v === 1) {
    for (let i = 0; i < 3; i++) s += sacoForma(ctx, '#D9C9A3', 205 + i * 175, GROUND, 190, 230, null, true);
    s += pila(380, GROUND - 190, 480, 60, 26, 20, 28);
    for (let i = 0; i < 9; i++) s += valva(110 + i * 80 + ctx.r() * 20, GROUND + 6 + ctx.r() * 16, 20 + ctx.r() * 12, ctx.r() * 360 - 180, tonos[i % 4]);
  } else {
    s += `<rect x="150" y="${GROUND - 190}" width="500" height="190" fill="${oscuro(MADERA, 0.5)}"/>`;
    s += pila(400, GROUND - 40, 470, 190, 80, 24, 36);
    s += `<rect x="130" y="${GROUND - 120}" width="540" height="120" rx="6" fill="${MADERA}"/><rect x="130" y="${GROUND - 40}" width="540" height="40" fill="${oscuro(MADERA)}" opacity=".35"/>`;
    for (const y of [GROUND - 84, GROUND - 42]) s += `<rect x="130" y="${y}" width="540" height="6" fill="${oscuro(MADERA, 0.5)}" opacity=".5"/>`;
    for (const x of [130, 640]) s += `<rect x="${x}" y="${GROUND - 190}" width="30" height="190" rx="4" fill="${oscuro(MADERA, 0.12)}"/>`;
  }
  return s;
}

function rollo(ctx: Ctx, c: string, cx: number, yTop: number, rx: number, h: number) {
  let s = cilindro(ctx, cx, yTop, rx, h, c, { tapa: false });
  const ry = rx * 0.3;
  s += `<ellipse cx="${cx}" cy="${yTop}" rx="${rx}" ry="${ry}" fill="${claro(c, 0.4)}"/>`;
  for (const k of [0.74, 0.5, 0.26]) s += `<ellipse cx="${cx}" cy="${yTop}" rx="${rx * k}" ry="${ry * k}" fill="none" stroke="${oscuro(c, 0.3)}" stroke-width="2.4" opacity=".55"/>`;
  s += `<ellipse cx="${cx}" cy="${yTop}" rx="${rx * 0.14}" ry="${ry * 0.14}" fill="${KRAFT}"/>`;
  for (let i = 0; i < 7; i++) s += `<line x1="${cx - rx + 6 + ((rx * 2 - 12) * i) / 6}" y1="${yTop + ry}" x2="${cx - rx + 6 + ((rx * 2 - 12) * i) / 6}" y2="${yTop + h}" stroke="${oscuro(c)}" stroke-width="1.3" opacity=".14"/>`;
  return s;
}
function rollos(ctx: Ctx): string {
  const c = ctx.f.obj;
  const cols = [c, ctx.f.alt ?? claro(c, 0.3), oscuro(c, 0.15), claro(c, 0.55), mezclar(c, '#2459D6', 0.4)];
  let s = sombra(400, GROUND + 8, 360, 24, 0.26);
  if (ctx.v === 0) {
    const hs = [215, 255, 235, 200];
    for (let i = 0; i < 4; i++) s += rollo(ctx, cols[i], 160 + i * 160, GROUND - hs[i], 72, hs[i] - 22);
  } else if (ctx.v === 1) {
    [4, 3, 2].forEach((n, ri) => {
      for (let i = 0; i < n; i++) {
        const cx = 400 + (i - (n - 1) / 2) * 135;
        const cy = GROUND - 66 - ri * 118;
        const col = cols[(i + ri) % cols.length];
        s += `<circle cx="${cx + 4}" cy="${cy + 5}" r="66" fill="${oscuro(col)}"/><circle cx="${cx}" cy="${cy}" r="66" fill="${col}"/><circle cx="${cx}" cy="${cy}" r="47" fill="none" stroke="${oscuro(col, 0.3)}" stroke-width="3" opacity=".5"/><circle cx="${cx}" cy="${cy}" r="29" fill="none" stroke="${oscuro(col, 0.3)}" stroke-width="3" opacity=".5"/><circle cx="${cx}" cy="${cy}" r="14" fill="${KRAFT}"/><circle cx="${cx}" cy="${cy}" r="8" fill="${oscuro(KRAFT, 0.45)}"/><path d="M${cx - 50} ${cy - 30} A58 58 0 0 1 ${cx - 12} ${cy - 56}" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity=".4"/>`;
      }
    });
  } else {
    for (let i = 0; i < 8; i++) {
      const col = cols[i % cols.length];
      const w = 330 - (i % 3) * 14;
      s += `<rect x="${150 + (i % 2) * 8}" y="${GROUND - 40 - i * 36}" width="${w}" height="38" rx="12" fill="${col}"/><rect x="${150 + (i % 2) * 8}" y="${GROUND - 14 - i * 36}" width="${w}" height="12" rx="6" fill="${oscuro(col)}" opacity=".45"/><path d="M${160 + (i % 2) * 8} ${GROUND - 32 - i * 36} h${w * 0.6}" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity=".35"/>`;
    }
    s += paca({ ...ctx, f: { ...ctx.f, tipo: 'textil' } }, c, 540, GROUND - 190, 190, 190, 48);
  }
  return s;
}

function tarimas(ctx: Ctx): string {
  const c = ctx.f.obj;
  let s = sombra(400, GROUND + 8, 360, 22, 0.26);
  const pila = (x: number, n: number, w: number) => {
    let g = '';
    for (let i = 0; i < n; i++) g += tarima(x + ((i * 7) % 11) - 5, GROUND - (i + 1) * 62, w, i % 3 === 1 ? claro(c, 0.08) : i % 3 === 2 ? oscuro(c, 0.06) : c);
    return g;
  };
  if (ctx.v === 0) s += pila(210, 6, 380);
  else if (ctx.v === 1) {
    s += pila(60, 5, 330) + pila(430, 3, 330);
    s += `<g transform="rotate(-72 760 ${GROUND})">${tarima(560, GROUND - 62, 200, c)}</g>`;
  } else {
    s += pila(40, 3, 230) + pila(285, 4, 230) + pila(530, 2, 230);
  }
  return s;
}

function jerrycan(ctx: Ctx, c: string, x: number, y: number, w: number, h: number) {
  let s = `<path d="M${x + 10} ${y + 30} L${x + w * 0.35} ${y} L${x + w - 8} ${y} Q${x + w} ${y} ${x + w} ${y + 10} L${x + w} ${y + h - 8} Q${x + w} ${y + h} ${x + w - 8} ${y + h} L${x + 10} ${y + h} Q${x} ${y + h} ${x} ${y + h - 8} L${x} ${y + 40} Q${x} ${y + 30} ${x + 10} ${y + 30}Z" fill="${c}"/>`;
  s += `<path d="M${x + w * 0.62} ${y + 4} L${x + w - 8} ${y + 4} Q${x + w - 3} ${y + 4} ${x + w - 3} ${y + 12} L${x + w - 3} ${y + h - 6} L${x + w * 0.62} ${y + h - 6}Z" fill="${oscuro(c)}" opacity=".4"/>`;
  s += `<rect x="${x + 10}" y="${y + 40}" width="${w * 0.1}" height="${h - 56}" rx="3" fill="${claro(c, 0.6)}" opacity=".5"/>`;
  s += `<rect x="${x + w * 0.42}" y="${y + 14}" width="${w * 0.3}" height="${h * 0.12}" rx="6" fill="${oscuro(c, 0.5)}"/><rect x="${x + w * 0.1}" y="${y - 7}" width="${w * 0.2}" height="12" rx="3" fill="${oscuro(c, 0.2)}"/>`;
  s += `<rect x="${x + 12}" y="${y + h * 0.5}" width="${w - 24}" height="${h * 0.26}" rx="4" fill="#FFFFFF" opacity=".88"/><rect x="${x + 20}" y="${y + h * 0.56}" width="${w * 0.5}" height="5" rx="2" fill="${oscuro(c, 0.2)}"/>`;
  return s;
}
function bidones(ctx: Ctx): string {
  const c = ctx.f.obj;
  const tapaBidon = (cx: number, yTop: number, rx: number) => `<circle cx="${cx - rx * 0.35}" cy="${yTop}" r="${rx * 0.1}" fill="${oscuro(c, 0.5)}"/><circle cx="${cx + rx * 0.3}" cy="${yTop + rx * 0.03}" r="${rx * 0.07}" fill="${oscuro(c, 0.5)}"/>`;
  let s = sombra(400, GROUND + 8, 370, 24, 0.26);
  if (ctx.v === 0) {
    const hs = [240, 270, 240];
    for (let i = 0; i < 3; i++) {
      const rx = 92;
      const cx = 215 + i * 185;
      s += cilindro(ctx, cx, GROUND - hs[i], rx, hs[i] - 10, i === 1 ? ctx.f.alt ?? c : c, { costillas: 2 }) + tapaBidon(cx, GROUND - hs[i], rx);
    }
  } else if (ctx.v === 1) {
    for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) s += jerrycan(ctx, mezclar(c, '#FFFFFF', 0.04 * (i % 2)), 120 + i * 140 + r * 40, GROUND - 160 - r * 150, 125, 150);
  } else {
    s += tarima(120, GROUND - 26, 460, MADERA);
    for (const [cx, dy] of [[210, 0], [350, 0], [490, 0]] as [number, number][]) s += cilindro(ctx, cx, GROUND - 28 - 200 + dy, 66, 190, c, { costillas: 2 }) + tapaBidon(cx, GROUND - 28 - 200 + dy, 66);
    s += `<g transform="translate(560 ${GROUND - 120})"><rect x="0" y="0" width="220" height="104" rx="10" fill="${c}"/><rect x="150" y="0" width="70" height="104" fill="${oscuro(c)}" opacity=".42"/><rect x="0" y="6" width="220" height="14" fill="${claro(c, 0.55)}" opacity=".4"/><rect x="60" y="0" width="10" height="104" fill="${oscuro(c, 0.45)}" opacity=".55"/><rect x="150" y="0" width="10" height="104" fill="${oscuro(c, 0.45)}" opacity=".55"/><ellipse cx="0" cy="52" rx="32" ry="52" fill="${claro(c, 0.3)}"/><ellipse cx="0" cy="52" rx="24" ry="42" fill="${c}"/></g>`;
  }
  return s;
}

function cajaMadera(x: number, y: number, w: number, h: number) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${MADERA}"/><rect x="${x}" y="${y + h - h * 0.3}" width="${w}" height="${h * 0.3}" fill="${oscuro(MADERA)}" opacity=".3"/>`;
  for (let k = 1; k < 3; k++) s += `<rect x="${x}" y="${y + (h * k) / 3 - 2}" width="${w}" height="4" fill="${oscuro(MADERA, 0.5)}" opacity=".55"/>`;
  for (const px of [x, x + w - 16]) s += `<rect x="${px}" y="${y}" width="16" height="${h}" rx="3" fill="${oscuro(MADERA, 0.15)}"/>`;
  s += `<rect x="${x + 4}" y="${y + 3}" width="${w - 8}" height="6" rx="3" fill="${claro(MADERA, 0.5)}" opacity=".6"/>`;
  return s;
}
function pilaFruta(ctx: Ctx, tipo: string, cx: number, b: number, filas: number[], r: number) {
  let s = '';
  for (let i = filas.length - 1; i >= 0; i--) {
    const n = filas[i];
    for (let k = 0; k < n; k++) {
      const x = cx + (k - (n - 1) / 2) * r * (tipo === 'uva' ? 1.45 : 1.9) + ctx.r() * 4;
      const y = b - i * r * (tipo === 'uva' ? 1.2 : 1.55) + ctx.r() * 3;
      s += tipo === 'banano' ? '' : fruto(tipo, x, y, r * (0.92 + ctx.r() * 0.12), ctx);
    }
  }
  if (tipo === 'banano') for (let i = filas.length - 1; i >= 0; i--) for (let k = 0; k < filas[i]; k++) s += bananos(ctx, cx + (k - (filas[i] - 1) / 2) * r * 2.9, b - i * r * 1.1 + 14, r * 3.1, ctx.r() * 50 - 25);
  return s;
}
function cajas(ctx: Ctx): string {
  const t = ctx.f.tipo ?? 'mango';
  let s = sombra(400, GROUND + 8, 370, 24, 0.26);
  if (ctx.v === 0) {
    for (const x of [120, 410]) s += cajaMadera(x, GROUND - 105, 270, 105);
    s += pilaFruta(ctx, t, 400, GROUND - 225, [5, 4, 2], 27) + cajaMadera(265, GROUND - 210, 270, 105);
  } else if (ctx.v === 1) {
    s += pilaFruta(ctx, t, 400, GROUND - 105, [8, 7, 5, 3], 30) + cajaMadera(130, GROUND - 150, 540, 150);
    for (let i = 0; i < 5; i++) s += t === 'banano' ? '' : fruto(t, 130 + i * 120 + ctx.r() * 30, GROUND + 18, 24, ctx);
  } else {
    [[60, [4, 3, 2]], [300, [4, 2]], [540, [4, 3]]].forEach(([x, filas]) => {
      s += pilaFruta(ctx, t, (x as number) + 100, GROUND - 115, filas as number[], 26) + cajaMadera(x as number, GROUND - 110, 200, 110);
    });
  }
  return s;
}

function jaba(ctx: Ctx, c: string, x: number, y: number, w: number, h: number, d: number) {
  let ex = '';
  const cols = Math.floor((w - 40) / 22);
  for (let r = 0; r < 2; r++) for (let i = 0; i < cols; i++) ex += `<rect x="${x + 20 + i * 22}" y="${y + 24 + r * 22}" width="14" height="12" rx="4" fill="${oscuro(c, 0.6)}" opacity=".85"/>`;
  ex += `<rect x="${x + w * 0.3}" y="${y + 5}" width="${w * 0.4}" height="10" rx="5" fill="${oscuro(c, 0.6)}" opacity=".85"/><rect x="${x + 4}" y="${y + h - 8}" width="${w - 8}" height="5" rx="2" fill="${oscuro(c)}" opacity=".35"/>`;
  return bloque(x, y, w, h, d, c, ex);
}
function jabas(ctx: Ctx): string {
  const c = ctx.f.obj;
  const col = (i: number) => (i % 2 ? c : ctx.f.alt ?? c);
  let s = sombra(400, GROUND + 8, 370, 24, 0.26);
  if (ctx.v === 0) {
    [4, 3, 5].forEach((n, ci) => {
      for (let i = 0; i < n; i++) s += jaba(ctx, col(ci + i), 90 + ci * 230, GROUND - (i + 1) * 74, 160, 72, 42);
    });
  } else if (ctx.v === 1) {
    [4, 3, 2, 1].forEach((n, ri) => {
      for (let i = 0; i < n; i++) s += jaba(ctx, col(ri + i), 400 - (n * 150 + (n - 1) * 6) / 2 - 20 + i * 156, GROUND - (ri + 1) * 76, 150, 74, 40);
    });
  } else {
    for (let i = 0; i < 5; i++) s += jaba(ctx, col(i), 90, GROUND - (i + 1) * 74, 160, 72, 42);
    for (let i = 0; i < 8; i++) {
      const x = 380 + ctx.r() * 320;
      const y = GROUND - 30 + ctx.r() * 16 - Math.floor(i / 4) * 34;
      s += `<g transform="rotate(${ctx.r() * 160 - 80} ${x + 40} ${y})"><rect x="${x}" y="${y - 12}" width="${60 + ctx.r() * 40}" height="22" rx="5" fill="${col(i)}"/><rect x="${x + 8}" y="${y - 6}" width="12" height="9" rx="3" fill="${oscuro(c, 0.6)}"/><rect x="${x + 28}" y="${y - 6}" width="12" height="9" rx="3" fill="${oscuro(c, 0.6)}"/></g>`;
    }
  }
  return s;
}

function fruta(ctx: Ctx): string {
  const t = ctx.f.tipo ?? 'mango';
  let s = sombra(400, GROUND + 8, 370, 24, 0.26);
  const hoja = (x: number, y: number, rot: number) => `<path d="M0 0 Q18 -26 46 -8 Q22 12 0 0Z" fill="#4B7A1F" transform="translate(${x} ${y}) rotate(${rot})"/><path d="M0 0 Q18 -26 46 -8" fill="none" stroke="#6BBF4A" stroke-width="2" transform="translate(${x} ${y}) rotate(${rot})"/>`;
  if (ctx.v === 0) {
    s += pilaFruta(ctx, t, 400, GROUND - 28, [8, 7, 6, 4, 2], 31);
  } else if (ctx.v === 1) {
    s += pilaFruta(ctx, t, 300, GROUND - 28, [6, 5, 4, 2], 31);
    s += pilaFruta(ctx, t, 600, GROUND - 28, [3, 2], 31);
    for (let i = 0; i < 6; i++) s += hoja(80 + i * 120, GROUND + 6, ctx.r() * 60 - 30);
  } else {
    s += bloque(120, GROUND - 60, 560, 60, 50, MADERA, `<rect x="130" y="${GROUND - 50}" width="540" height="6" fill="${oscuro(MADERA, 0.4)}" opacity=".5"/>`);
    s += pilaFruta(ctx, t, 410, GROUND - 78, [7, 6, 4], 30);
    for (let i = 0; i < 5; i++) if (t !== 'banano') s += fruto(t, 90 + i * 150 + ctx.r() * 40, GROUND + 28, 24, ctx);
  }
  return s;
}

function chatarra(ctx: Ctx): string {
  const c = ctx.f.obj;
  const tonos = [c, claro(c, 0.3), oscuro(c, 0.22), '#A8573A', '#7A4332'];
  let s = sombra(400, GROUND + 8, 370, 24, 0.26);
  if (ctx.v === 0) {
    const haz = (x: number, y: number, w: number, filas: number) => {
      let g = '';
      for (let i = 0; i < filas; i++) {
        const len = w - ctx.r() * 14;
        g += `<rect x="${x}" y="${y + i * 18}" width="${len}" height="14" rx="7" fill="${tonos[i % 3]}"/><rect x="${x + 6}" y="${y + i * 18 + 2}" width="${len - 12}" height="4" rx="2" fill="#FFFFFF" opacity=".35"/>`;
      }
      for (const f of [0.18, 0.52, 0.86]) g += `<rect x="${x + w * f}" y="${y - 3}" width="12" height="${filas * 18 + 4}" rx="3" fill="#1D2B4A" opacity=".75"/>`;
      return g;
    };
    s += haz(110, GROUND - 90, 580, 5) + haz(150, GROUND - 190, 500, 5) + haz(210, GROUND - 285, 380, 4);
  } else if (ctx.v === 1) {
    const pcs: { x: number; y: number; w: number; h: number; rot: number; col: string; l: boolean }[] = [];
    for (let i = 0; i < 46; i++) {
      const t = Math.pow(ctx.r(), 1.2) * 0.9;
      const hw = 300 * Math.pow(1 - t, 0.8);
      pcs.push({ x: 400 + (ctx.r() * 2 - 1) * hw, y: GROUND - 10 - t * 300, w: 70 + ctx.r() * 90, h: 12 + ctx.r() * 18, rot: ctx.r() * 160 - 80, col: tonos[Math.floor(ctx.r() * tonos.length)], l: ctx.r() < 0.3 });
    }
    s += pcs.sort((a, b) => a.y - b.y).map((p) => `<g transform="translate(${p.x} ${p.y}) rotate(${p.rot})"><rect x="${-p.w / 2}" y="${-p.h / 2}" width="${p.w}" height="${p.h}" rx="3" fill="${p.col}"/><rect x="${-p.w / 2 + 4}" y="${-p.h / 2 + 2}" width="${p.w - 8}" height="3" fill="#FFFFFF" opacity=".35"/>${p.l ? `<rect x="${p.w / 2 - p.h}" y="${-p.h / 2 - 34}" width="${p.h}" height="40" rx="3" fill="${p.col}"/>` : ''}</g>`).join('');
  } else {
    const pcs = [paca({ ...ctx, f: { ...ctx.f, tipo: 'metal' } }, c, 90, GROUND - 130, 250, 130, 50), paca({ ...ctx, f: { ...ctx.f, tipo: 'metal' } }, claro(c, 0.08), 400, GROUND - 130, 250, 130, 50)];
    s += pcs.join('');
    for (let i = 0; i < 6; i++) s += cilindro(ctx, 130 + i * 55 + (i % 2) * 20, GROUND - 28 + (i % 2) * 6, 20, 34, i % 2 ? claro(c, 0.3) : '#D8DEE9', { costillas: 0 });
  }
  return s;
}

function langostino(ctx: Ctx, x: number, y: number, s: number, rot: number, c: string) {
  const d = 'M0 0 Q40 -12 62 18 T58 70';
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="${d}" fill="none" stroke="${oscuro(c)}" stroke-width="30" stroke-linecap="round" transform="translate(3 4)"/><path d="${d}" fill="none" stroke="${c}" stroke-width="28" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${oscuro(c, 0.45)}" stroke-width="28" stroke-dasharray="2 14" opacity=".4"/><path d="M-4 -8 Q36 -30 58 6" fill="none" stroke="${claro(c, 0.6)}" stroke-width="6" stroke-linecap="round" opacity=".6"/><ellipse cx="-6" cy="0" rx="22" ry="17" fill="${c}"/><circle cx="-12" cy="-4" r="3.5" fill="#101828"/><path d="M-26 -6 Q-70 -30 -96 -14" fill="none" stroke="${oscuro(c)}" stroke-width="2.4"/><path d="M-26 0 Q-70 -4 -92 12" fill="none" stroke="${oscuro(c)}" stroke-width="2.4"/><ellipse cx="52" cy="82" rx="9" ry="18" fill="${claro(c, 0.15)}" transform="rotate(-20 52 82)"/><ellipse cx="68" cy="80" rx="9" ry="17" fill="${c}" transform="rotate(20 68 80)"/></g>`;
}
function pota(ctx: Ctx, x: number, y: number, s: number, rot: number, c: string) {
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M0 0 C30 -10 45 30 38 80 L0 112 L-38 80 C-45 30 -30 -10 0 0Z" fill="${c}"/><path d="M8 -4 C40 10 44 50 38 80 L0 112 Z" fill="${oscuro(c)}" opacity=".4"/><path d="M-24 6 L-62 -6 L-28 38Z" fill="${claro(c, 0.15)}"/><path d="M24 6 L62 -6 L28 38Z" fill="${oscuro(c, 0.15)}"/>` + [-30, -15, 0, 15, 30].map((dx) => `<path d="M${dx * 0.5} 108 Q${dx * 1.2} 135 ${dx * 1.5} 160" fill="none" stroke="${claro(c, 0.3)}" stroke-width="7" stroke-linecap="round"/>`).join('') + `<circle cx="-20" cy="84" r="5" fill="#101828"/><circle cx="20" cy="84" r="5" fill="#101828"/><path d="M-22 14 Q-26 45 -20 70" fill="none" stroke="${claro(c, 0.6)}" stroke-width="6" stroke-linecap="round" opacity=".5"/></g>`;
}
function marisco(ctx: Ctx): string {
  const c = ctx.f.obj;
  const dibujar = (x: number, y: number, sc: number, rot: number, i: number) => (ctx.f.tipo === 'pota' ? pota(ctx, x, y, sc, rot, i % 3 ? c : claro(c, 0.18)) : langostino(ctx, x, y, sc, rot, i % 3 ? c : claro(c, 0.18)));
  let s = sombra(400, GROUND + 8, 370, 24, 0.26);
  const bola = (cx: number, b: number, w: number, h: number, n: number, sc: number) => {
    const piezas: [number, number, number, number][] = [];
    for (let i = 0; i < n; i++) {
      const t = Math.pow(ctx.r(), 1.3) * 0.85;
      const hw = (w / 2) * Math.pow(1 - t, 0.8);
      piezas.push([cx + (ctx.r() * 2 - 1) * hw, b - t * h - 20, sc * (0.85 + ctx.r() * 0.3), ctx.r() * 360]);
    }
    return piezas.sort((a, b2) => a[1] - b2[1]).map((p, i) => dibujar(p[0], p[1], p[2], p[3], i)).join('');
  };
  if (ctx.v === 0) {
    s += `<path d="M110 ${GROUND} Q400 ${GROUND - 300} 690 ${GROUND} Z" fill="${oscuro(c, 0.5)}" opacity=".4"/>` + bola(400, GROUND - 10, 560, 270, 34, 1.0);
  } else if (ctx.v === 1) {
    const azul = '#2B7DE9';
    s += bola(400, GROUND - 190, 360, 60, 14, 0.95);
    for (let i = 0; i < 14; i++) s += `<rect x="${240 + ctx.r() * 300}" y="${GROUND - 250 + ctx.r() * 36}" width="${18 + ctx.r() * 14}" height="${18 + ctx.r() * 14}" rx="4" fill="#FFFFFF" opacity=".85" transform="rotate(${ctx.r() * 60 - 30} 400 ${GROUND - 220})"/>`;
    s += cilindro(ctx, 400, GROUND - 200, 190, 190, azul, { costillas: 1, tapa: false });
    s += `<ellipse cx="400" cy="${GROUND - 200}" rx="190" ry="57" fill="none" stroke="${claro(azul, 0.5)}" stroke-width="10"/>`;
  } else {
    s += bloque(110, GROUND - 90, 580, 90, 60, '#F4F7FB', `<rect x="124" y="${GROUND - 78}" width="552" height="8" fill="#101828" opacity=".08"/>`);
    s += `<polygon points="110,${GROUND - 90} 170,${GROUND - 123} 750,${GROUND - 123} 690,${GROUND - 90}" fill="#E1E7F0"/>`;
    for (let i = 0; i < 9; i++) s += dibujar(150 + (i % 5) * 120 + (i > 4 ? 56 : 0), GROUND - 150 + (i > 4 ? 22 : -4), 0.85, ctx.r() * 70 - 20, i);
    for (let i = 0; i < 4; i++) s += dibujar(130 + i * 180, GROUND + 20, 0.7, ctx.r() * 360, i);
  }
  return s;
}

function bigBag(ctx: Ctx, c: string, cx: number, b: number, w: number, h: number, abierto = false) {
  let s = sombra(cx, b + 6, w * 0.6, 12, 0.2);
  s += `<path d="M${cx - w / 2} ${b} L${cx - w / 2 - 7} ${b - h * 0.5} L${cx - w / 2} ${b - h} L${cx + w / 2} ${b - h} L${cx + w / 2 + 7} ${b - h * 0.5} L${cx + w / 2} ${b}Z" fill="${c}"/>`;
  s += `<path d="M${cx + w * 0.25} ${b - h} L${cx + w / 2} ${b - h} L${cx + w / 2 + 7} ${b - h * 0.5} L${cx + w / 2} ${b} L${cx + w * 0.25} ${b}Z" fill="${oscuro(c)}" opacity=".42"/><rect x="${cx - w / 2 + 6}" y="${b - h + 14}" width="${w * 0.1}" height="${h - 28}" rx="5" fill="${claro(c, 0.6)}" opacity=".45"/>`;
  for (const k of [0.33, 0.66]) s += `<line x1="${cx - w / 2}" y1="${b - h * k}" x2="${cx + w / 2}" y2="${b - h * k}" stroke="${oscuro(c)}" stroke-width="2" opacity=".25"/>`;
  s += `<rect x="${cx - w * 0.22}" y="${b - h * 0.62}" width="${w * 0.44}" height="${h * 0.24}" rx="5" fill="#FFFFFF" opacity=".92"/><rect x="${cx - w * 0.17}" y="${b - h * 0.57}" width="${w * 0.34}" height="${h * 0.04}" rx="2" fill="${oscuro(c, 0.2)}"/><rect x="${cx - w * 0.17}" y="${b - h * 0.5}" width="${w * 0.22}" height="${h * 0.03}" rx="2" fill="${oscuro(c, 0.2)}" opacity=".6"/>`;
  if (abierto) s += `<ellipse cx="${cx}" cy="${b - h}" rx="${w / 2}" ry="${w * 0.14}" fill="${oscuro(c, 0.35)}"/><ellipse cx="${cx}" cy="${b - h + 3}" rx="${w * 0.45}" ry="${w * 0.1}" fill="${ctx.f.alt ?? '#E8C547'}"/>`;
  else for (const x of [cx - w / 2 + 12, cx + w / 2 - 12]) s += `<path d="M${x} ${b - h} C${x - 18} ${b - h - 70} ${x + 18} ${b - h - 70} ${x} ${b - h}" fill="none" stroke="${oscuro(c, 0.4)}" stroke-width="9" stroke-linecap="round"/>`;
  return s;
}
function bigbags(ctx: Ctx): string {
  const c = ctx.f.obj;
  let s = sombra(400, GROUND + 8, 370, 22, 0.24);
  if (ctx.v === 0) {
    [260, 270, 250].forEach((h, i) => (s += bigBag(ctx, mezclar(c, '#FFFFFF', 0.05 * i), 195 + i * 205, GROUND, 190, h)));
  } else if (ctx.v === 1) {
    s += bigBag(ctx, c, 260, GROUND, 230, 260) + bigBag(ctx, claro(c, 0.06), 520, GROUND, 230, 260) + bigBag(ctx, mezclar(c, '#FFFFFF', 0.1), 390, GROUND - 255, 230, 200);
  } else {
    s += mont(ctx, 560, GROUND, 330, 90, ctx.f.alt ?? '#E8C547', 50);
    s += bigBag(ctx, c, 470, GROUND - 6, 230, 270, true);
    for (let i = 0; i < 4; i++) s += bloque(70, GROUND - (i + 1) * 20, 210, 18, 40, i % 2 ? c : claro(c, 0.1), `<rect x="${90}" y="${GROUND - (i + 1) * 20 + 6}" width="60" height="4" rx="2" fill="#FFFFFF" opacity=".5"/>`);
  }
  return s;
}

const ESCENAS: Record<Escena, (ctx: Ctx) => string> = { pacas, sacos, monton: montones, conchas, rollos, tarimas, bidones, cajas, jabas, fruta, chatarra, marisco, bigbag: bigbags };

const esc = (t: string) => t.replace(/[<>&"]/g, (m) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[m]!);

/** Dibuja una ilustración (SVG) de la escena del lote con un color de fondo (el de su categoría) y una variante 0–2. */
export function renderEscena(foto: FotoLote, fondo: string, variante: number, semilla: string, titulo: string): string {
  const azar = mulberry32(semillaDe(semilla));
  let n = 0;
  const ctx: Ctx = { r: azar, id: () => `g${n++}`, f: foto, v: variante % 3, fondo };
  const g = ctx.id();
  const sl = ctx.id();
  const vg = ctx.id();
  const cuerpo = ESCENAS[foto.escena](ctx);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600" role="img" aria-label="${esc(titulo)}"><title>${esc(titulo)}</title><defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mezclar(fondo, '#FFFFFF', 0.84)}"/><stop offset="1" stop-color="${mezclar(fondo, '#FFFFFF', 0.5)}"/></linearGradient><linearGradient id="${sl}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mezclar(fondo, '#FFFFFF', 0.42)}"/><stop offset="1" stop-color="${mezclar(fondo, '#101828', 0.22)}"/></linearGradient><radialGradient id="${vg}" cx=".5" cy=".5" r=".78"><stop offset=".62" stop-color="#101828" stop-opacity="0"/><stop offset="1" stop-color="#101828" stop-opacity=".2"/></radialGradient></defs><rect width="800" height="600" fill="url(#${g})"/><circle cx="${600 + ((semillaDe(semilla) % 120) - 60)}" cy="110" r="150" fill="#FFFFFF" opacity=".32"/><circle cx="120" cy="190" r="70" fill="#FFFFFF" opacity=".2"/><circle cx="690" cy="300" r="46" fill="${mezclar(fondo, '#FFFFFF', 0.3)}" opacity=".35"/><path d="M0 ${GROUND - 70} Q400 ${GROUND - 100} 800 ${GROUND - 70} V600 H0Z" fill="url(#${sl})"/><ellipse cx="400" cy="${GROUND + 10}" rx="420" ry="52" fill="#FFFFFF" opacity=".16"/>${cuerpo}<rect width="800" height="600" fill="url(#${vg})"/></svg>`;
  return svg.replace(/-?\d+\.\d{2,}/g, (m) => String(Math.round(parseFloat(m) * 10) / 10));
}

/**
 * Escribe en UPLOADS_DIR las `n` (1–3) ilustraciones de un lote y devuelve sus nombres de archivo (estables: `demo-<slug>-<i>.svg`).
 * Las variantes de composición arrancan en un punto distinto según el lote para que dos lotes de la misma escena no luzcan iguales.
 */
export function escribirImagenesDemo(slug: string, foto: FotoLote, fondo: string, n: number, titulo: string): string[] {
  const inicio = semillaDe(slug) % 3;
  const nombres: string[] = [];
  for (let i = 0; i < Math.max(1, Math.min(3, n)); i++) {
    const nombre = `demo-${slug}-${i + 1}.svg`;
    writeFileSync(join(UPLOADS_DIR, nombre), renderEscena(foto, fondo, (inicio + i) % 3, `${slug}-${i}`, titulo));
    nombres.push(nombre);
  }
  return nombres;
}
