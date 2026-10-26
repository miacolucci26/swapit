import {
  EVIDENCIAS,
  NIVELES,
  VALORES,
  nombreTipoDestino,
  type Escala,
  type Evidencia,
  type Nivel,
  type Residuo,
  type Valor,
} from "@swapit/shared";
import { Icono, type NombreIcono } from "./Iconos";

/** Nombre corto de un residuo: lo que va antes del primer paréntesis. */
export const nombreCorto = (nombre: string) => nombre.split("(")[0].trim();

/** Ícono y colores de cada nivel de la jerarquía (clases literales para que Tailwind las detecte). */
export const ESTILO_NIVEL: Record<Nivel, { icono: NombreIcono; circulo: string; texto: string; fondo: string; borde: string }> = {
  PREVENIR: { icono: "hoja", circulo: "bg-pri-700 text-white", texto: "text-pri-800", fondo: "bg-pri-50", borde: "border-pri-600" },
  REUSO: { icono: "reciclar", circulo: "bg-pri-600 text-white", texto: "text-pri-800", fondo: "bg-pri-50", borde: "border-pri-600" },
  MATERIAL: { icono: "material", circulo: "bg-nav-700 text-white", texto: "text-nav-800", fondo: "bg-nav-50", borde: "border-nav-600" },
  ENERGIA: { icono: "sol", circulo: "bg-nav-500 text-white", texto: "text-nav-700", fondo: "bg-nav-50", borde: "border-nav-500" },
  DISPOSICION: { icono: "candado", circulo: "bg-ink-500 text-white", texto: "text-ink-700", fondo: "bg-surface-2", borde: "border-ink-400" },
};

// ---------------------------------------------------------------------------
// Valor: tres puntos
// ---------------------------------------------------------------------------

const LLENAS: Record<Exclude<Valor, "COSTO">, number> = { ALTO: 3, MEDIO: 2, BAJO: 1 };

