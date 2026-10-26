import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CADENAS, cadenaPorId } from "@swapit/shared";
import { LeyendaEvidencia, MarcoAprovechamiento, ResumenCadena } from "@/components/Aprovechamiento";
import { DiagnosticoProceso } from "@/components/AprovechamientoIslas";
import { KpiFranja, PuntoCategoria, Seccion, TablaDatos } from "@/components/ui";
import { ValorMonedas, nombreCorto } from "@/components/vis/EscaleraVidas";

export function generateStaticParams() {
  return CADENAS.map((c) => ({ id: c.id }));
}

export async function generateMetadata(props: PageProps<"/aprovechamiento/cadena/[id]">): Promise<Metadata> {
  const c = cadenaPorId((await props.params).id);
  return c ? { title: `Cadena de ${c.nombre.toLowerCase()}: residuos y sus vidas — Swapit`, description: c.resumen } : {};
}

export default async function PaginaCadena(props: PageProps<"/aprovechamiento/cadena/[id]">) {
  const c = cadenaPorId((await props.params).id);
  if (!c) notFound();
  const otras = CADENAS.filter((x) => x.sector === c.sector && x.id !== c.id);
  const filas = c.etapas.flatMap((e, i) => e.residuos.map((r) => ({ r, etapa: e, n: i + 1 })));
  const nUsos = filas.reduce((a, f) => a + f.r.vidas.length, 0);
  const titulo = c.id === "empaques-y-apoyo" ? c.nombre : `Cadena de ${c.nombre.toLowerCase()}`;
  return (
    <MarcoAprovechamiento ruta={[{ texto: c.nombre }]}>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-nav-900 md:text-[26px]">{titulo}</h1>
        <p className="mt-1 text-sm text-ink-500">{c.zonas.join(" · ")}</p>
        <p className="mt-2 max-w-3xl text-sm text-ink-700 md:text-[15px]">{c.resumen}</p>
      </div>

      <KpiFranja items={[{ etiqueta: "Etapas", valor: c.etapas.length }, { etiqueta: "Residuos", valor: filas.length }, { etiqueta: "Usos documentados", valor: nUsos }]} />

      <Seccion titulo="Proceso productivo" descripcion="Etapas en orden y los residuos que salen de cada una. Marca donde trabajas para ver un diagnóstico." className="mt-8">
        <DiagnosticoProceso cadena={c} />
      </Seccion>

      <Seccion titulo="Residuos de la cadena" descripcion="Cada residuo, la etapa de la que sale y cuántos usos tiene." className="mt-8">
        <TablaDatos minAncho={0}>
          <caption className="sr-only">Residuos de {c.nombre}</caption>
          <thead>
            <tr>
              <th scope="col">Residuo</th>
              <th scope="col" className="hidden md:table-cell">Etapa de origen</th>
              <th scope="col">Valor del mejor uso</th>
              <th scope="col" className="text-right">Usos</th>
            </tr>
          </thead>
          <tbody>
            {filas.map(({ r, etapa, n }) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/aprovechamiento/residuo/${r.id}`} className="inline-flex min-h-10 items-center font-semibold text-nav-700 hover:underline">{nombreCorto(r.nombre)}</Link>
                  <div><PuntoCategoria codigo={r.categoria} /></div>
                </td>
                <td className="hidden text-ink-700 md:table-cell"><span className="num text-ink-500">{n}.</span> {etapa.nombre}</td>
                <td>{r.vidas[0] && <ValorMonedas valor={r.vidas[0].valor} />}</td>
                <td className="num text-right">{r.vidas.length}</td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr><td colSpan={4} className="text-ink-500">Sin residuos registrados.</td></tr>
            )}
          </tbody>
        </TablaDatos>
      </Seccion>

      <section className="mt-8" aria-label="Advertencia de evidencia"><LeyendaEvidencia /></section>

      {otras.length > 0 && (
        <Seccion titulo="Otras cadenas del sector" className="mt-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{otras.map((o) => <ResumenCadena key={o.id} cadena={o} compacto />)}</div>
        </Seccion>
      )}
    </MarcoAprovechamiento>
  );
}
