"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Barras, Cargando, EstadoMaterialBadge, KpiFranja, LinkBtn, PageHeader, Seccion, TablaDatos } from "@/components/ui";
import { Icono } from "@/components/vis/Iconos";
import { BarraSegmentada } from "@/components/vis/Kpi";
import { TuberiaMaterial } from "@/components/vis/TuberiaMaterial";
import { api } from "@/lib/api";
import { fecha, soles, VIA_REPORTE } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { Material, ResumenIntermediario } from "@/lib/types";
import { formatoMasa } from "@swapit/shared";

interface Accion { clave: string; verbo: string; objeto: string; cuenta?: number; href: string; atencion?: boolean }

/** Lo que toca hacer ahora, del paso más temprano (el proveedor espera) al más tardío. Máximo 3. */
function accionesAhora(r: ResumenIntermediario, porCertificar: number): Accion[] {
  const l: Accion[] = [];
  if (r.proveedoresActivos === 0) l.push({ clave: "prov", verbo: "Agregar", objeto: "tu primer proveedor", href: "/red" });
  if (r.pendientes > 0) l.push({ clave: "cotizar", verbo: "Cotizar", objeto: r.pendientes === 1 ? "reporte" : "reportes", cuenta: r.pendientes, href: "/material?estado=REPORTADO" });
  if (r.porDespachar > 0) l.push({ clave: "despachar", verbo: "Despachar", objeto: r.porDespachar === 1 ? "lote" : "lotes", cuenta: r.porDespachar, href: "/material?estado=ACOPIADO" });
  if (!r.suscripcionActiva) l.push({ clave: "suscripcion", verbo: "Activar", objeto: "suscripción", href: "/facturacion", atencion: true });
  else if (porCertificar > 0) l.push({ clave: "certificar", verbo: "Certificar", objeto: porCertificar === 1 ? "despacho" : "despachos", cuenta: porCertificar, href: "/material?estado=DESPACHADO" });
  if (r.porEstado.COTIZADO > 0) l.push({ clave: "recoger", verbo: "Registrar acopio de", objeto: r.porEstado.COTIZADO === 1 ? "lote" : "lotes", cuenta: r.porEstado.COTIZADO, href: "/material?estado=COTIZADO" });
  return l.slice(0, 3);
}

const PASOS_INICIO: { clave: keyof NonNullable<ResumenIntermediario["inicio"]>; etiqueta: string; href: string }[] = [
  { clave: "proveedor", etiqueta: "Agrega un proveedor", href: "/red" },
  { clave: "reporte", etiqueta: "Registra un reporte", href: "/material?nuevo=1" },
  { clave: "cotizacion", etiqueta: "Cotiza con precio de referencia", href: "/material?estado=REPORTADO" },
  { clave: "acopio", etiqueta: "Registra un acopio", href: "/material?estado=COTIZADO" },
  { clave: "destino", etiqueta: "Guarda un destino", href: "/destinos" },
  { clave: "certificado", etiqueta: "Emite un certificado", href: "/material?estado=DESPACHADO" },
];

