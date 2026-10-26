"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatoMasa } from "@swapit/shared";
import PublicNav from "@/components/PublicNav";
import { Badge, Cargando, Seccion, TablaDatos } from "@/components/ui";
import { Icono } from "@/components/vis/Iconos";
import { api, ApiError } from "@/lib/api";
import { fecha } from "@/lib/format";

interface Cert {
  codigo: string; valido: boolean; emitidoEl: string; hashSha256: string; material: string; codigoLer: string | null;
  toneladas: number; cantidad?: string; co2EvitadoTon: number; usoFinalDeclarado: string; pdfUrl: string;
  ofertante: { razonSocial: string; ruc: string | null; tipo: "EMPRESA" | "PERSONA" }; receptor: { razonSocial: string; ruc: string | null; tipo: "EMPRESA" | "PERSONA" };
  /** Solo certificados B2B2B: el intermediario que lo emitió (con su marca). */
  emisor?: { razonSocial: string; ruc: string | null; logoUrl: string | null; colorMarca: string | null } | null;
}

export default function Verificar() {
  const { codigo } = useParams<{ codigo: string }>();
  const [c, setC] = useState<Cert | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Cert>(`/verificar/${codigo}`).then(setC).catch((e) => setError(e instanceof ApiError && e.status === 404 ? "No existe un certificado con ese código." : "No se pudo verificar. Intenta de nuevo en unos minutos."));
  }, [codigo]);

  const plano = (t: string) => t.replace(/[  ]/g, " ");
  const cantidad = c ? (c.cantidad && !plano(c.cantidad).endsWith(" t") && plano(c.cantidad) !== plano(formatoMasa(c.toneladas)) ? `${c.cantidad} (≈ ${formatoMasa(c.toneladas)})` : formatoMasa(c.toneladas)) : "";
  const sinRuc = (ruc: string | null, persona: boolean) => (ruc ? ruc : c?.emisor ? "Sin RUC" : persona ? "Persona natural" : "—");

  const datos: [string, React.ReactNode][] = c
    ? [
        ["Código", <span key="cod" className="num font-semibold">{c.codigo}</span>],
        ["Material", c.material],
        ["Cantidad", <span key="cant" className="num">{cantidad}</span>],
        ["Emitido el", fecha(c.emitidoEl)],
        ["Uso final declarado", c.usoFinalDeclarado],
        ["CO₂eq evitado", <span key="co2" className="num">{formatoMasa(c.co2EvitadoTon)} <span className="font-normal text-ink-500">(estimación demostrativa)</span></span>],
        ["Código LER", c.codigoLer ?? "—"],
        ...(c.emisor ? ([["Emitido por", <span key="em" className="inline-flex items-center gap-2">{c.emisor.logoUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.emisor.logoUrl} alt="" className="size-6 rounded object-contain" />}{c.emisor.razonSocial}{c.emisor.ruc ? ` · RUC ${c.emisor.ruc}` : ""}</span>]] as [string, React.ReactNode][]) : []),
        ["Huella SHA-256", <code key="h" className="break-all text-xs">{c.hashSha256}</code>],
      ]
    : [];

  return (
    <div className="min-h-screen bg-bg">
      <PublicNav />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-semibold tracking-tight text-nav-900">Verificar certificado</h1>
        <p className="mt-1 text-sm text-ink-500">Comprueba que los datos coinciden con lo registrado al emitir el certificado.</p>

        {error && (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-card border border-error/30 bg-error-tint p-4 text-sm font-medium text-error-ink">
            <Icono nombre="alerta" size={18} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}
        {!c && !error && <Cargando />}
        {c && (
          <>
            <div
              role="status"
              className={`mt-4 flex items-start gap-3 rounded-card border p-4 ${c.valido ? "border-pri-200 bg-pri-50 text-pri-800" : "border-error/30 bg-error-tint text-error-ink"}`}
            >
              <Icono nombre={c.valido ? "check" : "alerta"} size={22} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-base font-semibold leading-tight">{c.valido ? "Certificado íntegro" : "Datos modificados"}</p>
                <p className="mt-0.5 text-sm">{c.valido ? "Coincide con lo registrado al emitirlo." : "Los datos no coinciden con el certificado emitido."}</p>
              </div>
            </div>

            <Seccion titulo="Datos del certificado" className="mt-6" acciones={<Badge tono={c.valido ? "verde" : "rojo"}>{c.valido ? "Íntegro" : "Alterado"}</Badge>}>
              <TablaDatos minAncho={0}>
                <caption className="sr-only">Datos del certificado {c.codigo}</caption>
                <tbody>
                  {datos.map(([k, v]) => (
                    <tr key={k}>
                      <td className="w-40 text-xs font-medium text-ink-500 sm:w-52 sm:text-sm">{k}</td>
                      <td className="!h-auto !py-2.5 font-medium text-ink-900">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </TablaDatos>
            </Seccion>

            <Seccion titulo="Partes del intercambio" className="mt-6">
              <TablaDatos minAncho={0}>
                <caption className="sr-only">Empresas que intervienen</caption>
                <thead>
                  <tr>
                    <th scope="col">Rol</th>
                    <th scope="col">Empresa</th>
                    <th scope="col">RUC</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{c.emisor ? "Proveedor (generador)" : "Entrega"}</td>
                    <td className="font-medium">{c.ofertante.razonSocial}</td>
                    <td className="num">{sinRuc(c.ofertante.ruc, c.ofertante.tipo === "PERSONA")}</td>
                  </tr>
                  {c.emisor && (
                    <tr>
                      <td>Acopiador</td>
                      <td className="font-medium">{c.emisor.razonSocial}</td>
                      <td className="num">{c.emisor.ruc ?? "—"}</td>
                    </tr>
                  )}
                  <tr>
                    <td>{c.emisor ? "Cliente destino" : "Recibe"}</td>
                    <td className="font-medium">{c.receptor.razonSocial}</td>
                    <td className="num">{sinRuc(c.receptor.ruc, c.receptor.tipo === "PERSONA")}</td>
                  </tr>
                </tbody>
              </TablaDatos>
            </Seccion>

            <a href={c.pdfUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-control bg-pri-600 px-5 py-2 text-sm font-semibold text-white hover:bg-pri-700">
              <Icono nombre="descargar" size={18} />
              Descargar PDF
            </a>
            <p className="mt-4 text-xs text-ink-500">
              {c.emisor ? `Constancia de trazabilidad emitida por ${c.emisor.razonSocial} con la plataforma Swapit` : "Constancia de trazabilidad emitida por Swapit"}; no reemplaza el Manifiesto de Residuos Sólidos Peligrosos ni las declaraciones oficiales ante SIGERSOL/OEFA. Prototipo con datos de demostración.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
