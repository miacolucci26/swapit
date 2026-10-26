"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatoCantidad, formatoMasa } from "@swapit/shared";
import { etapaDe, MiniEtapa } from "@/components/EtapaAcuerdo";
import { Badge, Cargando, InsigniaDemo, KpiFranja, LinkBtn, MES, ModalidadBadge, PageHeader, PuntoCategoria, Seccion, TablaDatos, Tabs, Vacio } from "@/components/ui";
import { Icono, type NombreIcono } from "@/components/vis/Iconos";
import { api } from "@/lib/api";
import { num, porUnidad } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { EtapaAcuerdo, TransaccionItem } from "@/lib/types";

type Item = TransaccionItem;
interface Impacto { toneladas: number; co2EvitadoTon: number; simbiosis: number; certificados: number; porMes: { mes: string; toneladas: number }[] }
type Vista = "OFERTANTE" | "RECEPTOR";

// El CO₂eq se oculta mientras sus factores no estén validados; solo se muestra con NEXT_PUBLIC_MOSTRAR_CO2=1.
const MOSTRAR_CO2 = process.env.NEXT_PUBLIC_MOSTRAR_CO2 === "1";

const ORDEN_ETAPA: Record<EtapaAcuerdo, number> = { PROPUESTA: 0, ACEPTADA: 1, CERRADA: 2, CANCELADA: 3 };

function precioTexto(t: Item) {
  if (t.modalidad === "DONACION") return "Donación";
  if (t.modalidad === "INTERCAMBIO") return "Intercambio";
  if (t.precioUnitario == null) return "A negociar";
  return t.modalidad === "CREDITOS" ? `${num(t.precioUnitario, 0)} créd.${porUnidad(t.lote.unidad)}` : `S/ ${num(t.precioUnitario, 2)}${porUnidad(t.lote.unidad)}`;
}

/** Etiqueta del precio: «Acordado» cuando ya hay acuerdo, «Propuesto» mientras se negocia. */
const etiquetaPrecio = (e: EtapaAcuerdo) => (e === "PROPUESTA" ? "Propuesto" : e === "CANCELADA" ? "Propuesto" : "Acordado");

function Miniatura({ t, className = "size-14" }: { t: Item; className?: string }) {
  return (
    <div className={`${className} shrink-0 overflow-hidden rounded-control bg-surface-2`}>
      {t.lote.imagen ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={t.lote.imagen} alt="" className="size-full object-cover" />
      ) : (
        <div className="grid size-full place-items-center text-ink-400" aria-hidden="true"><Icono nombre="material" size={22} /></div>
      )}
    </div>
  );
}

function Contraparte({ t }: { t: Item }) {
  const confidencial = t.contraparte.razonSocial === "Empresa confidencial";
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <Icono nombre={confidencial ? "candado" : "empresa"} size={16} className="shrink-0 text-ink-500" />
      <span className="truncate">{t.contraparte.razonSocial}</span>
      {t.contraparte.demo && <InsigniaDemo />}
    </span>
  );
}

function Accion({ t }: { t: Item }) {
  return (
    <span className={`flex items-start gap-1.5 text-sm ${t.requiereMiAccion ? "font-semibold text-nav-900" : "text-ink-700"}`}>
      <Icono nombre={t.requiereMiAccion ? "alerta" : "reloj"} size={16} className={`mt-0.5 shrink-0 ${t.requiereMiAccion ? "text-ambar-600" : "text-ink-400"}`} />
      <span>{t.pendiente}</span>
    </span>
  );
}

