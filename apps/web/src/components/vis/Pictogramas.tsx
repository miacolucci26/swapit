import type { ReactNode } from "react";

/**
 * Librería de 12 pictogramas de Swap It.
 * Estilo (docs/diseno/referencias-visuales.md §5): formas planas de 3 tonos
 * (base + sombra + luz), sin contornos, esquinas redondeadas, lienzo 64×64
 * con margen de 4 px. Los colores salen de los tokens CSS de la paleta; el
 * segundo argumento de `var()` es un respaldo por si el token aún no está
 * declarado en `@theme`.
 */

export type PictogramaId =
  | "mango"
  | "limon"
  | "arroz"
  | "cana"
  | "concha"
  | "pescado"
  | "textil"
  | "plastico"
  | "carton"
  | "madera"
  | "aceite"
  | "acopio";

export const PICTOGRAMAS: PictogramaId[] = [
  "mango",
  "limon",
  "arroz",
  "cana",
  "concha",
  "pescado",
  "textil",
  "plastico",
  "carton",
  "madera",
  "aceite",
  "acopio",
];

const tk = (nombre: string, respaldo: string) => `var(--color-${nombre}, ${respaldo})`;

// Tokens de la paleta
const SOL_100 = tk("pri-100", "#C8E7DF");
const SOL_200 = tk("pri-200", "#9ED3C6");
const SOL_500 = tk("pri-600", "#0B6B57");
const SOL_600 = tk("pri-700", "#085646");
const SOL_900 = tk("pri-900", "#05352B");
const MARINO_200 = tk("nav-200", "#B8C6DE");
const MARINO_600 = tk("nav-600", "#2D4A78");
const MARINO_700 = tk("nav-700", "#1F3A64");
const MARINO_900 = tk("nav-900", "#0F2140");
const LIMON_100 = tk("ambar-100", "#FDEBC0");
const LIMON_400 = tk("ambar-300", "#F4C152");
const ALERTA = tk("alerta", "#F5B800");
const AGRO = tk("agro", "#2B8412");
const AGRO_INK = tk("agro-ink", "#1C5A0B");
const PESCA = tk("pesca", "#0A7F96");
const PESCA_INK = tk("pesca-ink", "#0A5163");
const TEXTIL = tk("textil", "#C42885");
const TEXTIL_TINT = tk("textil-tint", "#FCE6F2");
const TEXTIL_INK = tk("textil-ink", "#86175A");
const PLASTICO = tk("plastico", "#8B3FD9");
const PLASTICO_TINT = tk("plastico-tint", "#F0E6FC");
const PLASTICO_INK = tk("plastico-ink", "#51269A");
const OTROS = tk("otros", "#8B5A2B");
const OTROS_INK = tk("otros-ink", "#5C3A18");

// Tonos fijos inevitables (no existen como token)
const AGUA_CLARA = "#7FD3E3"; // vientre del pescado
const VERDE_LUZ = "#6BBF4A"; // hoja iluminada
const GRANO = "#E8C547"; // arroz
const GRANO_SOMBRA = "#C9A12A";
const GRANO_LUZ = "#F6E3A0";
const CONCHA = "#F4A6A0";
const CONCHA_SOMBRA = "#E0817B";
const MADERA = "#C99A63";

/** Espiga de arroz dibujada hacia arriba desde el origen local (0,0). */
const Espiga = () => (
  <>
    <ellipse cx="0" cy="-23" rx="2.6" ry="4.2" fill={GRANO_LUZ} />
    <ellipse cx="-3.6" cy="-5" rx="2.5" ry="4.4" transform="rotate(-24 -3.6 -5)" fill={GRANO} />
    <ellipse cx="3.6" cy="-5" rx="2.5" ry="4.4" transform="rotate(24 3.6 -5)" fill={GRANO_SOMBRA} />
    <ellipse cx="-3.6" cy="-12" rx="2.5" ry="4.4" transform="rotate(-24 -3.6 -12)" fill={GRANO} />
    <ellipse cx="3.6" cy="-12" rx="2.5" ry="4.4" transform="rotate(24 3.6 -12)" fill={GRANO_SOMBRA} />
    <ellipse cx="-3.2" cy="-18.5" rx="2.3" ry="4" transform="rotate(-20 -3.2 -18.5)" fill={GRANO} />
    <ellipse cx="3.2" cy="-18.5" rx="2.3" ry="4" transform="rotate(20 3.2 -18.5)" fill={GRANO_SOMBRA} />
  </>
);

