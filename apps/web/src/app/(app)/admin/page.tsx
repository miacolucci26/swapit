"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Card, Cargando, PageHeader, Vacio } from "@/components/ui";
import { api } from "@/lib/api";
import { fecha } from "@/lib/format";
import { useSession } from "@/lib/session";

interface Inc {
  id: string; tipo: string; detalle: string; estado: "ABIERTA" | "EN_REVISION" | "RESUELTA"; createdAt: string;
  usuario: { nombre: string; empresa: { razonSocial: string } };
  transaccion: { id: string; estado: string; lote: { titulo: string }; ofertante: { razonSocial: string }; receptor: { razonSocial: string } };
}
const TONO = { ABIERTA: "rojo", EN_REVISION: "ambar", RESUELTA: "verde" } as const;

export default function Admin() {
  const { user } = useSession();
  const [lista, setLista] = useState<Inc[] | null>(null);
  const cargar = useCallback(() => api<Inc[]>("/admin/incidencias").then(setLista).catch(() => setLista([])), []);
  useEffect(() => { if (user?.rol === "ADMIN") cargar(); else setLista([]); }, [user, cargar]);

  if (!lista) return <Cargando />;
  if (user?.rol !== "ADMIN") return <Vacio titulo="Sin acceso" texto="Esta sección es solo para moderación." />;

  return (
    <>
      <PageHeader titulo="Moderación de incidencias" sub="Problemas reportados por personas y empresas en sus transacciones (no visibles para la contraparte)." />
      {lista.length === 0 ? <Vacio titulo="Sin incidencias" /> : (
        <div className="flex flex-col gap-3">
          {lista.map((i) => (
            <Card key={i.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2"><Badge tono={TONO[i.estado]}>{i.estado.replace("_", " ")}</Badge><b className="text-sm">{i.tipo.replaceAll("_", " ").toLowerCase()}</b></div>
                  <div className="mt-1 text-sm text-stone-600">{i.transaccion.lote.titulo} · {i.transaccion.ofertante.razonSocial} ↔ {i.transaccion.receptor.razonSocial}</div>
                  <p className="mt-2 text-sm">{i.detalle}</p>
                  <div className="mt-1 text-xs text-stone-500">Reportó {i.usuario.nombre} ({i.usuario.empresa.razonSocial}) · {fecha(i.createdAt)}</div>
                </div>
                <select value={i.estado} onChange={async (e) => { await api(`/admin/incidencias/${i.id}/estado`, { method: "POST", json: { estado: e.target.value } }); cargar(); }} className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm">
                  <option value="ABIERTA">Abierta</option><option value="EN_REVISION">En revisión</option><option value="RESUELTA">Resuelta</option>
                </select>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