/** Valor en tres puntos sobrios: ALTO ●●● · MEDIO ●●○ · BAJO ●○○ · COSTO triángulo ámbar con «−». */
export function ValorMonedas({ valor, conTexto = false, className = "" }: { valor: Valor; conTexto?: boolean; className?: string }) {
  const etiqueta = VALORES[valor];
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {valor === "COSTO" ? (
        <svg viewBox="0 0 34 12" width={34} height={12} role="img" aria-label={etiqueta} className="shrink-0">
          <path d="M6 1 11 10.5H1z" className="fill-ambar-100 stroke-ambar-600" strokeWidth={1.2} strokeLinejoin="round" />
          <path d="M4 7.5h4" className="stroke-ambar-700" strokeWidth={1.4} strokeLinecap="round" />
          <path d="M18 6h12" className="stroke-ambar-600" strokeWidth={2} strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 34 12" width={34} height={12} role="img" aria-label={etiqueta} className="shrink-0">
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={6 + i * 11} cy={6} r={4} strokeWidth={1.4} className={i < LLENAS[valor] ? "fill-nav-700 stroke-nav-700" : "fill-white stroke-ink-300"} />
          ))}
        </svg>
      )}
      {conTexto && <span className="text-xs font-medium text-ink-700">{etiqueta}</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Evidencia: etiqueta de texto
// ---------------------------------------------------------------------------

const ESTILO_EVIDENCIA: Record<Evidencia, string> = {
  PRACTICA_COMUN: "bg-pri-50 text-pri-700",
  REPORTADO: "bg-nav-50 text-nav-700",
  POR_VALIDAR: "bg-ambar-50 text-ambar-700",
};

/** Etiqueta de texto pequeña con el nivel de evidencia (siempre con palabra, nunca solo color). */
export function SelloEvidencia({ evidencia, conTexto = true, className = "" }: { evidencia: Evidencia; conTexto?: boolean; className?: string }) {
  const nombre = EVIDENCIAS[evidencia].nombre;
  return (
    <span
      title={EVIDENCIAS[evidencia].ayuda}
      className={`inline-flex items-center whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-4 ${ESTILO_EVIDENCIA[evidencia]} ${className}`}
      aria-label={conTexto ? undefined : nombre}
    >
      {conTexto ? nombre : nombre.charAt(0)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Escala: etiqueta
// ---------------------------------------------------------------------------

/** MYPE / Planta. No se muestra si la vida sirve para ambas escalas. */
export function ChipEscala({ escala, className = "" }: { escala: Escala; className?: string }) {
  if (escala === "AMBAS") return null;
  const mype = escala === "MYPE";
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-4 ${mype ? "bg-pri-50 text-pri-700" : "bg-ink-100 text-ink-700"} ${className}`}>
      <Icono nombre={mype ? "empresa" : "fabrica"} size={12} />
      {mype ? "MYPE" : "Planta"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tabla de usos
// ---------------------------------------------------------------------------

export interface EscaleraVidasProps {
  residuo: Residuo;
  /** Atenúa (no oculta) las vidas que exigen planta industrial y las rotula "Requiere planta". */
  modoMype?: boolean;
  /** Índice de la vida abierta al cargar (por defecto la primera); null = todas cerradas. */
  abiertaInicial?: number | null;
  className?: string;
}

const COLUMNAS = "md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.5fr)_64px_92px_minmax(0,1.7fr)_16px]";

/**
 * Los usos de un residuo como tabla estructurada, del mejor al último: Uso · Nivel · Valor · Evidencia · Quién lo compra.
 * Cada fila se expande (<details>) con «Cómo se gana» y «Qué cumplir». En móvil, la fila se apila.
 */
export function EscaleraVidas({ residuo, modoMype = false, abiertaInicial = 0, className = "" }: EscaleraVidasProps) {
  const nombre = nombreCorto(residuo.nombre);
  const soloGestor = residuo.vidas.length > 0 && residuo.vidas.every((v) => v.nivel === "DISPOSICION");

  return (
    <div className={className}>
      {soloGestor && (
        <p className="mb-3 flex items-center gap-2 rounded-control border border-ambar-200 bg-ambar-50 px-3 py-2 text-sm font-medium text-ambar-800">
          <Icono nombre="alerta" size={16} />
          Solo gestor autorizado
        </p>
      )}
      <div role="group" aria-label={`Usos de ${nombre}, del mejor al último`} className="overflow-hidden rounded-card border border-line bg-white shadow-card">
        <div aria-hidden="true" className={`hidden gap-x-3 bg-surface-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-500 md:grid ${COLUMNAS}`}>
          <span>Uso</span>
          <span>Nivel</span>
          <span>Valor</span>
          <span>Evidencia</span>
          <span>Quién lo compra</span>
          <span />
        </div>
        <ol className="divide-y divide-line md:border-t md:border-line">
          {residuo.vidas.map((v, i) => {
            const estilo = ESTILO_NIVEL[v.nivel];
            const nivel = NIVELES[v.nivel];
            const requierePlanta = modoMype && v.escala === "INDUSTRIAL";
            const destinos = v.destinos.map((d) => nombreTipoDestino(d, true) ?? d);
            return (
              <li key={`${i}-${v.uso}`} className={requierePlanta ? "opacity-70" : ""}>
                <details open={abiertaInicial === i} className="group">
                  <summary className={`grid min-h-12 cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 px-4 py-3 hover:bg-surface-2/60 md:py-2.5 [&::-webkit-details-marker]:hidden ${COLUMNAS}`}>
                    <span className="min-w-0 text-sm font-semibold leading-snug text-ink-900">
                      {v.uso}
                      {i === 0 && <span className="ml-2 whitespace-nowrap rounded-md bg-pri-50 px-1.5 py-0.5 align-middle text-[11px] font-medium text-pri-700">Empieza aquí</span>}
                    </span>
                    <Icono nombre="flecha" size={16} className="col-start-2 row-start-1 shrink-0 text-ink-400 transition-transform group-open:rotate-90 md:order-last md:col-auto md:row-auto" />
                    <span className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1 md:contents">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-700">
                        <span aria-hidden="true" className={`num grid size-5 shrink-0 place-items-center rounded-md text-[11px] font-semibold ${estilo.circulo}`}>{nivel.orden}</span>
                        <span className="sr-only">{`Nivel ${nivel.orden}: `}</span>
                        {nivel.nombre}
                      </span>
                      <ValorMonedas valor={v.valor} />
                      <span className="flex flex-wrap items-center gap-1">
                        <SelloEvidencia evidencia={v.evidencia} />
                        <ChipEscala escala={v.escala} />
                        {requierePlanta && <span className="text-[11px] font-medium text-ink-700">Requiere planta</span>}
                      </span>
                    </span>
                    <span className="col-span-2 line-clamp-2 text-xs text-ink-500 md:col-span-1" aria-label={`Lo recibe: ${destinos.join(", ")}`}>
                      <span className="font-medium text-ink-700 md:hidden">Compra: </span>
                      {destinos.length > 0 ? destinos.join(" · ") : "Gestor autorizado"}
                    </span>
                  </summary>
                  <div className="grid gap-4 border-t border-line bg-surface-2/50 px-4 py-3.5 text-sm text-ink-700 md:grid-cols-2">
                    <div>
                      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
                        <Icono nombre="dinero" size={14} />
                        Cómo se gana
                      </p>
                      <p className="mt-1">{v.negocio}</p>
                    </div>
                    <div>
                      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
                        <Icono nombre="check" size={14} />
                        Qué cumplir
                      </p>
                      <p className="mt-1">{v.requisitos}</p>
                    </div>
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
