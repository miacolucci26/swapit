"use client";

import LandingB2B from "@/components/LandingB2B";
import LandingMarketplace from "@/components/LandingMarketplace";
import { useModo } from "@/lib/modo";

export default function Home() {
  const modo = useModo();
  // Por defecto (B2B2B) se muestra la portada del intermediario; mientras se consulta el modo, esa misma.
  return modo === "MARKETPLACE" ? <LandingMarketplace /> : <LandingB2B />;
}
