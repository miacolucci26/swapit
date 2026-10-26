"use client";

import Link from "next/link";
import { useRef } from "react";
import { GRUPO_CATEGORIA, MODALIDAD, type GrupoCategoria } from "@/lib/format";

// ---------------------------------------------------------------------------
// Superficies
// ---------------------------------------------------------------------------

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-card border border-line bg-white p-4 shadow-card sm:p-5 ${className}`}>{children}</section>;
}

// ---------------------------------------------------------------------------
// Etiquetas
// ---------------------------------------------------------------------------

// Texto pequeño sobre un tinte suave. `sol` y `rosa` se conservan por compatibilidad: ahora son ámbar (atención) y gris.
const TONOS: Record<string, string> = {
  verde: "bg-pri-50 text-pri-700",
  ambar: "bg-ambar-50 text-ambar-700",
  rojo: "bg-error-tint text-error-ink",
  gris: "bg-ink-100 text-ink-700",
  azul: "bg-nav-50 text-nav-700",
  rosa: "bg-ink-100 text-ink-700",
  sol: "bg-ambar-50 text-ambar-700",
};
export function Badge({ tono = "gris", children, className = "" }: { tono?: keyof typeof TONOS; children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${TONOS[tono]} ${className}`}>{children}</span>;
}

export function ModalidadBadge({ m }: { m: string }) {
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${MODALIDAD[m]?.color}`}>{MODALIDAD[m]?.corta ?? m}</span>;
}

/** Marca gris pequeña para ofertas y empresas de demostración. */
export function InsigniaDemo({ className = "" }: { className?: string }) {
  return <span className={`inline-flex items-center rounded-md bg-ink-100 px-1.5 py-0.5 text-[11px] font-medium leading-4 text-ink-700 ${className}`}>Demo</span>;
}

/** Clases literales del punto de cada categoría (Tailwind las detecta aquí). */
export const CLASE_PUNTO: Record<GrupoCategoria, string> = {
  agro: "bg-cat-agro",
  pesca: "bg-cat-pesca",
  textil: "bg-cat-textil",
  plastico: "bg-cat-plastico",
  otros: "bg-cat-otros",
};

/** Punto de color (8 px) + nombre de la categoría. `codigo` puede ser el código de material (ORGANICO_AGRO…) o un grupo (agro, pesca…). */
export function PuntoCategoria({ codigo, etiqueta, className = "" }: { codigo: string; etiqueta?: string; className?: string }) {
  const info = GRUPO_CATEGORIA[codigo];
  const grupo: GrupoCategoria = info?.grupo ?? (codigo in CLASE_PUNTO ? (codigo as GrupoCategoria) : "otros");
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-ink-700 ${className}`}>
      <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${CLASE_PUNTO[grupo]}`} />
      {etiqueta ?? info?.nombre ?? codigo}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Botones y campos
// ---------------------------------------------------------------------------

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "primario" | "borde" | "peligro" | "suave" };
const BASE_BTN = "inline-flex min-h-10 items-center justify-center gap-2 rounded-control px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
const VARIANTES = {
  primario: "bg-pri-600 text-white hover:bg-pri-700",
  borde: "border border-ink-300 bg-white text-ink-900 hover:border-nav-600 hover:bg-surface-2",
  peligro: "border border-error/40 bg-white text-error-ink hover:bg-error-tint",
  suave: "bg-pri-50 text-pri-700 hover:bg-pri-100",
};
export function Btn({ variante = "primario", className = "", ...p }: BtnProps) {
  return <button className={`${BASE_BTN} ${VARIANTES[variante]} ${className}`} {...p} />;
}

export function LinkBtn({ href, variante = "primario", children, className = "" }: { href: string; variante?: "primario" | "borde" | "suave"; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={`${BASE_BTN} ${VARIANTES[variante]} ${className}`}>
      {children}
    </Link>
  );
}

export const inputCls = "min-h-10 w-full rounded-control border border-ink-300 bg-white px-3 py-2 text-base outline-none transition placeholder:text-ink-400 focus:border-nav-600 focus:ring-2 focus:ring-nav-100 md:text-[15px]";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[13px] font-medium text-ink-700">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-500">{hint}</span>}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Encabezados y secciones
// ---------------------------------------------------------------------------

export function PageHeader({ titulo, sub, acciones }: { titulo: string; sub?: string; acciones?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-nav-900 md:text-[26px]">{titulo}</h1>
        {sub && <p className="mt-1 max-w-2xl text-sm text-ink-500 md:text-[15px]">{sub}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </div>
  );
}

/** Bloque de pantalla: título + una línea de contexto + acción a la derecha, y el contenido debajo. */
export function Seccion({ titulo, descripcion, acciones, children, className = "" }: { titulo: string; descripcion?: string; acciones?: React.ReactNode; children?: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-nav-900 md:text-lg">{titulo}</h2>
          {descripcion && <p className="mt-0.5 text-sm text-ink-500">{descripcion}</p>}
        </div>
        {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Indicadores
// ---------------------------------------------------------------------------

export type TonoKpi = "neutro" | "ok" | "alerta" | "error" | "gris" | "verde" | "ambar";
const COLOR_VALOR: Record<TonoKpi, string> = {
  neutro: "text-nav-900", gris: "text-nav-900",
  ok: "text-pri-700", verde: "text-pri-700",
  alerta: "text-ambar-700", ambar: "text-ambar-700",
  error: "text-error",
};
const COLS_MD: Record<number, string> = { 1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4", 5: "md:grid-cols-5" };

export interface ItemKpi {
  etiqueta: string;
  valor: React.ReactNode;
  nota?: string;
  tono?: TonoKpi;
}

/** Franja horizontal de 3–5 indicadores separados por líneas finas, estilo reporte. En móvil, 2 por fila. */
export function KpiFranja({ items, className = "" }: { items: ItemKpi[]; className?: string }) {
  const n = Math.min(Math.max(items.length, 1), 5);
  const impar = items.length % 2 === 1;
  return (
    <dl className={`grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line shadow-card ${COLS_MD[n]} ${className}`}>
      {items.map((it, i) => (
        <div key={it.etiqueta} className={`min-w-0 bg-white px-4 py-3.5 ${impar && i === items.length - 1 ? "max-md:col-span-2" : ""}`}>
          <dt className="text-xs font-medium text-ink-500">{it.etiqueta}</dt>
          <dd className={`num mt-1 text-[28px] font-semibold leading-none ${COLOR_VALOR[it.tono ?? "neutro"]}`}>{it.valor}</dd>
          {it.nota && <dd className="mt-1.5 text-xs text-ink-500">{it.nota}</dd>}
        </div>
      ))}
    </dl>
  );
}

/** Indicador suelto (misma estética que KpiFranja). */
export function Stat({ etiqueta, valor, nota, tono = "gris" }: { etiqueta: string; valor: React.ReactNode; nota?: string; tono?: "gris" | "verde" | "ambar" }) {
  return (
    <div className="rounded-card border border-line bg-white p-4 shadow-card">
      <div className="text-xs font-medium text-ink-500">{etiqueta}</div>
      <div className={`num mt-1 text-[28px] font-semibold leading-none ${COLOR_VALOR[tono]}`}>{valor}</div>
      {nota && <div className="mt-1.5 text-xs text-ink-500">{nota}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pestañas y tablas
// ---------------------------------------------------------------------------

export interface OpcionTab {
  valor: string;
  etiqueta: string;
  /** Contador opcional junto a la etiqueta. */
  conteo?: number;
}

/** Pestañas subrayadas (teclado: ← →). Usar con el contenido de cada pestaña condicionado a `valor`. */
export function Tabs({ opciones, valor, onChange, className = "", etiqueta = "Secciones" }: { opciones: OpcionTab[]; valor: string; onChange: (v: string) => void; className?: string; etiqueta?: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const mover = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const j = (i + (e.key === "ArrowRight" ? 1 : opciones.length - 1)) % opciones.length;
    onChange(opciones[j].valor);
    refs.current[j]?.focus();
  };
  return (
    <div role="tablist" aria-label={etiqueta} className={`flex gap-5 overflow-x-auto border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}>
      {opciones.map((o, i) => {
        const activa = o.valor === valor;
        return (
          <button
            key={o.valor}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="tab"
            aria-selected={activa}
            tabIndex={activa ? 0 : -1}
            onClick={() => onChange(o.valor)}
            onKeyDown={(e) => mover(e, i)}
            className={`-mb-px inline-flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 px-0.5 text-sm transition ${activa ? "border-pri-600 font-semibold text-nav-900" : "border-transparent font-medium text-ink-500 hover:text-nav-900"}`}
          >
            {o.etiqueta}
            {o.conteo != null && <span className={`num rounded-md px-1.5 text-xs ${activa ? "bg-pri-50 text-pri-700" : "bg-ink-100 text-ink-700"}`}>{o.conteo}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Clases de tabla de reporte: cabecera gris, filas de 48 px, borde fino. Útil si la tabla no cabe en `TablaDatos`. */
export const tablaCls = {
  contenedor: "overflow-x-auto rounded-card border border-line bg-white shadow-card",
  tabla: "w-full min-w-[560px] border-collapse text-left text-sm",
  th: "bg-surface-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-500 whitespace-nowrap",
  td: "h-12 px-4 py-2 align-middle text-ink-900",
  fila: "border-t border-line hover:bg-surface-2/60",
} as const;

/**
 * Tabla de datos. Se escribe con `<thead><tr><th>…</th></tr></thead><tbody><tr><td>…</td></tr></tbody>` normales: el contenedor aplica
 * cabecera gris, filas de 48 px y separadores. Para cifras, añade `text-right num` a la celda. `minAncho` evita aplastar columnas en móvil.
 */
export function TablaDatos({ children, className = "", minAncho = 560 }: { children: React.ReactNode; className?: string; minAncho?: number }) {
  return (
    <div className={`${tablaCls.contenedor} ${className}`}>
      <table
        style={{ minWidth: minAncho }}
        className="w-full border-collapse text-left text-sm [&_td]:h-12 [&_td]:px-4 [&_td]:py-2 [&_td]:align-middle [&_th]:whitespace-nowrap [&_th]:bg-surface-2 [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-ink-500 [&_tbody_tr:hover]:bg-surface-2/60 [&_tbody_tr]:border-t [&_tbody_tr]:border-line"
      >
        {children}
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Estados vacíos, carga y utilidades
// ---------------------------------------------------------------------------

export function Vacio({ titulo, texto, accion }: { titulo: string; texto?: string; accion?: React.ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-ink-300 bg-white p-8 text-center">
      <div className="text-base font-semibold text-nav-900">{titulo}</div>
      {texto && <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">{texto}</p>}
      {accion && <div className="mt-4 flex justify-center">{accion}</div>}
    </div>
  );
}

export function Cargando({ texto = "Cargando…" }: { texto?: string }) {
  return <div className="p-8 text-center text-sm text-ink-500">{texto}</div>;
}

/** Quién publica: una persona o una empresa (dato informativo; el catálogo es uno solo). */
export function TipoBadge({ tipo, className = "" }: { tipo: "EMPRESA" | "PERSONA"; className?: string }) {
  return <Badge tono="gris" className={className}>{tipo === "PERSONA" ? "Persona" : "Empresa"}</Badge>;
}

export function Estrellas({ v, n }: { v: number; n?: number }) {
  if (!v) return <span className="text-xs text-ink-500">Sin calificaciones</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-700">
      <span aria-hidden="true">★</span>
      <b className="num font-semibold">{v.toFixed(1)}</b>
      {n != null && <span className="text-ink-500">({n})</span>}
    </span>
  );
}

/**
 * Imagen del lote: foto real si existe (recortada con `h-*` en tarjetas); si no, un bloque neutro con la inicial de la categoría.
 */
export function Portada({ codigo, src, className = "h-36" }: { codigo: string; src?: string | null; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={`w-full rounded-t-card object-cover ${className}`} />;
  }
  const nombre = (GRUPO_CATEGORIA[codigo] ?? GRUPO_CATEGORIA.OTROS).nombre;
  return (
    <div className={`flex w-full items-center justify-center rounded-t-card bg-surface-2 ${className}`} aria-hidden="true">
      <span className="text-3xl font-semibold text-ink-300">{nombre.charAt(0)}</span>
    </div>
  );
}

/** Barras horizontales simples para dashboards. */
export function Barras({ datos, unidad = "", color = "bg-pri-600", formato }: { datos: { etiqueta: string; valor: number }[]; unidad?: string; color?: string; formato?: (n: number) => string }) {
  const max = Math.max(...datos.map((d) => d.valor), 1);
  return (
    <ul className="flex flex-col gap-2.5">
      {datos.map((d) => (
        <li key={d.etiqueta}>
          <div className="mb-1 flex justify-between gap-3 text-xs">
            <span className="text-ink-700">{d.etiqueta}</span>
            <span className="num font-semibold text-ink-900">{formato ? formato(d.valor) : `${d.valor.toLocaleString("es-PE", { maximumFractionDigits: 1 })} ${unidad}`}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-sm bg-surface-2">
            <div className={`h-full rounded-sm ${color}`} style={{ width: `${(d.valor / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Columnas por mes. */
export function Columnas({ datos, unidad, formato }: { datos: { etiqueta: string; valor: number }[]; unidad: string; formato?: (n: number) => string }) {
  const max = Math.max(...datos.map((d) => d.valor), 1);
  return (
    <div className="flex h-44 gap-2">
      {datos.map((d) => (
        <div key={d.etiqueta} className="flex h-full flex-1 flex-col items-center gap-1">
          {/* Zona de la barra con altura definida (flex-1): la barra usa % de ESTA altura. Deja ~20% libre para el valor. */}
          <div className="flex w-full flex-1 flex-col items-center justify-end">
            <span className="num mb-1 text-[11px] font-semibold text-ink-700">{d.valor ? (formato ? formato(d.valor) : d.valor.toLocaleString("es-PE", { maximumFractionDigits: 0 })) : ""}</span>
            <div className="w-full rounded-t-sm bg-pri-600" style={{ height: `${d.valor ? Math.max((d.valor / max) * 78, 3) : 1}%` }} title={`${d.valor} ${unidad}`} />
          </div>
          <span className="text-[11px] text-ink-500">{d.etiqueta}</span>
        </div>
      ))}
    </div>
  );
}

export const MES = (m: string) => new Date(`${m}-15`).toLocaleDateString("es-PE", { month: "short" }).replace(".", "");

// ---------- Swapit para intermediarios ----------

const ESTADO_TONO: Record<string, keyof typeof TONOS> = { REPORTADO: "ambar", COTIZADO: "azul", ACOPIADO: "azul", DESPACHADO: "verde", RECHAZADO: "rojo" };
export function EstadoMaterialBadge({ estado, etiqueta }: { estado: string; etiqueta?: string }) {
  return <Badge tono={ESTADO_TONO[estado] ?? "gris"}>{etiqueta ?? estado}</Badge>;
}

/** Semáforo del precio frente al rango de referencia: dentro = verde; fuera (por debajo o por encima) = ámbar. */
export function SemaforoPrecio({ pos, corto = false }: { pos: string | null | undefined; corto?: boolean }) {
  if (!pos) return <span className="text-xs text-ink-500">Sin referencia</span>;
  const dentro = pos === "DENTRO";
  const txt = dentro ? "Dentro del rango" : pos === "DEBAJO" ? "Debajo del rango" : "Encima del rango";
  return (
    <Badge tono={dentro ? "verde" : "ambar"}>
      <span aria-hidden>{dentro ? "●" : pos === "DEBAJO" ? "▼" : "▲"}</span>
      {corto ? txt.split(" ")[0] : txt}
    </Badge>
  );
}

const PASOS_MATERIAL = ["REPORTADO", "COTIZADO", "ACOPIADO", "DESPACHADO"] as const;
export function PasosMaterial({ estado }: { estado: string }) {
  const rechazado = estado === "RECHAZADO";
  const actual = PASOS_MATERIAL.indexOf(estado as (typeof PASOS_MATERIAL)[number]);
  const nombre = ["Reportado", "Cotizado", "Acopiado", "Despachado"];
  return (
    <ol className="flex flex-wrap items-center gap-1 text-xs" aria-label="Avance del material">
      {PASOS_MATERIAL.map((p, i) => {
        const hecho = !rechazado && i <= actual;
        return (
          <li key={p} className="flex items-center gap-1">
            <span className={`flex h-6 items-center rounded-md px-2 font-medium ${hecho ? "bg-nav-700 text-white" : "bg-ink-100 text-ink-500"}`}>{i + 1}. {nombre[i]}</span>
            {i < 3 && <span aria-hidden="true" className="text-ink-300">›</span>}
          </li>
        );
      })}
      {rechazado && <li className="rounded-md bg-error-tint px-2 py-1 font-medium text-error-ink">Rechazado</li>}
    </ol>
  );
}

/**
 * Rango de precio de referencia (p25–p75) con la mediana y marcadores de precios (lo que pide el proveedor, lo que ofreces).
 * `formato` convierte un precio al texto que se muestra.
 */
export function RangoPrecio({
  rango, marcadores = [], formato, esSemilla = false, orientativo = false,
}: {
  rango: { p25: number; p50: number; p75: number } | null;
  marcadores?: { etiqueta: string; valor: number | null | undefined; color: string }[];
  formato: (n: number) => string;
  esSemilla?: boolean;
  orientativo?: boolean;
}) {
  if (!rango) return <p className="text-sm text-ink-500">Sin precios comparables todavía.</p>;
  const valores = marcadores.filter((m) => m.valor != null).map((m) => m.valor as number);
  const lo = Math.min(rango.p25, ...valores) * 0.8;
  const hi = Math.max(rango.p75, ...valores) * 1.2;
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100));
  const pos = (v: number) => `${pct(v)}%`;
  // Si dos marcadores quedan muy juntos, el segundo sube un nivel para que sus etiquetas no se encimen.
  const visibles = marcadores.filter((m) => m.valor != null).map((m) => ({ ...m, valor: m.valor as number }));
  const niveles = visibles.map((m, i) => visibles.slice(0, i).filter((o) => Math.abs(pct(o.valor) - pct(m.valor)) < 14).length);
  const maxNivel = Math.max(0, ...niveles);
  return (
    <div>
      <div className="relative h-2.5 rounded-sm bg-ink-100" style={{ marginTop: 28 + maxNivel * 16 }} role="img" aria-label={`Rango de referencia de ${formato(rango.p25)} a ${formato(rango.p75)}`}>
        <div className={`absolute top-0 h-2.5 rounded-sm ${esSemilla ? "bg-ambar-300" : "bg-pri-300"} ${orientativo ? "opacity-60" : ""}`} style={{ left: pos(rango.p25), width: `calc(${pos(rango.p75)} - ${pos(rango.p25)})` }} />
        <div className="absolute -top-1 h-[18px] w-0.5 bg-ink-700" style={{ left: pos(rango.p50) }} title="Mediana" />
        {visibles.map((m, i) => (
          <div key={m.etiqueta} className="absolute -translate-x-1/2 text-center" style={{ left: pos(m.valor), top: -24 - niveles[i] * 16 }}>
            <div className="whitespace-nowrap text-[10px] font-semibold" style={{ color: m.color }}>{m.etiqueta}</div>
            <div className="mx-auto h-2.5 w-2.5 rounded-full border border-white" style={{ background: m.color }} />
          </div>
        ))}
      </div>
      <div className="num mt-2 flex justify-between text-xs text-ink-500">
        <span>{formato(rango.p25)}</span>
        <span className="font-semibold text-ink-700">mediana {formato(rango.p50)}</span>
        <span>{formato(rango.p75)}</span>
      </div>
    </div>
  );
}

/** Aviso fijo cuando el rango viene de datos de ejemplo (sintéticos): no es un precio de mercado validado. */
export function AvisoEjemplo() {
  return (
    <p className="rounded-control border border-ambar-200 bg-ambar-50 p-2.5 text-xs text-ambar-800">
      <b>Datos de ejemplo.</b> Este rango sale de precios ilustrativos para mostrar cómo funciona; no es un precio de mercado validado. Importa tus compras reales en «Benchmark» para obtener tu propia referencia.
    </p>
  );
}
