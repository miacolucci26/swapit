import Link from "next/link";
import { formatoCantidad, residuoPorId } from "@swapit/shared";
import { corto, fecha, GRUPO_CATEGORIA, num, precioUnidad, VIA_REPORTE } from "@/lib/format";
import type { Lote, Material } from "@/lib/types";
import { Badge, EstadoMaterialBadge, InsigniaDemo, PuntoCategoria, SemaforoPrecio } from "./ui";
import { Icono, type NombreIcono } from "./vis/Iconos";
import { Pictograma, pictogramaDeCadena, type PictogramaId } from "./vis/Pictogramas";

// ---------------------------------------------------------------------------
// Piezas visuales compartidas por material, panel, red, destinos y acuerdos
// ---------------------------------------------------------------------------

/** Pictograma de un material: por su residuo de la base de cadenas; si no hay, por su categoría. */
export function pictoMaterial(m: { residuoRef?: string | null; categoriaCodigo?: string | null }): PictogramaId {
  if (m.residuoRef) {
    const h = residuoPorId(m.residuoRef);
    if (h) return pictogramaDeCadena(h.cadena.id, h.residuo.id);
  }
  const c = m.categoriaCodigo ?? "";
  if (c.startsWith("PLASTICO")) return "plastico";
  if (c === "PAPEL_CARTON") return "carton";
  if (c === "MADERA_PALLETS") return "madera";
  if (c === "ACEITES_USADOS") return "aceite";
  if (c === "TEXTIL") return "textil";
  if (c === "PESCA_MARISCOS") return "pescado";
  if (c === "ORGANICO_AGRO") return "mango";
  if (c === "BIOMASA") return "arroz";
  return "acopio";
}

