"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { fecha, num, soles } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { EtapaAcuerdo, TransaccionItem } from "@/lib/types";
import { TONO_ETAPA } from "./Transacciones";
import { Badge, Cargando, MES, PageHeader, Segmented, TablaDatos, Vacio, LinkBtn } from "./ui";
import { Icono } from "./vis/Iconos";

// Dashboard ejecutivo del marketplace: compras y ventas en un solo lugar, con trazabilidad de cada operación
// (origen → material → destino → certificado), estado de las transacciones, contrapartes frecuentes e impacto.
// Referencia: tableros de trazabilidad de residuos tipo ReciLink.

interface Impacto {
  toneladas: number;
  co2EvitadoTon: number;
  costoDisposicionEvitado: number;
  simbiosis: number;
  certificados: number;
  porMes: { mes: string; toneladas: number; simbiosis: number }[];
  porCategoria: { codigo: string; nombre: string; toneladas: number }[];
}

type Alcance = "TODO" | "RECEPTOR" | "OFERTANTE";

// El CO₂eq se oculta mientras sus factores no estén validados; solo se muestra con NEXT_PUBLIC_MOSTRAR_CO2=1.
const MOSTRAR_CO2 = process.env.NEXT_PUBLIC_MOSTRAR_CO2 === "1";

const ETAPAS: { etapa: EtapaAcuerdo; etiqueta: string; nota: string }[] = [
  { etapa: "PROPUESTA", etiqueta: "En negociación", nota: "Conversando el precio" },
  { etapa: "ACEPTADA", etiqueta: "Con acuerdo", nota: "Pago, recojo o entrega en curso" },
  { etapa: "CERRADA", etiqueta: "Completadas", nota: "Entregadas y cerradas" },
  { etapa: "CANCELADA", etiqueta: "Canceladas", nota: "No se concretaron" },
];

/** Toneladas de una operación; las unidades sueltas no tienen peso conocido y no suman. */
const toneladas = (t: TransaccionItem) => (t.lote.unidad === "ton" ? t.cantidad : t.lote.unidad === "kg" ? t.cantidad / 1000 : 0);
const etapa = (t: TransaccionItem): EtapaAcuerdo => t.etapa ?? "PROPUESTA";

const TARJETA = "rounded-2xl border border-zinc-200/80 bg-white/80 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_-8px_rgba(24,24,27,0.10)] backdrop-blur-xl";

