"use client";

import Link from "next/link";
import { FotoLote } from "@/components/LoteCard";
import { useTransaccionesDelModo } from "@/components/Transacciones";
import { Cargando, LinkBtn, PageHeader, Vacio } from "@/components/ui";
import { fecha } from "@/lib/format";
import { ETIQUETA_MODO } from "@/lib/modoUso";
import { useSession } from "@/lib/session";

/** Chats del modo actual. Cada chat es la conversación de una oferta; se abre en su pantalla de detalle. */
export default function Chats() {
  const { modoUso } = useSession();
  const items = useTransaccionesDelModo();
  if (!items) return <Cargando />;
  const abiertos = items.filter((t) => t.etapa !== "CANCELADA");

  return (
    <>
      <PageHeader titulo="Chats" sub={`Tus conversaciones como ${ETIQUETA_MODO[modoUso].toLowerCase()}.`} />
      {abiertos.length === 0 ? (
        <Vacio
          titulo="Aún no tienes chats"
          texto={modoUso === "comprador" ? "Entra a una oferta y toca «Chatear con el vendedor»." : "Cuando un comprador te escriba, verás la conversación aquí."}
          accion={modoUso === "comprador" ? <LinkBtn href="/lotes">Ir al marketplace</LinkBtn> : undefined}
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/80 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_-8px_rgba(24,24,27,0.10)] backdrop-blur-xl">
          {abiertos.map((t) => (
            <li key={t.id}>
              <Link href={`/transacciones/${t.id}`} className="flex items-center gap-3 px-3 py-3 transition hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nav-600">
                <span className="size-14 shrink-0 overflow-hidden rounded-full bg-surface-2">
                  <FotoLote l={{ categoriaCodigo: t.lote.categoriaCodigo ?? "OTROS", imagenes: t.lote.imagen ? [t.lote.imagen] : [] }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-semibold text-nav-900">{t.contraparte.razonSocial}</span>
                    <span className="shrink-0 text-xs text-ink-500">{fecha(t.updatedAt)}</span>
                  </span>
                  <span className="block truncate text-sm text-ink-700">{t.lote.titulo}</span>
                  <span className={`block truncate text-xs ${t.requiereMiAccion ? "font-semibold text-ambar-700" : "text-ink-500"}`}>{t.pendiente}</span>
                </span>
                {t.requiereMiAccion && <span aria-label="Requiere tu respuesta" className="size-2.5 shrink-0 rounded-full bg-error" />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
