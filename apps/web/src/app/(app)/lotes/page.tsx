"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CADENAS, aToneladas, buscarResiduos, cadenaPorId, compradoresDe, diagnosticar, formatoCantidad, formatoMasa, residuoPorId,
} from "@swapit/shared";
import LoteCard, { esDemo, ETIQUETA_MODALIDAD, FotoLote, precioOferta, zonaAprox } from "@/components/LoteCard";
import { Btn, Field, inputCls, InsigniaDemo, KpiFranja, LinkBtn, ModalidadBadge, PageHeader, PuntoCategoria, Seccion, TablaDatos, Tabs, Vacio } from "@/components/ui";
import { CadenaFlujo } from "@/components/vis/CadenaFlujo";
import { EscaleraVidas, nombreCorto } from "@/components/vis/EscaleraVidas";
import { Icono, type NombreIcono } from "@/components/vis/Iconos";
import { api } from "@/lib/api";
import { corto, num } from "@/lib/format";
import type { Categoria, Lote } from "@/lib/types";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false, loading: () => <div className="h-[62vh] min-h-[420px] animate-pulse rounded-card bg-ink-100" /> });

type Pestana = "ofertas" | "cadenas";
type Vista = "tarjetas" | "tabla" | "mapa";

const MODALIDADES = ["VENTA", "DONACION", "INTERCAMBIO"] as const;
const PUNTO: Record<string, string> = { VENTA: "#2d4a78", DONACION: "#0b6b57", CREDITOS: "#64748b", INTERCAMBIO: "#7a5fc0" };
const RADIOS = [25, 50, 100, 250];
const VISTAS: { id: Vista; texto: string; icono: NombreIcono }[] = [
  { id: "tarjetas", texto: "Tarjetas", icono: "material" },
  { id: "tabla", texto: "Tabla", icono: "menu" },
  { id: "mapa", texto: "Mapa", icono: "ubicacion" },
];

/** Conmutador de vista (Tarjetas | Tabla | Mapa): zonas táctiles ≥ 40 px. */
function ConmutadorVista({ valor, onChange }: { valor: Vista; onChange: (v: Vista) => void }) {
  return (
    <div role="group" aria-label="Cómo ver las ofertas" className="flex gap-1 rounded-control bg-ink-100 p-1">
      {VISTAS.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={valor === o.id}
          className={`inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[6px] px-3 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-nav-600 sm:flex-none ${valor === o.id ? "bg-white font-semibold text-nav-900 shadow-sm" : "text-ink-700 hover:text-nav-900"}`}
        >
          <Icono nombre={o.icono} size={16} />
          {o.texto}
        </button>
      ))}
    </div>
  );
}

const Precio = ({ l }: { l: Lote }) => {
  const { principal, sufijo } = precioOferta(l);
  if (l.modalidad === "VENTA" && l.precio == null) return <span className="text-ink-700">A negociar</span>;
  return <span className="num"><b className="font-semibold">{principal}</b>{sufijo && <span className="text-xs text-ink-500">{sufijo}</span>}</span>;
};

