"use client";

import { useEffect, useState } from "react";
import { RequiereModo } from "@/components/ShellMarket";
import TarjetaOferta from "@/components/TarjetaOferta";
import { Cargando, LinkBtn, PageHeader, Vacio } from "@/components/ui";
import { api } from "@/lib/api";
import { useFavoritos } from "@/lib/favoritos";
import { useSession } from "@/lib/session";
import type { Lote } from "@/lib/types";

/** Favoritos (modo comprador): las ofertas guardadas con el corazón. */
export default function Favoritos() {
  return (
    <RequiereModo modo="comprador">
      <Contenido />
    </RequiereModo>
  );
}

function Contenido() {
  const { user } = useSession();
  const { ids } = useFavoritos(user?.id);
  const [lotes, setLotes] = useState<Lote[] | null>(null);

  useEffect(() => {
    let vigente = true;
    // Una oferta borrada o vendida ya no se encuentra: se omite sin error.
    Promise.allSettled(ids.map((id) => api<Lote>(`/lotes/${id}`))).then((r) => {
      if (vigente) setLotes(r.flatMap((x) => (x.status === "fulfilled" ? [x.value] : [])));
    });
    return () => { vigente = false; };
  }, [ids]);

  if (!lotes) return <Cargando />;
  return (
    <>
      <PageHeader titulo="Favoritos" sub="Las ofertas que guardaste con el corazón." />
      {lotes.length === 0 ? (
        <Vacio titulo="Aún no guardas favoritos" texto="Toca el corazón de una oferta para tenerla a mano." accion={<LinkBtn href="/lotes">Ir al marketplace</LinkBtn>} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {lotes.map((l) => <TarjetaOferta key={l.id} l={l} />)}
        </div>
      )}
    </>
  );
}
