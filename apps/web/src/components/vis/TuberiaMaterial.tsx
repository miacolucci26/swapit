import Link from "next/link";
import { Icono, type NombreIcono } from "./Iconos";

type EtapaTuberia = "REPORTADO" | "COTIZADO" | "ACOPIADO" | "DESPACHADO";

interface DefEtapa {
  estado: EtapaTuberia;
  nombre: string;
  /** Verbo de lo que toca hacer con los lotes de esta etapa. */
  accion: string;
  icono: NombreIcono;
}

const ETAPAS: DefEtapa[] = [
  { estado: "REPORTADO", nombre: "Reportado", accion: "Cotizar", icono: "whatsapp" },
  { estado: "COTIZADO", nombre: "Cotizado", accion: "Recoger", icono: "balanza" },
  { estado: "ACOPIADO", nombre: "Acopiado", accion: "Despachar", icono: "material" },
  { estado: "DESPACHADO", nombre: "Despachado", accion: "Certificar", icono: "camion" },
];

export interface TuberiaMaterialProps {
  /** Lotes por estado (ResumenIntermediario["porEstado"]). */
  porEstado: Record<string, number>;
  /** Despachados que aún no tienen certificado. */
  porCertificar?: number;
  /** Destino del toque en cada etapa (por defecto /material?estado=...). */
  href?: (estado: string) => string;
  className?: string;
}

/**
 * Ciclo del material en 4 columnas de una franja de reporte: REPORTADO → COTIZADO → ACOPIADO → DESPACHADO (+ certificado).
 * La etapa con más lotes por atender (entre las tres primeras) se marca en ámbar con su verbo.
 */
export function TuberiaMaterial({ porEstado, porCertificar = 0, href, className = "" }: TuberiaMaterialProps) {
  const enlace = href ?? ((e: string) => `/material?estado=${e}`);
  const n = (e: string) => porEstado[e] ?? 0;

  // Cuello de botella: mayor conteo entre las 3 primeras (el primero gana en empate); solo si hay algo.
  let cuello: EtapaTuberia | null = null;
  let max = 0;
  for (const e of ETAPAS.slice(0, 3)) {
    if (n(e.estado) > max) {
      max = n(e.estado);
      cuello = e.estado;
    }
  }
  const rechazados = n("RECHAZADO");

  return (
    <nav aria-label="Ciclo del material" className={className}>
      <ol className="grid grid-cols-4 gap-px overflow-hidden rounded-card border border-line bg-line shadow-card">
        {ETAPAS.map((e, i) => {
          const cuenta = n(e.estado);
          const esCuello = cuello === e.estado;
          const porCert = e.estado === "DESPACHADO" && porCertificar > 0;
          const rotulo = esCuello ? e.accion : porCert ? `${porCertificar} por certificar` : "";
          const descripcion =
            `${cuenta} ${e.nombre.toLowerCase()}${cuenta === 1 ? "" : "s"}` +
            (esCuello ? `: ${e.accion.toLowerCase()}` : "") +
            (porCert ? `, ${porCertificar} por certificar` : "");
          return (
            <li key={e.estado} className="relative">
              <Link
                href={enlace(e.estado)}
                aria-label={descripcion}
                className={`flex min-h-[92px] flex-col justify-between gap-1 px-2.5 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nav-600 sm:px-4 ${
                  esCuello ? "bg-ambar-50" : "bg-white hover:bg-surface-2"
                }`}
              >
                <span className="flex items-center gap-1 text-xs font-medium text-ink-500">
                  <Icono nombre={e.icono} size={14} className="hidden shrink-0 sm:block" />
                  <span className="truncate">{e.nombre}</span>
                </span>
                <span className={`num text-[28px] font-semibold leading-none ${esCuello ? "text-ambar-700" : "text-nav-900"}`}>{cuenta}</span>
                <span className={`flex min-h-4 items-center gap-1 text-xs font-medium leading-tight ${esCuello ? "text-ambar-700" : "text-pri-700"}`}>
                  {esCuello && <Icono nombre="alerta" size={12} className="shrink-0" />}
                  {rotulo}
                </span>
              </Link>
              {i < ETAPAS.length - 1 && (
                <span aria-hidden="true" className="absolute -right-2 top-1/2 z-10 grid size-4 -translate-y-1/2 place-items-center rounded-full border border-line bg-white text-ink-400">
                  <Icono nombre="flecha" size={10} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {rechazados > 0 && (
        <Link
          href={enlace("RECHAZADO")}
          aria-label={`${rechazados} rechazados`}
          className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-control border border-ink-300 bg-white px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-surface-2"
        >
          <Icono nombre="cerrar" size={14} />
          <span className="num">{rechazados}</span> rechazados
        </Link>
      )}
    </nav>
  );
}
