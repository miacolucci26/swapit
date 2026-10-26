import Link from "next/link";
import {
  EVIDENCIAS, NIVELES, RESIDUOS, compradoresDe, nombreSector, nombreTipoDestino, preguntasDe,
  type Cadena, type Evidencia, type Nivel, type Residuo, type TipoDestino, type Valor,
} from "@swapit/shared";
import { Badge, PuntoCategoria, TablaDatos } from "./ui";
import PublicNav from "./PublicNav";
import { Icono } from "./vis/Iconos";
import { CLASE_SECTOR } from "./vis/CadenaFlujo";
import { ESTILO_NIVEL, SelloEvidencia, ValorMonedas, nombreCorto } from "./vis/EscaleraVidas";

/** Marco común de las páginas públicas de aprovechamiento (información de uso libre sobre cadenas y residuos). */
export function MarcoAprovechamiento({ children, ruta = [] }: { children: React.ReactNode; ruta?: { href?: string; texto: string }[] }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <PublicNav detectarSesion />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5">
        <nav aria-label="Ruta" className="mb-3 flex flex-wrap items-center gap-x-1 text-sm text-ink-500">
          <Link href="/aprovechamiento" className="inline-flex min-h-10 items-center font-medium text-nav-700 hover:underline">Aprovechamiento</Link>
          {ruta.map((r) => (
            <span key={r.texto} className="flex items-center gap-1">
              <span aria-hidden="true">›</span>
              {r.href ? (
                <Link href={r.href} className="inline-flex min-h-10 items-center font-medium text-nav-700 hover:underline">{r.texto}</Link>
              ) : (
                <span aria-current="page" className="font-medium text-ink-900">{r.texto}</span>
              )}
            </span>
          ))}
        </nav>
        {children}
      </main>
      <footer className="border-t border-line bg-white px-4 py-5 text-center text-sm text-ink-500">
        Información orientativa · Prototipo SeedTech UDEP 2026
        <details className="mx-auto mt-1 max-w-xl text-xs">
          <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-nav-700">Ver aviso</summary>
          <p>Reunida de prácticas de la industria, estudios y proyectos abiertos. No reemplaza la validación técnica, sanitaria ni normativa de quien transforma o compra.</p>
        </details>
      </footer>
    </div>
  );
}

const TONO_NIVEL: Record<Nivel, "verde" | "azul" | "ambar" | "rojo" | "gris"> = { PREVENIR: "verde", REUSO: "verde", MATERIAL: "azul", ENERGIA: "azul", DISPOSICION: "gris" };

export const InsigniaNivel = ({ nivel }: { nivel: Nivel }) => <Badge tono={TONO_NIVEL[nivel]}>{NIVELES[nivel].nombre}</Badge>;
export const InsigniaEvidencia = ({ evidencia }: { evidencia: Evidencia }) => <SelloEvidencia evidencia={evidencia} />;
export const InsigniaValor = ({ valor }: { valor: Valor }) => <ValorMonedas valor={valor} conTexto />;

/** Etiqueta de texto de un tipo de destino (siempre con su nombre corto). */
export function ChipDestino({ destino }: { destino: TipoDestino }) {
  return (
    <span className="inline-flex min-h-7 items-center rounded-md bg-nav-50 px-2.5 py-0.5 text-xs font-medium text-nav-800">
      {nombreTipoDestino(destino, true)}
    </span>
  );
}

/** Nº de usos de un residuo, con la concordancia correcta. */
export const textoUsos = (n: number) => `${n} ${n === 1 ? "uso" : "usos"}`;

