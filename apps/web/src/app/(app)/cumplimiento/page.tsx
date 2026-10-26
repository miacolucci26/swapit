"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Cargando, inputCls, KpiFranja, PageHeader, Seccion, TablaDatos, Tabs, Vacio } from "@/components/ui";
import { Icono } from "@/components/vis/Iconos";
import { api } from "@/lib/api";
import { fecha, num } from "@/lib/format";

interface Cumplimiento {
  empresa: { razonSocial: string; ruc: string };
  totalToneladas: number; totalCertificados: number;
  porCategoria: { categoria: string; codigoLer: string | null; toneladas: number; operaciones: number; contrapartes: string[] }[];
  detalle: { fecha: string; codigo: string; material: string; codigoLer: string | null; toneladas: number; contraparte: string; usoFinal: string }[];
}

export default function CumplimientoPage() {
  const [rol, setRol] = useState<"OFERTANTE" | "RECEPTOR">("OFERTANTE");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [d, setD] = useState<Cumplimiento | null>(null);

  const qs = new URLSearchParams({ rol, ...(desde ? { desde } : {}), ...(hasta ? { hasta } : {}) });
  useEffect(() => {
    setD(null);
    api<Cumplimiento>(`/cumplimiento?${qs}`).then(setD);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rol, desde, hasta]);

  return (
    <>
      <Link href="/transacciones" className="mb-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-nav-700 hover:underline">← Mi actividad</Link>
      <PageHeader
        titulo="Cumplimiento REP"
        sub="Evidencia de trazabilidad de los residuos gestionados a través de Swapit, lista para anexar a tus reportes (OEFA / MINAM)."
        acciones={<a href={`/api/cumplimiento/export.xlsx?${qs}`} className="inline-flex min-h-10 items-center gap-2 rounded-control bg-pri-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pri-700"><Icono nombre="descargar" size={16} />Exportar a Excel</a>}
      />

      <div className="mb-4 flex flex-wrap items-end gap-x-4 gap-y-2">
        <Tabs etiqueta="Ver como" valor={rol} onChange={(v) => setRol(v as "OFERTANTE" | "RECEPTOR")} opciones={[{ valor: "OFERTANTE", etiqueta: "Como generador" }, { valor: "RECEPTOR", etiqueta: "Como receptor" }]} />
        <label className="text-xs text-ink-700">Desde<input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={`${inputCls} mt-0.5`} /></label>
        <label className="text-xs text-ink-700">Hasta<input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={`${inputCls} mt-0.5`} /></label>
      </div>

      {!d ? <Cargando /> : (
        <>
          <KpiFranja
            items={[
              { etiqueta: "Toneladas gestionadas", valor: num(d.totalToneladas, 1), nota: d.empresa.razonSocial, tono: "ok" },
              { etiqueta: "Certificados emitidos", valor: d.totalCertificados },
              { etiqueta: "Categorías de residuo", valor: d.porCategoria.length },
            ]}
          />

          {d.detalle.length === 0 ? (
            <div className="mt-5"><Vacio titulo="Sin operaciones en este periodo" texto="Cada entrega confirmada por ambas partes genera un certificado y aparece aquí." /></div>
          ) : (
            <>
              <Seccion className="mt-6" titulo="Resumen por categoría" descripcion="Toneladas y operaciones por tipo de residuo.">
                <TablaDatos minAncho={620}>
                  <thead><tr><th>Categoría</th><th>Código LER</th><th className="text-right">Toneladas</th><th className="text-right">Operaciones</th><th>{rol === "OFERTANTE" ? "Receptores" : "Generadores"}</th></tr></thead>
                  <tbody>
                    {d.porCategoria.map((c) => (
                      <tr key={c.categoria}><td className="font-medium">{c.categoria}</td><td>{c.codigoLer ?? "—"}</td><td className="num text-right font-semibold">{num(c.toneladas, 1)}</td><td className="num text-right">{c.operaciones}</td><td className="text-ink-700">{c.contrapartes.join(", ")}</td></tr>
                    ))}
                  </tbody>
                </TablaDatos>
              </Seccion>

              <Seccion className="mt-6" titulo="Certificados de manejo y destino final" descripcion="Uno por cada entrega confirmada por ambas partes.">
                <TablaDatos minAncho={760}>
                  <thead><tr><th>Fecha</th><th>Certificado</th><th>Material</th><th className="text-right">t</th><th>{rol === "OFERTANTE" ? "Receptor" : "Generador"}</th><th>Uso final</th></tr></thead>
                  <tbody>
                    {d.detalle.map((x) => (
                      <tr key={x.codigo}>
                        <td className="whitespace-nowrap">{fecha(x.fecha)}</td>
                        <td className="whitespace-nowrap">
                          <Link href={`/verificar/${x.codigo}`} target="_blank" className="font-mono text-xs text-nav-700 hover:underline">{x.codigo}</Link>{" "}
                          <a href={`/api/verificar/${x.codigo}/pdf`} target="_blank" rel="noopener noreferrer" className="inline-flex size-8 items-center justify-center text-ink-500 hover:text-nav-700" title="Descargar PDF" aria-label={`Descargar PDF del certificado ${x.codigo}`}><Icono nombre="descargar" size={16} /></a>
                        </td>
                        <td>{x.material}</td><td className="num text-right font-semibold">{num(x.toneladas, 1)}</td><td>{x.contraparte}</td><td className="text-ink-700">{x.usoFinal}</td>
                      </tr>
                    ))}
                  </tbody>
                </TablaDatos>
              </Seccion>
            </>
          )}
          <p className="mt-4 text-xs text-ink-500">Constancia de trazabilidad emitida por Swapit a partir de datos confirmados por ambas partes; no reemplaza el Manifiesto de Residuos Sólidos Peligrosos ni las declaraciones oficiales ante SIGERSOL/OEFA.</p>
        </>
      )}
    </>
  );
}