function Tabla({ items }: { items: Item[] }) {
  const router = useRouter();
  return (
    <>
      {/* Escritorio y tableta: tabla de reporte */}
      <div className="hidden lg:block">
        <TablaDatos minAncho={760}>
          <thead>
            <tr>
              <th>Material</th>
              <th>Contraparte</th>
              <th>Cantidad y precio</th>
              <th>Etapa</th>
              <th>Próxima acción</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => {
              const e = etapaDe(t);
              return (
                <tr key={t.id} onClick={() => router.push(`/transacciones/${t.id}`)} className="cursor-pointer" data-etapa={e}>
                  <td className="min-w-[200px]">
                    <div className="flex items-center gap-3">
                      <Miniatura t={t} />
                      <div className="min-w-0">
                        <Link href={`/transacciones/${t.id}`} onClick={(ev) => ev.stopPropagation()} className="line-clamp-2 font-semibold text-nav-900 hover:text-nav-700 hover:underline">{t.lote.titulo}</Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <PuntoCategoria codigo={t.lote.categoriaCodigo ?? "OTROS"} etiqueta={t.lote.categoria.split("(")[0].trim()} />
                          <ModalidadBadge m={t.modalidad} />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="max-w-[190px]"><Contraparte t={t} /></td>
                  <td className="whitespace-nowrap">
                    <div className="num font-semibold">{formatoCantidad(t.cantidad, t.lote.unidad)}</div>
                    <div className="num text-xs text-ink-700">{precioTexto(t)}{t.precioUnitario != null && t.modalidad !== "DONACION" && t.modalidad !== "INTERCAMBIO" ? ` · ${etiquetaPrecio(e).toLowerCase()}` : ""}</div>
                  </td>
                  <td className="whitespace-nowrap"><MiniEtapa etapa={e} /></td>
                  <td className="min-w-[180px] max-w-[220px] !py-2.5"><Accion t={t} /></td>
                </tr>
              );
            })}
          </tbody>
        </TablaDatos>
      </div>

      {/* Móvil: una tarjeta compacta por negociación */}
      <ul className="grid gap-2 sm:grid-cols-2 lg:hidden">
        {items.map((t) => {
          const e = etapaDe(t);
          return (
            <li key={t.id}>
              <Link href={`/transacciones/${t.id}`} className={`block rounded-card border bg-white p-3 shadow-card ${t.requiereMiAccion ? "border-pri-600" : "border-line"}`}>
                <div className="flex gap-3">
                  <Miniatura t={t} className="size-16" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-nav-900">{t.lote.titulo}</p>
                    <p className="mt-0.5 text-sm text-ink-700"><Contraparte t={t} /></p>
                    <p className="num mt-1 flex flex-wrap gap-x-3 text-sm"><b>{formatoCantidad(t.cantidad, t.lote.unidad)}</b><span className="text-ink-700">{precioTexto(t)}{t.precioUnitario != null && t.modalidad !== "DONACION" && t.modalidad !== "INTERCAMBIO" ? ` · ${etiquetaPrecio(e).toLowerCase()}` : ""}</span></p>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-col gap-2 border-t border-line pt-2.5">
                  <MiniEtapa etapa={e} />
                  <Accion t={t} />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** Franja compacta de impacto: toneladas intercambiadas y acuerdos cerrados como indicadores primarios. */
function FranjaImpacto({ imp }: { imp: Impacto }) {
  const max = Math.max(...imp.porMes.map((m) => m.toneladas), 0.0001);
  return (
    <section aria-label="Impacto resumido" className="rounded-card border border-line bg-white px-4 py-3 shadow-card">
      <div className="grid grid-cols-2 items-center gap-x-6 gap-y-3 sm:flex sm:flex-wrap sm:gap-x-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Toneladas intercambiadas</p>
          <p className="num mt-0.5 text-2xl font-semibold leading-none text-pri-700">{formatoMasa(imp.toneladas)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Acuerdos cerrados</p>
          <p className="num mt-0.5 text-2xl font-semibold leading-none text-nav-900">{num(imp.simbiosis, 0)}</p>
        </div>
        {imp.certificados > 0 && (
          <div>
            <p className="text-xs font-medium text-ink-500">Certificados</p>
            <p className="num mt-0.5 text-lg font-semibold leading-none text-ink-700">{num(imp.certificados, 0)}</p>
          </div>
        )}
        {MOSTRAR_CO2 && (
          <div>
            <p className="text-xs font-medium text-ink-500">CO₂eq evitado</p>
            <p className="num mt-0.5 text-lg font-semibold leading-none text-ink-700">{formatoMasa(imp.co2EvitadoTon)}</p>
            <p className="mt-0.5 text-[11px] text-ambar-700">Estimación demostrativa (factores de ejemplo, sin validar)</p>
          </div>
        )}
        <figure className="ml-auto hidden min-w-[140px] sm:block" aria-label={`Toneladas por mes: ${imp.porMes.map((m) => `${MES(m.mes)} ${num(m.toneladas, 2)}`).join(", ")}`}>
          <div className="flex h-9 items-end gap-1" aria-hidden="true">
            {imp.porMes.map((m, i) => (
              <span key={m.mes} className={`flex-1 rounded-t-sm ${i === imp.porMes.length - 1 ? "bg-pri-600" : "bg-pri-200"}`} style={{ height: `${Math.max((m.toneladas / max) * 100, 8)}%` }} />
            ))}
          </div>
          <figcaption className="mt-1 text-[11px] text-ink-500">Toneladas por mes</figcaption>
        </figure>
      </div>
    </section>
  );
}

export default function MiActividad() {
  const { user } = useSession();
  const [lista, setLista] = useState<Item[] | null>(null);
  const [imp, setImp] = useState<Impacto | null>(null);
  const [saldo, setSaldo] = useState<number | null>(null);
  const [vista, setVista] = useState<Vista | null>(null);

  useEffect(() => {
    api<Item[]>("/transacciones").then(setLista).catch(() => setLista([]));
    api<Impacto>("/impacto/mi").then(setImp).catch(() => undefined);
    api<{ saldo: number }>("/creditos").then((c) => setSaldo(c.saldo)).catch(() => undefined);
  }, []);

  const resumen = useMemo(() => {
    const c = { OFERTANTE: 0, RECEPTOR: 0, accionO: 0, accionR: 0, propuestas: 0, aceptadas: 0, cerradas: 0 };
    for (const t of lista ?? []) {
      c[t.rol]++;
      if (t.requiereMiAccion) t.rol === "OFERTANTE" ? c.accionO++ : c.accionR++;
      const e = etapaDe(t);
      if (e === "PROPUESTA") c.propuestas++;
      else if (e === "ACEPTADA") c.aceptadas++;
      else if (e === "CERRADA") c.cerradas++;
    }
    return c;
  }, [lista]);

  if (!lista || !user) return <Cargando />;
  // Por defecto, el rol con más actividad (en empate, ofertante).
  const rol: Vista = vista ?? (resumen.RECEPTOR > resumen.OFERTANTE ? "RECEPTOR" : "OFERTANTE");
  // Primero lo que me toca atender, luego por etapa y, dentro de cada una, lo más reciente.
  const propias = lista
    .filter((t) => t.rol === rol)
    .sort((a, b) => Number(b.requiereMiAccion) - Number(a.requiereMiAccion) || ORDEN_ETAPA[etapaDe(a)] - ORDEN_ETAPA[etapaDe(b)] || b.updatedAt.localeCompare(a.updatedAt));
  const esEmpresa = user.empresa.tipo === "EMPRESA";

  const secundarios: { href: string; etiqueta: string; icono: NombreIcono; nota?: string }[] = [
    { href: "/creditos", etiqueta: "Créditos", icono: "dinero", nota: saldo == null ? undefined : `${num(saldo, 0)} disponibles` },
    { href: "/matching", etiqueta: "Buscar y alertas", icono: "buscar" },
    ...(esEmpresa ? [{ href: "/cumplimiento", etiqueta: "Cumplimiento REP", icono: "certificado" as NombreIcono }] : []),
  ];

  return (
    <>
      <PageHeader
        titulo="Mi actividad"
        sub="Tus negociaciones: de la propuesta al acuerdo cerrado."
        acciones={<><LinkBtn href="/lotes/nuevo">Publicar</LinkBtn><LinkBtn href="/lotes" variante="borde">Explorar</LinkBtn></>}
      />

      <KpiFranja
        items={[
          { etiqueta: "Propuestas abiertas", valor: resumen.propuestas, nota: "en conversación", tono: resumen.propuestas > 0 ? "alerta" : "neutro" },
          { etiqueta: "Aceptadas", valor: resumen.aceptadas, nota: "por coordinar y entregar" },
          { etiqueta: "Cerradas", valor: resumen.cerradas, nota: "material entregado", tono: "ok" },
          { etiqueta: "Toneladas cerradas", valor: imp ? formatoMasa(imp.toneladas) : "—", nota: "intercambiadas por tu empresa", tono: "ok" },
        ]}
      />

      {imp && <div className="mt-3"><FranjaImpacto imp={imp} /></div>}

      <Seccion
        className="mt-6"
        titulo="Negociaciones"
        descripcion="Lo que requiere tu respuesta aparece primero."
        acciones={
          <Tabs
            etiqueta="Ver como"
            valor={rol}
            onChange={(v) => setVista(v as Vista)}
            opciones={[
              { valor: "OFERTANTE", etiqueta: "Como ofertante", conteo: resumen.OFERTANTE },
              { valor: "RECEPTOR", etiqueta: "Como demandante", conteo: resumen.RECEPTOR },
            ]}
          />
        }
      >
        {(resumen.accionO > 0 || resumen.accionR > 0) && (
          <p className="mb-3 flex flex-wrap items-center gap-2 text-sm text-ink-700" role="status">
            <Badge tono="ambar"><Icono nombre="alerta" size={14} />{rol === "OFERTANTE" ? resumen.accionO : resumen.accionR} por atender</Badge>
            {rol === "OFERTANTE" && resumen.accionR > 0 && <span>Tienes {resumen.accionR} más como demandante.</span>}
            {rol === "RECEPTOR" && resumen.accionO > 0 && <span>Tienes {resumen.accionO} más como ofertante.</span>}
          </p>
        )}
        {propias.length === 0 ? (
          rol === "OFERTANTE" ? (
            <Vacio titulo="Aún no te han propuesto nada" texto="Publica un lote con fotos para recibir propuestas." accion={<LinkBtn href="/lotes/nuevo">Publicar un lote</LinkBtn>} />
          ) : (
            <Vacio titulo="Aún no has propuesto ningún acuerdo" texto="Explora los materiales y ofrece tu precio dentro de la plataforma." accion={<LinkBtn href="/lotes">Explorar materiales</LinkBtn>} />
          )
        ) : (
          <Tabla items={propias} />
        )}
      </Seccion>

      <nav aria-label="Más herramientas" className="mt-8 border-t border-line pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Más herramientas</p>
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
          {secundarios.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-nav-700 hover:underline">
                <Icono nombre={s.icono} size={16} className="shrink-0 text-ink-500" />
                {s.etiqueta}
                {s.nota && <span className="text-xs font-normal text-ink-500">· {s.nota}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
