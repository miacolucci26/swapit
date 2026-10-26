import { Icono, type NombreIcono } from "./Iconos";
import type { PictogramaId } from "./Pictogramas";

export interface PasoRecorrido {
  icono?: NombreIcono;
  /** Heredado: los pictogramas ya no se dibujan en el estilo ejecutivo. */
  pictograma?: PictogramaId;
  /** Cifra o dato clave. */
  dato: string;
  /** Frase corta (≤ 8 palabras). */
  frase: string;
}

export type ColorRecorrido = "sol" | "marino" | "agro" | "pesca" | "textil" | "plastico" | "otros" | "exito";

// Solo acentúa la línea superior de cada paso (clases literales para Tailwind).
const LINEA: Record<ColorRecorrido, string> = {
  sol: "border-pri-600",
  exito: "border-pri-600",
  marino: "border-nav-600",
  agro: "border-cat-agro",
  pesca: "border-cat-pesca",
  textil: "border-cat-textil",
  plastico: "border-cat-plastico",
  otros: "border-cat-otros",
};

export interface RecorridoIlustradoProps {
  /** 4–5 pasos. */
  pasos: PasoRecorrido[];
  color?: ColorRecorrido;
  /** Título accesible de la lista. */
  titulo?: string;
  className?: string;
}

/**
 * Recorrido de 4–5 pasos en columnas con una línea superior de acento: número, dato clave y frase. Una columna en móvil,
 * horizontal desde `md`. Sin ilustraciones ni animación.
 */
export function RecorridoIlustrado({ pasos, color = "sol", titulo, className = "" }: RecorridoIlustradoProps) {
  return (
    <ol aria-label={titulo ?? `Recorrido en ${pasos.length} pasos`} className={`grid gap-3 md:grid-cols-[repeat(var(--n),minmax(0,1fr))] ${className}`} style={{ "--n": pasos.length } as React.CSSProperties}>
      {pasos.map((p, i) => (
        <li key={i} className={`rounded-card border border-line border-t-2 bg-white p-3.5 ${LINEA[color]}`}>
          <p className="flex items-center gap-2 text-xs font-medium text-ink-500">
            <span aria-hidden="true" className="num grid size-5 place-items-center rounded-md bg-nav-50 text-[11px] font-semibold text-nav-700">{i + 1}</span>
            {p.icono && <Icono nombre={p.icono} size={14} className="text-nav-600" />}
          </p>
          <p className="mt-2 text-lg font-semibold leading-tight text-nav-900">{p.dato}</p>
          <p className="mt-1 text-sm leading-snug text-ink-700">{p.frase}</p>
        </li>
      ))}
    </ol>
  );
}
