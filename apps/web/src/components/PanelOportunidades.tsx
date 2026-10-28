"use client";

import { useState } from "react";
import { Badge, Btn } from "@/components/ui";
import { Icono } from "@/components/vis/Iconos";
import { api, ApiError } from "@/lib/api";

export interface Oportunidades {
  modo: "gemini" | "local";
  usos: { titulo: string; detalle: string; cuidado: string }[];
  industrias: string[];
  compradores: { necesidad: string; tipo: "EMPRESA" | "PERSONA"; distanciaKm: number | null; afinidad: number }[];
  aviso?: string;
}

/**
 * «¿Quién podría aprovechar esto?» en Publicar: usos posibles del material (Gemini o la base local) y compradores de Swapit
 * que ya buscan algo parecido (alertas de búsqueda, anónimas). Solo consulta al pulsar el botón: la descripción sale a la IA
 * cuando el vendedor lo pide.
 */
export function PanelOportunidades({ titulo, descripcion, categoria }: { titulo: string; descripcion: string; categoria: string }) {
  const [res, setRes] = useState<Oportunidades | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const corta = descripcion.trim().length < 10;

  async function consultar() {
    setCargando(true);
    setError("");
    try {
      setRes(await api<Oportunidades>("/oportunidades/sugerir", { method: "POST", json: { titulo: titulo.trim() || undefined, descripcion: descripcion.trim(), categoriaCodigo: categoria || undefined } }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo conectar con el servidor");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="rounded-control border border-nav-100 bg-nav-50/50 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-nav-900">¿Quién podría aprovechar esto?</p>
          <p className="text-xs text-ink-500">Usos posibles de tu residuo y compradores de Swapit que buscan algo parecido.</p>
          <p className="text-xs text-ink-500">Tu descripción se analiza con IA de Google: no incluyas datos confidenciales.</p>
        </div>
        <Btn type="button" variante="suave" onClick={consultar} disabled={cargando || corta} title={corta ? "Escribe primero la descripción (mínimo 10 caracteres)" : undefined}>
          <Icono nombre="buscar" size={16} />
          {cargando ? "Analizando…" : res ? "Volver a analizar" : "Ver oportunidades"}
        </Btn>
      </div>

      {error && <p role="alert" className="mt-3 text-sm text-error-ink">{error}</p>}

      {res && (
        <div className="mt-4 space-y-4" aria-live="polite">
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-ink-700">
              Usos posibles
              <Badge tono={res.modo === "gemini" ? "azul" : "gris"}>{res.modo === "gemini" ? "Sugerencia de IA" : "Base de Swapit"}</Badge>
            </h3>
            {res.usos.length ? (
              <ul className="space-y-2">
                {res.usos.map((u) => (
                  <li key={u.titulo} className="rounded-control border border-line bg-white p-3">
                    <p className="text-sm font-medium text-ink-900">{u.titulo}</p>
                    <p className="mt-0.5 text-sm text-ink-700">{u.detalle}</p>
                    {u.cuidado && <p className="mt-1 flex items-start gap-1.5 text-xs text-ambar-700"><Icono nombre="alerta" size={14} className="mt-px shrink-0" />{u.cuidado}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-500">No encontramos usos conocidos. Describe mejor el material: qué es, de qué proceso sale y en qué estado está.</p>
            )}
            {res.industrias.length > 0 && (
              <p className="mt-2 text-sm text-ink-700"><span className="font-medium">Industrias que suelen comprarlo:</span> {res.industrias.join(" · ")}</p>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-[13px] font-semibold text-ink-700">Compradores en Swapit</h3>
            {res.compradores.length ? (
              <>
                <ul className="space-y-1.5">
                  {res.compradores.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ink-700">
                      <Icono nombre="empresa" size={16} className="mt-0.5 shrink-0 text-nav-600" />
                      <span>{c.tipo === "PERSONA" ? "Una persona" : "Una empresa"}{c.distanciaKm != null ? ` a ~${c.distanciaKm} km` : ""} busca: <span className="italic">«{c.necesidad}»</span></span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-ink-500">Si tu publicación calza con lo que buscan, Swapit les avisa.</p>
              </>
            ) : (
              <p className="text-sm text-ink-500">Por ahora nadie busca algo parecido. Igual publica: quien busque algo parecido encontrará tu oferta.</p>
            )}
          </div>

          {res.aviso && <p className="text-xs text-ink-500">{res.aviso}</p>}
        </div>
      )}
    </div>
  );
}
