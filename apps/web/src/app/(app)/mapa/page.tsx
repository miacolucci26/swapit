import { redirect } from "next/navigation";

// El mapa es la vista secundaria del catálogo: /lotes?vista=mapa.
export default function Mapa() {
  redirect("/lotes?vista=mapa");
}
