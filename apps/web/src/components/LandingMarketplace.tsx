"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CADENAS, formatoMasa, nombreSector } from "@swapit/shared";
import PublicNav from "@/components/PublicNav";
import { KpiFranja, LinkBtn, Seccion } from "@/components/ui";
import { CLASE_SECTOR } from "@/components/vis/CadenaFlujo";
import { Icono } from "@/components/vis/Iconos";
import { api } from "@/lib/api";
import { num } from "@/lib/format";

interface Impacto {
  toneladas: number;
  simbiosis: number;
  lotesActivos: number;
  empresasRegistradas: number;
}

const PASOS = [
  { t: "Publicar", d: "Sube fotos, cantidad y ubicación de tu excedente. Sin llamadas ni cadenas de mensajes." },
  { t: "Encontrar", d: "Explora el catálogo con foto y detalle del material, y filtra por tipo, volumen y zona." },
  { t: "Negociar", d: "Propón un precio dentro de la plataforma. El contacto directo se habilita al acordar." },
];

/** Cadenas destacadas de la portada (todas existen en la base de aprovechamiento). */
const IDS_CADENAS = ["mango", "limon", "arroz", "concha-abanico", "algodon-textil", "empaques-y-apoyo"];

/** Portada del modo MARKETPLACE: intercambio de excedentes entre empresas. Sobria, sin cifras de tracción inventadas. */
export default function LandingMarketplace() {
  const [i, setI] = useState<Impacto | null>(null);
  const [sesion, setSesion] = useState(false);
  useEffect(() => {
    api<Impacto>("/impacto/publico").then(setI).catch(() => undefined);
    api("/auth/me").then(() => setSesion(true)).catch(() => undefined);
  }, []);

  const cadenas = IDS_CADENAS.map((id) => CADENAS.find((c) => c.id === id)).filter((c) => c !== undefined);

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <PublicNav detectarSesion />
      <main className="flex-1">
        <section className="border-b border-line bg-white">
          <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
            <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-nav-900 md:text-[40px]">
              Intercambia excedentes entre empresas del norte.
            </h1>
            <p className="mt-3 max-w-xl text-base text-ink-700 md:text-lg">Lo que a una empresa le sobra es insumo de otra. Publica, encuentra y negocia materiales con fotos y detalle.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <LinkBtn href={sesion ? "/lotes" : "/login"} className="min-h-11 px-5">Explorar materiales</LinkBtn>
              <LinkBtn href={sesion ? "/lotes/nuevo" : "/registro"} variante="borde" className="min-h-11 px-5">Publicar</LinkBtn>
            </div>
          </div>
        </section>

        <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-8 md:py-10">
          <Seccion titulo="Cómo funciona" descripcion="Tres pasos, todo dentro de la plataforma.">
            <ol className="grid divide-y divide-line overflow-hidden rounded-card border border-line bg-white shadow-card md:grid-cols-3 md:divide-x md:divide-y-0">
              {PASOS.map((p, k) => (
                <li key={p.t} className="flex gap-3 p-4 md:p-5">
                  <span aria-hidden="true" className="num grid size-7 shrink-0 place-items-center rounded-md bg-nav-700 text-sm font-semibold text-white">{k + 1}</span>
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-1.5 text-base font-semibold text-nav-900">
                      {p.t}
                      {k < PASOS.length - 1 && <Icono nombre="flecha" size={14} className="hidden text-ink-400 md:inline" />}
                    </h3>
                    <p className="mt-1 text-sm text-ink-700">{p.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Seccion>

          {i && (
            <Seccion titulo="La plataforma hoy" descripcion="Datos de demostración etiquetados Demo; no son cifras de operación comercial.">
              <KpiFranja
                items={[
                  { etiqueta: "Ofertas activas", valor: num(i.lotesActivos, 0) },
                  { etiqueta: "Empresas registradas", valor: num(i.empresasRegistradas, 0) },
                  { etiqueta: "Acuerdos cerrados", valor: num(i.simbiosis, 0) },
                  { etiqueta: "Material intercambiado", valor: formatoMasa(i.toneladas) },
                ]}
              />
            </Seccion>
          )}

          <Seccion
            titulo="Cadenas y usos"
            descripcion="Qué residuos salen de cada proceso productivo y en qué se pueden convertir. Información libre."
            acciones={<Link href="/aprovechamiento" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-nav-700 hover:underline">Ver todas las cadenas <Icono nombre="flecha" size={16} /></Link>}
          >
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cadenas.map((c) => {
                const residuos = c.etapas.reduce((a, e) => a + e.residuos.length, 0);
                const nombre = c.id === "empaques-y-apoyo" ? "Empaques y apoyo" : c.nombre;
                return (
                  <li key={c.id}>
                    <Link href={`/aprovechamiento/cadena/${c.id}`} className="block h-full rounded-card border border-line bg-white p-4 shadow-card transition hover:border-nav-600">
                      <span className="flex items-center gap-1.5 text-xs text-ink-700">
                        <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${CLASE_SECTOR[c.sector].linea}`} />
                        {c.sector === "OTRO" ? "Todos los sectores" : (nombreSector(c.sector)?.split(" y ")[0] ?? "Varios sectores")}
                      </span>
                      <span className="mt-1.5 block text-base font-semibold text-nav-900">{nombre}</span>
                      <span className="num mt-1 block text-sm text-ink-500">{c.etapas.length} {c.etapas.length === 1 ? "etapa" : "etapas"} · {residuos} residuos</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Seccion>
        </div>
      </main>
      <footer className="border-t border-line bg-white px-4 py-5 text-center text-sm text-ink-500">
        Prototipo; datos de demostración etiquetados Demo · SeedTech UDEP 2026.
      </footer>
    </div>
  );
}