const DIBUJOS: Record<PictogramaId, ReactNode> = {
  // ── Mango ────────────────────────────────────────────────────────────
  mango: (
    <>
      <path d="M32 12c15 0 24 12 22 26-2 12-13 18-25 14C17 48 9 37 12 27 15 18 22 12 32 12z" fill={SOL_500} />
      <path d="M46 15c7 7 8 17 5 26-3 8-10 12-18 11 11-4 17-14 14-26-.5-4-1-8-1-11z" fill={SOL_600} />
      <ellipse cx="22" cy="29" rx="3.8" ry="8" transform="rotate(18 22 29)" fill={SOL_200} />
      <path d="M33 13c1-6 8-9 15-7-1 6-8 10-15 7z" fill={AGRO} />
      <path d="M32 13c0-3 1-5 2-7" stroke={SOL_900} strokeWidth="3" strokeLinecap="round" fill="none" />
    </>
  ),
  // ── Limón ────────────────────────────────────────────────────────────
  limon: (
    <>
      <path d="M8 32C8 22 18 14 32 14s24 8 24 18-10 18-24 18S8 42 8 32z" fill={LIMON_400} />
      <circle cx="6.5" cy="32" r="3.5" fill={LIMON_400} />
      <circle cx="57.5" cy="32" r="3.5" fill={LIMON_400} />
      <path d="M12 39c8 14 34 14 42-2-2 8-10 13-22 13-10 0-18-4-20-11z" fill={ALERTA} />
      <ellipse cx="23" cy="25" rx="7" ry="3" transform="rotate(-25 23 25)" fill={LIMON_100} />
      <path d="M32 14c1-5 6-8 12-7-1 5-6 8-12 7z" fill={AGRO} />
    </>
  ),
  // ── Arroz: tres espigas curvas ───────────────────────────────────────
  arroz: (
    <>
      <path d="M31 59C30 49 20 43 17 35" stroke={AGRO} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M33 59C34 49 44 43 47 35" stroke={AGRO} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M32 59V33" stroke={AGRO_INK} strokeWidth="3" strokeLinecap="round" fill="none" />
      <g transform="translate(17 35) rotate(-20)">
        <Espiga />
      </g>
      <g transform="translate(47 35) rotate(20)">
        <Espiga />
      </g>
      <g transform="translate(32 33)">
        <Espiga />
      </g>
      <rect x="25" y="49" width="14" height="5" rx="2.5" fill={SOL_600} />
    </>
  ),
  // ── Caña: dos tallos con nudos y hojas largas ────────────────────────
  cana: (
    <>
      <path d="M36 20C28 6 14 8 6 20c10-5 20-3 30 4z" fill={VERDE_LUZ} />
      <path d="M43 20C49 6 59 8 61 20c-6-6-12-6-18 4z" fill={AGRO} />
      <rect x="15" y="26" width="12" height="34" rx="6" fill={AGRO} />
      <rect x="22" y="26" width="5" height="34" rx="2.5" fill={AGRO_INK} />
      <rect x="17.5" y="30" width="2.6" height="26" rx="1.3" fill={VERDE_LUZ} />
      <rect x="15" y="38" width="12" height="3.4" rx="1.7" fill={AGRO_INK} />
      <rect x="15" y="50" width="12" height="3.4" rx="1.7" fill={AGRO_INK} />
      <rect x="32" y="14" width="13" height="46" rx="6.5" fill={AGRO} />
      <rect x="39.5" y="14" width="5.5" height="46" rx="2.75" fill={AGRO_INK} />
      <rect x="34.6" y="18" width="2.8" height="38" rx="1.4" fill={VERDE_LUZ} />
      <rect x="32" y="26" width="13" height="3.4" rx="1.7" fill={AGRO_INK} />
      <rect x="32" y="38" width="13" height="3.4" rx="1.7" fill={AGRO_INK} />
      <rect x="32" y="50" width="13" height="3.4" rx="1.7" fill={AGRO_INK} />
    </>
  ),
  // ── Concha de abanico ────────────────────────────────────────────────
  concha: (
    <>
      <path
        d="M32 56C20 52 7 40 2.6 23.3A9 9 0 0 1 16.2 14.9 9 9 0 0 1 32 12 9 9 0 0 1 47.8 14.9 9 9 0 0 1 61.4 23.3C57 40 44 52 32 56z"
        fill={CONCHA}
      />
      <path d="M32 56C20 52 7 40 2.6 23.3A9 9 0 0 1 16.2 14.9z" fill={TEXTIL_TINT} />
      <path d="M32 56 47.8 14.9A9 9 0 0 1 61.4 23.3C57 40 44 52 32 56z" fill={CONCHA_SOMBRA} />
      <path
        d="M32 54 16.2 14.9M32 54V12M32 54 47.8 14.9"
        stroke={CONCHA_SOMBRA}
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M22 62 18 49H46L42 62z" fill={SOL_200} />
      <path d="M32 49H46L42 62H32z" fill={SOL_500} />
    </>
  ),
  // ── Pescado ──────────────────────────────────────────────────────────
  pescado: (
    <>
      <path d="M6 32C14 18 36 16 46 28L58 18l-2 14 2 14-12-10C36 48 14 46 6 32z" fill={PESCA} />
      <path d="M9 35c10 10 27 10 37 1l4 3C38 52 17 49 9 35z" fill={AGUA_CLARA} />
      <path d="M26 21c4-8 12-7 14 1z" fill={PESCA_INK} />
      <circle cx="18" cy="30" r="3" fill="#FFFFFF" />
      <circle cx="18.6" cy="30" r="1.4" fill={MARINO_900} />
    </>
  ),
  // ── Textil: rollo de tela ────────────────────────────────────────────
  textil: (
    <>
      <ellipse cx="52" cy="32" rx="8" ry="16" fill={TEXTIL_INK} />
      <rect x="20" y="16" width="32" height="32" fill={TEXTIL} />
      <path d="M31 16h6L29 48h-6zM45 16h6L43 48h-6z" fill={TEXTIL_TINT} />
      <rect x="20" y="40" width="32" height="8" fill={TEXTIL_INK} fillOpacity=".35" />
      <ellipse cx="20" cy="32" rx="8" ry="16" fill={TEXTIL_TINT} />
      <ellipse cx="20" cy="32" rx="4.6" ry="9.5" fill={TEXTIL} />
      <ellipse cx="20" cy="32" rx="1.8" ry="3.6" fill={TEXTIL_INK} />
    </>
  ),
  // ── Plástico: botella ────────────────────────────────────────────────
  plastico: (
    <>
      <rect x="26" y="4" width="12" height="7" rx="2.5" fill={PLASTICO_INK} />
      <path
        d="M27 10h10v8c0 6 9 6 9 14v22a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4V32c0-8 9-8 9-14z"
        fill={PLASTICO}
      />
      <path d="M39 25c4 3 7 4 7 8v21a4 4 0 0 1-4 4h-3z" fill={PLASTICO_INK} />
      <rect x="18" y="34" width="28" height="12" fill={PLASTICO_TINT} />
      <rect x="18" y="38" width="28" height="4" fill={PLASTICO} />
      <rect x="21.5" y="26" width="3.4" height="5" rx="1.7" fill={PLASTICO_TINT} />
      <rect x="21.5" y="49" width="3.4" height="6" rx="1.7" fill={PLASTICO_TINT} />
    </>
  ),
  // ── Cartón: caja con cinta ───────────────────────────────────────────
  carton: (
    <>
      <rect x="7" y="16" width="50" height="42" rx="4" fill={OTROS} />
      <path d="M49 30h8v24a4 4 0 0 1-4 4h-4z" fill={OTROS_INK} fillOpacity=".5" />
      <path d="M7 30v-10a4 4 0 0 1 4-4h42a4 4 0 0 1 4 4v10z" fill={SOL_200} />
      <rect x="7" y="29" width="50" height="3" fill={OTROS_INK} fillOpacity=".4" />
      <rect x="26" y="16" width="12" height="20" rx="2" fill={SOL_100} />
      <rect x="13" y="40" width="12" height="5" rx="2.5" fill={OTROS_INK} />
      <rect x="39" y="42" width="11" height="10" rx="2" fill={SOL_100} />
      <rect x="41.5" y="45" width="6" height="2" rx="1" fill={OTROS} />
    </>
  ),
  // ── Madera: tronco en corte ──────────────────────────────────────────
  madera: (
    <>
      <circle cx="32" cy="32" r="27" fill={OTROS_INK} />
      <circle cx="32" cy="32" r="22.5" fill={MADERA} />
      <circle cx="32" cy="32" r="15" fill="none" stroke={OTROS} strokeWidth="3" />
      <circle cx="32" cy="32" r="7.5" fill="none" stroke={OTROS} strokeWidth="3" />
      <circle cx="32" cy="32" r="2.5" fill={OTROS} />
      <path d="M32 32 54 25.5 54.5 31z" fill={OTROS_INK} />
      <path d="M17.5 21A18 18 0 0 1 28 14" stroke={SOL_200} strokeWidth="3" strokeLinecap="round" fill="none" />
    </>
  ),
  // ── Aceite: gota y bidón ─────────────────────────────────────────────
  aceite: (
    <>
      <path d="M39 33a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v21a4 4 0 0 1-4 4H43a4 4 0 0 1-4-4z" fill={OTROS_INK} />
      <rect x="47" y="22" width="7" height="7" rx="2" fill={SOL_600} />
      <rect x="42" y="35" width="14" height="14" rx="2.5" fill={LIMON_400} />
      <path d="M49 38c0 0-3 3.4-3 5.2a3 3 0 0 0 6 0c0-1.8-3-5.2-3-5.2z" fill={SOL_600} />
      <path d="M21 6C21 6 5 22 5 37a16 16 0 0 0 32 0C37 22 21 6 21 6z" fill={LIMON_400} />
      <path d="M31 21c3 5 6 10 6 16a16 16 0 0 1-16 16c9-3 13-9 12-16-.5-5-1-10-2-16z" fill={SOL_600} />
      <ellipse cx="14.5" cy="37" rx="2.6" ry="6" transform="rotate(8 14.5 37)" fill={LIMON_100} />
    </>
  ),
  // ── Acopio: camión ───────────────────────────────────────────────────
  acopio: (
    <>
      <rect x="5" y="16" width="34" height="28" rx="3" fill={MARINO_600} />
      <rect x="5" y="36" width="34" height="8" fill={MARINO_700} />
      <rect x="12" y="23" width="10" height="9" rx="2" fill={SOL_100} />
      <rect x="25" y="23" width="8" height="9" rx="2" fill={MARINO_200} />
      <path d="M39 27h10l9 9v8H39z" fill={SOL_500} />
      <path d="M43 30h5l5 5H43z" fill={SOL_100} />
      <circle cx="18" cy="46" r="6.5" fill={MARINO_900} />
      <circle cx="18" cy="46" r="2.5" fill={MARINO_200} />
      <circle cx="48" cy="46" r="6.5" fill={MARINO_900} />
      <circle cx="48" cy="46" r="2.5" fill={MARINO_200} />
    </>
  ),
};

