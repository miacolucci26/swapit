"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatoCantidad } from "@swapit/shared";
import { aproximar, esDemo, FotoLote, zonaAprox } from "@/components/LoteCard";
import { BotonFavorito, PrecioGrande } from "@/components/TarjetaOferta";
import { Badge, Btn, Cargando, Estrellas, InsigniaDemo, LinkBtn, Vacio } from "@/components/ui";
import { Icono } from "@/components/vis/Iconos";
import { api, ApiError } from "@/lib/api";
import { CONDICION, ENTREGA, fecha, num } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { Lote } from "@/lib/types";

const MapaUbicacion = dynamic(() => import("@/components/MapaMarket").then((m) => m.MapaUbicacion), {
  ssr: false,
  loading: () => <div className="h-56 animate-pulse rounded-card bg-surface-2" />,
});

const ESTADO: Record<string, { texto: string; tono: "verde" | "gris" | "ambar" }> = {
  PUBLICADO: { texto: "Disponible", tono: "verde" },
  PAUSADO: { texto: "Pausada por el vendedor", tono: "ambar" },
  RESERVADO: { texto: "Reservada", tono: "ambar" },
  CERRADO: { texto: "Vendida", tono: "gris" },
  RETIRADO: { texto: "Ya no está publicada", tono: "gris" },
};

