"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Btn, Card, inputCls, PageHeader } from "@/components/ui";
import { Icono } from "@/components/vis/Iconos";
import { api, ApiError } from "@/lib/api";
import { corto, MODALIDAD } from "@/lib/format";

interface Sugerencia {
  categoriaCodigo: string; categoriaNombre: string; confianza: number; titulo: string; descripcion: string;
  keywords: string[]; precioReferencia: number | null; unidadBase: "ton" | "kg" | "und"; modo: "claude" | "demo";
}
type Mod = "DONACION" | "VENTA" | "INTERCAMBIO";
interface Fila {
  texto: string; sug: Sugerencia; modalidad: Mod; cantidad: string; precio: string;
  estado: "listo" | "publicando" | "publicado" | "error"; id?: string; error?: string;
}

/** «3 libros de cálculo» → 3; si la línea no empieza con un número se asume 1. */
const cantidadDe = (t: string) => {
  const m = t.trim().match(/^(\d+)\s/);
  return m ? m[1] : "1";
};

export default function PublicarVarios() {
  const [texto, setTexto] = useState("");
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [preparando, setPreparando] = useState(false);
  const [publicando, setPublicando] = useState(false);

  const lineas = texto.split("\n").map((l) => l.trim()).filter((l) => l.length >= 3).slice(0, 15);

  async function preparar() {
    setPreparando(true);
    const nuevas: Fila[] = [];
    for (const l of lineas) {
      try {
        const sug = await api<Sugerencia>("/ia/clasificar", { method: "POST", json: { descripcion: l, imagenes: [] } });
        nuevas.push({ texto: l, sug, modalidad: "DONACION", cantidad: cantidadDe(l), precio: sug.precioReferencia ? String(sug.precioReferencia) : "", estado: "listo" });
      } catch {
        // Una línea que no se pudo analizar no detiene al resto.
      }
    }
    setFilas(nuevas);
    setPreparando(false);
  }

  const cambiar = (i: number, p: Partial<Fila>) => setFilas((f) => f!.map((x, j) => (j === i ? { ...x, ...p } : x)));

  async function publicarTodo() {
    if (!filas) return;
    setPublicando(true);
    for (let i = 0; i < filas.length; i++) {
      const f = filas[i];
      if (f.estado === "publicado") continue;
      cambiar(i, { estado: "publicando", error: undefined });
      try {
        const lote = await api<{ id: string }>("/lotes", {
          method: "POST",
          json: {
            categoriaCodigo: f.sug.categoriaCodigo, titulo: f.sug.titulo, descripcion: f.sug.descripcion, keywords: f.sug.keywords,
            cantidad: Number(f.cantidad) || 1, unidad: f.sug.unidadBase, modalidad: f.modalidad,
            precio: f.modalidad === "VENTA" ? Number(f.precio) || undefined : undefined,
            precioReferencia: f.sug.precioReferencia ?? undefined, entrega: "PUNTO_ENCUENTRO",
            iaSugerencia: { modo: f.sug.modo, confianza: f.sug.confianza, categoriaSugerida: f.sug.categoriaCodigo },
          },
        });
        cambiar(i, { estado: "publicado", id: lote.id });
      } catch (e) {
        cambiar(i, { estado: "error", error: e instanceof ApiError ? (e.errores?.map((x) => x.mensaje).join(", ") ?? e.message) : "Error de conexión" });
      }
    }
    setPublicando(false);
  }

  const pendientes = filas?.filter((f) => f.estado !== "publicado").length ?? 0;

  return (
    <>
      <PageHeader
        titulo="Publicar varias a la vez"
        sub="Una por línea. Sugerimos categoría y precio; tú eliges la modalidad."
        acciones={<Link href="/lotes/nuevo" className="inline-flex min-h-11 items-center text-sm font-semibold text-nav-700 underline">Publicar una con fotos</Link>}
      />

      {!filas ? (
        <Card>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={8} className={inputCls} placeholder={"20 t de cartón corrugado\nPallets de madera en buen estado\n500 kg de recortes de tela de algodón\n200 L de aceite usado"} aria-label="Lista de ofertas" />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Btn onClick={preparar} disabled={lineas.length === 0 || preparando}>{preparando ? "Preparando…" : `Preparar ${lineas.length || ""} ofertas`}</Btn>
            <span className="text-xs text-ink-500">Hasta 15 líneas. Revisas todo antes de publicar.</span>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filas.length === 0 && <Card>No pudimos analizar ninguna línea. <button className="text-nav-700 underline" onClick={() => setFilas(null)}>Volver</button></Card>}
          {filas.map((f, i) => (
            <Card key={i} className={f.estado === "publicado" ? "border-pri-600 bg-pri-50/50" : ""}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-nav-900">{f.sug.titulo}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-700">
                    <Badge>{corto(f.sug.categoriaNombre)}</Badge>
                    {f.sug.confianza < 0.5 && <span className="text-ambar-700">Revisa la categoría en la ficha completa.</span>}
                  </div>
                </div>
                {f.estado === "publicado" && <Link href={`/lotes/${f.id}`} className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-pri-700 underline"><Icono nombre="check" size={14} />Publicado · Ver oferta</Link>}
                {f.estado === "publicando" && <span className="text-sm text-ink-500">Publicando…</span>}
              </div>
              {f.estado !== "publicado" && (
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_6rem_8rem]">
                  <select value={f.modalidad} onChange={(e) => cambiar(i, { modalidad: e.target.value as Mod })} className={inputCls} aria-label="Qué hacer con esto">
                    {(["DONACION", "VENTA", "INTERCAMBIO"] as const).map((m) => <option key={m} value={m}>{MODALIDAD[m].etiqueta}</option>)}
                  </select>
                  <input type="number" min={1} value={f.cantidad} onChange={(e) => cambiar(i, { cantidad: e.target.value })} className={inputCls} aria-label="Cantidad" title="Cantidad" />
                  {f.modalidad === "VENTA" ? (
                    <input type="number" min={1} value={f.precio} onChange={(e) => cambiar(i, { precio: e.target.value })} className={inputCls} aria-label="Precio en soles" placeholder="Precio S/" />
                  ) : <span />}
                </div>
              )}
              {f.error && <p className="mt-2 text-sm font-medium text-error-ink">{f.error}</p>}
            </Card>
          ))}
          {filas.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <Btn onClick={publicarTodo} disabled={publicando || pendientes === 0}>{publicando ? "Publicando…" : pendientes === 0 ? "Todo publicado" : `Publicar ${pendientes}`}</Btn>
              {pendientes === 0 ? <Link href="/lotes" className="inline-flex min-h-10 items-center text-sm font-semibold text-nav-700 underline">Ver mis ofertas</Link> : <button className="min-h-10 text-sm font-medium text-ink-500 underline" onClick={() => setFilas(null)}>Empezar de nuevo</button>}
            </div>
          )}
        </div>
      )}
    </>
  );
}
