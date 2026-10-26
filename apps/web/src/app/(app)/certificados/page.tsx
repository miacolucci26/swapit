"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatoMasa } from "@swapit/shared";
import { Badge, Cargando, KpiFranja, LinkBtn, PageHeader, Seccion, TablaDatos, Vacio } from "@/components/ui";
import { api } from "@/lib/api";
import { fecha } from "@/lib/format";
import type { Material } from "@/lib/types";

interface Certificado { codigo: string; fecha: string; material: string; titulo: string; toneladas: number; co2Evitado: number; ofertante: string; receptor: string; pdfUrl: string }

const BTN_LINK = "inline-flex min-h-10 items-center justify-center rounded-control border border-ink-300 bg-white px-3 text-sm font-semibold text-ink-900 hover:border-nav-600 hover:bg-surface-2";

/** Certificados que el intermediario emitió a sus clientes, y los despachos que aún están por certificar. */
export default function CertificadosPage() {
  const [certs, setCerts] = useState<Certificado[] | null>(null);
  const [porCertificar, setPorCertificar] = useState<Material[]>([]);

  useEffect(() => {
    api<Certificado[]>("/certificados").then(setCerts);
    api<Material[]>("/material?estado=DESPACHADO").then((l) => setPorCertificar(l.filter((m) => !m.certificado)));
  }, []);

  if (!certs) return <Cargando />;

  const toneladas = certs.reduce((a, c) => a + c.toneladas, 0);

  return (
    <>
      <PageHeader titulo="Certificados" sub="Constancias con tu marca para tus clientes." />

      <KpiFranja
        className="mb-6"
        items={[
          { etiqueta: "Emitidos", valor: certs.length, tono: certs.length > 0 ? "ok" : "neutro" },
          { etiqueta: "Por certificar", valor: porCertificar.length, nota: porCertificar.length > 0 ? "Despachos sin constancia" : "Todo al día", tono: porCertificar.length > 0 ? "alerta" : "neutro" },
          { etiqueta: "Material certificado", valor: formatoMasa(toneladas) },
        ]}
      />

      {porCertificar.length > 0 && (
        <Seccion className="mb-6" titulo="Por certificar" descripcion="Despachos que aún no tienen constancia.">
          <TablaDatos minAncho={560}>
            <thead>
              <tr><th>Material</th><th>Proveedor</th><th>Cliente</th><th className="text-right">Acción</th></tr>
            </thead>
            <tbody>
              {porCertificar.map((m) => (
                <tr key={m.id}>
                  <td className="max-w-[260px]"><span className="line-clamp-2 font-medium text-ink-900">{m.titulo}</span></td>
                  <td className="text-ink-700">{m.proveedor}</td>
                  <td className="text-ink-700">{m.clienteDestino ?? m.destinoNombre ?? "—"}</td>
                  <td className="text-right"><LinkBtn href={`/material/${m.id}`} className="min-h-9 px-3">Emitir certificado</LinkBtn></td>
                </tr>
              ))}
            </tbody>
          </TablaDatos>
        </Seccion>
      )}

      {certs.length === 0 ? (
        <Vacio titulo="Aún no emites certificados" texto="Despacha material y emite el primero con tu logo." accion={<LinkBtn href="/material">Ver material</LinkBtn>} />
      ) : (
        <Seccion titulo="Emitidos" descripcion="Cada constancia lleva un código QR verificable.">
          <TablaDatos minAncho={880}>
            <thead>
              <tr><th>Código</th><th>Material</th><th>Entrega</th><th className="text-right">Cantidad</th><th className="text-right">CO₂eq evitado*</th><th>Fecha</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {certs.map((c) => (
                <tr key={c.codigo}>
                  <td className="whitespace-nowrap font-mono text-xs font-semibold text-nav-800">{c.codigo}</td>
                  <td className="max-w-[240px]">
                    <span className="line-clamp-2 font-medium text-ink-900">{c.titulo}</span>
                    <span className="block text-xs text-ink-500">{c.material.split("(")[0].trim()}</span>
                  </td>
                  <td className="text-ink-700">{c.ofertante} <span className="text-ink-400">→</span> {c.receptor}</td>
                  <td className="num whitespace-nowrap text-right">{formatoMasa(c.toneladas)}</td>
                  <td className="num whitespace-nowrap text-right text-pri-700">{formatoMasa(c.co2Evitado)}</td>
                  <td className="whitespace-nowrap text-ink-500">{fecha(c.fecha)} <Badge tono="verde" className="ml-1">Emitido</Badge></td>
                  <td>
                    <div className="flex gap-1.5">
                      <a href={c.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center rounded-control bg-pri-600 px-3 text-sm font-semibold text-white hover:bg-pri-700">Descargar</a>
                      <Link href={`/verificar/${c.codigo}`} target="_blank" className={BTN_LINK}>Verificar</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TablaDatos>
        </Seccion>
      )}

      <details className="mt-4 text-sm text-ink-500">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold text-nav-700">Ver aviso</summary>
        <p>* CO₂eq es una estimación con factores de ejemplo, aún no validados. La constancia no reemplaza el Manifiesto de Residuos Sólidos Peligrosos ni las declaraciones ante SIGERSOL/OEFA.</p>
      </details>
    </>
  );
}
