import type { Metadata } from "next";
import Link from "next/link";
import { CADENAS, RESIDUOS, nombreSector } from "@swapit/shared";
import { EscaleraDeValor, LeyendaEvidencia, MarcoAprovechamiento } from "@/components/Aprovechamiento";
import { BuscadorResiduos } from "@/components/AprovechamientoIslas";
import { KpiFranja, LinkBtn, Seccion, TablaDatos } from "@/components/ui";
import { CLASE_SECTOR } from "@/components/vis/CadenaFlujo";

export const metadata: Metadata = {
  title: "Aprovechamiento de residuos y subproductos — Swapit",
  description: "Información libre: qué residuos salen en cada etapa de tus cadenas, qué se puede hacer con cada uno y a quién entregarlo.",
};

export default function Aprovechamiento() {
  const usos = RESIDUOS.reduce((a, r) => a + r.residuo.vidas.length, 0);
  const filas = CADENAS.map((c) => {
    const residuos = c.etapas.flatMap((e) => e.residuos);
    return { c, nResiduos: residuos.length, nUsos: residuos.reduce((a, r) => a + r.vidas.length, 0) };
  });

  return (
    <MarcoAprovechamiento>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-nav-900 md:text-[26px]">Aprovechamiento de residuos y subproductos</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-500 md:text-[15px]">De dónde sale cada residuo en su cadena productiva y en qué se puede convertir. Información de uso libre.</p>
      </div>

      <KpiFranja items={[{ etiqueta: "Cadenas", valor: CADENAS.length }, { etiqueta: "Residuos", valor: RESIDUOS.length }, { etiqueta: "Usos documentados", valor: usos }]} />

      <Seccion titulo="Buscar un residuo" descripcion="Escribe en tus palabras lo que te sobra." className="mt-8">
        <BuscadorResiduos />
      </Seccion>

      <Seccion titulo="Cadenas productivas" descripcion="Elige tu rubro para ver el proceso, sus etapas y los residuos que salen de cada una." className="mt-8">
        <TablaDatos minAncho={0}>
          <caption className="sr-only">Índice de cadenas productivas</caption>
          <thead>
            <tr>
              <th scope="col">Cadena</th>
              <th scope="col" className="hidden md:table-cell">Sector</th>
              <th scope="col" className="text-right">Etapas</th>
              <th scope="col" className="text-right">Residuos</th>
              <th scope="col" className="text-right">Usos</th>
            </tr>
          </thead>
          <tbody>
            {filas.map(({ c, nResiduos, nUsos }) => (
              <tr key={c.id}>
                <td className="font-semibold">
                  <Link href={`/aprovechamiento/cadena/${c.id}`} className="inline-flex min-h-10 items-center text-nav-700 hover:underline">
                    {c.id === "empaques-y-apoyo" ? "Empaques y apoyo" : c.nombre}
                  </Link>
                </td>
                <td className="hidden text-ink-700 md:table-cell">
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${CLASE_SECTOR[c.sector].linea}`} />
                    {c.sector === "OTRO" ? "Todos los sectores" : nombreSector(c.sector)}
                  </span>
                </td>
                <td className="num text-right">{c.etapas.length}</td>
                <td className="num text-right">{nResiduos}</td>
                <td className="num text-right">{nUsos}</td>
              </tr>
            ))}
          </tbody>
        </TablaDatos>
      </Seccion>

      <Seccion titulo="La escalera de valor" descripcion="Qué tan bien se aprovecha un residuo según el uso que se le dé." className="mt-8">
        <EscaleraDeValor />
      </Seccion>

      <Seccion titulo="Según tu situación" className="mt-8">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-card border border-line bg-white p-4 shadow-card">
            <h3 className="text-base font-semibold text-nav-900">Soy MYPE</h3>
            <p className="mt-1 text-sm text-ink-700">Cinco pasos antes de invertir, oportunidades sin planta y una calculadora de margen.</p>
            <LinkBtn href="/aprovechamiento/mype" variante="borde" className="mt-3">Ver oportunidades</LinkBtn>
          </div>
          <div className="rounded-card border border-line bg-white p-4 shadow-card">
            <h3 className="text-base font-semibold text-nav-900">Tengo excedentes para intercambiar</h3>
            <p className="mt-1 text-sm text-ink-700">Publica tu material con fotos y negocia con empresas que lo usan como insumo.</p>
            <LinkBtn href="/registro" className="mt-3">Crear cuenta</LinkBtn>
          </div>
        </div>
      </Seccion>

      <section className="mt-8" aria-label="Advertencia de evidencia"><LeyendaEvidencia /></section>
    </MarcoAprovechamiento>
  );
}
