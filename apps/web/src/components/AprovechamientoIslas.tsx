"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { buscarResiduos, diagnosticar, type Cadena } from "@swapit/shared";
import { Field, KpiFranja, Seccion, TablaDatos, inputCls } from "./ui";
import { TarjetaResiduo } from "./Aprovechamiento";
import { Icono } from "./vis/Iconos";
import { CadenaFlujo } from "./vis/CadenaFlujo";
import { ValorMonedas, nombreCorto } from "./vis/EscaleraVidas";
import { soles } from "@/lib/format";

/** Buscador en lenguaje libre sobre la base de residuos (corre en el navegador: no envía nada al servidor). */
export function BuscadorResiduos() {
  const [q, setQ] = useState("");
  const idAyuda = useId();
  const hallados = useMemo(() => (q.trim().length >= 3 ? buscarResiduos(q, 6) : []), [q]);
  return (
    <div>
      <label className="relative block">
        <span className="sr-only">Qué residuo tienes</span>
        <Icono nombre="buscar" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-describedby={idAyuda}
          placeholder="Buscar un residuo. Ej. cáscara de mango"
          className={`${inputCls} min-h-11 pl-10`}
        />
      </label>
      <p id={idAyuda} className="sr-only">Escribe al menos 3 letras para ver residuos relacionados.</p>
      <div aria-live="polite">
        {q.trim().length >= 3 && (
          <div className="mt-3">
            {hallados.length ? (
              <div className="grid gap-2 sm:grid-cols-2">{hallados.map((h) => <TarjetaResiduo key={h.residuo.id} residuo={h.residuo} />)}</div>
            ) : (
              <p className="rounded-card border border-line bg-white p-3 text-sm text-ink-700">No se encontró ese residuo. Prueba con otra palabra.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Marca las etapas donde trabajas → cuántos residuos salen, cuántos tienen valor y qué intentar primero. */
export function DiagnosticoProceso({ cadena }: { cadena: Cadena }) {
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const d = useMemo(() => (marcadas.length ? diagnosticar(cadena.id, marcadas) : null), [cadena.id, marcadas]);
  const alternar = (id: string) => setMarcadas((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  return (
    <div>
      <CadenaFlujo cadena={cadena} resaltar={marcadas} onAlternarEtapa={alternar} />
      <div aria-live="polite" className="mt-4">
        {d ? (
          <Seccion titulo="Diagnóstico de tus etapas" descripcion={`${marcadas.length} ${marcadas.length === 1 ? "etapa marcada" : "etapas marcadas"}. Estos son los residuos que te tocan.`}>
            <KpiFranja
              items={[
                { etiqueta: "Residuos", valor: d.residuos.length },
                { etiqueta: "Con valor", valor: d.conValor, tono: "ok" },
                { etiqueta: "Solo gestor autorizado", valor: d.soloGestor, tono: d.soloGestor ? "alerta" : "neutro" },
              ]}
            />
            <TablaDatos className="mt-3" minAncho={0}>
              <caption className="sr-only">Qué intentar primero con cada residuo</caption>
              <thead>
                <tr>
                  <th scope="col">Residuo</th>
                  <th scope="col">Qué intentar primero</th>
                  <th scope="col">Valor</th>
                </tr>
              </thead>
              <tbody>
                {d.residuos.map((r) => (
                  <tr key={r.residuo.id}>
                    <td className="font-medium">
                      <Link href={`/aprovechamiento/residuo/${r.residuo.id}`} className="text-nav-700 hover:underline">{nombreCorto(r.residuo.nombre)}</Link>
                    </td>
                    <td className="text-ink-700">{r.exigeGestor ? "Entrega a gestor autorizado" : r.primera.uso}</td>
                    <td><ValorMonedas valor={r.primera.valor} /></td>
                  </tr>
                ))}
              </tbody>
            </TablaDatos>
          </Seccion>
        ) : (
          <p className="flex items-center gap-2 rounded-card border border-line bg-white px-3 py-2.5 text-sm text-ink-700">
            <Icono nombre="info" size={16} className="shrink-0 text-nav-600" />
            Marca las etapas donde trabajas para ver tu diagnóstico.
          </p>
        )}
      </div>
    </div>
  );
}

const n = (t: string) => {
  const v = Number(t.replace(",", "."));
  return Number.isFinite(v) && v > 0 ? v : 0;
};

/** Calculadora simple de margen: el usuario pone SUS números; Swapit no supone precios. */
export function CalculadoraMargen() {
  const [v, setV] = useState({ kg: "", precio: "", recojo: "", proceso: "", fijos: "" });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((x) => ({ ...x, [k]: e.target.value }));
  const kg = n(v.kg);
  const precio = n(v.precio);
  const variable = n(v.recojo) + n(v.proceso);
  const margenKg = precio - variable;
  const mensual = margenKg * kg - n(v.fijos);
  const equilibrio = margenKg > 0 && n(v.fijos) > 0 ? Math.ceil(n(v.fijos) / margenKg) : null;
  const listo = kg > 0 && precio > 0;
  const gana = mensual > 0;
  const campo = (k: keyof typeof v, label: string, hint: string) => (
    <Field label={label} hint={hint}>
      <input inputMode="decimal" value={v[k]} onChange={set(k)} className={inputCls} placeholder="0" />
    </Field>
  );
  return (
    <Seccion titulo="¿Sale a cuenta?" descripcion="Pon tus propios números: la plataforma no supone precios.">
      <div className="rounded-card border border-line bg-white p-4 shadow-card sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {campo("kg", "Kilos al mes", "Lo que consigues")}
          {campo("precio", "Precio de venta (S/ por kilo)", "Lo que te ofrece el comprador")}
          {campo("recojo", "Recoger y transportar (S/ por kilo)", "Flete, combustible")}
          {campo("proceso", "Procesar (S/ por kilo)", "Secado, molienda, empaque")}
          {campo("fijos", "Costos fijos (S/ al mes)", "Alquiler, permisos, sueldos")}
        </div>
        <div className="mt-4" aria-live="polite">
          {listo ? (
            <div className={`rounded-card border p-4 ${gana ? "border-pri-200 bg-pri-50" : "border-error/30 bg-error-tint"}`}>
              <p className={`flex items-center gap-2 text-sm font-semibold ${gana ? "text-pri-800" : "text-error-ink"}`}>
                <Icono nombre={gana ? "check" : "alerta"} size={18} />
                {gana ? "Sale a cuenta" : "No sale a cuenta"}
              </p>
              <p className={`num mt-1 text-3xl font-semibold leading-none ${gana ? "text-pri-800" : "text-error-ink"}`}>{soles(mensual)}</p>
              <p className="mt-1 text-sm text-ink-700">resultado del mes</p>
              <ul className="mt-3 space-y-1 text-sm text-ink-900">
                <li>Margen por kilo: <b className="num">{soles(margenKg)}</b></li>
                {equilibrio && <li>Para cubrir tus costos fijos: <b className="num">{equilibrio.toLocaleString("es-PE")} kg al mes</b></li>}
                {margenKg <= 0 && <li className="font-semibold">Pierdes en cada kilo: busca quien pague más.</li>}
              </ul>
            </div>
          ) : (
            <p className="flex items-center gap-2 rounded-card bg-surface-2 p-3 text-sm text-ink-700">
              <Icono nombre="info" size={16} className="shrink-0 text-nav-600" />
              Pon kilos y precio para ver el resultado.
            </p>
          )}
        </div>
      </div>
    </Seccion>
  );
}
