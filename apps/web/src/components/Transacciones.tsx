"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fecha, soles } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { TransaccionItem } from "@/lib/types";
import { ROL_DE_MODO } from "./ShellMarket";
import { Badge, TablaDatos } from "./ui";
import { Icono } from "./vis/Iconos";

/** Conversaciones/operaciones del modo actual: como comprador las que recibes, como vendedor las que ofreces. */
export function useTransaccionesDelModo() {
  const { modoUso } = useSession();
  const [items, setItems] = useState<TransaccionItem[] | null>(null);
  useEffect(() => {
    api<TransaccionItem[]>("/transacciones")
      .then((t) => setItems(t.filter((x) => x.rol === ROL_DE_MODO[modoUso])))
      .catch(() => setItems([]));
  }, [modoUso]);
  return items;
}

export const TONO_ETAPA: Record<string, "ambar" | "azul" | "verde" | "gris"> = { PROPUESTA: "ambar", ACEPTADA: "azul", CERRADA: "verde", CANCELADA: "gris" };

/** Estado del dinero según el estado de la operación (el pago es en garantía y se libera al confirmar la entrega). */
export function estadoPago(t: TransaccionItem, comoVendedor: boolean): string {
  if (t.modalidad === "DONACION" || t.modalidad === "INTERCAMBIO") return "No aplica";
  switch (t.estado) {
    case "ACORDADO": return comoVendedor ? "Esperando pago" : "Por pagar";
    case "PAGO_RETENIDO":
    case "RECOJO_CONFIRMADO": return comoVendedor ? "Retenido hasta la entrega" : "Pagado (en garantía)";
    case "ENTREGADO":
    case "CALIFICADO":
    case "CERRADO": return comoVendedor ? "Cobrado" : "Pagado";
    case "CANCELADO": return "—";
    default: return "Aún sin acuerdo";
  }
}

/** Tabla de compras o ventas con enlace al chat de cada una. */
export function TablaOperaciones({ items, comoVendedor }: { items: TransaccionItem[]; comoVendedor: boolean }) {
  return (
    <TablaDatos minAncho={720}>
      <thead>
        <tr>
          <th>Producto</th>
          <th>{comoVendedor ? "Comprador" : "Vendedor"}</th>
          <th className="text-right">Total</th>
          <th>Estado</th>
          <th>{comoVendedor ? "Cobro" : "Pago"}</th>
          <th>Fecha</th>
          <th><span className="sr-only">Abrir</span></th>
        </tr>
      </thead>
      <tbody>
        {items.map((t) => (
          <tr key={t.id}>
            <td className="max-w-[240px]"><span className="line-clamp-2 font-medium text-nav-900">{t.lote.titulo}</span></td>
            <td className="max-w-[160px] truncate text-ink-700">{t.contraparte.razonSocial}</td>
            <td className="num whitespace-nowrap text-right font-semibold">{t.total ? soles(t.total) : "—"}</td>
            <td><Badge tono={TONO_ETAPA[t.etapa ?? ""] ?? "gris"}>{t.etiquetaEtapa ?? t.etiquetaEstado}</Badge></td>
            <td className="whitespace-nowrap text-ink-700">{estadoPago(t, comoVendedor)}</td>
            <td className="whitespace-nowrap text-ink-500">{fecha(t.updatedAt)}</td>
            <td className="text-right">
              <Link href={`/transacciones/${t.id}`} className="inline-flex min-h-10 items-center gap-1 whitespace-nowrap text-sm font-semibold text-nav-700 hover:underline">
                {t.requiereMiAccion ? "Atender" : "Ver"}<Icono nombre="flecha" size={14} />
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </TablaDatos>
  );
}

/** Suma de totales de un grupo de operaciones. */
export const sumaTotales = (ts: TransaccionItem[]) => ts.reduce((a, t) => a + (t.total || 0), 0);
