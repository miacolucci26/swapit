import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RESIDUOS, VALORES, residuoPorId, vidasParaMype } from "@swapit/shared";
import { LeyendaEvidencia, ListaCompradores, MarcoAprovechamiento, PreguntasClave, TarjetaResiduo, textoUsos } from "@/components/Aprovechamiento";
import { KpiFranja, LinkBtn, PuntoCategoria, Seccion } from "@/components/ui";
import { EscaleraVidas, nombreCorto } from "@/components/vis/EscaleraVidas";
import { Icono } from "@/components/vis/Iconos";

export function generateStaticParams() {
  return RESIDUOS.map((r) => ({ id: r.residuo.id }));
}

export async function generateMetadata(props: PageProps<"/aprovechamiento/residuo/[id]">): Promise<Metadata> {
  const r = residuoPorId((await props.params).id);
  return r ? { title: `${r.residuo.nombre}: vidas, compradores y cuidados — Swapit`, description: r.residuo.descripcion } : {};
}

export default async function PaginaResiduo(props: PageProps<"/aprovechamiento/residuo/[id]">) {
  const hallado = residuoPorId((await props.params).id);
  if (!hallado) notFound();
  const { residuo, cadena, etapa } = hallado;
  const mype = vidasParaMype(residuo)[0];
  const soloGestor = residuo.vidas.every((v) => v.nivel === "DISPOSICION");
  const hermanos = etapa.residuos.filter((r) => r.id !== residuo.id);
  const mejor = residuo.vidas[0];
  const posEtapa = cadena.etapas.findIndex((e) => e.id === etapa.id);
  return (
    <MarcoAprovechamiento ruta={[{ href: `/aprovechamiento/cadena/${cadena.id}`, texto: cadena.nombre }, { texto: nombreCorto(residuo.nombre) }]}>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-nav-900 md:text-[26px]">{nombreCorto(residuo.nombre)}</h1>
        <PuntoCategoria codigo={residuo.categoria} className="mt-1.5 text-sm" />
        <p className="mt-2 max-w-3xl text-sm text-ink-700 md:text-[15px]">{residuo.descripcion}</p>
      </div>

      <KpiFranja
        items={[
          { etiqueta: "Usos documentados", valor: residuo.vidas.length },
          { etiqueta: "Valor del mejor uso", valor: <span className="text-xl">{mejor ? VALORES[mejor.valor] : "—"}</span>, tono: soloGestor ? "alerta" : "neutro" },
          { etiqueta: "Sale en la etapa", valor: <span className="num text-xl">{posEtapa + 1} de {cadena.etapas.length}</span>, nota: etapa.nombre },
        ]}
      />

      <Seccion titulo="Proceso de origen" descripcion={`Este residuo sale de «${etapa.nombre}»${etapa.que ? `: ${etapa.que}` : "."}`} className="mt-8">
        <ol aria-label={`Etapas de ${cadena.nombre}`} className="flex flex-wrap items-stretch gap-2">
          {cadena.etapas.map((e, i) => {
            const aqui = e.id === etapa.id;
            return (
              <li key={e.id} className="flex items-center gap-2">
                <span
                  aria-current={aqui ? "step" : undefined}
                  className={`flex min-h-10 items-center gap-2 rounded-control border px-3 py-1.5 text-sm ${aqui ? "border-pri-600 bg-pri-50 font-semibold text-nav-900" : "border-line bg-white text-ink-700"}`}
                >
                  <span aria-hidden="true" className={`num grid size-5 shrink-0 place-items-center rounded-md text-[11px] font-semibold ${aqui ? "bg-pri-600 text-white" : "bg-ink-100 text-ink-700"}`}>{i + 1}</span>
                  {e.nombre}
                  {aqui && <span className="rounded-md bg-pri-600 px-1.5 text-[11px] font-medium text-white">Aquí sale</span>}
                </span>
                {i < cadena.etapas.length - 1 && <Icono nombre="flecha" size={14} className="hidden shrink-0 text-ink-400 sm:block" />}
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-sm">
          <Link href={`/aprovechamiento/cadena/${cadena.id}`} className="inline-flex min-h-10 items-center font-medium text-nav-700 hover:underline">Ver el proceso completo de la cadena</Link>
        </p>
      </Seccion>

      {residuo.preparacion && (
        <Seccion titulo="Cómo prepararlo" descripcion="Cómo subirle el valor antes de ofrecerlo." className="mt-8">
          <p className="rounded-card border border-line bg-white p-4 text-sm text-ink-900 shadow-card">{residuo.preparacion}</p>
        </Seccion>
      )}

      <Seccion titulo="En qué se puede convertir" descripcion={`${textoUsos(residuo.vidas.length)}, del mejor al último. Abre cada fila para ver cómo se gana y qué cumplir.`} className="mt-8">
        <EscaleraVidas residuo={residuo} />
        {mype && !soloGestor && (
          <Link href="/aprovechamiento/mype" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-control border border-line bg-white px-3 text-sm font-medium text-nav-700 hover:border-nav-600">
            Opción para MYPE: {mype.uso}
            <Icono nombre="flecha" size={14} />
          </Link>
        )}
      </Seccion>

      <Seccion titulo="Quién lo compra" descripcion="Tipos de compradores y para qué usos." className="mt-8">
        <ListaCompradores residuo={residuo} />
      </Seccion>

      <Seccion titulo="Antes de cerrar trato" descripcion="Preguntas clave para el comprador." className="mt-8">
        <PreguntasClave residuo={residuo} />
      </Seccion>

      <section className="mt-8 flex flex-wrap gap-3">
        <LinkBtn href="/registro">Crear cuenta</LinkBtn>
        <LinkBtn href={`/aprovechamiento/cadena/${cadena.id}`} variante="borde">Ver la cadena</LinkBtn>
      </section>

      <section className="mt-8" aria-label="Advertencia de evidencia"><LeyendaEvidencia /></section>

      {hermanos.length > 0 && (
        <Seccion titulo="Otros residuos de la misma etapa" className="mt-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{hermanos.map((r) => <TarjetaResiduo key={r.id} residuo={r} />)}</div>
        </Seccion>
      )}
    </MarcoAprovechamiento>
  );
}
