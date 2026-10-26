"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatoCantidad, residuoPorId, SECTORES, TIPOS_ACTOR } from "@swapit/shared";
import { Btn, Card, Cargando, EstadoMaterialBadge, Field, inputCls, LinkBtn, PageHeader, PuntoCategoria, SemaforoPrecio, TablaDatos, Tabs, Vacio } from "@/components/ui";
import { SECTOR_CORTO } from "@/components/LoteCard";
import { Icono } from "@/components/vis/Iconos";
import { api, ApiError } from "@/lib/api";
import { corto, fecha, precioUnidad } from "@/lib/format";
import type { Material, Proveedor } from "@/lib/types";

interface Cat { codigo: string; nombre: string; familia: string | null; kgPorUnidad: number | null }
const ESTADOS = [["", "Todos"], ["REPORTADO", "Por cotizar"], ["COTIZADO", "Cotizados"], ["ACOPIADO", "Por despachar"], ["DESPACHADO", "Despachados"], ["RECHAZADO", "Rechazados"]] as const;

/** Material de tu red: lo que reportan tus proveedores y el avance de cada lote. */
export default function MaterialPage() {
  const router = useRouter();
  const [lista, setLista] = useState<Material[] | null>(null);
  const [listo, setListo] = useState(false);
  // Filtros (se leen de la URL al entrar: el panel enlaza con ?estado=…).
  const [estado, setEstado] = useState("");
  const [sector, setSector] = useState("");
  const [tipoActor, setTipoActor] = useState("");
  const [residuoRef, setResiduoRef] = useState("");
  const [q, setQ] = useState("");
  const [qFiltro, setQFiltro] = useState("");

  const [abierto, setAbierto] = useState(false);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [proveedorId, setProveedorId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [unidad, setUnidad] = useState<"kg" | "ton">("kg");
  const [precio, setPrecio] = useState("");
  const [errores, setErrores] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api<Proveedor[]>("/empresas/proveedores").then((p) => setProveedores(p.filter((x) => x.activo)));
    api<Cat[]>("/categorias").then((c) => setCats(c.filter((x) => x.codigo !== "ARTICULOS_PERSONALES")));
    const sp = new URLSearchParams(window.location.search);
    const e = sp.get("estado");
    if (e) setEstado(e);
    setSector(sp.get("sector") ?? "");
    setTipoActor(sp.get("tipoActor") ?? "");
    setResiduoRef(sp.get("residuoRef") ?? "");
    const qq = sp.get("q") ?? "";
    setQ(qq);
    setQFiltro(qq);
    // Desde «Mi red» se llega con ?nuevo=<id del proveedor> y el formulario ya abierto.
    const nuevo = sp.get("nuevo");
    if (nuevo) {
      setAbierto(true);
      if (nuevo !== "1") setProveedorId(nuevo);
    }
    setListo(true);
  }, []);

  // La búsqueda de texto espera a que la persona termine de escribir.
  useEffect(() => {
    const t = setTimeout(() => setQFiltro(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Parámetros de la API: la lista y el Excel usan los mismos filtros.
  const parametros = (conEstado: boolean) => {
    const p = new URLSearchParams();
    if (conEstado && estado) p.set("estado", estado);
    if (sector) p.set("sector", sector);
    if (tipoActor) p.set("tipoActor", tipoActor);
    if (residuoRef) p.set("residuoRef", residuoRef);
    if (qFiltro) p.set("q", qFiltro);
    return p.toString();
  };

  useEffect(() => {
    if (!listo) return;
    const qs = parametros(false);
    api<Material[]>(`/material${qs ? `?${qs}` : ""}`).then(setLista);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, sector, tipoActor, residuoRef, qFiltro]);

  // Deja la URL al día sin recargar (se puede compartir o volver con «atrás»).
  useEffect(() => {
    if (!listo) return;
    const url = parametros(true);
    window.history.replaceState(null, "", url ? `?${url}` : window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, sector, tipoActor, residuoRef, qFiltro, estado]);

  const conteo = useMemo(() => {
    const c: Record<string, number> = { "": lista?.length ?? 0 };
    for (const m of lista ?? []) c[m.estado] = (c[m.estado] ?? 0) + 1;
    return c;
  }, [lista]);
  const visibles = (lista ?? []).filter((m) => !estado || m.estado === estado);
  const hayFiltros = !!(estado || sector || tipoActor || residuoRef || qFiltro);
  const residuoNombre = residuoRef ? corto(residuoPorId(residuoRef)?.residuo.nombre ?? "Residuo") : "";
  const hrefExcel = `/api/material/exportar${parametros(true) ? `?${parametros(true)}` : ""}`;

  function limpiar() {
    setEstado("");
    setSector("");
    setTipoActor("");
    setResiduoRef("");
    setQ("");
    setQFiltro("");
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setErrores([]);
    setEnviando(true);
    try {
      const m = await api<Material>("/material", {
        method: "POST",
        json: { proveedorId, descripcion, categoriaCodigo: categoria || undefined, cantidad: Number(cantidad), unidad, precioEsperado: precio ? Number(precio) : undefined, imagenes: [] },
      });
      router.push(`/material/${m.id}`);
    } catch (err) {
      setErrores(err instanceof ApiError ? (err.errores?.map((x) => `${x.campo}: ${x.mensaje}`) ?? [err.message]) : ["Error de conexión"]);
      setEnviando(false);
    }
  }

  if (!lista) return <Cargando />;

  return (
    <>
      <PageHeader
        titulo="Material"
        sub="Lo que reportan tus proveedores."
        acciones={
          <>
            <a href={hrefExcel} download className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-ink-300 bg-white px-4 py-2 text-sm font-semibold text-ink-900 transition hover:border-nav-600 hover:bg-surface-2">
              <Icono nombre="descargar" size={16} />Exportar a Excel
            </a>
            <Btn onClick={() => setAbierto((a) => !a)}>{abierto ? "Cerrar" : "Registrar material"}</Btn>
          </>
        }
      />

      {abierto && (
        <Card className="mb-5">
          <h2 className="text-base font-semibold text-nav-900">Registrar material</h2>
          {proveedores.length === 0 ? (
            <p className="mt-2 text-base text-ink-700">Primero agrega un proveedor en <Link href="/red" className="font-semibold text-nav-700 underline">Mi red</Link>.</p>
          ) : (
            <form onSubmit={crear} className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Proveedor">
                <select required value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className={inputCls}>
                  <option value="">Elige…</option>
                  {proveedores.map((p) => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
                </select>
              </Field>
              <Field label="Categoría" hint="Si dudas, deja que Swapit la sugiera.">
                <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={inputCls}>
                  <option value="">Que Swapit la sugiera</option>
                  {cats.map((c) => <option key={c.codigo} value={c.codigo}>{corto(c.nombre)}</option>)}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="¿Qué material es?" hint="Ej. «Bidones de PEAD azules enjuagados».">
                  <textarea required minLength={5} rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={inputCls} />
                </Field>
              </div>
              <Field label="Cantidad">
                <div className="flex gap-2">
                  <input required type="number" min="0.1" step="0.1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className={inputCls} />
                  <select value={unidad} onChange={(e) => setUnidad(e.target.value as "kg" | "ton")} className={`${inputCls} w-28`} aria-label="Unidad">
                    <option value="kg">kilos</option>
                    <option value="ton">toneladas</option>
                  </select>
                </div>
              </Field>
              <Field label={`Precio que pide (S/ por ${unidad === "kg" ? "kilo" : "tonelada"})`} hint="Opcional.">
                <input type="number" min="0" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} className={inputCls} />
              </Field>
              {errores.length > 0 && <ul role="alert" className="list-disc pl-5 text-sm text-error-ink sm:col-span-2">{errores.map((m) => <li key={m}>{m}</li>)}</ul>}
              <div className="sm:col-span-2"><Btn disabled={enviando}>{enviando ? "Registrando…" : "Registrar y ver precio"}</Btn></div>
            </form>
          )}
        </Card>
      )}

      {/* Filtros en una sola barra */}
      <Tabs
        etiqueta="Estado del material"
        valor={estado}
        onChange={setEstado}
        opciones={ESTADOS.map(([k, etiqueta]) => ({ valor: k, etiqueta, conteo: conteo[k] ?? 0 }))}
        className="mb-4"
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-60">
          <Icono nombre="buscar" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar material o proveedor" className={`${inputCls} pl-10`} aria-label="Buscar" />
        </div>
        <select value={sector} onChange={(e) => setSector(e.target.value)} className={`${inputCls} w-auto min-w-40`} aria-label="Sector">
          <option value="">Todos los sectores</option>
          {SECTORES.map((s) => <option key={s.id} value={s.id}>{SECTOR_CORTO[s.id]}</option>)}
        </select>
        <select value={tipoActor} onChange={(e) => setTipoActor(e.target.value)} className={`${inputCls} w-auto min-w-44`} aria-label="Tipo de proveedor">
          <option value="">Todos los tipos</option>
          {TIPOS_ACTOR.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
        {residuoRef && (
          <button type="button" onClick={() => setResiduoRef("")} className="inline-flex min-h-10 items-center gap-1.5 rounded-control border border-pri-600 bg-pri-50 px-3 text-sm font-medium text-pri-700" aria-label={`Quitar filtro ${residuoNombre}`}>
            {residuoNombre}<Icono nombre="cerrar" size={14} />
          </button>
        )}
        {hayFiltros && <button type="button" onClick={limpiar} className="min-h-10 px-2 text-sm font-semibold text-nav-700 hover:underline">Quitar filtros</button>}
      </div>

      {visibles.length === 0 ? (
        <Vacio
          titulo="Nada por aquí"
          texto={lista.length || hayFiltros ? "Prueba con otros filtros." : "Cuando un proveedor reporte, aparecerá aquí."}
          accion={hayFiltros ? <Btn variante="borde" onClick={limpiar}>Quitar filtros</Btn> : <LinkBtn href="/red">Ir a Mi red</LinkBtn>}
        />
      ) : (
        <TablaDatos minAncho={820}>
          <thead>
            <tr>
              <th>Material</th><th>Proveedor</th><th className="text-right">Cantidad</th><th className="text-right">Pide</th><th className="text-right">Ofreces</th><th>Precio</th><th>Estado</th><th className="text-right">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((m) => (
              <tr key={m.id}>
                <td className="max-w-[280px]">
                  <Link href={`/material/${m.id}`} className="line-clamp-2 font-medium text-nav-700 hover:underline">{m.titulo}</Link>
                  <PuntoCategoria codigo={m.categoriaCodigo} />
                  {m.iaSugerencia?.requiereRevision && <span className="ml-2 text-xs font-medium text-ambar-700">Revisar tipo</span>}
                </td>
                <td className="text-ink-700">{m.proveedor}</td>
                <td className="num whitespace-nowrap text-right font-medium">{formatoCantidad(m.cantidad, m.unidad)}</td>
                <td className="num whitespace-nowrap text-right text-ink-700">{m.precioEsperado != null ? precioUnidad(m.precioEsperado, m.unidad) : "—"}</td>
                <td className="num whitespace-nowrap text-right text-ink-700">{m.precioOfrecido != null ? precioUnidad(m.precioOfrecido, m.unidad) : "—"}</td>
                <td>{m.estado !== "RECHAZADO" ? <SemaforoPrecio pos={m.posicionPrecio} corto /> : <span className="text-xs text-ink-500">—</span>}</td>
                <td><EstadoMaterialBadge estado={m.estado} etiqueta={m.etiquetaEstado} /></td>
                <td className="whitespace-nowrap text-right text-ink-500">{fecha(m.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </TablaDatos>
      )}
    </>
  );
}
