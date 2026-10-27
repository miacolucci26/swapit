"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatoCantidad } from "@swapit/shared";
import { FotoLote } from "@/components/LoteCard";
import { RequiereModo } from "@/components/ShellMarket";
import { PrecioGrande } from "@/components/TarjetaOferta";
import { Badge, Btn, Cargando, Field, inputCls, LinkBtn, PageHeader, Segmented, Vacio } from "@/components/ui";
import { Icono } from "@/components/vis/Iconos";
import { api, ApiError } from "@/lib/api";
import { fecha } from "@/lib/format";
import type { Lote } from "@/lib/types";

const ESTADO: Record<string, { texto: string; tono: "verde" | "ambar" | "gris" | "azul" }> = {
  PUBLICADO: { texto: "Activa", tono: "verde" },
  PAUSADO: { texto: "Pausada", tono: "ambar" },
  RESERVADO: { texto: "Reservada", tono: "azul" },
  CERRADO: { texto: "Vendida", tono: "gris" },
};

type Filtro = "todas" | "activas" | "pausadas";

/** Mis productos (modo vendedor): editar, pausar y borrar publicaciones. */
export default function MisProductos() {
  return (
    <RequiereModo modo="vendedor">
      <Lista />
    </RequiereModo>
  );
}

function Lista() {
  const [lotes, setLotes] = useState<Lote[] | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [editando, setEditando] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");

  const cargar = useCallback(() => {
    // Las borradas (RETIRADO) ya no se listan.
    api<Lote[]>("/lotes?mios=1").then((r) => setLotes(r.filter((l) => l.estado !== "RETIRADO"))).catch(() => setLotes([]));
  }, []);

  useEffect(() => {
    cargar();
    setEditando(new URLSearchParams(window.location.search).get("editar"));
  }, [cargar]);

  async function accion(l: Lote, tipo: "pausar" | "reanudar" | "borrar") {
    setAviso("");
    if (tipo === "borrar" && !window.confirm(`¿Borrar «${l.titulo}»? Dejará de verse en el marketplace y no se puede deshacer.`)) return;
    try {
      if (tipo === "borrar") await api(`/lotes/${l.id}`, { method: "DELETE" });
      else await api(`/lotes/${l.id}/${tipo}`, { method: "POST" });
      setAviso(tipo === "borrar" ? "Publicación borrada." : tipo === "pausar" ? "Publicación pausada: ya no se muestra en el marketplace." : "Publicación activa otra vez.");
      cargar();
    } catch (e) {
      setAviso(e instanceof ApiError ? e.message : "No se pudo completar la acción.");
    }
  }

  if (!lotes) return <Cargando />;
  const visibles = lotes.filter((l) => (filtro === "activas" ? l.estado === "PUBLICADO" : filtro === "pausadas" ? l.estado === "PAUSADO" : true));

  return (
    <>
      <PageHeader titulo="Mis productos" sub="Edita, pausa o borra lo que publicaste." acciones={<LinkBtn href="/publicar"><Icono nombre="mas" size={16} />Publicar</LinkBtn>} />
      <Segmented
        etiqueta="Filtrar"
        className="mb-4"
        valor={filtro}
        onChange={(v) => setFiltro(v as Filtro)}
        opciones={[{ valor: "todas", etiqueta: "Todas" }, { valor: "activas", etiqueta: "Activas" }, { valor: "pausadas", etiqueta: "Pausadas" }]}
      />
      {aviso && <p role="status" className="mb-3 rounded-control bg-nav-50 px-3 py-2 text-sm font-medium text-nav-800">{aviso}</p>}

      {visibles.length === 0 ? (
        <Vacio titulo={lotes.length ? "Nada en este filtro" : "Aún no publicas productos"} texto={lotes.length ? undefined : "Sube fotos, pon un precio y marca dónde está."} accion={lotes.length ? undefined : <LinkBtn href="/publicar">Publicar</LinkBtn>} />
      ) : (
        <ul className="flex flex-col gap-3">
          {visibles.map((l) => {
            const e = ESTADO[l.estado] ?? { texto: l.estado, tono: "gris" as const };
            const abierto = editando === l.id;
            const modificable = l.estado === "PUBLICADO" || l.estado === "PAUSADO";
            return (
              <li key={l.id} className="rounded-2xl border border-zinc-200/80 bg-white/80 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_-8px_rgba(24,24,27,0.10)] backdrop-blur-xl">
                <div className="flex flex-wrap items-center gap-3 p-3">
                  <Link href={`/lotes/${l.id}`} className="size-20 shrink-0 overflow-hidden rounded-control bg-surface-2"><FotoLote l={l} /></Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/lotes/${l.id}`} className="truncate font-semibold text-nav-900 hover:underline">{l.titulo}</Link>
                      <Badge tono={e.tono}>{e.texto}</Badge>
                    </div>
                    <PrecioGrande l={l} className="text-lg" />
                    <p className="num text-xs text-ink-500">Disponible: {formatoCantidad(l.cantidadDisponible, l.unidad)} · Publicado el {fecha(l.createdAt)}</p>
                  </div>
                  <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                    <Btn variante="borde" onClick={() => setEditando(abierto ? null : l.id)} disabled={!modificable} aria-expanded={abierto}><Icono nombre="editar" size={16} />Editar</Btn>
                    {l.estado === "PUBLICADO" && <Btn variante="borde" onClick={() => accion(l, "pausar")}><Icono nombre="pausa" size={16} />Pausar</Btn>}
                    {l.estado === "PAUSADO" && <Btn variante="suave" onClick={() => accion(l, "reanudar")}><Icono nombre="reanudar" size={16} />Reanudar</Btn>}
                    <Btn variante="peligro" onClick={() => accion(l, "borrar")} disabled={!modificable}><Icono nombre="basura" size={16} />Borrar</Btn>
                  </div>
                </div>
                {abierto && <Edicion l={l} onListo={() => { setEditando(null); setAviso("Cambios guardados."); cargar(); }} />}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function Edicion({ l, onListo }: { l: Lote; onListo: () => void }) {
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const conPrecio = l.modalidad === "VENTA" || l.modalidad === "CREDITOS";

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const titulo = String(f.get("titulo") ?? "").trim();
    const descripcion = String(f.get("descripcion") ?? "").trim();
    if (titulo.length < 5) return setError("El título debe tener al menos 5 caracteres.");
    if (descripcion.length < 10) return setError("La descripción debe tener al menos 10 caracteres.");
    setGuardando(true);
    setError("");
    try {
      await api(`/lotes/${l.id}`, {
        method: "PATCH",
        json: {
          titulo,
          descripcion,
          cantidadDisponible: Number(f.get("cantidadDisponible")),
          ...(conPrecio ? { precio: Number(f.get("precio")) } : {}),
        },
      });
      onListo();
    } catch (err) {
      setError(err instanceof ApiError ? (err.errores?.[0]?.mensaje ?? err.message) : "No se pudo guardar.");
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="grid gap-3 border-t border-line p-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><Field label="Título"><input name="titulo" defaultValue={l.titulo} maxLength={140} className={inputCls} /></Field></div>
      {conPrecio && <Field label="Precio (S/)"><input name="precio" type="number" min={0} step="0.01" defaultValue={l.precio ?? ""} className={inputCls} /></Field>}
      <Field label={`Disponible (máx. ${formatoCantidad(l.cantidad, l.unidad)})`}><input name="cantidadDisponible" type="number" min={0} max={l.cantidad} step="any" defaultValue={l.cantidadDisponible} className={inputCls} /></Field>
      <div className="sm:col-span-2"><Field label="Descripción"><textarea name="descripcion" rows={3} defaultValue={l.descripcion} maxLength={2000} className={inputCls} /></Field></div>
      {error && <p role="alert" className="text-sm font-medium text-error-ink sm:col-span-2">{error}</p>}
      <div className="flex gap-2 sm:col-span-2 sm:justify-end">
        <Btn disabled={guardando}>{guardando ? "Guardando…" : "Guardar cambios"}</Btn>
      </div>
    </form>
  );
}
