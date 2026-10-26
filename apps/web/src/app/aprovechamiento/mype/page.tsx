import type { Metadata } from "next";
import Link from "next/link";
import { RESIDUOS, type Evidencia, type Valor } from "@swapit/shared";
import { ChipDestino, LeyendaEvidencia, MarcoAprovechamiento } from "@/components/Aprovechamiento";
import { CalculadoraMargen } from "@/components/AprovechamientoIslas";
import { PuntoCategoria, Seccion, TablaDatos } from "@/components/ui";
import { SelloEvidencia, ValorMonedas, nombreCorto } from "@/components/vis/EscaleraVidas";

export const metadata: Metadata = {
  title: "Cómo una MYPE saca ingresos de residuos y subproductos — Swapit",
  description: "Salidas al alcance de una MYPE para cáscaras, retazos, conchas, aceite y otros insumos, y una calculadora de margen con tus propios números.",
};

const PASOS = [
  ["Elige UN residuo", "Uno que ya tengas cerca y en volumen constante. Los de práctica común tienen compradores conocidos."],
  ["Pide una muestra y una ficha", "Pregunta qué calidad, humedad, empaque y volumen mínimo exige, y cuánto pagaría por una muestra."],
  ["Revisa permisos", "Si es alimento o cosmético, o si manejas residuos con riesgo, consulta los permisos sanitarios, municipales y ambientales. Esta página no los reemplaza."],
  ["Haz un lote piloto", "Te enseña tu costo real: recoger, secar, moler, empacar y entregar."],
  ["Asegura la regularidad", "A un comprador le sirve quien entrega cada semana o cada temporada. Pacta volumen, precio y fecha antes de la campaña."],
];

const ORDEN_EVIDENCIA: Record<Evidencia, number> = { PRACTICA_COMUN: 0, REPORTADO: 1, POR_VALIDAR: 2 };
const ORDEN_VALOR: Record<Valor, number> = { ALTO: 0, MEDIO: 1, BAJO: 2, COSTO: 3 };

export default function MypePage() {
  // Salidas que una MYPE puede hacer sin planta: vidas de escala MYPE o ambas, que se transforman o se revenden, nunca las de gestión de residuos.
  const oportunidades = RESIDUOS.flatMap(({ residuo, cadena }) =>
    residuo.vidas
      .filter((v) => v.escala !== "INDUSTRIAL" && v.nivel !== "DISPOSICION" && v.nivel !== "ENERGIA" && (v.destinos.includes("ARTESANIA_MYPE") || v.destinos.includes("MERCADO_LOCAL")) && v.valor !== "BAJO")
      .map((v) => ({ residuo, cadena, v })),
  ).sort((a, b) => ORDEN_EVIDENCIA[a.v.evidencia] - ORDEN_EVIDENCIA[b.v.evidencia] || ORDEN_VALOR[a.v.valor] - ORDEN_VALOR[b.v.valor]);

  return (
    <MarcoAprovechamiento ruta={[{ texto: "Para MYPE" }]}>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-nav-900 md:text-[26px]">Saca ingresos de tus insumos</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-500 md:text-[15px]">Salidas al alcance de una MYPE, sin planta industrial. Prueba en pequeño antes de invertir.</p>
      </div>

      <Seccion titulo="Cinco pasos antes de invertir" descripcion="Para no gastar en algo que nadie compra.">
        <ol className="divide-y divide-line overflow-hidden rounded-card border border-line bg-white shadow-card">
          {PASOS.map(([t, d], k) => (
            <li key={t} className="flex gap-3 px-4 py-3">
              <span aria-hidden="true" className="num grid size-6 shrink-0 place-items-center rounded-md bg-nav-700 text-xs font-semibold text-white">{k + 1}</span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-nav-900">{t}</h3>
                <p className="mt-0.5 text-sm text-ink-700">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </Seccion>

      <Seccion titulo="Oportunidades para ti" descripcion={`${oportunidades.length} salidas al alcance de una MYPE, de mejor respaldo a menor. Abre un uso para ver cómo se gana y qué cumplir.`} className="mt-8">
        <TablaDatos minAncho={0}>
          <caption className="sr-only">Oportunidades para una MYPE</caption>
          <thead>
            <tr>
              <th scope="col">Residuo</th>
              <th scope="col">Uso</th>
              <th scope="col">Valor</th>
              <th scope="col" className="hidden md:table-cell">Evidencia</th>
              <th scope="col" className="hidden lg:table-cell">Quién compra</th>
            </tr>
          </thead>
          <tbody>
            {oportunidades.map(({ residuo, v }) => (
              <tr key={`${residuo.id}-${v.uso}`} className="align-top">
                <td className="!h-auto !py-3 align-top">
                  <Link href={`/aprovechamiento/residuo/${residuo.id}`} className="font-semibold text-nav-700 hover:underline">{nombreCorto(residuo.nombre)}</Link>
                  <div className="mt-0.5"><PuntoCategoria codigo={residuo.categoria} /></div>
                </td>
                <td className="!h-auto !py-3 align-top">
                  <details>
                    <summary className="min-h-6 cursor-pointer text-sm font-medium text-ink-900">{v.uso}</summary>
                    <div className="mt-2 space-y-1.5 text-sm text-ink-700">
                      <p><b className="text-ink-900">Cómo se gana:</b> {v.negocio}</p>
                      <p><b className="text-ink-900">Qué cumplir:</b> {v.requisitos}</p>
                      <p className="md:hidden"><SelloEvidencia evidencia={v.evidencia} /></p>
                    </div>
                  </details>
                </td>
                <td className="!h-auto !py-3 align-top"><ValorMonedas valor={v.valor} /></td>
                <td className="!h-auto hidden !py-3 align-top md:table-cell"><SelloEvidencia evidencia={v.evidencia} /></td>
                <td className="!h-auto hidden !py-3 align-top lg:table-cell">
                  <div className="flex flex-wrap gap-1">{v.destinos.map((d) => <ChipDestino key={d} destino={d} />)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </TablaDatos>
        <p className="mt-2 text-sm text-ink-500">El valor es una estimación, no un precio. Prueba con tu muestra.</p>
      </Seccion>

      <div className="mt-8"><CalculadoraMargen /></div>

      <section className="mt-8" aria-label="Advertencia de evidencia"><LeyendaEvidencia /></section>
    </MarcoAprovechamiento>
  );
}
