"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge, Btn, Cargando, inputCls, KpiFranja, PageHeader, Seccion } from "@/components/ui";
import { Icono, type NombreIcono } from "@/components/vis/Iconos";
import { api, ApiError } from "@/lib/api";
import { fecha, num } from "@/lib/format";
import type { Lote } from "@/lib/types";

interface Panel {
  saldo: number; totalGanado: number; totalGastado: number;
  movimientos: { id: string; tipo: string; monto: number; descripcion: string | null; createdAt: string }[];
  beneficios: { codigo: string; costo: number; etiqueta: string }[];
}

const TIPO: Record<string, string> = {
  GANADO_DONACION: "Ganado por donación", GANADO_CANJE: "Cobro en créditos", GASTADO_COMISION: "Comisión pagada", GASTADO_CANJE: "Pago con créditos", CANJE_BENEFICIO: "Canje de beneficio", AJUSTE: "Ajuste",
};
const ICONO: Record<string, NombreIcono> = { DESTACAR_LOTE: "precio", BADGE_CIRCULAR: "reciclar", REPORTE_SOSTENIBILIDAD: "grafico" };

export default function Creditos() {
  const [p, setP] = useState<Panel | null>(null);
  const [mios, setMios] = useState<Lote[]>([]);
  const [lote, setLote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const cargar = useCallback(() => api<Panel>("/creditos").then(setP), []);
  useEffect(() => {
    cargar();
    api<Lote[]>("/lotes?mios=1").then((l) => { const pub = l.filter((x) => x.estado === "PUBLICADO"); setMios(pub); setLote(pub[0]?.id ?? ""); });
  }, [cargar]);

  async function canjear(beneficio: string) {
    setMsg(null); setBusy(true);
    try {
      await api("/creditos/canjear", { method: "POST", json: { beneficio, loteId: beneficio === "DESTACAR_LOTE" ? lote : undefined } });
      setMsg({ ok: true, t: "¡Canje realizado!" });
      await cargar();
    } catch (e) {
      setMsg({ ok: false, t: e instanceof ApiError ? e.message : "No se pudo canjear" });
    } finally { setBusy(false); }
  }

  if (!p) return <Cargando />;
  return (
    <>
      <Link href="/transacciones" className="mb-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-nav-700 hover:underline">← Mi actividad</Link>
      <PageHeader titulo="Créditos circulares" sub="Moneda interna sin valor fuera de la plataforma. Se ganan donando material y se usan para pagar comisiones, comprar lotes o canjear beneficios." />

      <KpiFranja
        items={[
          { etiqueta: "Saldo actual", valor: num(p.saldo, 0), nota: "créditos circulares", tono: "ok" },
          { etiqueta: "Total ganado", valor: num(p.totalGanado, 0) },
          { etiqueta: "Total gastado", valor: num(p.totalGastado, 0) },
        ]}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Seccion className="min-w-0" titulo="Canjear beneficios" descripcion="Usa tus créditos en mejoras de tu cuenta.">
          {msg && <p role="status" className={`rounded-control p-2.5 text-sm ${msg.ok ? "bg-pri-50 text-pri-700" : "bg-error-tint text-error-ink"}`}>{msg.t}</p>}
          <ul className="mt-3 flex flex-col gap-3">
            {p.beneficios.map((b) => (
              <li key={b.codigo} className="rounded-card border border-line bg-white p-3 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2"><Icono nombre={ICONO[b.codigo] ?? "info"} size={16} className="shrink-0 text-ink-500" /><span className="text-sm font-medium">{b.etiqueta}</span></div>
                  <Badge tono="ambar">{b.costo} créd.</Badge>
                </div>
                {b.codigo === "DESTACAR_LOTE" && (
                  <select value={lote} onChange={(e) => setLote(e.target.value)} className={`${inputCls} mt-2`}>
                    {mios.length === 0 && <option value="">No tienes lotes publicados</option>}
                    {mios.map((l) => <option key={l.id} value={l.id}>{l.titulo}</option>)}
                  </select>
                )}
                {b.codigo === "REPORTE_SOSTENIBILIDAD" && p.movimientos.some((m) => m.descripcion?.startsWith("REPORTE_SOSTENIBILIDAD")) && (
                  <a href="/api/impacto/mi/reporte.xlsx" className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-nav-700 underline"><Icono nombre="descargar" size={16} />Descargar reporte (Excel)</a>
                )}
                <Btn variante="suave" className="mt-2" disabled={busy || p.saldo < b.costo || (b.codigo === "DESTACAR_LOTE" && !lote)} onClick={() => canjear(b.codigo)}>
                  {p.saldo < b.costo ? `Te faltan ${num(b.costo - p.saldo, 0)}` : "Canjear"}
                </Btn>
              </li>
            ))}
          </ul>
        </Seccion>

        <Seccion className="min-w-0" titulo="Historial de movimientos" descripcion="Registro inmutable: el saldo es la suma de todos los movimientos.">
          <ul className="divide-y divide-line rounded-card border border-line bg-white px-4 shadow-card">
            {p.movimientos.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{TIPO[m.tipo] ?? m.tipo}</div>
                  <div className="truncate text-xs text-ink-500">{m.descripcion?.replace(/^[A-Z_]+: /, "")} · {fecha(m.createdAt)}</div>
                </div>
                <b className={m.monto >= 0 ? "text-pri-700" : "text-error"}>{m.monto >= 0 ? "+" : ""}{num(m.monto, 1)}</b>
              </li>
            ))}
            {p.movimientos.length === 0 && <li className="py-4 text-sm text-ink-500">Aún no hay movimientos. Dona un lote para empezar a ganar créditos.</li>}
          </ul>
        </Seccion>
      </div>
    </>
  );
}