/** Pictograma sobre una baldosa clara, para encabezar tarjetas y filas. */
export function PictoMaterial({ id, size = 44, className = "" }: { id: PictogramaId; size?: number; className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-card bg-surface-2 ${className}`} style={{ width: size + 12, height: size + 12 }}>
      <Pictograma id={id} size={size} />
    </span>
  );
}

/** Pictograma según el sector del proveedor. */
export const PICTO_SECTOR: Record<string, PictogramaId> = {
  AGRO: "mango", AGROINDUSTRIA: "arroz", PESCA: "pescado", TEXTIL: "textil", MANUFACTURA: "plastico", SERVICIOS: "acopio", OTRO: "acopio",
};
/** Nombres cortos de sector para chips. */
export const SECTOR_CORTO: Record<string, string> = {
  AGRO: "Agro", AGROINDUSTRIA: "Agroindustria", PESCA: "Pesca", TEXTIL: "Textil", MANUFACTURA: "Manufactura", SERVICIOS: "Servicios", OTRO: "Otro",
};

/** Ícono y colores de cada tipo de destino (clases literales para que Tailwind las detecte). */
export const ESTILO_DESTINO: Record<string, { icono: NombreIcono; tint: string; ink: string; borde: string; solido: string }> = {
  REPROCESO_ALIMENTOS: { icono: "fabrica", tint: "bg-agro-tint", ink: "text-agro-ink", borde: "border-agro", solido: "bg-agro" },
  MERCADO_LOCAL: { icono: "dinero", tint: "bg-pri-100", ink: "text-pri-800", borde: "border-pri-600", solido: "bg-pri-600" },
  ALIMENTO_ANIMAL: { icono: "hoja", tint: "bg-otros-tint", ink: "text-otros-ink", borde: "border-otros", solido: "bg-otros" },
  COMPOSTAJE: { icono: "hoja", tint: "bg-exito-tint", ink: "text-exito-ink", borde: "border-exito", solido: "bg-exito" },
  ENERGIA: { icono: "sol", tint: "bg-alerta-tint", ink: "text-alerta-ink", borde: "border-alerta", solido: "bg-alerta" },
  CONSTRUCCION: { icono: "fabrica", tint: "bg-ink-100", ink: "text-ink-700", borde: "border-ink-400", solido: "bg-ink-500" },
  RECICLADO_MATERIAL: { icono: "reciclar", tint: "bg-plastico-tint", ink: "text-plastico-ink", borde: "border-plastico", solido: "bg-plastico" },
  INGREDIENTES: { icono: "gota", tint: "bg-textil-tint", ink: "text-textil-ink", borde: "border-textil", solido: "bg-textil" },
  PLANTA_HARINAS: { icono: "mar", tint: "bg-pesca-tint", ink: "text-pesca-ink", borde: "border-pesca", solido: "bg-pesca" },
  ARTESANIA_MYPE: { icono: "empresa", tint: "bg-nav-50", ink: "text-nav-800", borde: "border-nav-500", solido: "bg-nav-600" },
  GESTOR_AUTORIZADO: { icono: "camion", tint: "bg-ink-100", ink: "text-ink-900", borde: "border-ink-500", solido: "bg-ink-700" },
};
export const ESTILO_DESTINO_BASE = { icono: "destinos" as NombreIcono, tint: "bg-surface-2", ink: "text-ink-700", borde: "border-ink-300", solido: "bg-ink-500" };

const ORDEN_ESTADOS = ["REPORTADO", "COTIZADO", "ACOPIADO", "DESPACHADO"];
/** Avance del material en miniatura: 4 tramos (el actual en naranja). */
export function MiniPasos({ estado }: { estado: string }) {
  const rechazado = estado === "RECHAZADO";
  const actual = ORDEN_ESTADOS.indexOf(estado);
  return (
    <span className="flex items-center gap-1" role="img" aria-label={rechazado ? "Rechazado" : `Paso ${actual + 1} de 4`}>
      {ORDEN_ESTADOS.map((e, i) => (
        <span key={e} className={`h-2 w-7 rounded-full ${rechazado ? "bg-ink-300" : i < actual ? "bg-nav-600" : i === actual ? "bg-pri-600" : "bg-ink-100"}`} />
      ))}
    </span>
  );
}

/** Tarjeta de un material de la red: pictograma, cantidad, precios, semáforo y avance. */
export function TarjetaMaterial({ m }: { m: Material }) {
  const via = VIA_REPORTE[m.reportadoVia ?? ""];
  return (
    <Link href={`/material/${m.id}`} className="group flex h-full flex-col gap-3 rounded-card border border-line bg-white p-4 shadow-card transition hover:border-nav-500">
      <div className="flex items-start gap-3">
        <PictoMaterial id={pictoMaterial(m)} />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-base font-bold leading-snug text-nav-900 group-hover:text-nav-700">{m.titulo}</h3>
          <p className="truncate text-sm text-ink-700">{m.proveedor}</p>
        </div>
        <EstadoMaterialBadge estado={m.estado} etiqueta={m.etiquetaEstado} />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <span className="num text-3xl font-bold leading-none text-ink-900">{formatoCantidad(m.cantidad, m.unidad)}</span>
        <span className="text-right text-sm text-ink-700">
          {m.precioEsperado != null && <span className="block">Pide <b className="text-ink-900">{precioUnidad(m.precioEsperado, m.unidad)}</b></span>}
          {m.precioOfrecido != null && <span className="block">Ofreces <b className="text-ink-900">{precioUnidad(m.precioOfrecido, m.unidad)}</b></span>}
        </span>
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <MiniPasos estado={m.estado} />
        <span className="flex items-center gap-2 text-xs text-ink-500">
          {m.estado !== "RECHAZADO" && <SemaforoPrecio pos={m.posicionPrecio} corto />}
          {m.iaSugerencia?.requiereRevision && <span className="inline-flex items-center gap-1 font-semibold text-alerta-ink" title="Confirma el tipo"><Icono nombre="info" size={14} />Revisar</span>}
          <span title={via?.etiqueta}>{via?.icono} {fecha(m.createdAt)}</span>
        </span>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Catálogo de ofertas (modo intercambio): foto, precio, ubicación aproximada
// ---------------------------------------------------------------------------

/** Color de cada categoría (clases literales para que Tailwind las detecte). `grad` es el fondo de la ilustración. */
export type EstiloCategoria = { tint: string; ink: string; borde: string; solido: string; grad: string };
const FAMILIAS = {
  agro: { tint: "bg-agro-tint", ink: "text-agro-ink", borde: "border-agro", solido: "bg-agro", grad: "bg-linear-to-br from-agro-tint via-white to-agro/30" },
  pesca: { tint: "bg-pesca-tint", ink: "text-pesca-ink", borde: "border-pesca", solido: "bg-pesca", grad: "bg-linear-to-br from-pesca-tint via-white to-pesca/30" },
  textil: { tint: "bg-textil-tint", ink: "text-textil-ink", borde: "border-textil", solido: "bg-textil", grad: "bg-linear-to-br from-textil-tint via-white to-textil/30" },
  plastico: { tint: "bg-plastico-tint", ink: "text-plastico-ink", borde: "border-plastico", solido: "bg-plastico", grad: "bg-linear-to-br from-plastico-tint via-white to-plastico/30" },
  otros: { tint: "bg-otros-tint", ink: "text-otros-ink", borde: "border-otros", solido: "bg-otros", grad: "bg-linear-to-br from-otros-tint via-white to-otros/30" },
  marino: { tint: "bg-nav-50", ink: "text-nav-800", borde: "border-nav-500", solido: "bg-nav-600", grad: "bg-linear-to-br from-nav-50 via-white to-nav-200" },
  sol: { tint: "bg-pri-100", ink: "text-pri-800", borde: "border-pri-600", solido: "bg-pri-600", grad: "bg-linear-to-br from-pri-100 via-white to-pri-300/50" },
  exito: { tint: "bg-exito-tint", ink: "text-exito-ink", borde: "border-exito", solido: "bg-exito", grad: "bg-linear-to-br from-exito-tint via-white to-exito/30" },
} satisfies Record<string, EstiloCategoria>;
const FAMILIA_DE: Record<string, keyof typeof FAMILIAS> = {
  ORGANICO_AGRO: "agro", BIOMASA: "sol", PESCA_MARISCOS: "pesca", TEXTIL: "textil",
  PAPEL_CARTON: "otros", MADERA_PALLETS: "otros", ACEITES_USADOS: "sol", CONSTRUCCION: "otros",
  METAL: "marino", MAQUINARIA_EQUIPOS: "marino", RAEE: "marino", VIDRIO_CERAMICA: "pesca",
  INSUMOS_RECICLADOS: "exito", ARTICULOS_PERSONALES: "textil",
};
export function estiloCategoria(codigo: string): EstiloCategoria {
  if (codigo.startsWith("PLASTICO")) return FAMILIAS.plastico;
  return FAMILIAS[FAMILIA_DE[codigo] ?? "marino"];
}

/** Precio por unidad con hasta 2 decimales (un kg a S/ 1,80 no debe redondearse a S/ 2). */
export const solesPrecio = (n: number | null | undefined) =>
  n == null ? "—" : `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const sufijoUnidad = (u: string) => (u === "kg" ? "/kg" : u === "und" ? "/und." : "/t");

/** Precio destacado de una oferta: texto grande + sufijo pequeño. */
export function precioOferta(l: Pick<Lote, "modalidad" | "precio" | "unidad">): { principal: string; sufijo: string } {
  if (l.modalidad === "DONACION") return { principal: "Donación", sufijo: "" };
  if (l.modalidad === "INTERCAMBIO") return { principal: "Intercambio", sufijo: "" };
  if (l.modalidad === "CREDITOS") return { principal: `${num(l.precio, 0)} créd.`, sufijo: sufijoUnidad(l.unidad) };
  return { principal: solesPrecio(l.precio), sufijo: sufijoUnidad(l.unidad) };
}

export const TONO_MODALIDAD: Record<string, "azul" | "verde" | "sol" | "rosa"> = { VENTA: "azul", DONACION: "verde", INTERCAMBIO: "rosa", CREDITOS: "sol" };
export const ETIQUETA_MODALIDAD: Record<string, string> = { VENTA: "Venta", DONACION: "Donación", INTERCAMBIO: "Intercambio", CREDITOS: "Créditos" };

/** Ciudades del norte (y Lima) para decir «Piura» en vez de coordenadas. */
const CIUDADES: [string, number, number][] = [
  ["Tumbes", -3.57, -80.45], ["Talara", -4.58, -81.27], ["Paita", -5.09, -81.11], ["Sullana", -4.9, -80.69],
  ["Piura", -5.19, -80.63], ["Chulucanas", -5.1, -80.16], ["Olmos", -5.99, -79.75], ["Chiclayo", -6.77, -79.84],
  ["Jaén", -5.71, -78.81], ["Cajamarca", -7.16, -78.51], ["Trujillo", -8.11, -79.03], ["Chao", -8.54, -78.68],
  ["Chimbote", -9.07, -78.59], ["Huaral", -11.5, -77.21], ["Lima", -12.05, -77.04],
];
/** Zona aproximada (ciudad más cercana o región); nunca una dirección exacta. */
export function zonaAprox(u: { lat: number; lng: number } | null | undefined): string {
  if (!u) return "Perú";
  let mejor = { n: "", d: Infinity };
  for (const [n, la, lo] of CIUDADES) {
    const d = Math.hypot((u.lat - la) * 111, (u.lng - lo) * 111 * Math.cos((la * Math.PI) / 180));
    if (d < mejor.d) mejor = { n, d };
  }
  return mejor.d <= 60 ? mejor.n : u.lat > -9.5 ? "Norte del Perú" : "Perú";
}
/** Redondea a ~1 km para que ni siquiera el mapa revele el punto exacto. */
export const aproximar = (u: { lat: number; lng: number }) => ({ lat: Math.round(u.lat * 100) / 100, lng: Math.round(u.lng * 100) / 100 });

/** La oferta es de demostración (campo opcional: puede no existir aún en la API). */
export const esDemo = (l: object) => (l as { demo?: boolean }).demo === true;

/** Foto de la oferta; sin foto, un bloque neutro con la inicial de la categoría (sin ilustraciones). `picto` se conserva por compatibilidad. */
export function FotoLote({ l, src, className = "" }: { l: Pick<Lote, "categoriaCodigo" | "imagenes">; src?: string | null; className?: string; picto?: number }) {
  const foto = src === undefined ? l.imagenes[0] : src;
  if (foto) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={foto} alt="" loading="lazy" className={`h-full w-full object-cover ${className}`} />;
  }
  const nombre = (GRUPO_CATEGORIA[l.categoriaCodigo] ?? GRUPO_CATEGORIA.OTROS).nombre;
  return (
    <div aria-hidden="true" className={`grid h-full w-full place-items-center bg-surface-2 ${className}`}>
      <span className="text-3xl font-semibold text-ink-300">{nombre.charAt(0)}</span>
    </div>
  );
}

/** Oferta del catálogo (vista Tarjetas): foto 16:10, título, empresa, cantidad, precio y ciudad aproximada. Toda la tarjeta es un enlace. */
export default function LoteCard({ l }: { l: Lote }) {
  const { principal, sufijo } = precioOferta(l);
  const aNegociar = l.modalidad === "VENTA" && l.precio == null;
  return (
    <Link href={`/lotes/${l.id}`} className="group flex h-full min-w-0 flex-col overflow-hidden rounded-card border border-line bg-white shadow-card transition hover:border-nav-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nav-600">
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-2">
        <FotoLote l={l} />
        {l.esMio && <Badge tono="gris" className="absolute right-2 top-2 bg-ink-900 text-white">Tu oferta</Badge>}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <PuntoCategoria codigo={l.categoriaCodigo} etiqueta={corto(l.categoriaNombre)} className="min-w-0 max-w-full" />
          {esDemo(l) && <InsigniaDemo />}
        </div>
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-nav-900 group-hover:text-nav-700">{l.titulo}</h3>
        <p className="flex items-center gap-1.5 text-sm text-ink-700">
          <Icono nombre={l.identidadOculta ? "candado" : "empresa"} size={16} className="shrink-0 text-ink-500" />
          <span className="truncate">{l.razonSocial}</span>
        </p>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-t border-line pt-2.5">
          <span className="num text-sm font-semibold text-ink-900">{formatoCantidad(l.cantidadDisponible, l.unidad)}</span>
          <span className="num text-sm text-ink-900">
            {aNegociar ? <span className="text-ink-700">A negociar</span> : <b className="font-semibold">{principal}</b>}
            {!aNegociar && sufijo && <span className="text-xs text-ink-500">{sufijo}</span>}
          </span>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-ink-500">
          <Icono nombre="ubicacion" size={14} className="shrink-0" />
          <span className="truncate">{zonaAprox(l.ubicacion)}{l.distanciaKm != null && !l.esMio ? ` · ${num(l.distanciaKm, 0)} km` : ""}</span>
        </p>
        <span className="mt-auto inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control bg-pri-600 px-4 text-sm font-semibold text-white transition group-hover:bg-pri-700">
          Ver detalle<Icono nombre="flecha" size={16} />
        </span>
      </div>
    </Link>
  );
}
