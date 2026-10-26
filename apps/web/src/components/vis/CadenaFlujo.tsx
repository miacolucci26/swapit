import Link from "next/link";
import type { Cadena, Etapa, Residuo, Sector } from "@swapit/shared";
import { Icono } from "./Iconos";
import { PuntoCategoria } from "../ui";
import { ValorMonedas, nombreCorto } from "./EscaleraVidas";

/**
 * Acentos por sector (clases literales para que Tailwind las detecte). Estilo ejecutivo: superficies neutras y una
 * línea/punto de color de la categoría; el texto va en navy.
 */
export const CLASE_SECTOR: Record<Sector, { texto: string; fondo: string; borde: string; linea: string; nodo: string }> = {
  AGRO: { texto: "text-nav-800", fondo: "bg-surface-2", borde: "border-line", linea: "bg-cat-agro", nodo: "bg-nav-700 text-white" },
  AGROINDUSTRIA: { texto: "text-nav-800", fondo: "bg-surface-2", borde: "border-line", linea: "bg-cat-agro", nodo: "bg-nav-700 text-white" },
  PESCA: { texto: "text-nav-800", fondo: "bg-surface-2", borde: "border-line", linea: "bg-cat-pesca", nodo: "bg-nav-700 text-white" },
  TEXTIL: { texto: "text-nav-800", fondo: "bg-surface-2", borde: "border-line", linea: "bg-cat-textil", nodo: "bg-nav-700 text-white" },
  MANUFACTURA: { texto: "text-nav-800", fondo: "bg-surface-2", borde: "border-line", linea: "bg-cat-otros", nodo: "bg-nav-700 text-white" },
  SERVICIOS: { texto: "text-nav-800", fondo: "bg-surface-2", borde: "border-line", linea: "bg-nav-600", nodo: "bg-nav-700 text-white" },
  OTRO: { texto: "text-nav-800", fondo: "bg-surface-2", borde: "border-line", linea: "bg-cat-otros", nodo: "bg-nav-700 text-white" },
};

export interface CadenaFlujoProps {
  cadena: Cadena;
  /** Ids de las etapas marcadas (donde trabaja la persona). */
  resaltar?: readonly string[];
  /** Si existe, cada etapa es un botón (aria-pressed). Úsalo desde un componente cliente. */
  onAlternarEtapa?: (etapaId: string) => void;
  /** Ruta de cada residuo (por defecto /aprovechamiento/residuo/{id}). */
  hrefResiduo?: (r: Residuo) => string;
  className?: string;
}

function CabeceraEtapa({
  etapa,
  numero,
  marcada,
  onAlternar,
}: {
  etapa: Etapa;
  numero: number;
  marcada: boolean;
  onAlternar?: (id: string) => void;
}) {
  const interior = (
    <>
      <span className="flex items-center gap-2">
        <span aria-hidden="true" className={`num grid size-6 shrink-0 place-items-center rounded-md text-xs font-semibold ${marcada ? "bg-pri-600 text-white" : "bg-nav-700 text-white"}`}>
          {marcada ? <Icono nombre="check" size={14} /> : numero}
        </span>
        <span className="min-w-0 flex-1 text-left text-sm font-semibold leading-tight text-nav-900">{etapa.nombre}</span>
        {onAlternar && marcada && <span className="shrink-0 text-[11px] font-medium text-pri-700">Aquí trabajo</span>}
      </span>
      {etapa.que && <span className="mt-1.5 block text-left text-xs leading-snug text-ink-500">{etapa.que}</span>}
    </>
  );
  const base = `block w-full rounded-control border px-3 py-2.5 ${marcada ? "border-pri-600 bg-pri-50" : "border-line bg-white"}`;
  if (onAlternar) {
    return (
      <button type="button" aria-pressed={marcada} onClick={() => onAlternar(etapa.id)} className={`${base} cursor-pointer hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nav-600`}>
        {interior}
      </button>
    );
  }
  return (
    <div className={base}>
      <span className="sr-only">{`Etapa ${numero}${marcada ? ", marcada" : ""}: `}</span>
      {interior}
    </div>
  );
}

function FilaResiduo({ residuo, href }: { residuo: Residuo; href: string }) {
  const primera = residuo.vidas[0];
  const usos = residuo.vidas.length;
  return (
    <Link
      href={href}
      aria-label={`${residuo.nombre}: ${usos} ${usos === 1 ? "uso" : "usos"}`}
      className="group flex min-h-11 items-center gap-2 border-t border-line px-3 py-2 first:border-t-0 hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nav-600"
    >
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-[13px] font-medium leading-tight text-ink-900 group-hover:underline">{nombreCorto(residuo.nombre)}</span>
        <PuntoCategoria codigo={residuo.categoria} className="mt-0.5" />
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5">
        {primera && <ValorMonedas valor={primera.valor} />}
        <span className="num text-[11px] text-ink-500">{usos} {usos === 1 ? "uso" : "usos"}</span>
      </span>
    </Link>
  );
}

/**
 * Proceso productivo de una cadena: etapas en columnas (con flechas finas) y, debajo de cada una, los residuos que salen
 * como filas compactas con su punto de categoría, el valor del mejor uso y el número de usos. Horizontal desde `md`;
 * en móvil, las etapas se apilan.
 */
export function CadenaFlujo({ cadena, resaltar = [], onAlternarEtapa, hrefResiduo, className = "" }: CadenaFlujoProps) {
  const nEtapas = cadena.etapas.length;
  const nResiduos = cadena.etapas.reduce((a, e) => a + e.residuos.length, 0);
  const href = hrefResiduo ?? ((r: Residuo) => `/aprovechamiento/residuo/${r.id}`);

  return (
    <figure className={className} aria-label={`Cadena de ${cadena.nombre}`}>
      <figcaption className="sr-only">
        {`Cadena de ${cadena.nombre}: ${nEtapas} ${nEtapas === 1 ? "etapa" : "etapas"} y ${nResiduos} ${nResiduos === 1 ? "residuo" : "residuos"}`}
      </figcaption>
      <ol style={{ "--n": nEtapas } as React.CSSProperties} className="grid grid-cols-1 gap-y-5 md:grid-cols-[repeat(var(--n),minmax(0,1fr))] md:gap-x-6 md:gap-y-0">
        {cadena.etapas.map((etapa, i) => {
          const ultima = i === nEtapas - 1;
          return (
            <li key={etapa.id} className="relative">
              {/* Flecha fina a la etapa siguiente: a la derecha en escritorio, hacia abajo en móvil */}
              {!ultima && (
                <>
                  <span aria-hidden="true" className="absolute -right-[18px] top-3.5 z-10 hidden size-3 text-ink-400 md:block"><Icono nombre="flecha" size={12} /></span>
                  <span aria-hidden="true" className="absolute -bottom-[18px] left-5 z-10 size-3 rotate-90 text-ink-400 md:hidden"><Icono nombre="flecha" size={12} /></span>
                </>
              )}
              <CabeceraEtapa etapa={etapa} numero={i + 1} marcada={resaltar.includes(etapa.id)} onAlternar={onAlternarEtapa} />
              <ul aria-label={`Residuos de ${etapa.nombre}`} className="mt-2 overflow-hidden rounded-control border border-line bg-white">
                {etapa.residuos.map((r) => (
                  <li key={r.id}>
                    <FilaResiduo residuo={r} href={href(r)} />
                  </li>
                ))}
                {etapa.residuos.length === 0 && <li className="px-3 py-2.5 text-xs text-ink-500">Sin residuos registrados</li>}
              </ul>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