function Tarjeta({ titulo, sub, children, className = "" }: { titulo: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`${TARJETA} p-4 sm:p-5 ${className}`}>
      <h2 className="text-base font-semibold text-zinc-900">{titulo}</h2>
      {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

type Tono = "neutro" | "ok" | "alerta";
const TONO_VALOR: Record<Tono, string> = { neutro: "text-zinc-900", ok: "text-pri-700", alerta: "text-amber-700" };

/** Indicadores principales: una franja de vidrio con cifras grandes (estilo de los paneles de Apple). */
function Indicadores({ items }: { items: { etiqueta: string; valor: React.ReactNode; nota?: string; tono?: Tono; icono: Parameters<typeof Icono>[0]["nombre"] }[] }) {
  return (
    <dl className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {items.map((it, i) => (
        <div key={it.etiqueta} className={`${TARJETA} min-w-0 px-4 py-4 ${i === items.length - 1 && items.length % 2 ? "max-md:col-span-2" : ""}`}>
          <dt className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
            <span className="grid size-6 place-items-center rounded-full bg-zinc-900/[0.04] text-zinc-600"><Icono nombre={it.icono} size={14} /></span>
            {it.etiqueta}
          </dt>
          <dd className={`num mt-2.5 truncate text-[26px] font-semibold leading-none tracking-tight ${TONO_VALOR[it.tono ?? "neutro"]}`}>{it.valor}</dd>
          {it.nota && <dd className="mt-1.5 truncate text-xs text-zinc-500">{it.nota}</dd>}
        </div>
      ))}
    </dl>
  );
}

/** Barras horizontales de una sola serie (un solo tono: es magnitud, no identidad). */
function BarrasH({ filas, formato }: { filas: { etiqueta: string; valor: number; detalle?: string }[]; formato: (n: number) => string }) {
  const max = Math.max(...filas.map((f) => f.valor), 0) || 1;
  return (
    <ul className="flex flex-col gap-3">
      {filas.map((f) => (
        <li key={f.etiqueta} title={`${f.etiqueta}: ${formato(f.valor)}${f.detalle ? ` · ${f.detalle}` : ""}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-zinc-700">{f.etiqueta}</span>
            <span className="num shrink-0 font-semibold text-zinc-900">{formato(f.valor)}</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-100">
            <div className="h-2 rounded-full bg-pri-600" style={{ width: `${Math.max(2, (f.valor / max) * 100)}%` }} />
          </div>
          {f.detalle && <p className="mt-1 text-xs text-zinc-500">{f.detalle}</p>}
        </li>
      ))}
    </ul>
  );
}

/** Columnas por mes (toneladas recuperadas), con el valor al pasar el cursor. */
function ColumnasMes({ meses }: { meses: Impacto["porMes"] }) {
  const max = Math.max(...meses.map((m) => m.toneladas), 0) || 1;
  return (
    <div>
      <div className="flex h-36 items-end gap-2 border-b border-zinc-200" role="img" aria-label={`Toneladas recuperadas por mes: ${meses.map((m) => `${MES(m.mes)} ${num(m.toneladas)}`).join(", ")}`}>
        {meses.map((m) => (
          <div key={m.mes} className="group relative flex h-full flex-1 items-end" title={`${MES(m.mes)}: ${num(m.toneladas)} t · ${m.simbiosis} operaciones`}>
            <div className="w-full rounded-t bg-pri-600 transition group-hover:bg-pri-700" style={{ height: `${m.toneladas ? Math.max(3, (m.toneladas / max) * 100) : 0}%` }} />
            <span className="num pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-1.5 py-0.5 text-[11px] text-white opacity-0 transition group-hover:opacity-100">{num(m.toneladas)} t</span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2">
        {meses.map((m) => <span key={m.mes} className="flex-1 text-center text-xs capitalize text-zinc-500">{MES(m.mes)}</span>)}
      </div>
    </div>
  );
}

/** Contrapartes con más operaciones (proveedores si compras, clientes si vendes). */
function frecuentes(items: TransaccionItem[]) {
  const g = new Map<string, { nombre: string; n: number; total: number; ton: number }>();
  for (const t of items) {
    if (etapa(t) === "CANCELADA") continue;
    const c = g.get(t.contraparte.id) ?? { nombre: t.contraparte.razonSocial, n: 0, total: 0, ton: 0 };
    c.n += 1;
    c.total += t.total || 0;
    c.ton += toneladas(t);
    g.set(t.contraparte.id, c);
  }
  return [...g.values()].sort((a, b) => b.n - a.n || b.total - a.total).slice(0, 5);
}

export default function DashboardMarket() {
  const { user, modoUso } = useSession();
  const [items, setItems] = useState<TransaccionItem[] | null>(null);
  const [imp, setImp] = useState<Impacto | null>(null);
  const [alcance, setAlcance] = useState<Alcance>("TODO");

  useEffect(() => {
    api<TransaccionItem[]>("/transacciones").then(setItems).catch(() => setItems([]));
    api<Impacto>("/impacto/mi").then(setImp).catch(() => undefined);
  }, []);

  const vista = useMemo(() => (items ?? []).filter((t) => alcance === "TODO" || t.rol === alcance), [items, alcance]);
  const compras = useMemo(() => (items ?? []).filter((t) => t.rol === "RECEPTOR"), [items]);
  const ventas = useMemo(() => (items ?? []).filter((t) => t.rol === "OFERTANTE"), [items]);

  if (!items) return <Cargando />;

  const vivas = (ts: TransaccionItem[]) => ts.filter((t) => etapa(t) !== "CANCELADA");
  const suma = (ts: TransaccionItem[]) => vivas(ts).reduce((a, t) => a + (t.total || 0), 0);
  const porEtapa = ETAPAS.map((e) => ({ ...e, n: vista.filter((t) => etapa(t) === e.etapa).length }));
  const pendientes = vista.filter((t) => t.requiereMiAccion).length;
  const mi = user?.empresa.nombreTienda ?? user?.empresa.razonSocial ?? "Tú";
  const traza = [...vista].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <>
      <PageHeader
        titulo="Panel"
        sub="Tus compras y ventas, su estado y el impacto que generan."
        acciones={
          <a href="/api/impacto/mi/reporte.xlsx" className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 hover:border-nav-600">
            <Icono nombre="descargar" size={16} />Reporte Excel
          </a>
        }
      />

      <Indicadores
        items={[
          { etiqueta: "Compras", valor: soles(suma(compras)), nota: `${vivas(compras).length} operaciones`, icono: "caja" },
          { etiqueta: "Ventas", valor: soles(suma(ventas)), nota: `${vivas(ventas).length} operaciones`, tono: "ok", icono: "dinero" },
          { etiqueta: "Material recuperado", valor: `${num(imp?.toneladas ?? 0)} t`, nota: "En operaciones entregadas", icono: "reciclar" },
          MOSTRAR_CO2
            ? { etiqueta: "CO₂eq evitado", valor: `${num(imp?.co2EvitadoTon ?? 0)} t`, nota: "Estimado", icono: "hoja" }
            : { etiqueta: "Disposición evitada", valor: soles(imp?.costoDisposicionEvitado ?? 0), nota: "Costo de relleno estimado", icono: "hoja" },
          { etiqueta: "Requieren tu acción", valor: pendientes, nota: pendientes ? "Revisa la trazabilidad" : "Todo al día", tono: pendientes ? "alerta" : "neutro", icono: "alerta" },
        ]}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented
          etiqueta="Mostrar"
          valor={alcance}
          onChange={(v) => setAlcance(v as Alcance)}
          opciones={[{ valor: "TODO", etiqueta: "Todo" }, { valor: "RECEPTOR", etiqueta: "Compras" }, { valor: "OFERTANTE", etiqueta: "Ventas" }]}
        />
        <span className="text-xs text-zinc-500">Filtra el estado y la trazabilidad.</span>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Tarjeta titulo="Estado de las transacciones" sub={`${vista.length} en total`} className="lg:col-span-1">
          <ul className="flex flex-col divide-y divide-zinc-100">
            {porEtapa.map((e) => (
              <li key={e.etapa} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <Badge tono={TONO_ETAPA[e.etapa]}>{e.etiqueta}</Badge>
                <span className="min-w-0 flex-1 truncate text-xs text-zinc-500">{e.nota}</span>
                <span className="num text-xl font-semibold text-zinc-900">{e.n}</span>
              </li>
            ))}
          </ul>
        </Tarjeta>

        <Tarjeta titulo="Material recuperado por mes" sub="Toneladas en operaciones entregadas · últimos 6 meses" className="lg:col-span-2">
          {imp ? <ColumnasMes meses={imp.porMes} /> : <div className="h-36 animate-pulse rounded-lg bg-zinc-100" />}
        </Tarjeta>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Tarjeta titulo="Impacto por material" sub="Toneladas recuperadas">
          {imp?.porCategoria.length ? (
            <BarrasH filas={[...imp.porCategoria].sort((a, b) => b.toneladas - a.toneladas).slice(0, 6).map((c) => ({ etiqueta: c.nombre, valor: c.toneladas }))} formato={(n) => `${num(n)} t`} />
          ) : (
            <p className="text-sm text-zinc-500">Aparece cuando completes tu primera entrega.</p>
          )}
        </Tarjeta>
        <Tarjeta titulo="Proveedores frecuentes" sub="A quién le compras más">
          {frecuentes(compras).length ? (
            <BarrasH filas={frecuentes(compras).map((p) => ({ etiqueta: p.nombre, valor: p.n, detalle: `${soles(p.total)}${p.ton ? ` · ${num(p.ton)} t` : ""}` }))} formato={(n) => `${n} ${n === 1 ? "operación" : "operaciones"}`} />
          ) : (
            <p className="text-sm text-zinc-500">Aún no tienes compras.</p>
          )}
        </Tarjeta>
        <Tarjeta titulo="Clientes frecuentes" sub="Quién te compra más">
          {frecuentes(ventas).length ? (
            <BarrasH filas={frecuentes(ventas).map((p) => ({ etiqueta: p.nombre, valor: p.n, detalle: `${soles(p.total)}${p.ton ? ` · ${num(p.ton)} t` : ""}` }))} formato={(n) => `${n} ${n === 1 ? "operación" : "operaciones"}`} />
          ) : (
            <p className="text-sm text-zinc-500">Aún no tienes ventas.</p>
          )}
        </Tarjeta>
      </div>

      <section className={`${TARJETA} p-4 sm:p-5`}>
        <h2 className="text-base font-semibold text-zinc-900">Trazabilidad</h2>
        <p className="mt-0.5 text-xs text-zinc-500">De dónde sale cada material, a dónde llega y con qué respaldo.</p>
        <div className="mt-4">
          {traza.length === 0 ? (
            <Vacio
              titulo="Aún no hay operaciones"
              texto={modoUso === "vendedor" ? "Cuando un comprador te escriba, la operación aparece aquí." : "Escríbele a un vendedor y la operación aparece aquí."}
              accion={<LinkBtn href="/lotes">Ir al marketplace</LinkBtn>}
            />
          ) : (
            <TablaDatos minAncho={900}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Material</th>
                  <th>Origen → Destino</th>
                  <th className="text-right">Cantidad</th>
                  <th className="text-right">Total</th>
                  <th>Estado</th>
                  <th>Respaldo</th>
                  <th><span className="sr-only">Abrir</span></th>
                </tr>
              </thead>
              <tbody>
                {traza.map((t) => {
                  const vendo = t.rol === "OFERTANTE";
                  return (
                    <tr key={t.id}>
                      <td className="whitespace-nowrap text-zinc-500">{fecha(t.updatedAt)}</td>
                      <td className="max-w-[220px]">
                        <span className="line-clamp-1 font-medium text-zinc-900">{t.lote.titulo}</span>
                        <span className="text-xs text-zinc-500">{t.lote.categoria} · {vendo ? "Venta" : "Compra"}</span>
                      </td>
                      <td className="max-w-[260px] text-zinc-700">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate">{vendo ? mi : t.contraparte.razonSocial}</span>
                          <Icono nombre="flecha" size={14} className="shrink-0 text-zinc-400" />
                          <span className="truncate">{vendo ? t.contraparte.razonSocial : mi}</span>
                        </span>
                      </td>
                      <td className="num whitespace-nowrap text-right">{num(t.cantidad)} {t.lote.unidad}</td>
                      <td className="num whitespace-nowrap text-right font-semibold">{t.total ? soles(t.total) : "—"}</td>
                      <td><Badge tono={TONO_ETAPA[etapa(t)] ?? "gris"}>{t.etiquetaEtapa ?? t.etiquetaEstado}</Badge></td>
                      <td className="whitespace-nowrap">
                        {t.certificado ? (
                          <a href={`/verificar/${t.certificado}`} target="_blank" className="inline-flex items-center gap-1 text-sm font-semibold text-nav-700 hover:underline"><Icono nombre="certificado" size={15} />Certificado</a>
                        ) : (
                          <span className="text-xs text-zinc-500">{etapa(t) === "CERRADA" ? "Sin certificado" : "Al entregar"}</span>
                        )}
                      </td>
                      <td className="text-right">
                        <Link href={`/transacciones/${t.id}`} className="inline-flex min-h-10 items-center gap-1 whitespace-nowrap text-sm font-semibold text-nav-700 hover:underline">
                          {t.requiereMiAccion ? "Atender" : "Ver"}<Icono nombre="flecha" size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TablaDatos>
          )}
        </div>
      </section>
    </>
  );
}
