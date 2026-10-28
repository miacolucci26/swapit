"use client";

import DashboardMarket from "@/components/DashboardMarket";
import PanelIntermediario from "@/components/PanelIntermediario";
import { Cargando } from "@/components/ui";
import { useSession } from "@/lib/session";

/**
 * Modo B2B2B: panel del intermediario.
 * Modo MARKETPLACE: dashboard ejecutivo con compras, ventas, trazabilidad e impacto.
 */
export default function Panel() {
  const { user } = useSession();
  if (!user) return <Cargando />;
  return user.modo === "B2B2B" ? <PanelIntermediario /> : <DashboardMarket />;
}
