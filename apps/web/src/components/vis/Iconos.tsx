import type { ReactNode } from "react";

/**
 * Íconos de interfaz de Swap It: trazo uniforme de 2 px, extremos y uniones
 * redondeados, lienzo 24×24, color heredado (`currentColor`). Dibujados a mano.
 */

export type NombreIcono =
  | "inicio"
  | "red"
  | "material"
  | "precio"
  | "certificado"
  | "facturacion"
  | "whatsapp"
  | "asistente"
  | "empresa"
  | "aprovechamiento"
  | "destinos"
  | "acuerdos"
  | "camion"
  | "balanza"
  | "check"
  | "alerta"
  | "flecha"
  | "mas"
  | "buscar"
  | "descargar"
  | "telefono"
  | "ubicacion"
  | "calendario"
  | "candado"
  | "info"
  | "cerrar"
  | "menu"
  | "reloj"
  | "dinero"
  | "reciclar"
  | "hoja"
  | "gota"
  | "fabrica"
  | "grafico"
  | "sol"
  | "mar";

/** Flecha del símbolo de reciclaje: borde inferior hacia la izquierda. */
const FlechaCiclo = () => (
  <>
    <path d="M17 19.5H8.5" />
    <path d="M11.5 16.5 8.5 19.5l3 3" />
  </>
);

const DIBUJOS: Record<NombreIcono, ReactNode> = {
  inicio: (
    <>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v10h13V10" />
      <path d="M10 20v-5.5h4V20" />
    </>
  ),
  red: (
    <>
      <circle cx="12" cy="5.5" r="2.5" />
      <circle cx="5" cy="18" r="2.5" />
      <circle cx="19" cy="18" r="2.5" />
      <path d="M10.8 7.8 6.2 15.7M13.2 7.8l4.6 7.9M7.5 18h9" />
    </>
  ),
  material: (
    <>
      <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </>
  ),
  precio: (
    <>
      <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h7a1.5 1.5 0 0 1 1.1.4l8 8a1.5 1.5 0 0 1 0 2.2l-7 7a1.5 1.5 0 0 1-2.2 0l-8-8A1.5 1.5 0 0 1 3 11.5z" />
      <circle cx="8" cy="8" r="1.3" />
    </>
  ),
  certificado: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="M8.6 14.2 7 22l5-3 5 3-1.6-7.8" />
      <path d="m9.5 9 1.8 1.8 3.2-3.4" />
    </>
  ),
  facturacion: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9.5 8h5M9.5 12h5" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M3 21l1.6-5A9 9 0 1 1 8.2 19.4z" />
      <path d="M9 8.5c.2 3.3 2.4 5.9 6 6.5l1.3-1.5-2.1-1.2-1 .9a4 4 0 0 1-1.9-1.9l.9-1L10.9 7z" />
    </>
  ),
  asistente: (
    <>
      <path d="M10 3.5c.6 4.2 2.3 5.9 6.5 6.5-4.2.6-5.9 2.3-6.5 6.5-.6-4.2-2.3-5.9-6.5-6.5 4.2-.6 5.9-2.3 6.5-6.5z" />
      <path d="M18.5 15v5M16 17.5h5" />
    </>
  ),
  empresa: (
    <>
      <path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16" />
      <path d="M14 10h5a1 1 0 0 1 1 1v10" />
      <path d="M2 21h20M8 8h2M8 12h2M8 16h2" />
    </>
  ),
  aprovechamiento: (
    <>
      <path d="M3 21h5v-5h5v-5h5V6" />
      <path d="m14.5 8.5 3.5-4 3.5 4" />
    </>
  ),
  destinos: (
    <>
      <path d="M12 21v-8L6 5.5" />
      <path d="m12 13 6-7.5" />
      <path d="M6 10.5V5.5h5M13 5.5h5v5" />
    </>
  ),
  acuerdos: (
    <>
      <path d="M17 3l4 4-4 4" />
      <path d="M21 7H9" />
      <path d="M7 21l-4-4 4-4" />
      <path d="M3 17h12" />
    </>
  ),
  camion: (
    <>
      <path d="M2 5.5h12V16H2z" />
      <path d="M14 8.5h4.5L22 12v4h-8" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17.5" cy="18" r="2" />
    </>
  ),
  balanza: (
    <>
      <path d="M12 3v18M7 21h10M5 7h14" />
      <path d="M5 7l-3 7a3 3 0 0 0 6 0z" />
      <path d="M19 7l-3 7a3 3 0 0 0 6 0z" />
    </>
  ),
  check: <path d="M4.5 12.5 9.5 17.5 19.5 7" />,
  alerta: (
    <>
      <path d="M10.3 4.3 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" />
      <path d="M12 10v4M12 17.5v.01" />
    </>
  ),
  flecha: <path d="M5 12h14M13 6l6 6-6 6" />,
  mas: <path d="M12 5v14M5 12h14" />,
  buscar: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5.5 5.5" />
    </>
  ),
  descargar: <path d="M12 4v11M7 10.5l5 5 5-5M4 20h16" />,
  telefono: (
    <path d="M5 4h3.5l2 5-2.3 1.5a11 11 0 0 0 5.3 5.3L15 13.5l5 2V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  ),
  ubicacion: (
    <>
      <path d="M12 21.5s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  calendario: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  candado: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.5v.01" />
    </>
  ),
  cerrar: <path d="M6 6l12 12M18 6 6 18" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  reloj: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  dinero: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12v.01M18 12v.01" />
    </>
  ),
  reciclar: (
    <>
      <FlechaCiclo />
      <g transform="rotate(120 12 14)">
        <FlechaCiclo />
      </g>
      <g transform="rotate(240 12 14)">
        <FlechaCiclo />
      </g>
    </>
  ),
  hoja: (
    <>
      <path d="M20 4C10 4 4.5 8.5 4.5 15c0 1.8.5 3.2 1.5 4.2 1 .9 2.4 1 4 .8C17 19 20 13 20 4z" />
      <path d="M4 21c2-5 6-9 11-12" />
    </>
  ),
  gota: <path d="M12 3s-7 7.5-7 12.5a7 7 0 0 0 14 0C19 10.5 12 3 12 3z" />,
  fabrica: (
    <>
      <path d="M3 21V13l6 3.5V13l6 3.5V4h6v17z" />
      <path d="M17.5 9h.01M17.5 13h.01" />
    </>
  ),
  grafico: (
    <>
      <path d="M4 4v16h16" />
      <path d="M9 16v-4M13 16V8M17 16v-6" />
    </>
  ),
  sol: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  mar: (
    <>
      <path d="M2 6q2-3 4 0t4 0 4 0 4 0 4 0" />
      <path d="M2 12q2-3 4 0t4 0 4 0 4 0 4 0" />
      <path d="M2 18q2-3 4 0t4 0 4 0 4 0 4 0" />
    </>
  ),
};

export function Icono({
  nombre,
  size = 20,
  className,
  titulo,
}: {
  nombre: NombreIcono;
  size?: number;
  className?: string;
  titulo?: string;
}) {
  const a11y = titulo ? { role: "img" as const } : { "aria-hidden": true as const };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      focusable="false"
      {...a11y}
    >
      {titulo ? <title>{titulo}</title> : null}
      {DIBUJOS[nombre]}
    </svg>
  );
}