/** Tarjeta compacta de un residuo: nombre, categoría, nº de usos y valor de su mejor uso. */
export function TarjetaResiduo({ residuo }: { residuo: Residuo; cadenaId?: string }) {
  const primera = residuo.vidas[0];
  const usos = residuo.vidas.length;
  return (
    <Link
      href={`/aprovechamiento/residuo/${residuo.id}`}
      aria-label={`${residuo.nombre}: ${textoUsos(usos)}`}
      className="flex min-h-14 items-center gap-3 rounded-card border border-line bg-white px-3 py-2.5 shadow-card transition hover:border-nav-600"
    >
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-sm font-semibold leading-tight text-ink-900">{nombreCorto(residuo.nombre)}</span>
        <PuntoCategoria codigo={residuo.categoria} className="mt-1" />
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5">
        {primera && <ValorMonedas valor={primera.valor} />}
        <span className="num text-xs text-ink-500">{textoUsos(usos)}</span>
      </span>
    </Link>
  );
}

/** Tarjeta sobria de una cadena: sector (punto de color), nombre y «N etapas · N residuos». */
export function ResumenCadena({ cadena, compacto = false }: { cadena: Cadena; compacto?: boolean }) {
  const residuos = cadena.etapas.reduce((a, e) => a + e.residuos.length, 0);
  const nombre = cadena.nombre.replace(/^Cadena d[eo]l? /i, "");
  return (
    <Link
      href={`/aprovechamiento/cadena/${cadena.id}`}
      aria-label={`${cadena.nombre}: ${cadena.etapas.length} etapas, ${residuos} residuos`}
      className={`block h-full rounded-card border border-line bg-white shadow-card transition hover:border-nav-600 ${compacto ? "p-3" : "p-4"}`}
    >
      <span className="flex items-center gap-1.5 text-xs text-ink-700">
        <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${CLASE_SECTOR[cadena.sector].linea}`} />
        {cadena.sector === "OTRO" ? "Todos los sectores" : nombreSector(cadena.sector)}
      </span>
      <span className="mt-1 block text-base font-semibold leading-tight text-nav-900">{nombre}</span>
      <span className="num mt-1 block text-sm text-ink-500">{cadena.etapas.length} etapas · {residuos} residuos</span>
    </Link>
  );
}

/** Quién compra o recibe un residuo: tabla «Comprador · para qué usos». */
export function ListaCompradores({ residuo }: { residuo: Residuo }) {
  const compradores = compradoresDe(residuo);
  if (compradores.length === 0) {
    return <p className="rounded-card border border-line bg-white p-4 text-sm text-ink-700">Sin compradores comerciales: entrégalo a un gestor autorizado.</p>;
  }
  return (
    <TablaDatos minAncho={0}>
      <thead>
        <tr>
          <th scope="col">Comprador</th>
          <th scope="col">Para qué usos</th>
        </tr>
      </thead>
      <tbody>
        {compradores.map((c) => (
          <tr key={c.destino}>
            <td className="align-top font-semibold text-ink-900">
              {nombreTipoDestino(c.destino, true)}
              <span className="mt-0.5 block text-xs font-normal text-ink-500">{nombreTipoDestino(c.destino)}</span>
            </td>
            <td className="align-top text-sm text-ink-700">
              <ul className="list-disc space-y-0.5 pl-4">{c.usos.map((u) => <li key={u}>{u}</li>)}</ul>
            </td>
          </tr>
        ))}
      </tbody>
    </TablaDatos>
  );
}

/** Tres preguntas clave (solo la pregunta); el resto, tras «Ver todas». */
export function PreguntasClave({ residuo }: { residuo: Residuo }) {
  const todas = preguntasDe(residuo);
  const corta = (p: string) => (p.includes("?") ? `${p.split("?")[0]}?` : p);
  return (
    <div className="rounded-card border border-line bg-white p-4 shadow-card">
      <ul className="space-y-2">
        {todas.slice(0, 3).map((p) => (
          <li key={p} className="flex items-start gap-2 text-sm text-ink-900">
            <Icono nombre="check" size={16} className="mt-0.5 shrink-0 text-pri-700" />
            {corta(p)}
          </li>
        ))}
      </ul>
      {todas.length > 3 && (
        <details className="mt-1">
          <summary className="inline-flex min-h-10 cursor-pointer items-center text-sm font-semibold text-nav-700">Ver todas ({todas.length})</summary>
          <ul className="list-disc space-y-1 pb-1 pl-5 text-sm text-ink-700">{todas.slice(3).map((p) => <li key={p}>{p}</li>)}</ul>
        </details>
      )}
    </div>
  );
}

/** La jerarquía de residuos en cinco niveles (D. Leg. 1278), como tabla con el nº de usos de la base en cada uno. */
export function EscaleraDeValor() {
  const orden = Object.entries(NIVELES).sort((a, b) => a[1].orden - b[1].orden) as [Nivel, (typeof NIVELES)[Nivel]][];
  const conteo = (k: Nivel) => RESIDUOS.reduce((a, r) => a + r.residuo.vidas.filter((v) => v.nivel === k).length, 0);
  return (
    <div>
      <TablaDatos minAncho={0}>
        <caption className="sr-only">Escalera de valor: de más a menos valor</caption>
        <thead>
          <tr>
            <th scope="col" className="w-12">N.º</th>
            <th scope="col">Nivel</th>
            <th scope="col" className="hidden sm:table-cell">Qué significa</th>
            <th scope="col" className="text-right">Usos en la base</th>
          </tr>
        </thead>
        <tbody>
          {orden.map(([k, n]) => (
            <tr key={k}>
              <td>
                <span aria-hidden="true" className={`num grid size-6 place-items-center rounded-md text-xs font-semibold ${ESTILO_NIVEL[k].circulo}`}>{n.orden}</span>
                <span className="sr-only">Nivel {n.orden}</span>
              </td>
              <td className="font-semibold text-nav-900">
                {n.nombre}
                <span className="mt-0.5 block text-xs font-normal text-ink-500 sm:hidden">{n.ayuda}</span>
              </td>
              <td className="hidden text-ink-700 sm:table-cell">{n.ayuda}</td>
              <td className="num text-right font-medium">{conteo(k)}</td>
            </tr>
          ))}
        </tbody>
      </TablaDatos>
      <p className="mt-2 text-sm text-ink-500">Arriba, más valor; abajo, menos. Se prefiere evitar y reusar antes que reciclar, reciclar antes que quemar y quemar antes que disponer.</p>
      <details className="mt-1">
        <summary className="inline-flex min-h-10 cursor-pointer items-center text-sm font-semibold text-nav-700">Ver base legal</summary>
        <p className="pb-2 text-sm text-ink-700">Orden de la Ley de Gestión Integral de Residuos Sólidos (D. Leg. 1278): primero evitar y reusar, luego transformar, después aprovechar la energía y al final disponer.</p>
      </details>
    </div>
  );
}

/** Advertencia de evidencia: sellos y la aclaración de que el valor es cualitativo. */
export function LeyendaEvidencia() {
  const evidencias = Object.keys(EVIDENCIAS) as Evidencia[];
  return (
    <div className="rounded-card border border-ambar-200 bg-ambar-50 p-4">
      <p className="text-sm font-semibold text-ambar-800">Cómo leer esta información</p>
      <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        {evidencias.map((e) => <li key={e}><SelloEvidencia evidencia={e} /></li>)}
        <li className="flex items-center gap-2 text-xs font-medium text-ink-700"><ValorMonedas valor="ALTO" /> valor cualitativo</li>
      </ul>
      <ul className="mt-2 space-y-1 text-sm text-ink-700">
        {evidencias.map((e) => <li key={e}><b>{EVIDENCIAS[e].nombre}:</b> {EVIDENCIAS[e].ayuda}</li>)}
        <li>El valor es cualitativo: no hay precios de mercado validados. Pide siempre muestra y ficha de calidad.</li>
      </ul>
    </div>
  );
}
