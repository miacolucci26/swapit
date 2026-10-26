"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Btn, Card, Cargando, KpiFranja, LinkBtn, PageHeader, Seccion, TablaDatos } from "@/components/ui";
import { Icono } from "@/components/vis/Iconos";
import { api, ApiError } from "@/lib/api";
import { fecha, soles } from "@/lib/format";

interface Resumen {
  plan: { codigo: string; etiqueta: string; incluye: string; precioMensual: number; feeCertificado: number };
  suscripcion: { estado: string; periodoInicio: string; periodoFin: string; montoMensual: number; referenciaPago: string | null } | null;
  proximoCobro: { fecha: string; monto: number } | null;
  feesDelMes: { cantidad: number; monto: number };
  recientes: { id: string; concepto: string; monto: number; estado: "PENDIENTE" | "COBRADO" | "FALLIDO"; fecha: string; certificado: string | null }[];
  aviso: string;
}
// Estado = tono + palabra.
const ESTADO_COBRO: Record<"PENDIENTE" | "COBRADO" | "FALLIDO", { tono: "verde" | "ambar" | "rojo"; texto: string }> = {
  COBRADO: { tono: "verde", texto: "Cobrado" },
  PENDIENTE: { tono: "ambar", texto: "Pendiente" },
  FALLIDO: { tono: "rojo", texto: "Fallido" },
};

/** Suscripción mensual y fee por certificado. Los cobros son simulados en esta versión. */
export default function Facturacion() {
  const [r, setR] = useState<Resumen | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(() => api<Resumen>("/facturacion").then(setR), []);
  useEffect(() => {
    cargar();
  }, [cargar]);

  async function accion(ruta: string) {
    setBusy(true);
    setError("");
    try {
      setR(await api<Resumen>(ruta, { method: "POST" }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error de conexión");
    } finally {
      setBusy(false);
    }
  }

  if (!r) return <Cargando />;
  const activa = !!r.suscripcion;

  return (
    <>
      <PageHeader titulo="Facturación" sub="Suscripción mensual y costo por certificado." acciones={<Badge tono="ambar">Cobros simulados</Badge>} />
      {error && <p role="alert" className="mb-4 flex items-center gap-2 rounded-control bg-error-tint px-3 py-2 text-sm font-medium text-error-ink"><Icono nombre="alerta" size={16} />{error}</p>}

      <KpiFranja
        items={[
          { etiqueta: "Plan", valor: <>{soles(r.plan.precioMensual)}<span className="ml-1 text-sm font-medium text-ink-500">/ mes</span></>, nota: `+ ${soles(r.plan.feeCertificado)} por certificado` },
          { etiqueta: "Próximo cobro", valor: r.proximoCobro ? soles(r.proximoCobro.monto) : "—", nota: r.proximoCobro ? `El ${fecha(r.proximoCobro.fecha)}` : "Sin suscripción", tono: r.proximoCobro ? "neutro" : "alerta" },
          { etiqueta: "Costos del mes", valor: soles(r.feesDelMes.monto), nota: `${r.feesDelMes.cantidad} certificado${r.feesDelMes.cantidad === 1 ? "" : "s"}` },
        ]}
      />

      <Seccion className="mt-6" titulo="Suscripción" descripcion="Necesaria para emitir certificados.">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-base font-semibold text-nav-900">{r.plan.etiqueta}</h3>
              <Badge tono={activa ? "verde" : "ambar"}>{activa ? "Activa" : "Sin suscripción"}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {activa ? (
                <Btn variante="peligro" disabled={busy} onClick={() => { if (window.confirm("Sin suscripción no podrás emitir certificados. ¿Cancelar?")) accion("/facturacion/cancelar"); }}>Cancelar suscripción</Btn>
              ) : (
                <Btn disabled={busy} onClick={() => accion("/facturacion/suscribir")}>{busy ? "Activando…" : "Activar suscripción"}</Btn>
              )}
              <LinkBtn href="/certificados" variante="borde">Ver certificados</LinkBtn>
            </div>
          </div>
          <details className="mt-2 text-sm text-ink-700">
            <summary className="min-h-11 cursor-pointer py-2 font-semibold text-nav-700">Qué incluye</summary>
            <p>{r.plan.incluye}</p>
            <p className="mt-1 text-xs text-ink-500">{r.aviso} Precios de ejemplo; la tarifa definitiva aún no está decidida. Sin comisión por tus operaciones.</p>
          </details>
        </Card>
      </Seccion>

      <Seccion className="mt-6" titulo="Últimos cobros">
        {r.recientes.length === 0 ? (
          <p className="rounded-card border border-dashed border-ink-300 bg-white p-4 text-sm text-ink-500">Aún no hay cobros. Salen al emitir certificados.</p>
        ) : (
          <TablaDatos minAncho={520}>
            <thead>
              <tr><th>Concepto</th><th>Certificado</th><th>Fecha</th><th className="text-right">Monto</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {r.recientes.map((f) => {
                const e = ESTADO_COBRO[f.estado];
                return (
                  <tr key={f.id}>
                    <td className="font-medium text-ink-900">Costo por certificado</td>
                    <td className="font-mono text-xs text-ink-700">{f.certificado ?? "—"}</td>
                    <td className="whitespace-nowrap text-ink-500">{fecha(f.fecha)}</td>
                    <td className="num text-right font-semibold">{soles(f.monto)}</td>
                    <td><Badge tono={e.tono}>{e.texto}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </TablaDatos>
        )}
      </Seccion>
    </>
  );
}