export function Pictograma({
  id,
  size = 48,
  className,
  titulo,
}: {
  id: PictogramaId;
  size?: number;
  className?: string;
  titulo?: string;
}) {
  const a11y = titulo ? { role: "img" as const } : { "aria-hidden": true as const };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      focusable="false"
      {...a11y}
    >
      {titulo ? <title>{titulo}</title> : null}
      {DIBUJOS[id]}
    </svg>
  );
}

/**
 * Pictograma de una cadena (ids de packages/shared/src/cadenas-datos.ts).
 * Para `empaques-y-apoyo` se decide por el residuo.
 */
export const pictogramaDeCadena = (cadenaId: string, residuoId?: string): PictogramaId => {
  switch (cadenaId) {
    case "mango":
      return "mango";
    case "limon":
      return "limon";
    // Sin pictograma propio: se usa el más cercano (fruta cítrica/amarilla).
    case "uva":
    case "palta-arandano":
    case "banano":
      return "limon";
    // Cacao: fruta de pepas y cáscara gruesa, la más parecida es el mango.
    case "cacao":
      return "mango";
    case "arroz":
      return "arroz";
    case "cana":
      return "cana";
    case "concha-abanico":
      return "concha";
    case "pesca-crustaceos":
      return "pescado";
    case "algodon-textil":
      return "textil";
    case "empaques-y-apoyo":
      return pictogramaDeResiduoEmpaque(residuoId);
    default:
      return "acopio";
  }
};

const pictogramaDeResiduoEmpaque = (residuoId?: string): PictogramaId => {
  if (!residuoId) return "acopio";
  if (residuoId.startsWith("plastico-") || residuoId === "eps-tecnopor") return "plastico";
  if (residuoId === "redes-pesca") return "pescado";
  if (residuoId === "carton-corrugado") return "carton";
  if (residuoId === "madera-pallets") return "madera";
  if (residuoId.startsWith("aceite-")) return "aceite";
  // metal-chatarra, raee-equipos, envases-agroquimicos y el resto
  return "acopio";
};