function Galeria({ l }: { l: Lote }) {
  const [i, setI] = useState(0);
  const fotos = l.imagenes;
  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-zinc-200/80 bg-surface-2 sm:aspect-[4/3]">
        <FotoLote l={l} src={fotos[i] ?? null} />
        <BotonFavorito loteId={l.id} titulo={l.titulo} className="absolute right-3 top-3" />
        {fotos.length > 1 && (
          <span className="num absolute bottom-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">{i + 1} / {fotos.length}</span>
        )}
      </div>
      {fotos.length > 1 && (
        <div className="flex gap-2" role="group" aria-label="Fotos">
          {fotos.map((f, k) => (
            <button
              key={f}
              type="button"
              onClick={() => setI(k)}
              aria-label={`Foto ${k + 1}`}
              aria-pressed={k === i}
              className={`size-16 overflow-hidden rounded-control border-2 transition sm:size-20 ${k === i ? "border-nav-700" : "border-transparent opacity-70 hover:opacity-100"}`}
            >
              <FotoLote l={l} src={f} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Botón principal según quién mira: el comprador chatea; el vendedor dueño edita. */
function Accion({ l }: { l: Lote }) {
  const { modoUso, modos, cambiarModo } = useSession();
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  if (l.esMio) {
    return <LinkBtn href={`/mis-productos?editar=${l.id}`} variante="borde" className="w-full"><Icono nombre="editar" size={16} />Editar en Mis productos</LinkBtn>;
  }
  if (l.transaccionActiva) {
    return <LinkBtn href={`/transacciones/${l.transaccionActiva.id}`} className="w-full"><Icono nombre="chat" size={16} />Ir al chat con el vendedor</LinkBtn>;
  }
  if (modoUso !== "comprador") {
    return modos.includes("comprador") ? (
      <Btn variante="borde" className="w-full" onClick={() => cambiarModo("comprador")}>Cambiar a modo comprador para chatear</Btn>
    ) : (
      <LinkBtn href="/perfil?activar=comprador" variante="borde" className="w-full">Registrarme como comprador para chatear</LinkBtn>
    );
  }

  async function chatear() {
    setEnviando(true);
    setError("");
    try {
      // Abrir el chat crea la conversación (solicitud) por todo lo disponible; cantidad y precio se ajustan conversando.
      const t = await api<{ id: string }>("/transacciones", {
        method: "POST",
        json: { loteId: l.id, cantidad: l.cantidadDisponible, mensaje: `Hola, me interesa «${l.titulo}». ¿Sigue disponible?` },
      });
      router.push(`/transacciones/${t.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo abrir el chat");
      setEnviando(false);
    }
  }

  return (
    <>
      <Btn className="min-h-12 w-full text-base" disabled={enviando || l.estado !== "PUBLICADO"} onClick={chatear}>
        <Icono nombre="chat" size={18} />{enviando ? "Abriendo chat…" : "Chatear con el vendedor"}
      </Btn>
      {error && <p role="alert" className="text-sm font-medium text-error-ink">{error}</p>}
    </>
  );
}

export default function DetalleProducto() {
  const { id } = useParams<{ id: string }>();
  const { modoUso } = useSession();
  const [l, setL] = useState<Lote | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Lote>(`/lotes/${id}`).then(setL).catch((e) => setError(e instanceof ApiError && e.status === 404 ? "Esta oferta no existe o ya no está publicada." : "No se pudo cargar la oferta."));
  }, [id]);

  if (error) return <Vacio titulo={error} accion={<LinkBtn href="/lotes">Volver al marketplace</LinkBtn>} />;
  if (!l) return <Cargando />;

  const estado = ESTADO[l.estado];
  const punto = l.ubicacion ? aproximar(l.ubicacion) : null;
  const entrega = l.entrega ? ENTREGA[l.entrega] : null;

  return (
    <>
      <Link href="/lotes" className="mb-3 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-nav-700 hover:underline">← Volver al marketplace</Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Galeria l={l} />

        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              {estado && l.estado !== "PUBLICADO" && <Badge tono={estado.tono}>{estado.texto}</Badge>}
              {esDemo(l) && <InsigniaDemo />}
              {l.condicion && <Badge tono="gris">{CONDICION[l.condicion]}</Badge>}
            </div>
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-nav-900">{l.titulo}</h1>
            <div className="mt-2"><PrecioGrande l={l} className="text-3xl" /></div>
            <p className="num mt-1 text-sm text-ink-500">Disponible: {formatoCantidad(l.cantidadDisponible, l.unidad)} · Publicado el {fecha(l.createdAt)}</p>
          </div>

          <div className="flex flex-col gap-2">
            <Accion l={l} />
            {modoUso === "comprador" && !l.esMio && (
              <p className="text-xs text-ink-500">La dirección exacta se comparte por el chat, cuando ya hablaron.</p>
            )}
          </div>

          <section aria-labelledby="desc" className="rounded-2xl border border-zinc-200/80 bg-white/80 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_-8px_rgba(24,24,27,0.10)] backdrop-blur-xl p-4">
            <h2 id="desc" className="text-sm font-semibold text-nav-900">Descripción</h2>
            <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink-700">{l.descripcion}</p>
            {entrega && <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-700"><Icono nombre="camion" size={16} className="text-ink-500" />{entrega.etiqueta}</p>}
          </section>

          <section aria-labelledby="vendedor" className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white/80 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_-8px_rgba(24,24,27,0.10)] backdrop-blur-xl p-4">
            <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-nav-700 text-lg font-semibold text-white">{l.razonSocial.charAt(0)}</span>
            <div className="min-w-0 flex-1">
              <h2 id="vendedor" className="text-xs font-medium text-ink-500">Vendedor</h2>
              <p className="truncate font-semibold text-nav-900">{l.razonSocial}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                <Estrellas v={l.ratingProm} n={l.nTransacciones} />
                {l.estadoKyb === "VERIFICADA" && <span className="inline-flex items-center gap-1 text-pri-700"><Icono nombre="check" size={14} />Verificado</span>}
              </div>
            </div>
          </section>

          <section aria-labelledby="ubic">
            <h2 id="ubic" className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-nav-900">
              <Icono nombre="ubicacion" size={16} />Ubicación aproximada: {zonaAprox(l.ubicacion)}
              {l.distanciaKm != null && !l.esMio && <span className="num font-normal text-ink-500">· a {num(l.distanciaKm, 0)} km de ti</span>}
            </h2>
            {punto ? <MapaUbicacion punto={punto} radioKm={1.2} zoom={12.5} className="h-56" /> : <p className="text-sm text-ink-500">El vendedor no indicó ubicación.</p>}
          </section>
        </div>
      </div>
    </>
  );
}
