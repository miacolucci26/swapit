"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { ETIQUETA_UNIDAD, formatoCantidad, palabrasClave, resolverResiduo, residuoPorId, type ResiduoEnCadena } from "@swapit/shared";
import { aproximar, ETIQUETA_MODALIDAD, precioOferta, solesPrecio, TONO_MODALIDAD, zonaAprox } from "@/components/LoteCard";
import { Badge, Btn, Cargando, Estrellas, inputCls, InsigniaDemo, LinkBtn, PuntoCategoria, Seccion, Tabs } from "@/components/ui";
import { CadenaFlujo } from "@/components/vis/CadenaFlujo";
import { EscaleraVidas, nombreCorto } from "@/components/vis/EscaleraVidas";
import { Icono } from "@/components/vis/Iconos";
import { api, ApiError } from "@/lib/api";
import { CONDICION, corto, ENTREGA, fecha, FRECUENCIA, num } from "@/lib/format";
import type { Lote } from "@/lib/types";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false, loading: () => <div className="h-52 animate-pulse rounded-control bg-surface-2" /> });

/** Campos que la API puede traer y el tipo compartido aún no declara. */
type LoteFicha = Lote & { demo?: boolean; residuoRef?: string | null; codigoLer?: string | null };

const ESTADO_LOTE: Record<string, { texto: string; tono: "verde" | "gris" | "ambar" }> = {
  PUBLICADO: { texto: "Disponible", tono: "verde" },
  RETIRADO: { texto: "Retirada", tono: "gris" },
  AGOTADO: { texto: "Agotada", tono: "gris" },
  EN_NEGOCIACION: { texto: "En negociación", tono: "ambar" },
};

/** Dato de la cuadrícula de resumen: etiqueta pequeña arriba, valor debajo. */
function Dato({ etiqueta, children, nota }: { etiqueta: string; children: React.ReactNode; nota?: string }) {
  return (
    <div className="min-w-0 border-b border-r border-line bg-white px-4 py-3">
      <dt className="text-xs font-medium text-ink-500">{etiqueta}</dt>
      <dd className="mt-1 break-words text-[15px] font-semibold leading-snug text-ink-900">{children}</dd>
      {nota && <dd className="mt-0.5 text-xs text-ink-500">{nota}</dd>}
    </div>
  );
}

/** Condiciones de retiro derivadas del campo `entrega`. */
function retiroDe(entrega: Lote["entrega"]) {
  switch (entrega) {
    case "RECOJO_RECEPTOR":
      return { quien: "Lo retira quien lo recibe, en la planta del ofertante.", transporte: true, detalle: "El traslado corre por cuenta de quien recibe." };
    case "PUNTO_ENCUENTRO":
      return { quien: "Se entrega en un punto de encuentro público acordado.", transporte: true, detalle: "Ambas partes se desplazan al punto acordado." };
    case "ENVIO_OFERTANTE":
      return { quien: "El ofertante lo lleva o lo envía.", transporte: false, detalle: "Acuerden antes quién paga el flete." };
    default:
      return null;
  }
}

/** Palabras que describen una clase de residuo sin identificar el material («bagazo», «cáscara»…), ya en raíz. */
const PALABRAS_GENERICAS = new Set(
  ["bagazo", "cascara", "descarte", "pulpa", "residuo", "residual", "resto", "merma", "hoja", "semilla", "grano", "fuera", "calibre", "bolsa", "sustrato", "fibra", "poda", "raqui", "viscera", "partido", "mancha", "usado", "agotado"].flatMap(palabrasClave),
);

/** Un residuo solo se acepta si el texto contiene alguna palabra propia suya (no solo «bagazo» o «descarte»). */
function coincideConTexto(h: ResiduoEnCadena, texto: string): boolean {
  const t = new Set(palabrasClave(texto));
  const propias = [...palabrasClave(h.residuo.nombre), ...h.residuo.sinonimos.flatMap(palabrasClave)].filter((w) => !PALABRAS_GENERICAS.has(w));
  return propias.some((w) => t.has(w));
}