/** Panel de un intermediario: qué hacer ahora, dónde está el material, cómo van los precios y qué falta certificar. */
export default function PanelIntermediario() {
  const { user } = useSession();
  const [r, setR] = useState<ResumenIntermediario | null>(null);
  const [mats, setMats] = useState<Material[] | null>(null);

  useEffect(() => {
    api<ResumenIntermediario>("/material/resumen").then(setR);
    api<Material[]>("/material").then(setMats).catch(() => setMats([]));
  }, []);

  if (!user || !r) return <Cargando />;
  const evaluados = r.semaforo.DEBAJO + r.semaforo.DENTRO + r.semaforo.ENCIMA;
  const porCertificar = (mats ?? []).filter((m) => m.estado === "DESPACHADO" && !m.certificado).length;
  const acciones = accionesAhora(r, porCertificar);
  const hechos = r.inicio ? PASOS_INICIO.filter((p) => r.inicio![p.clave]).length : PASOS_INICIO.length;
  const pct = Math.round((hechos / PASOS_INICIO.length) * 100);
  // Los últimos movimientos salen de la lista completa; si aún no llega, del resumen.
  const recientes = mats && mats.length ? mats.slice(0, 6) : null;
  const filas = (recientes ?? r.ultimos).map((u) => {
    const m = recientes ? (u as Material) : null;
    const base = u as ResumenIntermediario["ultimos"][number];
    return { id: u.id, titulo: u.titulo, proveedor: u.proveedor, estado: u.estado, etiquetaEstado: u.etiquetaEstado, via: VIA_REPORTE[(m ? m.reportadoVia : base.reportadoVia) ?? ""]?.etiqueta, fecha: m ? m.createdAt : base.fecha };
  });

  return (
    <>
      <PageHeader
        titulo={`Hola, ${user.nombre.split(" ")[0]}`}
        sub={user.empresa.razonSocial}
        acciones={<><LinkBtn href="/material?nuevo=1">Registrar material</LinkBtn><LinkBtn href="/red" variante="borde">Agregar proveedor</LinkBtn></>}
      />

      {!r.suscripcionActiva && (
        <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-ambar-200 bg-ambar-50 px-4 py-3 text-ambar-800">
          <span className="flex items-center gap-2 text-sm font-medium"><Icono nombre="alerta" size={18} />Sin suscripción no puedes emitir certificados.</span>
          <LinkBtn href="/facturacion">Activar suscripción</LinkBtn>
        </div>
      )}

      <KpiFranja
        items={[
          { etiqueta: "Acopiado del mes", valor: formatoMasa(r.acopiadoMesTon), nota: `${r.proveedoresActivos} proveedores activos`, tono: r.acopiadoMesTon > 0 ? "ok" : "neutro" },
          { etiqueta: "Pagado este mes", valor: soles(r.pagadoMes) },
          { etiqueta: "Precio justo", valor: r.pctPrecioJusto == null ? "—" : `${r.pctPrecioJusto} %`, nota: r.pctPrecioJusto == null ? "Sin cotizaciones aún" : "de tus ofertas", tono: r.pctPrecioJusto == null ? "neutro" : r.pctPrecioJusto >= 70 ? "ok" : "alerta" },
          { etiqueta: "Certificados", valor: r.certificadosMes, nota: r.suscripcionActiva ? "este mes" : "requiere suscripción", tono: r.certificadosMes > 0 ? "ok" : "neutro" },
        ]}
      />

      {/* Qué hacer ahora */}
      <Seccion className="mt-6" titulo="Pendientes" descripcion="Lo que toca atender, del paso más temprano al más tardío.">
        {acciones.length === 0 ? (
          <p className="flex items-center gap-2 rounded-card border border-line bg-white px-4 py-3 text-sm font-medium text-pri-700"><Icono nombre="check" size={18} />Todo al día.</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-white shadow-card">
            {acciones.map((a) => (
              <li key={a.clave}>
                <Link href={a.href} className="flex min-h-12 items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface-2">
                  {a.cuenta != null && <span className={`num inline-flex min-w-7 justify-center rounded-md px-1.5 py-0.5 text-sm font-semibold ${a.atencion ? "bg-ambar-50 text-ambar-700" : "bg-nav-50 text-nav-700"}`}>{a.cuenta}</span>}
                  <span className="min-w-0 flex-1 font-medium text-ink-900">{a.verbo} {a.objeto}</span>
                  <Icono nombre="flecha" size={16} className="shrink-0 text-ink-400" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Seccion>

      {/* Ciclo del material */}
      <Seccion className="mt-6" titulo="Tu material" descripcion="Cuántos lotes hay en cada etapa.">
        <TuberiaMaterial porEstado={r.porEstado} porCertificar={r.suscripcionActiva ? porCertificar : 0} />
      </Seccion>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Seccion titulo="Precio justo" descripcion="Tus ofertas frente al rango de referencia.">
          <div className="rounded-card border border-line bg-white p-4 shadow-card">
            {evaluados === 0 ? (
              <p className="text-sm text-ink-500">Cotiza un material para ver tu semáforo.</p>
            ) : (
              <>
                <BarraSegmentada
                  partes={[
                    { etiqueta: "dentro", valor: r.semaforo.DENTRO, color: "bg-pri-600" },
                    { etiqueta: "debajo", valor: r.semaforo.DEBAJO, color: "bg-ambar-400", patron: "rayas" },
                    { etiqueta: "encima", valor: r.semaforo.ENCIMA, color: "bg-nav-600", patron: "puntos" },
                  ]}
                />
                <p className="mt-3 text-xs text-ink-500">
                  <b className="font-semibold text-ink-700">Debajo:</b> pueden rechazarte. <b className="font-semibold text-ink-700">Encima:</b> pagas de más.
                </p>
              </>
            )}
          </div>
        </Seccion>

        <Seccion titulo="Acopio del mes" descripcion="Toneladas por categoría.">
          <div className="rounded-card border border-line bg-white p-4 shadow-card">
            {r.porCategoria.length === 0 ? (
              <p className="text-sm text-ink-500">Aún sin acopios este mes.</p>
            ) : (
              <Barras datos={r.porCategoria.map((c) => ({ etiqueta: c.nombre, valor: c.toneladas }))} color="bg-nav-600" formato={(n) => formatoMasa(n)} />
            )}
          </div>
        </Seccion>
      </div>

      {/* Primeros pasos */}
      {r.inicio && hechos < PASOS_INICIO.length && (
        <Seccion className="mt-6" titulo="Primeros pasos" descripcion={`${hechos} de ${PASOS_INICIO.length} completados.`}>
          <div className="rounded-card border border-line bg-white p-4 shadow-card">
            <div className="h-1.5 overflow-hidden rounded-sm bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Avance de primeros pasos">
              <div className="h-full rounded-sm bg-pri-600 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <ol className="mt-3 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
              {PASOS_INICIO.map((p) => {
                const hecho = r.inicio![p.clave];
                return (
                  <li key={p.clave}>
                    <Link href={p.href} className={`flex min-h-10 items-center gap-2 text-sm ${hecho ? "text-ink-500" : "font-medium text-ink-900 hover:text-nav-700"}`}>
                      <span aria-hidden="true" className={`grid size-5 shrink-0 place-items-center rounded-md border ${hecho ? "border-pri-600 bg-pri-600 text-white" : "border-ink-300 bg-white"}`}>{hecho && <Icono nombre="check" size={12} />}</span>
                      <span className={hecho ? "line-through" : ""}>{p.etiqueta}</span>
                      <span className="sr-only">{hecho ? "(hecho)" : "(pendiente)"}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        </Seccion>
      )}

      {/* Últimos movimientos */}
      <Seccion className="mt-6" titulo="Últimos movimientos" acciones={<LinkBtn href="/material" variante="borde" className="min-h-9 px-3">Ver todo</LinkBtn>}>
        {filas.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-dashed border-ink-300 bg-white p-4">
            <span className="text-sm text-ink-700">Aún no hay material. Agrega un proveedor y envíale su enlace de reporte.</span>
            <LinkBtn href="/red">Ir a Mi red</LinkBtn>
          </div>
        ) : (
          <TablaDatos minAncho={560}>
            <thead>
              <tr><th>Material</th><th>Proveedor</th><th>Estado</th><th className="text-right">Fecha</th></tr>
            </thead>
            <tbody>
              {filas.map((u) => (
                <tr key={u.id}>
                  <td className="max-w-[260px]"><Link href={`/material/${u.id}`} className="line-clamp-2 font-medium text-nav-700 hover:underline">{u.titulo}</Link></td>
                  <td className="text-ink-700">{u.proveedor}</td>
                  <td><EstadoMaterialBadge estado={u.estado} etiqueta={u.etiquetaEstado} /></td>
                  <td className="whitespace-nowrap text-right text-ink-500">{fecha(u.fecha)}{u.via ? ` · ${u.via}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </TablaDatos>
        )}
      </Seccion>
    </>
  );
}
