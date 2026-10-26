import { Icono, type NombreIcono } from "./Iconos";

// ---------------------------------------------------------------------------
// Sparkline
// ---------------------------------------------------------------------------

export interface SparklineProps {
  /** Valores en orden cronológico (p. ej. 6 meses). */
  serie: number[];
  /** Texto para lectores de pantalla ("Últimos 6 meses: de 4 a 12"). Si falta, se genera uno. */
  resumen?: string;
  ancho?: number;
  alto?: number;
  className?: string;
}

/** Micrográfico de línea gris con el último punto resaltado (Tufte). */
export function Sparkline({ serie, resumen, ancho = 96, alto = 28, className = "" }: SparklineProps) {
  if (serie.length === 0) return null;
  const pad = 4;
  const min = Math.min(...serie);
  const max = Math.max(...serie);
  const rango = max - min || 1;
  const x = (i: number) => (serie.length === 1 ? ancho / 2 : pad + (i * (ancho - 2 * pad)) / (serie.length - 1));
  const y = (v: number) => (max === min ? alto / 2 : alto - pad - ((v - min) / rango) * (alto - 2 * pad));
  const d = serie.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const ultimo = serie.length - 1;
  const etiqueta = resumen ?? `Últimos ${serie.length} valores: de ${serie[0]} a ${serie[ultimo]}`;
  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} width={ancho} height={alto} role="img" aria-label={etiqueta} className={className}>
      <path d={d} fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="stroke-ink-300" />
      <circle cx={x(ultimo)} cy={y(serie[ultimo])} r={2.5} className="fill-nav-700" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// KpiTile
// ---------------------------------------------------------------------------

const TONOS = {
  neutro: { caja: "border-line bg-white", valor: "text-nav-900" },
  ok: { caja: "border-line bg-white", valor: "text-pri-700" },
  alerta: { caja: "border-ambar-200 bg-ambar-50", valor: "text-ambar-700" },
} as const;

export interface Tendencia {
  /** Texto ya formateado: "+12 %", "−3 t". */
  valor: string;
  sentido: "sube" | "baja" | "igual";
  /** Si el cambio es favorable (verde) o no (ámbar). Por defecto, sube = favorable. */
  favorable?: boolean;
}

export interface KpiTileProps {
  /** ≤ 3 palabras. */
  etiqueta: string;
  /** Ya formateado (formatoMasa, soles...). */
  valor: string | number;
  unidad?: string;
  /** ≤ 6 palabras. */
  nota?: string;
  icono?: NombreIcono;
  tono?: keyof typeof TONOS;
  /** Si se da, dibuja un Sparkline junto al número. */
  serie?: number[];
  tendencia?: Tendencia;
  className?: string;
}

/** Indicador compacto (sin sombra): etiqueta, cifra tabular de 28 px, unidad, tendencia opcional y micrográfico. */
export function KpiTile({ etiqueta, valor, unidad, nota, icono, tono = "neutro", serie, tendencia, className = "" }: KpiTileProps) {
  const t = TONOS[tono];
  // Con tono alerta sin ícono propio, se añade uno para no depender solo del color.
  const iconoFinal: NombreIcono | undefined = icono ?? (tono === "alerta" ? "alerta" : undefined);
  const fav = tendencia ? (tendencia.favorable ?? tendencia.sentido !== "baja") : true;
  return (
    <div className={`flex flex-col gap-1 rounded-card border p-3.5 ${t.caja} ${className}`}>
      <p className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
        {iconoFinal && <Icono nombre={iconoFinal} size={16} className="shrink-0 text-nav-600" />}
        {etiqueta}
      </p>
      <div className="flex items-end justify-between gap-2">
        <p className="flex items-baseline gap-1.5">
          <span className={`num whitespace-nowrap text-[28px] font-semibold leading-none ${t.valor}`}>{valor}</span>
          {unidad && <span className="text-sm font-medium text-ink-500">{unidad}</span>}
        </p>
        {serie && serie.length > 0 && <Sparkline serie={serie} ancho={72} alto={24} />}
      </div>
      {(tendencia || nota) && (
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink-500">
          {tendencia && (
            <span className={`num font-medium ${fav ? "text-pri-700" : "text-ambar-700"}`}>
              <span aria-hidden="true">{tendencia.sentido === "sube" ? "▲" : tendencia.sentido === "baja" ? "▼" : "–"}</span> {tendencia.valor}
            </span>
          )}
          {nota}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BarraSegmentada
// ---------------------------------------------------------------------------

export type PatronSegmento = "liso" | "rayas" | "puntos";

export interface ParteBarra {
  etiqueta: string;
  valor: number;
  /** Clase Tailwind literal de fondo, p. ej. "bg-pri-600" o "bg-cat-agro". */
  color: string;
  /** Textura que refuerza el color (por defecto liso). */
  patron?: PatronSegmento;
}

const TEXTURA: Record<PatronSegmento, React.CSSProperties | undefined> = {
  liso: undefined,
  rayas: { backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,.6) 0 3px, transparent 3px 7px)" },
  puntos: { backgroundImage: "radial-gradient(rgba(255,255,255,.75) 1.5px, transparent 1.6px)", backgroundSize: "7px 7px" },
};

export interface BarraSegmentadaProps {
  partes: ParteBarra[];
  /** Texto para lectores de pantalla; si falta se genera con las partes. */
  resumen?: string;
  className?: string;
}

/** Barra horizontal repartida en partes proporcionales, con leyenda de punto + cifra + etiqueta. */
export function BarraSegmentada({ partes, resumen, className = "" }: BarraSegmentadaProps) {
  const total = partes.reduce((a, p) => a + Math.max(0, p.valor), 0);
  const etiqueta = resumen ?? partes.map((p) => `${p.valor} ${p.etiqueta}`).join(", ");
  return (
    <div className={className}>
      <div role="img" aria-label={etiqueta} className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-sm bg-surface-2">
        {total > 0 &&
          partes
            .filter((p) => p.valor > 0)
            .map((p) => (
              <span key={p.etiqueta} className={`h-full ${p.color}`} style={{ flexGrow: p.valor, flexBasis: 0, ...TEXTURA[p.patron ?? "liso"] }} />
            ))}
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
        {partes.map((p) => (
          <li key={p.etiqueta} className="flex items-center gap-1.5 text-xs text-ink-700">
            <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${p.color}`} />
            <span className="num font-semibold text-ink-900">{p.valor}</span>
            {p.etiqueta}
          </li>
        ))}
      </ul>
    </div>
  );
}