/** Resalta la fila del residuo dentro del flujo (CadenaFlujo solo marca etapas). */
function ResaltarFila({ ambito, nombre }: { ambito: string; nombre: string }) {
  const n = nombre.replace(/[\\"]/g, "\\$&");
  return <style>{`[data-cf="${ambito}"] a[aria-label^="${n}:"]{background:var(--color-pri-50);box-shadow:inset 3px 0 0 var(--color-pri-600)}`}</style>;
}

function ConvertibleEn({ hallados }: { hallados: ResiduoEnCadena[] }) {
  const [sel, setSel] = useState(hallados[0].residuo.id);
  const ambito = useId().replace(/:/g, "");
  const h = hallados.find((x) => x.residuo.id === sel) ?? hallados[0];
  return (
    <Seccion titulo="En qué se puede convertir" descripcion="Recupera lo que hoy se pierde: de dónde sale este material y qué usos se reportan para él.">
      <div className="flex flex-col gap-4 rounded-card border border-line bg-white p-4 shadow-card sm:p-5">
        {hallados.length > 1 && (
          <div>
            <p className="text-xs text-ink-500">La publicación coincide con varios residuos. Elige el que corresponde:</p>
            <Tabs etiqueta="Residuos posibles" valor={h.residuo.id} onChange={setSel} opciones={hallados.map((x) => ({ valor: x.residuo.id, etiqueta: nombreCorto(x.residuo.nombre) }))} />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-nav-900">{nombreCorto(h.residuo.nombre)}</h3>
          <p className="mt-0.5 text-sm text-ink-700">{h.residuo.descripcion}</p>
          {h.residuo.preparacion && <p className="mt-1.5 text-sm text-ink-500"><b className="font-medium text-ink-700">Cómo subirle el valor: </b>{h.residuo.preparacion}</p>}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-nav-900">Proceso productivo</h3>
          <p className="mb-3 mt-0.5 text-sm text-ink-500">
            Sale de la etapa «{h.etapa.nombre}» de la cadena de {h.cadena.nombre.toLowerCase()}.
          </p>
          <div data-cf={ambito} className="overflow-x-auto" style={{ "--mw": `${h.cadena.etapas.length * 190}px` } as React.CSSProperties}>
            <ResaltarFila ambito={ambito} nombre={h.residuo.nombre} />
            <CadenaFlujo cadena={h.cadena} resaltar={[h.etapa.id]} className="md:min-w-[var(--mw)]" />
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-nav-900">Usos del insumo</h3>
          <div className="overflow-x-auto"><div className="md:min-w-[760px]"><EscaleraVidas residuo={h.residuo} /></div></div>
        </div>

        <p className="flex items-start gap-2 text-xs text-ink-500">
          <Icono nombre="info" size={14} className="mt-0.5 shrink-0" />
          Usos reportados en fuentes abiertas; no es una validación técnica ni sanitaria.
        </p>
        <Link href={`/aprovechamiento/residuo/${h.residuo.id}`} className="inline-flex min-h-10 items-center gap-1.5 self-start text-sm font-semibold text-nav-700 underline">
          Ver la ficha completa del residuo<Icono nombre="flecha" size={14} />
        </Link>
      </div>
    </Seccion>
  );
}

export default function DetalleLote() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [l, setL] = useState<LoteFicha | null>(null);
  const [origen, setOrigen] = useState<{ lat: number; lng: number } | null>(null);
  const [foto, setFoto] = useState(0);
  const [verMas, setVerMas] = useState(false);
  const [cantidad, setCantidad] = useState("");
  const [precioOf, setPrecioOf] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [intento, setIntento] = useState(false);
  const [confirmarRetiro, setConfirmarRetiro] = useState(false);

  useEffect(() => {
    api<LoteFicha>(`/lotes/${id}`).then((x) => {
      setL(x);
      setCantidad(String(Math.min(x.cantidadDisponible, x.cantidadDisponible >= 10 ? 10 : x.cantidadDisponible)));
      setPrecioOf(x.modalidad === "VENTA" && x.precio ? String(x.precio) : "");
    }).catch(() => router.replace("/lotes"));
    api<{ ubicacion: { lat: number; lng: number } | null }>("/empresas/mi").then((e) => setOrigen(e.ubicacion)).catch(() => undefined);
  }, [id, router]);

  const puntoMapa = useMemo(() => (l?.ubicacion ? [{ id: l.id, ...aproximar(l.ubicacion), modalidad: l.modalidad }] : []), [l]);

  // Residuo de la base de cadenas: el que trae la API o el deducido del texto de la publicación.
  const hallados = useMemo<ResiduoEnCadena[]>(() => {
    if (!l) return [];
    const directo = l.residuoRef ? residuoPorId(l.residuoRef) : undefined;
    if (directo) return [directo];
    const texto = `${l.titulo} ${l.descripcion}`;
    const r = resolverResiduo(texto);
    // Se descartan coincidencias que solo comparten una palabra genérica («bagazo de espárrago» no es «bagazo de caña»).
    // La palabra propia debe estar en el título: la descripción suele traer términos sueltos («fibra») que confunden.
    if (r.tipo === "claro") return coincideConTexto(r.hallado, l.titulo) ? [r.hallado] : [];
    if (r.tipo === "ambiguo") return r.opciones.filter((o) => coincideConTexto(o, l.titulo)).slice(0, 4);
    return [];
  }, [l]);

  if (!l) return <Cargando />;
  const qty = Number(cantidad) || 0;
  const pOf = Number(precioOf) || 0;
  const conPrecio = l.modalidad === "VENTA";
  const total = conPrecio ? qty * pOf : 0;
  const dif = l.precio && l.precioReferencia ? Math.round(((l.precio - l.precioReferencia) / l.precioReferencia) * 100) : null;
  const { principal, sufijo } = precioOferta(l);
  const fotos = l.imagenes;
  const larga = l.descripcion.length > 320 || l.descripcion.split("\n").length > 5;
  const disponible = l.estado === "PUBLICADO" && l.cantidadDisponible > 0;
  const verificada = l.tipoPublicador === "EMPRESA" && l.estadoKyb === "VERIFICADA";
  const zona = zonaAprox(l.ubicacion);
  const retiro = retiroDe(l.entrega);
  const estado = ESTADO_LOTE[l.estado] ?? { texto: l.estado, tono: "gris" as const };
  const unidad = ETIQUETA_UNIDAD[l.unidad];
  const errCantidad = !intento ? "" : qty <= 0 ? "Indica una cantidad mayor que cero." : qty > l.cantidadDisponible ? `Máximo disponible: ${formatoCantidad(l.cantidadDisponible, l.unidad)}.` : "";
  const errPrecio = !intento || !conPrecio ? "" : pOf <= 0 ? "Indica el precio que propones." : "";
  const precioTexto = l.modalidad === "VENTA" ? (l.precio ? `${principal} ${sufijo}` : "A negociar") : l.modalidad === "DONACION" ? "Donación (sin costo)" : l.modalidad === "INTERCAMBIO" ? "Intercambio" : l.precio ? `${principal} ${sufijo}` : "A negociar";

  async function ofertar(e: React.FormEvent) {
    e.preventDefault();
    setIntento(true);
    setError("");
    if (qty <= 0 || qty > l!.cantidadDisponible || (conPrecio && pOf <= 0)) return;
    setEnviando(true);
    try {
      const r = await api<{ id: string }>("/transacciones", {
        method: "POST",
        json: { loteId: id, cantidad: qty, precioOfertado: conPrecio && pOf > 0 ? pOf : undefined, mensaje: mensaje.trim() || undefined },
      });
      router.push(`/transacciones/${r.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? (err.errores?.map((x) => x.mensaje).join(", ") ?? err.message) : "Error de conexión");
      setEnviando(false);
    }
  }

  return (
    <>
      <Link href="/lotes" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink-700 hover:text-nav-700">
        <Icono nombre="flecha" size={16} className="rotate-180" />Explorar materiales
      </Link>

      {/* Encabezado */}
      <header className="mb-5 mt-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tono={estado.tono}>{estado.texto}</Badge>
          <Badge tono={TONO_MODALIDAD[l.modalidad] ?? "gris"}>{ETIQUETA_MODALIDAD[l.modalidad] ?? l.modalidad}</Badge>
          <PuntoCategoria codigo={l.categoriaCodigo} etiqueta={corto(l.categoriaNombre)} />
          {l.destacado && <Badge tono="ambar">Destacada</Badge>}
        </div>
        <h1 className="mt-2 break-words text-2xl font-semibold leading-tight tracking-tight text-nav-900 md:text-[28px]">{l.titulo}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-ink-700">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Icono nombre={l.identidadOculta ? "candado" : "empresa"} size={16} className="shrink-0 text-ink-500" />
            <span className="break-words font-medium text-ink-900">{l.razonSocial}</span>
            {l.demo && <InsigniaDemo />}
          </span>
          {verificada && <Badge tono="verde"><Icono nombre="check" size={12} />Verificada</Badge>}
          {l.badgeCircular && <Badge tono="verde"><Icono nombre="reciclar" size={12} />Circular</Badge>}
          <Estrellas v={l.ratingProm} n={l.nTransacciones} />
          {!!l.certificacionesEmpresa?.length && l.certificacionesEmpresa.map((c) => <Badge key={c}>{c}</Badge>)}
        </div>
        {l.identidadOculta && <p className="mt-1.5 text-sm text-ink-500">Empresa confidencial: su nombre se revela cuando responde tu propuesta.</p>}
        {!l.esMio && disponible && (
          <a href="#proponer" className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-pri-600 px-4 text-sm font-semibold text-white hover:bg-pri-700 lg:hidden">
            Proponer acuerdo<Icono nombre="flecha" size={16} className="rotate-90" />
          </a>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Galería */}
          <div>
            <div className="overflow-hidden rounded-card border border-line bg-surface-2">
              <div className="aspect-[4/3] sm:aspect-[16/10]">
                {fotos.length ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fotos[Math.min(foto, fotos.length - 1)]} alt={`Foto ${Math.min(foto, fotos.length - 1) + 1} de ${l.titulo}`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-ink-500">
                    <span aria-hidden="true" className="text-6xl font-semibold text-ink-300">{corto(l.categoriaNombre).charAt(0)}</span>
                    <span className="text-sm">Esta oferta aún no tiene fotos</span>
                  </div>
                )}
              </div>
            </div>
            {fotos.length > 1 && (
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Fotos">
                {fotos.map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFoto(i)}
                    aria-label={`Ver foto ${i + 1} de ${fotos.length}`}
                    aria-pressed={foto === i}
                    className={`h-16 w-20 shrink-0 overflow-hidden rounded-control border-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nav-600 ${foto === i ? "border-pri-600" : "border-line opacity-80 hover:opacity-100"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Resumen */}
          <Seccion titulo="Resumen del material" descripcion={`Publicada el ${fecha(l.createdAt)}`}>
            <div className="overflow-hidden rounded-card border border-line bg-white shadow-card">
            <dl className="-mb-px -mr-px grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3">
              <Dato etiqueta="Volumen disponible" nota={l.cantidadDisponible < l.cantidad ? `de ${formatoCantidad(l.cantidad, l.unidad)} publicados` : undefined}>
                <span className="num">{formatoCantidad(l.cantidadDisponible, l.unidad)}</span>
              </Dato>
              <Dato etiqueta="Unidad">{unidad.plural.charAt(0).toUpperCase() + unidad.plural.slice(1)}</Dato>
              <Dato etiqueta="Precio" nota={conPrecio && dif != null ? `Mercado ${solesPrecio(l.precioReferencia)}${sufijo} (${dif > 0 ? "+" : ""}${dif}%)` : l.modalidad === "INTERCAMBIO" && l.notaIntercambio ? `A cambio de: ${l.notaIntercambio}` : undefined}>
                <span className="num">{precioTexto}</span>
              </Dato>
              <Dato etiqueta="Disponibilidad">{FRECUENCIA[l.frecuencia] ?? l.frecuencia}</Dato>
              <Dato etiqueta="Condición">{l.condicion ? CONDICION[l.condicion] : "No indicada"}</Dato>
              <Dato etiqueta="Procedencia" nota={l.distanciaKm != null && !l.esMio ? `${num(l.distanciaKm, 0)} km de tu planta · aprox.` : "Ubicación aproximada"}>{zona}</Dato>
              {l.fleteEstimado != null && !l.esMio && <Dato etiqueta="Flete estimado" nota="Referencial, hasta tu planta"><span className="num">≈ {solesPrecio(l.fleteEstimado)}</span></Dato>}
              {l.codigoLer && <Dato etiqueta="Código LER">{l.codigoLer}</Dato>}
            </dl>
            </div>
          </Seccion>

          {/* Descripción */}
          <Seccion titulo="Descripción">
            <div className="rounded-card border border-line bg-white p-4 shadow-card sm:p-5">
              <p className={`whitespace-pre-line break-words text-[15px] leading-relaxed text-ink-700 ${larga && !verMas ? "line-clamp-5" : ""}`}>{l.descripcion}</p>
              {larga && (
                <button type="button" onClick={() => setVerMas((v) => !v)} aria-expanded={verMas} className="mt-1 min-h-11 text-sm font-semibold text-nav-700 underline">{verMas ? "Ver menos" : "Ver más"}</button>
              )}
              {l.keywords.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{l.keywords.map((k) => <span key={k} className="rounded-md bg-surface-2 px-2 py-0.5 text-xs text-ink-700">#{k}</span>)}</div>}
            </div>
          </Seccion>

          {/* Condiciones de retiro */}
          <Seccion titulo="Condiciones de retiro" descripcion="Quién traslada el material. La dirección exacta se comparte cuando el acuerdo es aceptado.">
            <div className="rounded-card border border-line bg-white p-4 shadow-card sm:p-5">
              {retiro ? (
                <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium text-ink-500">Entrega</dt>
                    <dd className="mt-1 flex items-start gap-2 text-[15px] font-semibold leading-snug text-ink-900"><Icono nombre="camion" size={18} className="mt-0.5 shrink-0 text-nav-700" />{retiro.quien}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-ink-500">Requiere transporte</dt>
                    <dd className="mt-1 text-[15px] font-semibold text-ink-900">{retiro.transporte ? "Sí" : "No"} <span className="font-normal text-ink-500">· {retiro.detalle}</span></dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-ink-700">El ofertante no indicó condiciones de retiro; se acuerdan al aceptar la propuesta.</p>
              )}
            </div>
          </Seccion>

          {l.ubicacion && (
            <Seccion titulo="Ubicación aproximada" descripcion={`Zona de ${zona}. Nunca mostramos la dirección exacta.`}>
              <div className="overflow-hidden rounded-card border border-line bg-white p-2 shadow-card">
                <MapView className="h-52" puntos={puntoMapa} origen={l.esMio ? null : origen} />
              </div>
            </Seccion>
          )}
        </div>

        {/* Panel lateral: propuesta (inferior en móvil) */}
        <aside id="proponer" aria-label="Proponer acuerdo" className="scroll-mt-4 lg:sticky lg:top-4">
          <div className="rounded-card border border-line bg-white p-4 shadow-card sm:p-5">
            <div className="text-xs font-medium text-ink-500">Precio publicado</div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span className="num text-[28px] font-semibold leading-none text-nav-900">{l.modalidad === "VENTA" && !l.precio ? "A negociar" : principal}</span>
              {sufijo && l.precio != null && <span className="text-sm font-medium text-ink-500">{sufijo}</span>}
            </div>
            <p className="mt-1.5 text-sm text-ink-700"><b className="num font-semibold text-ink-900">{formatoCantidad(l.cantidadDisponible, l.unidad)}</b> disponibles</p>

            {l.esMio ? (
              <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tono={estado.tono}>{estado.texto}</Badge>
                  <span className="text-sm text-ink-700">Es tu oferta</span>
                </div>
                <LinkBtn href="/transacciones" variante="suave"><Icono nombre="acuerdos" size={16} />Ver propuestas recibidas</LinkBtn>
                {l.estado === "PUBLICADO" && (confirmarRetiro ? (
                  <div className="flex flex-wrap gap-2">
                    <Btn variante="peligro" onClick={async () => { await api(`/lotes/${l.id}`, { method: "DELETE" }); router.push("/lotes"); }}>Confirmar retiro</Btn>
                    <Btn variante="borde" onClick={() => setConfirmarRetiro(false)}>No retirar</Btn>
                  </div>
                ) : <Btn variante="borde" onClick={() => setConfirmarRetiro(true)}>Retirar oferta</Btn>)}
              </div>
            ) : l.transaccionActiva ? (
              <div className="mt-4 border-t border-line pt-4"><LinkBtn href={`/transacciones/${l.transaccionActiva.id}`} className="w-full">Ver mi propuesta en curso</LinkBtn></div>
            ) : !disponible ? (
              <div className="mt-4 rounded-control bg-surface-2 p-3 text-sm text-ink-700">Esta oferta ya no está disponible.</div>
            ) : (
              <form onSubmit={ofertar} noValidate className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
                <h2 className="text-base font-semibold text-nav-900">Proponer acuerdo</h2>
                <div className={`grid gap-3 ${conPrecio ? "grid-cols-2" : ""}`}>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="of-cant" className="text-[13px] font-medium text-ink-700">Cantidad ({unidad.corta})</label>
                    <input id="of-cant" type="number" inputMode="decimal" min={l.unidad === "ton" ? 0.1 : 1} max={l.cantidadDisponible} step={l.unidad === "ton" ? 0.1 : 1} value={cantidad} onChange={(e) => setCantidad(e.target.value)} aria-invalid={!!errCantidad} aria-describedby={errCantidad ? "of-cant-err" : undefined} className={`${inputCls} ${errCantidad ? "!border-error" : ""}`} />
                    {errCantidad && <span id="of-cant-err" className="text-xs font-medium text-error-ink">{errCantidad}</span>}
                  </div>
                  {conPrecio && (
                    <div className="flex flex-col gap-1">
                      <label htmlFor="of-precio" className="text-[13px] font-medium text-ink-700">Tu precio (S/ {sufijo})</label>
                      <input id="of-precio" type="number" inputMode="decimal" min="0.01" step="0.01" value={precioOf} onChange={(e) => setPrecioOf(e.target.value)} aria-invalid={!!errPrecio} aria-describedby={errPrecio ? "of-precio-err" : undefined} className={`${inputCls} ${errPrecio ? "!border-error" : ""}`} />
                      {errPrecio && <span id="of-precio-err" className="text-xs font-medium text-error-ink">{errPrecio}</span>}
                    </div>
                  )}
                </div>
                {conPrecio && total > 0 && (
                  <div className="flex items-baseline justify-between gap-3 rounded-control bg-surface-2 px-3.5 py-2.5" aria-live="polite">
                    <span className="text-sm text-ink-700">Total de tu propuesta</span>
                    <b className="num text-xl font-semibold text-nav-900">{solesPrecio(Math.round(total * 100) / 100)}</b>
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <label htmlFor="of-msg" className="text-[13px] font-medium text-ink-700">Mensaje <span className="font-normal text-ink-500">(opcional)</span></label>
                  <textarea id="of-msg" rows={3} maxLength={1000} value={mensaje} onChange={(e) => setMensaje(e.target.value)} className={inputCls} placeholder="Para qué lo usarías y cuándo lo retirarías." />
                </div>
                {error && <p role="alert" className="text-sm font-medium text-error-ink">{error}</p>}
                <Btn disabled={enviando} className="w-full">{enviando ? "Enviando…" : "Proponer acuerdo"}</Btn>
                <p className="flex items-start gap-2 text-xs leading-snug text-ink-500">
                  <Icono nombre="candado" size={14} className="mt-0.5 shrink-0 text-nav-700" />
                  El contacto directo (teléfono/WhatsApp) se habilita cuando el acuerdo es aceptado.
                </p>
              </form>
            )}
          </div>
        </aside>
      </div>

      <div className="mt-6">
        {hallados.length > 0 ? (
            <ConvertibleEn key={hallados.map((h) => h.residuo.id).join("|")} hallados={hallados} />
          ) : (
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-ink-500">
              No reconocimos este material en nuestra base de cadenas productivas.
              <Link href="/lotes?tab=cadenas" className="inline-flex min-h-10 items-center font-semibold text-nav-700 underline">Explorar «Cadenas y usos»</Link>
            </p>
          )}
      </div>
    </>
  );
}
