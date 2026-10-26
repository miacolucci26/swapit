"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import PanelIntermediario from "@/components/PanelIntermediario";
import { Cargando } from "@/components/ui";
import { useSession } from "@/lib/session";

/**
 * Modo B2B2B: panel del intermediario.
 * Modo MARKETPLACE: ya no hay panel aparte; «Mi actividad» (/transacciones) ocupa su lugar.
 */
export default function Panel() {
  const { user } = useSession();
  const router = useRouter();
  const marketplace = !!user && user.modo !== "B2B2B";
  useEffect(() => {
    if (marketplace) router.replace("/transacciones");
  }, [marketplace, router]);
  if (!user || marketplace) return <Cargando />;
  return <PanelIntermediario />;
}