/** Panel lateral de la vista Mapa: resumen del lote elegido. */
function PanelLote({ l, onCerrar }: { l: Lote | undefined; onCerrar: () => void }) {
  if (!l) {
    return (
      <div className="flex h-full min-h-40 flex-col items-center justify-center gap-1 rounded-card border border-dashed border-ink-300 bg-white p-6 text-center">
        <Icono nombre="ubicacion" size={20} className="text-ink-400" />
        <p className="text-sm font-semibold text-nav-900">Elige una oferta en el mapa</p>
        <p className="text-xs text-ink-500">Verás aquí su foto, cantidad y precio.</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-card border border-line bg-white shadow-card">
      <div className="relative aspect-[16/10] bg-surface-2">
        <FotoLote l={l} />
        <button type="button" onClick={onCerrar} aria-label="Cerrar detalle" className="absolute right-2 top-2 grid size-10 place-items-center rounded-control bg-white/90 text-ink-700 hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-nav-600">
          <Icono nombre="cerrar" size={16} />
        </button>
      </div>
      <div className="flex flex-col gap-2 p-3.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <PuntoCategoria codigo={l.categoriaCodigo} etiqueta={corto(l.categoriaNombre)} />
          {esDemo(l) && <InsigniaDemo />}
          <ModalidadBadge m={l.modalidad} />
        </div>
        <h3 className="text-[15px] font-semibold leading-snug text-nav-900">{l.titulo}</h3>
        <p className="flex items-center gap-1.5 text-sm text-ink-700"><Icono nombre={l.identidadOculta ? "candado" : "empresa"} size={16} className="shrink-0 text-ink-500" /><span className="truncate">{l.razonSocial}</span></p>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-line pt-2.5 text-sm">
          <div><dt className="text-xs text-ink-500">Cantidad</dt><dd className="num font-semibold text-ink-900">{formatoCantidad(l.cantidadDisponible, l.unidad)}</dd></div>
          <div><dt className="text-xs text-ink-500">Precio</dt><dd className="text-ink-900"><Precio l={l} /></dd></div>
          <div className="col-span-2"><dt className="text-xs text-ink-500">Ciudad aproximada</dt><dd className="text-ink-900">{zonaAprox(l.ubicacion)}{l.distanciaKm != null && !l.esMio ? ` · ${num(l.distanciaKm, 0)} km` : ""}</dd></div>
        </dl>
        <LinkBtn href={`/lotes/${l.id}`} className="mt-1 w-full">Ver detalle</LinkBtn>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pestaña «Cadenas y usos»
// ---------------------------------------------------------------------------

/** La búsqueda de la API es por subcadena: una frase completa casi nunca coincide, así que se usa la palabra más distintiva. */
const terminoBusqueda = (nombre: string) => nombre.split(/s+/).filter((w) => w.length >= 4).sort((a, b) => b.length - a.length)[0] ?? nombre;

const nombreCadena = (id: string, nombre: string) => (id === "empaques-y-apoyo" ? "Empaques y apoyo" : nombre);

function CadenasYUsos({ onVerOfertas }: { onVerOfertas: (texto: string) => void }) {
  const [texto, setTexto] = useState("");
  const [cadenaId, setCadenaId] = useState(CADENAS[0].id);
  const [residuoId, setResiduoId] = useState<string | null>(null);
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const detalle = useRef<HTMLDivElement>(null);

  const cadena = cadenaPorId(cadenaId) ?? CADENAS[0];
  const hallados = useMemo(() => (texto.trim().length >= 2 ? buscarResiduos(texto, 6) : []), [texto]);
  const sel = residuoId ? residuoPorId(residuoId) : undefined;
  const diag = useMemo(() => (marcadas.length ? diagnosticar(cadena.id, marcadas) : null), [cadena.id, marcadas]);

  const elegirResiduo = useCallback((id: string) => {
    const r = residuoPorId(id);
    if (!r) return;
    setCadenaId(r.cadena.id);
    setResiduoId(id);
    requestAnimationFrame(() => detalle.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }, []);

  function elegirCadena(id: string) {
    setCadenaId(id);
    setResiduoId(null);
    setMarcadas([]);
  }

  // Los residuos de CadenaFlujo son enlaces: se interceptan (fase de captura) para elegirlos aquí sin salir de la pantalla.
  function alHacerClic(e: React.MouseEvent) {
    const a = (e.target as HTMLElement).closest("a");
    const href = a?.getAttribute("href") ?? "";
    if (href.startsWith("#residuo-")) {
      e.preventDefault();
      e.stopPropagation();
      elegirResiduo(href.slice("#residuo-".length));
    }
  }

  const compradores = sel ? compradoresDe(sel.residuo) : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-card border border-line bg-white p-4 shadow-card">
        <Field label="¿Qué residuo tienes?" hint="Ejemplos: cáscara de mango, bagazo, concha, cartón.">
          <div className="relative">
            <Icono nombre="buscar" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input value={texto} onChange={(e) => setTexto(e.target.value)} className={`${inputCls} pl-10`} placeholder="Escribe un residuo…" autoComplete="off" />
          </div>
        </Field>
        {texto.trim().length >= 2 && (
          <div className="mt-3" aria-live="polite">
            {hallados.length === 0 ? (
              <p className="text-sm text-ink-500">No encontramos ese residuo. Prueba con otra palabra o elige una cadena abajo.</p>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-control border border-line">
                {hallados.map((h) => (
                  <li key={h.residuo.id}>
                    <button type="button" onClick={() => { elegirResiduo(h.residuo.id); setTexto(""); }} className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nav-600">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink-900">{nombreCorto(h.residuo.nombre)}</span>
                        <span className="block truncate text-xs text-ink-500">{nombreCadena(h.cadena.id, h.cadena.nombre)} · {h.etapa.nombre}</span>
                      </span>
                      <span className="num shrink-0 text-xs text-ink-500">{h.residuo.vidas.length} usos</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <Seccion titulo="Cadena productiva" descripcion="Elige una cadena para ver el proceso y los residuos que salen en cada etapa.">
        <div role="group" aria-label="Cadenas productivas" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
          {CADENAS.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={c.id === cadena.id}
              onClick={() => elegirCadena(c.id)}
              className={`inline-flex min-h-10 shrink-0 items-center rounded-control border px-3 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-nav-600 ${c.id === cadena.id ? "border-nav-700 bg-nav-700 text-white" : "border-line bg-white text-ink-700 hover:border-nav-500"}`}
            >
              {nombreCadena(c.id, c.nombre)}
            </button>
          ))}
        </div>
      </Seccion>

      <section aria-label={`Proceso de ${cadena.nombre}`} className="rounded-card border border-line bg-white p-4 shadow-card sm:p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-nav-900 md:text-lg">{nombreCadena(cadena.id, cadena.nombre)}</h2>
          <p className="mt-0.5 text-sm text-ink-500">{cadena.resumen}{cadena.zonas.length > 0 && ` Zonas: ${cadena.zonas.join(", ")}.`}</p>
          <p className="mt-1 text-xs text-ink-500">Marca las etapas donde trabajas para ver qué residuos generas. Toca un residuo para ver en qué se convierte.</p>
        </div>
        <div onClickCapture={alHacerClic}>
          <CadenaFlujo
            cadena={cadena}
            resaltar={marcadas}
            onAlternarEtapa={(id) => setMarcadas((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]))}
            hrefResiduo={(r) => `#residuo-${r.id}`}
          />
        </div>
        {diag && (
          <div className="mt-4 rounded-control border border-pri-200 bg-pri-50 px-3 py-2.5 text-sm text-pri-800" aria-live="polite">
            En {diag.etapas.length === 1 ? "la etapa marcada" : `las ${diag.etapas.length} etapas marcadas`} generas <b className="num">{diag.residuos.length}</b> {diag.residuos.length === 1 ? "residuo" : "residuos"}:{" "}
            <b className="num">{diag.conValor}</b> con un uso de valor alto o medio{diag.soloGestor > 0 && <>, <b className="num">{diag.soloGestor}</b> solo con gestor autorizado</>}.
          </div>
        )}
      </section>

      <div ref={detalle} className="scroll-mt-4">
        {!sel ? (
          <p className="rounded-card border border-dashed border-ink-300 bg-white p-6 text-center text-sm text-ink-500">Elige un residuo para ver sus usos, el nivel de valor, la evidencia y quién lo compra.</p>
        ) : (
          <Seccion
            titulo={nombreCorto(sel.residuo.nombre)}
            descripcion={`${sel.residuo.descripcion} · ${nombreCadena(sel.cadena.id, sel.cadena.nombre)}, ${sel.etapa.nombre}.`}
            acciones={
              <>
                <Btn onClick={() => onVerOfertas(terminoBusqueda(nombreCorto(sel.residuo.nombre)))}><Icono nombre="buscar" size={16} />Ver ofertas de este material</Btn>
                <LinkBtn href={`/aprovechamiento/residuo/${sel.residuo.id}`} variante="borde">Ver compradores</LinkBtn>
              </>
            }
          >
            {sel.residuo.preparacion && (
              <p className="mb-3 rounded-control bg-surface-2 px-3 py-2 text-sm text-ink-700"><b className="font-semibold text-nav-900">Antes de ofrecerlo: </b>{sel.residuo.preparacion}</p>
            )}
            <EscaleraVidas residuo={sel.residuo} />
            {compradores.length > 0 && (
              <p className="mt-3 text-sm text-ink-700"><b className="font-semibold text-nav-900">Quién compra: </b>{compradores.map((c) => c.nombre).join(" · ")}</p>
            )}
          </Seccion>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pantalla
// ---------------------------------------------------------------------------

export default function Explorar() {
  const [pestana, setPestana] = useState<Pestana>("ofertas");
  const [vista, setVista] = useState<Vista>("tarjetas");
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState("");
  const [modalidad, setModalidad] = useState("");
  const [radio, setRadio] = useState("");
  const [soloMios, setSoloMios] = useState(false);
  const [soloFoto, setSoloFoto] = useState(false);
  const [empresaId, setEmpresaId] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [lotes, setLotes] = useState<Lote[] | null>(null);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);
  const [cats, setCats] = useState<Categoria[]>([]);
  const [origen, setOrigen] = useState<{ lat: number; lng: number } | null>(null);
  const [sel, setSel] = useState<string | null>(null);

  useEffect(() => {
    api<Categoria[]>("/categorias").then(setCats).catch(() => undefined);
    api<{ ubicacion: { lat: number; lng: number } | null }>("/empresas/mi").then((e) => setOrigen(e.ubicacion)).catch(() => undefined);
    const sp = new URLSearchParams(window.location.search);
    // /mapa redirige a /lotes?vista=mapa; «Volver a pedir» llega con ?empresaId=… para ver lo que publica un proveedor conocido.
    const v = sp.get("vista");
    if (v === "mapa" || v === "tabla") setVista(v);
    if (sp.get("tab") === "cadenas") setPestana("cadenas");
    setEmpresaId(sp.get("empresaId") ?? "");
  }, []);

  function sincronizarUrl(cambios: Record<string, string | null>) {
    const sp = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(cambios)) { if (v) sp.set(k, v); else sp.delete(k); }
    const s = sp.toString();
    window.history.replaceState(null, "", `/lotes${s ? `?${s}` : ""}`);
  }
  const cambiarVista = (v: Vista) => { setVista(v); sincronizarUrl({ vista: v === "tarjetas" ? null : v }); };
  const cambiarPestana = (p: Pestana) => { setPestana(p); sincronizarUrl({ tab: p === "cadenas" ? "cadenas" : null }); };

  useEffect(() => {
    if (pestana !== "ofertas") return;
    const p = new URLSearchParams();
    if (soloMios) p.set("mios", "1");
    if (q) p.set("q", q);
    if (categoria) p.set("categoria", categoria);
    if (modalidad) p.set("modalidad", modalidad);
    if (radio && !soloMios) p.set("radioKm", radio);
    if (empresaId && !soloMios) p.set("empresaId", empresaId);
    let vigente = true;
    const t = setTimeout(() => {
      setError(false);
      api<Lote[]>(`/lotes?${p}`)
        .then((r) => { if (vigente) { setLotes(r); setSel(null); } })
        .catch(() => { if (vigente) setError(true); });
    }, q ? 250 : 0);
    return () => { vigente = false; clearTimeout(t); };
  }, [pestana, soloMios, q, categoria, modalidad, radio, empresaId, intento]);

  const visibles = useMemo(() => (lotes ? (soloFoto ? lotes.filter((l) => l.imagenes.length > 0) : lotes) : null), [lotes, soloFoto]);
  const puntos = useMemo(() => (visibles ?? []).filter((l) => l.ubicacion).map((l) => ({ id: l.id, lat: l.ubicacion!.lat, lng: l.ubicacion!.lng, modalidad: l.modalidad, titulo: l.titulo })), [visibles]);
  const elegido = visibles?.find((l) => l.id === sel);

  const kpis = useMemo(() => {
    const l = visibles ?? [];
    const t = l.reduce((a, x) => a + aToneladas(x.cantidadDisponible, x.unidad, x.kgPorUnidad), 0);
    return {
      ofertas: l.length,
      toneladas: formatoMasa(t),
      empresas: new Set(l.map((x) => x.empresaId)).size,
      categorias: new Set(l.map((x) => x.categoriaCodigo)).size,
    };
  }, [visibles]);

  const nFiltros = [categoria, modalidad, radio, soloMios, soloFoto].filter(Boolean).length;
  const hayFiltros = nFiltros > 0 || !!q;
  const limpiar = () => { setQ(""); setCategoria(""); setModalidad(""); setRadio(""); setSoloMios(false); setSoloFoto(false); };
  const verOfertasDe = (texto: string) => { limpiar(); setQ(texto); cambiarPestana("ofertas"); };

  return (
    <>
      <PageHeader
        titulo="Explorar"
        sub="Ofertas de materiales de empresas del norte y el mapa de cadenas productivas."
        acciones={<LinkBtn href="/lotes/nuevo" className="max-sm:hidden"><Icono nombre="mas" size={16} />Publicar oferta</LinkBtn>}
      />

      <Tabs
        etiqueta="Explorar"
        className="mb-4"
        valor={pestana}
        onChange={(v) => cambiarPestana(v as Pestana)}
        opciones={[{ valor: "ofertas", etiqueta: "Ofertas", conteo: pestana === "ofertas" && visibles ? visibles.length : undefined }, { valor: "cadenas", etiqueta: "Cadenas y usos" }]}
      />

      {pestana === "cadenas" ? (
        <CadenasYUsos onVerOfertas={verOfertasDe} />
      ) : (
        <>
          <KpiFranja
            className="mb-4"
            items={[
              { etiqueta: "Ofertas activas", valor: visibles ? num(kpis.ofertas, 0) : "—" },
              { etiqueta: "Toneladas disponibles", valor: visibles ? kpis.toneladas : "—" },
              { etiqueta: "Empresas oferentes", valor: visibles ? num(kpis.empresas, 0) : "—" },
              { etiqueta: "Categorías", valor: visibles ? num(kpis.categorias, 0) : "—" },
            ]}
          />

          {empresaId && !soloMios && (
            <p className="mb-3 flex flex-wrap items-center gap-2 rounded-control bg-nav-50 px-3.5 py-2 text-sm text-nav-900">
              Solo ofertas de un proveedor con el que ya trabajaste.
              <button type="button" onClick={() => setEmpresaId("")} className="min-h-10 font-semibold underline">Ver todo</button>
            </p>
          )}

          <div className="mb-4 rounded-card border border-line bg-white p-3 shadow-card">
            <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
              <div className="relative min-w-0 flex-1">
                <Icono nombre="buscar" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: cáscara, cartón, chatarra…" aria-label="Buscar ofertas" className={`${inputCls} pl-10`} />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAbierto((v) => !v)}
                  aria-expanded={abierto}
                  aria-controls="panel-filtros"
                  className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-control border px-3.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-nav-600 md:flex-none ${abierto || nFiltros ? "border-nav-600 bg-nav-50 text-nav-800" : "border-ink-300 bg-white text-ink-900 hover:border-nav-600"}`}
                >
                  Filtros
                  {nFiltros > 0 && <span className="num grid min-w-5 place-items-center rounded-md bg-nav-700 px-1 text-xs font-semibold text-white">{nFiltros}</span>}
                  <Icono nombre="flecha" size={14} className={`transition-transform ${abierto ? "-rotate-90" : "rotate-90"}`} />
                </button>
                {hayFiltros && <button type="button" onClick={limpiar} className="inline-flex min-h-10 items-center px-2 text-sm font-semibold text-nav-700 hover:underline">Limpiar</button>}
              </div>
              <ConmutadorVista valor={vista} onChange={cambiarVista} />
            </div>

            {abierto && (
              <div id="panel-filtros" className="mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Categoría">
                  <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={inputCls}>
                    <option value="">Todas</option>
                    {cats.map((c) => <option key={c.codigo} value={c.codigo}>{corto(c.nombre)}</option>)}
                  </select>
                </Field>
                <Field label="Modalidad">
                  <select value={modalidad} onChange={(e) => setModalidad(e.target.value)} className={inputCls}>
                    <option value="">Todas</option>
                    {MODALIDADES.map((m) => <option key={m} value={m}>{ETIQUETA_MODALIDAD[m]}</option>)}
                  </select>
                </Field>
                <Field label="Distancia desde tu planta">
                  <select value={radio} onChange={(e) => setRadio(e.target.value)} disabled={soloMios} className={inputCls}>
                    <option value="">Cualquiera</option>
                    {RADIOS.map((r) => <option key={r} value={r}>Hasta {r} km</option>)}
                  </select>
                </Field>
                <fieldset className="flex flex-col justify-end gap-1">
                  <legend className="sr-only">Mostrar solo</legend>
                  <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-ink-900">
                    <input type="checkbox" checked={soloMios} onChange={(e) => setSoloMios(e.target.checked)} className="size-4 accent-pri-600" />
                    Solo mis ofertas
                  </label>
                  <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-ink-900">
                    <input type="checkbox" checked={soloFoto} onChange={(e) => setSoloFoto(e.target.checked)} className="size-4 accent-pri-600" />
                    Solo con foto
                  </label>
                </fieldset>
              </div>
            )}
          </div>

          {error ? (
            <Vacio titulo="No pudimos cargar las ofertas" texto="Puede ser un corte momentáneo de la conexión. Inténtalo de nuevo." accion={<Btn onClick={() => setIntento((n) => n + 1)}>Reintentar</Btn>} />
          ) : !visibles ? (
            <div role="status" aria-label="Cargando ofertas" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-72 animate-pulse rounded-card border border-line bg-white" />)}
              <span className="sr-only">Cargando ofertas…</span>
            </div>
          ) : visibles.length === 0 ? (
            <Vacio
              titulo={soloMios ? "Aún no publicas ofertas" : hayFiltros ? "Sin ofertas con esos filtros" : "Aún no hay ofertas"}
              texto={soloMios ? "Sube fotos de tu material y publícalo en un minuto." : hayFiltros ? "Prueba con otra palabra, otra categoría o más distancia." : "Cuando una empresa publique, la verás aquí."}
              accion={
                soloMios ? <LinkBtn href="/lotes/nuevo">Publicar oferta</LinkBtn> : (
                  <div className="flex flex-wrap justify-center gap-2">
                    {hayFiltros && <Btn variante="borde" onClick={limpiar}>Limpiar filtros</Btn>}
                    <LinkBtn href="/matching" variante="suave">Crear alerta</LinkBtn>
                  </div>
                )
              }
            />
          ) : vista === "tarjetas" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {visibles.map((l) => <LoteCard key={l.id} l={l} />)}
            </div>
          ) : vista === "tabla" ? (
            <TablaDatos minAncho={820}>
              <thead>
                <tr>
                  <th className="w-[88px]"><span className="sr-only">Foto</span></th>
                  <th>Material</th>
                  <th>Empresa</th>
                  <th className="text-right">Cantidad</th>
                  <th className="text-right">Precio</th>
                  <th>Ciudad</th>
                  <th>Modalidad</th>
                  <th><span className="sr-only">Enlace</span></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((l) => (
                  <tr key={l.id}>
                    <td className="!py-1.5">
                      <div className="size-14 overflow-hidden rounded-control bg-surface-2"><FotoLote l={l} /></div>
                    </td>
                    <td className="min-w-[180px] max-w-[260px]">
                      <Link href={`/lotes/${l.id}`} className="line-clamp-2 font-medium text-nav-800 hover:underline focus-visible:outline-2 focus-visible:outline-nav-600">{l.titulo}</Link>
                      <span className="mt-0.5 flex items-center gap-2"><PuntoCategoria codigo={l.categoriaCodigo} etiqueta={corto(l.categoriaNombre)} />{esDemo(l) && <InsigniaDemo />}</span>
                    </td>
                    <td className="max-w-[150px] text-ink-700"><span className="flex items-center gap-1.5"><Icono nombre={l.identidadOculta ? "candado" : "empresa"} size={14} className="shrink-0 text-ink-500" /><span className="truncate">{l.razonSocial}</span></span></td>
                    <td className="num whitespace-nowrap text-right">{formatoCantidad(l.cantidadDisponible, l.unidad)}</td>
                    <td className="whitespace-nowrap text-right"><Precio l={l} /></td>
                    <td className="whitespace-nowrap text-ink-700">{zonaAprox(l.ubicacion)}</td>
                    <td><ModalidadBadge m={l.modalidad} /></td>
                    <td className="text-right"><Link href={`/lotes/${l.id}`} className="inline-flex min-h-10 items-center gap-1 whitespace-nowrap text-sm font-semibold text-nav-700 hover:underline">Ver<Icono nombre="flecha" size={14} /></Link></td>
                  </tr>
                ))}
              </tbody>
            </TablaDatos>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0">
                <MapView puntos={puntos} origen={origen} radioKm={radio && !soloMios ? Number(radio) : null} seleccionado={sel} onSelect={setSel} className="h-[56vh] min-h-[360px] lg:h-[64vh]" />
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-700">
                  {MODALIDADES.map((k) => <span key={k} className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: PUNTO[k] }} />{ETIQUETA_MODALIDAD[k]}</span>)}
                  <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-full bg-pri-600" />Tu planta</span>
                  <span className="num ml-auto text-ink-500">{puntos.length} de {visibles.length} con ubicación</span>
                </div>
              </div>
              <PanelLote l={elegido} onCerrar={() => setSel(null)} />
            </div>
          )}
        </>
      )}
    </>
  );
}
