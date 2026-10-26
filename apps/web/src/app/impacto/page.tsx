"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { formatoMasa } from "@swapit/shared";
import PublicNav from "@/components/PublicNav";
import { Cargando, Columnas, type ItemKpi, KpiFranja, LinkBtn, MES, PuntoCategoria, Seccion, TablaDatos } from "@/components/ui";
import { Icono } from "@/components/vis/Iconos";
import { api } from "@/lib/api";
import { num } from "@/lib/format";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false, loading: () => <div className="h-[420px] animate-pulse rounded-card bg-ink-100" /> });

// El CO₂eq se oculta mientras sus factores no estén validados; solo se muestra con NEXT_PUBLIC_MOSTRAR_CO2=1.
const MOSTRAR_CO2 = process.env.NEXT_PUBLIC_MOSTRAR_CO2 === "1";
const ETIQUETA_CO2 = "Estimación demostrativa (factores de ejemplo, sin validar)";

interface Impacto {
  toneladas: number; co2EvitadoTon: number;
  simbiosis: number; participantesActivos: number; lotesActivos: number; certificados: number;
  porCategoria: { codigo: string; nombre: string; toneladas: number; co2: number }[];
  porMes: { mes: string; toneladas: number; co2: number; simbiosis: number }[];
  calor: { lat: number; lng: number; peso: number }[];
  supuestos: string;
}

export default function ImpactoPublico() {
  const [d, setD] = useState<Impacto | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    api<Impacto>("/impacto/publico").then(setD).catch(() => setError(true));
  }, []);

  const total = d ? d.porCategoria.reduce((a, c) => a + c.toneladas, 0) : 0;
  const kpis: ItemKpi[] = d
    ? [
        { etiqueta: "Toneladas intercambiadas", valor: formatoMasa(d.toneladas), nota: "material entregado entre empresas", tono: "ok" },
        { etiqueta: "Acuerdos cerrados", valor: num(d.simbiosis, 0), nota: "con entrega confirmada", tono: "neutro" },
        { etiqueta: "Empresas participantes", valor: num(d.participantesActivos, 0), nota: "con al menos un acuerdo" },
        { etiqueta: "Certificados emitidos", valor: num(d.certificados, 0), nota: "verificables con código QR" },
        ...(MOSTRAR_CO2 ? [{ etiqueta: "CO₂eq evitado", valor: formatoMasa(d.co2EvitadoTon), nota: ETIQUETA_CO2, tono: "alerta" as const }] : []),
      ]
    : [];

  return (
    <div className="min-h-screen bg-bg">
      <PublicNav />
      <header className="border-b border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-pri-700"><Icono nombre="hoja" size={16} />Reporte de impacto</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-nav-900 md:text-[28px]">Impacto de la red Swap It</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-500 md:text-[15px]">Material que las empresas del norte del Perú intercambian en lugar de desecharlo. Cifras calculadas solo con acuerdos cerrados en la plataforma.</p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">
        {error ? (
          <p className="rounded-card border border-line bg-white p-6 text-center text-sm text-ink-700">No pudimos cargar el reporte. Intenta de nuevo en unos minutos.</p>
        ) : !d ? <Cargando /> : (
          <>
            <KpiFranja items={kpis} />

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Seccion titulo="Toneladas por mes" descripcion="Últimos seis meses, según la fecha de cierre.">
                <div className="rounded-card border border-line bg-white p-4 shadow-card">
                  <figure aria-label={`Toneladas intercambiadas por mes: ${d.porMes.map((m) => `${MES(m.mes)} ${num(m.toneladas, 2)}`).join(", ")}`}>
                    <Columnas datos={d.porMes.map((m) => ({ etiqueta: MES(m.mes), valor: m.toneladas }))} unidad="t" formato={formatoMasa} />
                    <figcaption className="sr-only">Toneladas intercambiadas por mes</figcaption>
                  </figure>
                </div>
              </Seccion>

              <Seccion titulo="Por categoría de material" descripcion="Qué se intercambia y cuánto.">
                {d.porCategoria.length === 0 ? (
                  <p className="rounded-card border border-line bg-white p-6 text-center text-sm text-ink-500">Aún no hay acuerdos cerrados.</p>
                ) : (
                  <TablaDatos minAncho={MOSTRAR_CO2 ? 460 : 340}>
                    <thead>
                      <tr>
                        <th>Categoría</th>
                        <th className="text-right">Toneladas</th>
                        <th className="text-right">% del total</th>
                        {MOSTRAR_CO2 && <th className="text-right">CO₂eq (t)</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {d.porCategoria.map((c) => (
                        <tr key={c.codigo}>
                          <td><PuntoCategoria codigo={c.codigo} etiqueta={c.nombre.split("(")[0].trim()} className="text-sm text-ink-900" /></td>
                          <td className="num text-right font-medium">{formatoMasa(c.toneladas)}</td>
                          <td className="num text-right text-ink-700">{total > 0 ? `${num((c.toneladas / total) * 100, 0)} %` : "—"}</td>
                          {MOSTRAR_CO2 && <td className="num text-right text-ink-700">{formatoMasa(c.co2)}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </TablaDatos>
                )}
              </Seccion>
            </div>

            <Seccion className="mt-6" titulo="Dónde se mueve" descripcion="Zonas aproximadas; nunca ubicaciones exactas.">
              <div className="rounded-card border border-line bg-white p-3 shadow-card"><MapView modo="calor" puntos={d.calor.map((p, i) => ({ id: String(i), lat: p.lat, lng: p.lng, peso: p.peso }))} /></div>
            </Seccion>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-white p-4 shadow-card">
              <p className="text-base font-semibold text-nav-900">¿Tu empresa tiene excedentes o busca materia prima?</p>
              <LinkBtn href="/registro">Crear cuenta</LinkBtn>
            </div>
            <p className="mt-4 flex items-start gap-1.5 text-xs text-ink-500">
              <Icono nombre="info" size={14} className="mt-0.5 shrink-0" />
              <span>Las cifras pueden incluir operaciones de demostración. {MOSTRAR_CO2 ? `${ETIQUETA_CO2}. ${d.supuestos}` : "No se presentan estimaciones ambientales hasta validar sus factores y método."}</span>
            </p>
          </>
        )}
      </main>
    </div>
  );
}
