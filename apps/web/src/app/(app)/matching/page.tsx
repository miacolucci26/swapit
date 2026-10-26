"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge, Btn, Card, Cargando, Field, inputCls, ModalidadBadge, PageHeader, TipoBadge, Vacio } from "@/components/ui";
import { Icono } from "@/components/vis/Iconos";
import { api, ApiError } from "@/lib/api";
import { formatoCantidad } from "@swapit/shared";
import { corto, num, porUnidad, soles } from "@/lib/format";
import type { Categoria } from "@/lib/types";

interface Resultado {
  loteId: string; titulo: string; categoriaNombre: string; modalidad: string; precio: number | null; cantidadDisponible: number; unidad: string; tipoPublicador: "EMPRESA" | "PERSONA";
  razonSocial: string; distanciaKm: number | null; fleteEstimado: number | null; score: number; explicacion: string;
  usoSugerido: { titulo: string; detalle: string; cuidado: string } | null;
}
interface Alerta {
  id: string; texto: string; radioKm: number; categoria: string | null; nuevos: number;
  matches: { loteId: string; titulo: string; score: number; explicacion: string | null; nuevo: boolean }[];
}

function Score({ v }: { v: number }) {
  const c = v >= 70 ? "bg-pri-50 text-pri-700" : v >= 45 ? "bg-ambar-50 text-ambar-700" : "bg-ink-100 text-ink-700";
  return <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-control ${c}`} aria-label={`Afinidad ${v} de 100`}><span className="num text-lg font-semibold leading-none">{v}</span><span className="text-[10px] uppercase">afín</span></div>;
}

const SUGERENCIAS = ["necesito cáscaras de fruta para hacer gomitas", "cascarilla de arroz para calderas", "conchas de abanico para concreto", "aceite de cocina usado para jabón", "retazos de algodón"];

export default function Matching() {
  const [texto, setTexto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [radio, setRadio] = useState("200");
  const [cats, setCats] = useState<Categoria[]>([]);
  const [res, setRes] = useState<Resultado[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [alertas, setAlertas] = useState<Alerta[] | null>(null);
  const [aviso, setAviso] = useState("");

  const cargarAlertas = useCallback(() => api<Alerta[]>("/matching/alertas").then(setAlertas), []);
  useEffect(() => {
    api<Categoria[]>("/categorias").then(setCats);
    cargarAlertas();
    // Desde el asistente o «Volver a pedir» se llega con ?texto=… y la búsqueda se hace sola.
    const t = new URLSearchParams(window.location.search).get("texto");
    if (t) {
      setTexto(t);
      setBuscando(true);
      api<Resultado[]>(`/matching/buscar?${new URLSearchParams({ texto: t, radioKm: "200" })}`).then(setRes).finally(() => setBuscando(false));
    }
  }, [cargarAlertas]);

  async function buscar(t = texto) {
    if (t.trim().length < 3) return;
    setBuscando(true);
    setAviso("");
    const p = new URLSearchParams({ texto: t, radioKm: radio });
    if (categoria) p.set("categoria", categoria);
    try {
      setRes(await api<Resultado[]>(`/matching/buscar?${p}`));
    } finally {
      setBuscando(false);
    }
  }

  async function crearAlerta() {
    try {
      await api("/matching/alertas", { method: "POST", json: { texto, categoriaCodigo: categoria || undefined, radioKm: Number(radio) } });
      setAviso("Alerta creada: te avisaremos cuando aparezca un lote compatible.");
      cargarAlertas();
    } catch (e) {
      setAviso(e instanceof ApiError ? e.message : "No se pudo crear la alerta");
    }
  }

  return (
    <>
      <Link href="/transacciones" className="mb-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-nav-700 hover:underline">← Mi actividad</Link>
      <PageHeader titulo="Buscar y alertas" sub="Cuenta qué necesitas y te mostramos lo más afín." />

      <Card>
        <form onSubmit={(e) => { e.preventDefault(); buscar(); }} className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
          <Field label="¿Qué material necesitas?"><input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej. cascarilla de arroz para energía en calderas" className={inputCls} /></Field>
          <Field label="Categoría (opcional)">
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={inputCls}>
              <option value="">Cualquiera</option>
              {cats.map((c) => <option key={c.codigo} value={c.codigo}>{corto(c.nombre)}</option>)}
            </select>
          </Field>
          <Field label="Radio máximo">
            <select value={radio} onChange={(e) => setRadio(e.target.value)} className={inputCls}>
              {[50, 100, 200, 300, 500].map((r) => <option key={r} value={r}>{r} km</option>)}
            </select>
          </Field>
          <Btn disabled={buscando || texto.trim().length < 3}>{buscando ? "Buscando…" : "Buscar"}</Btn>
        </form>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SUGERENCIAS.map((s) => <button key={s} onClick={() => { setTexto(s); buscar(s); }} className="min-h-8 rounded-md bg-ink-100 px-2.5 py-1 text-xs text-ink-700 hover:bg-ink-200">{s}</button>)}
        </div>
      </Card>

      {res && (
        <div className="mt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-nav-900">{res.length} resultado{res.length === 1 ? "" : "s"}</h2>
            <Btn variante="suave" onClick={crearAlerta}><Icono nombre="alerta" size={16} />Avisarme de nuevos lotes como este</Btn>
          </div>
          {aviso && <p className="mb-3 rounded-control bg-pri-50 p-3 text-sm text-pri-700">{aviso}</p>}
          {res.length === 0 ? (
            <Vacio titulo="Sin coincidencias" texto="Prueba con otras palabras o amplía el radio. También puedes crear una alerta." accion={<Btn onClick={crearAlerta}>Crear alerta</Btn>} />
          ) : (
            <ul className="flex flex-col gap-3">
              {res.map((r) => (
                <li key={r.loteId}>
                  <Link href={`/lotes/${r.loteId}`} className="flex items-center gap-4 rounded-card border border-line bg-white p-4 shadow-card hover:border-nav-500">
                    <Score v={r.score} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{r.titulo}</h3><ModalidadBadge m={r.modalidad} /><TipoBadge tipo={r.tipoPublicador} /></div>
                      <div className="mt-0.5 text-sm text-ink-700">{r.razonSocial} · {formatoCantidad(r.cantidadDisponible, r.unidad)} · {r.modalidad === "DONACION" ? "Gratis" : r.modalidad === "INTERCAMBIO" ? "Intercambio" : r.modalidad === "CREDITOS" ? `${num(r.precio, 0)} créd.${porUnidad(r.unidad)}` : `${soles(r.precio)}${porUnidad(r.unidad)}`}</div>
                      <div className="mt-1 text-xs text-pri-700">{r.explicacion}{r.fleteEstimado != null && ` · flete ≈ ${soles(r.fleteEstimado)}`}</div>
                      {r.usoSugerido && <div className="mt-1 text-xs text-ink-700"><b>{r.usoSugerido.titulo}:</b> {r.usoSugerido.detalle} <span className="text-ambar-800">Cuidado: {r.usoSugerido.cuidado}</span></div>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-3 text-base font-semibold text-nav-900 md:text-lg">Mis alertas de búsqueda</h2>
        {!alertas ? <Cargando /> : alertas.length === 0 ? (
          <Vacio titulo="Aún no tienes alertas" texto="Haz una búsqueda y pulsa «Avisarme». Cuando alguien publique un lote compatible en tu radio, aparecerá aquí." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {alertas.map((a) => (
              <Card key={a.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{a.texto}</div>
                    <div className="text-xs text-ink-500">Radio {a.radioKm} km{a.categoria ? ` · ${corto(a.categoria)}` : ""}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {a.nuevos > 0 && <Badge tono="verde">{a.nuevos} nuevos</Badge>}
                    <button className="min-h-8 px-1 text-xs text-ink-500 hover:text-error" onClick={async () => { await api(`/matching/alertas/${a.id}`, { method: "DELETE" }); cargarAlertas(); }}>Eliminar</button>
                  </div>
                </div>
                {a.matches.length === 0 ? <p className="mt-3 text-sm text-ink-500">Sin coincidencias por ahora.</p> : (
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {a.matches.slice(0, 3).map((m) => (
                      <li key={m.loteId}>
                        <Link href={`/lotes/${m.loteId}`} onClick={() => api(`/matching/alertas/${a.id}/vistos`, { method: "POST" })} className="flex items-center justify-between gap-2 rounded-control bg-surface-2 px-3 py-2 text-sm hover:bg-pri-50">
                          <span className="truncate">{m.nuevo && <span className="mr-1 text-pri-600" aria-label="Nuevo">●</span>}{m.titulo}</span>
                          <b className="shrink-0 text-pri-700">{m.score}%</b>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
