import { etapaSimple, ETIQUETA_ETAPA } from "@swapit/shared";
import type { EtapaAcuerdo } from "@/lib/types";

/**
 * Etapa simple de un acuerdo: Propuesta → Aceptada → Cerrada (+ Cancelada).
 * Usa la `etapa` que manda la API; si falta (API antigua), la deduce del estado interno con la misma regla del paquete compartido.
 * Los nueve estados internos no cambian: esto solo es lo que ve la persona usuaria.
 */
export function etapaDe(t: { estado: string; etapa?: string | null }): EtapaAcuerdo {
  const e = t.etapa;
  if (e === "PROPUESTA" || e === "ACEPTADA" || e === "CERRADA" || e === "CANCELADA") return e;
  return etapaSimple(t.estado);
}

const PASOS: Exclude<EtapaAcuerdo, "CANCELADA">[] = ["PROPUESTA", "ACEPTADA", "CERRADA"];

/** Texto accesible: «Etapa: Aceptada (2 de 3)». */
function resumenEtapa(etapa: EtapaAcuerdo) {
  if (etapa === "CANCELADA") return "Etapa: Cancelada";
  return `Etapa: ${ETIQUETA_ETAPA[etapa]} (${PASOS.indexOf(etapa) + 1} de 3)`;
}

/** Mini-stepper de 3 puntos con el nombre de la etapa actual (para filas de tabla). */
export function MiniEtapa({ etapa }: { etapa: EtapaAcuerdo }) {
  const cancelada = etapa === "CANCELADA";
  const idx = PASOS.indexOf(etapa as (typeof PASOS)[number]);
  return (
    <span className="inline-flex flex-col items-start gap-1" role="img" aria-label={resumenEtapa(etapa)}>
      <span className="flex items-center" aria-hidden="true">
        {PASOS.map((p, i) => {
          const hecho = !cancelada && i < idx;
          const actual = !cancelada && i === idx;
          return (
            <span key={p} className="flex items-center">
              <span className={`size-2.5 rounded-full ${cancelada ? "bg-ink-300" : actual ? "bg-pri-600 ring-2 ring-pri-100" : hecho ? "bg-pri-600" : "bg-ink-200"}`} />
              {i < PASOS.length - 1 && <span className={`h-0.5 w-3 ${!cancelada && i < idx ? "bg-pri-600" : "bg-ink-200"}`} />}
            </span>
          );
        })}
      </span>
      <span className={`text-xs font-semibold ${cancelada ? "text-error" : "text-nav-900"}`}>{ETIQUETA_ETAPA[etapa]}</span>
    </span>
  );
}

/** Stepper grande de 3 etapas para encabezar el acuerdo. Si está cancelada, lo dice y atenúa los pasos. */
export function StepperEtapas({ etapa }: { etapa: EtapaAcuerdo }) {
  const cancelada = etapa === "CANCELADA";
  const idx = PASOS.indexOf(etapa as (typeof PASOS)[number]);
  return (
    <ol className="flex items-start" aria-label={resumenEtapa(etapa)}>
      {PASOS.map((p, i) => {
        const hecho = !cancelada && (i < idx || (i === idx && p === "CERRADA"));
        const actual = !cancelada && i === idx && p !== "CERRADA";
        return (
          <li key={p} className="flex min-w-0 flex-1 flex-col" aria-current={actual ? "step" : undefined}>
            <div className="flex items-center">
              <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${cancelada ? "bg-ink-100 text-ink-500" : hecho ? "bg-pri-600 text-white" : actual ? "bg-nav-900 text-white ring-4 ring-nav-100" : "bg-ink-100 text-ink-500"}`}>
                {hecho ? <span aria-hidden="true">✓</span> : i + 1}
              </span>
              {i < PASOS.length - 1 && <span className={`mx-2 h-0.5 flex-1 rounded-full ${!cancelada && i < idx ? "bg-pri-600" : "bg-ink-200"}`} aria-hidden="true" />}
            </div>
            <span className={`mt-1.5 pr-2 text-sm ${actual || hecho ? "font-semibold text-nav-900" : "font-medium text-ink-500"}`}>{ETIQUETA_ETAPA[p]}</span>
          </li>
        );
      })}
    </ol>
  );
}
