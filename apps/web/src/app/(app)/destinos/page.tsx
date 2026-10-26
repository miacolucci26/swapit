"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CODIGOS_TIPO_DESTINO, TIPOS_DESTINO } from "@swapit/shared";
import { Badge, Btn, Card, Cargando, Field, inputCls, KpiFranja, PageHeader, Seccion, TablaDatos } from "@/components/ui";
import { Icono } from "@/components/vis/Iconos";
import { api, ApiError } from "@/lib/api";
import { enlaceWhatsapp, fecha } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { Destino } from "@/lib/types";

const VACIO = { nombre: "", tipo: "", materiales: "", zona: "", contactoNombre: "", telefono: "", notas: "" };
const BTN_LINK = "inline-flex min-h-10 items-center gap-1.5 rounded-control border border-ink-300 bg-white px-3 text-sm font-semibold text-ink-900 hover:border-nav-600 hover:bg-surface-2";

/** Destinos: a quién entregas o vendes cada material, agrupados por tipo. */
export default function DestinosPage() {
  const { user } = useSession();
  const [lista, setLista] = useState<Destino[] | null>(null);
  const [form, setForm] = useState<typeof VACIO | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [errores, setErrores] = useState<string[]>([]);
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(() => api<Destino[]>("/destinos").then(setLista), []);
  useEffect(() => {
    cargar();
    // Desde la ficha de un material se llega con ?nuevo=<tipo de destino> y el formulario ya abierto.
    const nuevo = new URLSearchParams(window.location.search).get("nuevo");
    if (nuevo) setForm({ ...VACIO, tipo: (CODIGOS_TIPO_DESTINO as readonly string[]).includes(nuevo) ? nuevo : "" });
  }, [cargar]);

  const grupos = useMemo(() => {
    const por = new Map<string, Destino[]>();
    for (const d of lista ?? []) por.set(d.tipo, [...(por.get(d.tipo) ?? []), d]);
    return TIPOS_DESTINO.filter((t) => por.has(t.id)).map((t) => ({ tipo: t, destinos: por.get(t.id)! }));
  }, [lista]);

  function abrir(tipo = "") {
    setForm({ ...VACIO, tipo });
    setEditando(null);
    setErrores([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setErrores([]);
    setGuardando(true);
    // Los textos opcionales se envían aunque estén vacíos al editar (así se pueden borrar); el teléfono vacío no se envía.
    const BORRABLES = ["materiales", "zona", "contactoNombre", "notas"];
    const datos = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()]).filter(([k, v]) => v !== "" || (editando && BORRABLES.includes(k))));
    try {
      if (editando) await api(`/destinos/${editando}`, { method: "PATCH", json: datos });
      else await api("/destinos", { method: "POST", json: datos });
      setAviso(editando ? "Destino actualizado." : "Destino guardado.");
      setForm(null);
      setEditando(null);
      await cargar();
    } catch (err) {
      setErrores(err instanceof ApiError ? (err.errores?.map((x) => `${x.campo}: ${x.mensaje}`) ?? [err.message]) : ["Error de conexión"]);
    } finally {
      setGuardando(false);
    }
  }

  async function alternar(d: Destino) {
    try {
      await api(`/destinos/${d.id}`, { method: "PATCH", json: { activo: !d.activo } });
      setAviso(d.activo ? "Destino desactivado." : "Destino activado.");
      await cargar();
    } catch (err) {
      setAviso(err instanceof ApiError ? err.message : "No se pudo completar la acción");
    }
  }

  if (!lista) return <Cargando />;
  const campo = (k: keyof typeof VACIO) => ({ value: form?.[k] ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f)) });

  return (
    <>
      <PageHeader titulo="Mis destinos" sub="A quién entregas cada material." acciones={<Btn onClick={() => abrir()}>Agregar destino</Btn>} />
      {aviso && <p role="status" className="mb-4 flex items-center gap-2 rounded-control bg-pri-50 px-3 py-2 text-sm font-medium text-pri-800"><Icono nombre="check" size={16} />{aviso}</p>}

      {lista.length > 0 && (
        <KpiFranja
          className="mb-6"
          items={[
            { etiqueta: "Destinos", valor: lista.length },
            { etiqueta: "Activos", valor: lista.filter((d) => d.activo).length, tono: "ok" },
            { etiqueta: "Tipos", valor: grupos.length },
            { etiqueta: "Despachos", valor: lista.reduce((a, d) => a + d.despachos, 0), nota: "en total" },
          ]}
        />
      )}

      {form && (
        <Card className="mb-5">
          <h2 className="text-base font-semibold text-nav-900">{editando ? "Editar destino" : "Nuevo destino"}</h2>
          <form onSubmit={guardar} className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Nombre"><input required minLength={2} className={inputCls} placeholder="Ej. Recicladora Andina" {...campo("nombre")} /></Field>
            <Field label="Tipo de destino">
              <select required className={inputCls} {...campo("tipo")}>
                <option value="">Elige…</option>
                {TIPOS_DESTINO.map((t) => <option key={t.id} value={t.id}>{t.corto}</option>)}
              </select>
            </Field>
            <Field label="Qué recibe" hint="Con tus palabras. Ej. «descarte de mango, pulpa»."><input maxLength={300} className={inputCls} {...campo("materiales")} /></Field>
            <Field label="Zona"><input maxLength={120} className={inputCls} placeholder="Ej. Piura, Sullana" {...campo("zona")} /></Field>
            <Field label="Contacto"><input maxLength={120} className={inputCls} {...campo("contactoNombre")} /></Field>
            <Field label="Celular (WhatsApp)" hint="Ej. 987654321."><input inputMode="tel" className={inputCls} {...campo("telefono")} /></Field>
            <div className="sm:col-span-2"><Field label="Notas" hint="Solo tú las ves."><textarea rows={2} maxLength={500} className={inputCls} {...campo("notas")} /></Field></div>
            {errores.length > 0 && <ul role="alert" className="list-disc pl-5 text-sm text-error-ink sm:col-span-2">{errores.map((m) => <li key={m}>{m}</li>)}</ul>}
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Btn disabled={guardando}>{guardando ? "Guardando…" : editando ? "Guardar cambios" : "Guardar destino"}</Btn>
              <Btn type="button" variante="borde" onClick={() => { setForm(null); setEditando(null); }}>Cancelar</Btn>
            </div>
          </form>
        </Card>
      )}

      {lista.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-300 bg-white p-6 text-center sm:p-8">
          <p className="text-base font-semibold text-nav-900">Aún no tienes destinos</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">Empieza por uno. ¿A quién le vendes?</p>
          <ul className="mt-5 grid grid-cols-2 gap-2 text-left sm:grid-cols-3">
            {TIPOS_DESTINO.slice(0, 6).map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => abrir(t.id)} className="flex min-h-11 w-full items-center rounded-control border border-ink-300 bg-white px-3 py-2 text-left text-sm font-medium text-ink-900 transition hover:border-nav-600 hover:bg-surface-2">
                  {t.corto}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex justify-center"><Btn onClick={() => abrir()}>Agregar destino</Btn></div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {grupos.map(({ tipo, destinos }) => (
            <Seccion key={tipo.id} titulo={tipo.corto} descripcion={`${destinos.length} destino${destinos.length === 1 ? "" : "s"}`}>
              <TablaDatos minAncho={760}>
                <thead>
                  <tr><th>Destino</th><th>Recibe</th><th>Contacto</th><th className="text-right">Despachos</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {destinos.map((d) => {
                    const wa = enlaceWhatsapp(d.telefono, `Hola${d.contactoNombre ? ` ${d.contactoNombre.split(" ")[0]}` : ""}, soy de ${user?.empresa.razonSocial ?? "Swapit"}. Tengo material${d.materiales ? ` (${d.materiales})` : ""}. ¿Te interesa?`);
                    return (
                      <tr key={d.id} className={d.activo ? "" : "opacity-60"}>
                        <td className="max-w-[240px]">
                          <span className="font-medium text-ink-900">{d.nombre}</span>
                          {!d.activo && <Badge className="ml-2">Desactivado</Badge>}
                          {d.zona && <span className="block text-xs text-ink-500">{d.zona}</span>}
                        </td>
                        <td className="max-w-[220px] text-ink-700">{d.materiales ?? "—"}</td>
                        <td className="whitespace-nowrap text-ink-700">{[d.contactoNombre, d.telefono].filter(Boolean).join(" · ") || "—"}</td>
                        <td className="num whitespace-nowrap text-right">{d.despachos}{d.ultimoDespacho && <span className="block text-xs text-ink-500">último {fecha(d.ultimoDespacho)}</span>}</td>
                        <td>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {d.telefono && wa && <a href={wa} target="_blank" rel="noreferrer" className={BTN_LINK}><Icono nombre="whatsapp" size={16} />WhatsApp</a>}
                            {d.telefono && <a href={`tel:${d.telefono}`} className={BTN_LINK}>Llamar</a>}
                            <button className="min-h-10 px-2 text-sm font-semibold text-nav-700 hover:underline" onClick={() => { setEditando(d.id); setForm({ nombre: d.nombre, tipo: d.tipo, materiales: d.materiales ?? "", zona: d.zona ?? "", contactoNombre: d.contactoNombre ?? "", telefono: d.telefono ?? "", notas: d.notas ?? "" }); setErrores([]); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button>
                            <button className={`min-h-10 px-2 text-sm font-semibold hover:underline ${d.activo ? "text-error-ink" : "text-pri-700"}`} onClick={() => alternar(d)}>{d.activo ? "Desactivar" : "Activar"}</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </TablaDatos>
            </Seccion>
          ))}
        </div>
      )}
    </>
  );
}
