"use client";

import Link from "next/link";
import { useState } from "react";
import { CADENAS, nombreSector, residuoPorId, vidasParaMype } from "@swapit/shared";
import PublicNav from "./PublicNav";
import { LinkBtn, Seccion, Tabs } from "./ui";
import { CLASE_SECTOR } from "./vis/CadenaFlujo";
import { Icono } from "./vis/Iconos";
import { RecorridoIlustrado, type ColorRecorrido, type PasoRecorrido } from "./vis/RecorridoIlustrado";

const CICLO = [
  { t: "Reportan", d: "Tus proveedores avisan su material desde el celular, por WhatsApp o con un enlace." },
  { t: "Cotizas", d: "Ves el rango de precio de referencia y ofreces dentro de él." },
  { t: "Despachas", d: "Registras el acopio, la cantidad pagada y a quién se lo entregas." },
  { t: "Certificas", d: "Tu cliente recibe una constancia con tu logo y un código QR verificable." },
];

const usosMango = residuoPorId("mango-descarte")?.residuo.vidas.length ?? 5;
const limon = residuoPorId("limon-cascara")?.residuo;
const usosMype = limon ? vidasParaMype(limon).length : 3;
const usosLimon = limon?.vidas.length ?? 4;

interface Recorrido {
  id: string;
  corto: string;
  titulo: string;
  color: ColorRecorrido;
  pasos: PasoRecorrido[];
}

// Datos «reales» salen de la base de cadenas; lo marcado como ejemplo es ilustrativo.
const RECORRIDOS: Recorrido[] = [
  {
    id: "mango", corto: "Mango", titulo: "Del descarte de mango al comprador", color: "agro",
    pasos: [
      { icono: "hoja", dato: `${usosMango} usos`, frase: "El descarte vale más de una forma." },
      { icono: "reloj", dato: "Horas, no días", frase: "Separa la fruta sana. Entrégala rápido." },
      { icono: "fabrica", dato: "Valor alto", frase: "Mejor uso: seguir siendo alimento." },
      { icono: "balanza", dato: "Precio justo", frase: "Ofrece dentro del rango." },
      { icono: "camion", dato: "Despachado", frase: "Registra a quién se lo diste." },
    ],
  },
  {
    id: "proveedor", corto: "Proveedor", titulo: "Del reporte del proveedor al certificado", color: "marino",
    pasos: [
      { icono: "red", dato: "Con o sin RUC", frase: "Da de alta a tu proveedor." },
      { icono: "whatsapp", dato: "0 cuentas", frase: "Él reporta desde su celular." },
      { icono: "balanza", dato: "▼ ● ▲", frase: "Cotiza con precio de referencia." },
      { icono: "camion", dato: "4 estados", frase: "Recoge, pesa y despacha." },
      { icono: "certificado", dato: "Código QR", frase: "Tu cliente recibe su certificado." },
    ],
  },
  {
    id: "mype", corto: "MYPE", titulo: "De la cáscara a la ganancia de una MYPE", color: "sol",
    pasos: [
      { icono: "hoja", dato: `${usosMype} de ${usosLimon} usos`, frase: "Están al alcance de una MYPE." },
      { icono: "dinero", dato: "Valor medio", frase: "Elige un uso a tu alcance." },
      { icono: "check", dato: "1 requisito", frase: "Revisa qué debes cumplir." },
      { icono: "grafico", dato: "S/ por kilo", frase: "Pon tus números: ¿sale a cuenta?" },
      { icono: "dinero", dato: "Margen", frase: "Vende y repite si te conviene." },
    ],
  },
];

/** Cadenas destacadas (todas existen en la base de aprovechamiento). */
const IDS_CADENAS = ["mango", "limon", "arroz", "concha-abanico", "algodon-textil", "empaques-y-apoyo"];

const BENEFICIOS = [
  { cifra: "0", titulo: "Reportes por WhatsApp", linea: "Cuentas que crear a tus proveedores." },
  { cifra: "▼ ● ▲", titulo: "Precio de referencia", linea: "Sabes si tu oferta es justa." },
  { cifra: "QR", titulo: "Certificado con tu logo", linea: "Tu cliente lo verifica en segundos." },
];

const GARANTIAS = ["Tus clientes son solo tuyos", "Sin comisión por operación", "Tus precios no se comparten"];

/** Portada del modo B2B2B: Swapit como herramienta para acopiadores y agregadores regionales (no un marketplace). */
export default function LandingB2B() {
  const [sel, setSel] = useState(RECORRIDOS[0].id);
  const rec = RECORRIDOS.find((r) => r.id === sel) ?? RECORRIDOS[0];
  const cadenas = IDS_CADENAS.map((id) => CADENAS.find((c) => c.id === id)).filter((c) => c !== undefined);

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <PublicNav />
      <main className="flex-1">
        <section className="border-b border-line bg-white">
          <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
            <p className="text-sm font-medium text-pri-700">Piura · Lambayeque</p>
            <h1 className="mt-2 max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-nav-900 md:text-[40px]">Acopia con precio justo.</h1>
            <p className="mt-3 max-w-xl text-base text-ink-700 md:text-lg">Tus proveedores reportan por WhatsApp. Tú cotizas con precio de referencia y certificas cada despacho.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <LinkBtn href="/login" className="min-h-11 px-5">Probar la demo</LinkBtn>
              <LinkBtn href="/registro" variante="borde" className="min-h-11 px-5">Crear cuenta</LinkBtn>
            </div>
          </div>
        </section>

        <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-8 md:py-10">
          {/* Cómo funciona */}
          <Seccion titulo="Cómo funciona" descripcion="Cuatro pasos, desde el reporte del proveedor hasta el certificado.">
            <ol aria-label="Cómo funciona" className="grid divide-y divide-line overflow-hidden rounded-card border border-line bg-white shadow-card md:grid-cols-4 md:divide-x md:divide-y-0">
              {CICLO.map((c, k) => (
                <li key={c.t} className="flex gap-3 p-4">
                  <span aria-hidden="true" className="num grid size-7 shrink-0 place-items-center rounded-md bg-nav-700 text-sm font-semibold text-white">{k + 1}</span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-nav-900">{c.t}</h3>
                    <p className="mt-1 text-sm text-ink-700">{c.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Seccion>

          {/* Recorridos */}
          <Seccion titulo="Elige un recorrido" descripcion="Tres ejemplos de principio a fin.">
            <Tabs
              etiqueta="Recorrido"
              valor={sel}
              onChange={setSel}
              opciones={RECORRIDOS.map((r) => ({ valor: r.id, etiqueta: r.corto }))}
              className="mb-4"
            />
            <div className="rounded-card border border-line bg-white p-4 shadow-card md:p-5">
              <h3 className="mb-4 text-base font-semibold text-nav-900">{rec.titulo}</h3>
              <RecorridoIlustrado key={rec.id} pasos={rec.pasos} color={rec.color} titulo={rec.titulo} />
            </div>
          </Seccion>

          {/* Beneficios */}
          <Seccion titulo="Qué te da Swapit" descripcion="Una herramienta para acopiadores, no un marketplace.">
            <ul className="grid divide-y divide-line overflow-hidden rounded-card border border-line bg-white shadow-card md:grid-cols-3 md:divide-x md:divide-y-0">
              {BENEFICIOS.map((b) => (
                <li key={b.titulo} className="p-4 md:p-5">
                  <p className="num text-[28px] font-semibold leading-none text-nav-900">{b.cifra}</p>
                  <h3 className="mt-2 text-base font-semibold text-nav-900">{b.titulo}</h3>
                  <p className="mt-0.5 text-sm text-ink-700">{b.linea}</p>
                </li>
              ))}
            </ul>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
              {GARANTIAS.map((g) => (
                <li key={g} className="flex min-h-9 items-center gap-1.5 text-sm font-medium text-ink-900">
                  <Icono nombre="check" size={16} className="text-pri-600" />{g}
                </li>
              ))}
            </ul>
            <details className="mt-2 text-sm text-ink-700">
              <summary className="inline-flex min-h-10 cursor-pointer items-center font-semibold text-nav-700">Cómo se paga</summary>
              <p className="pb-2">Suscripción mensual y un costo por certificado. En esta demo, los precios y cobros son de ejemplo y simulados.</p>
            </details>
          </Seccion>

          {/* Cadenas */}
          <Seccion
            titulo="Cada residuo, varias vidas"
            descripcion="Qué residuos salen de cada proceso productivo y en qué se pueden convertir. Información libre."
            acciones={<Link href="/aprovechamiento" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-nav-700 hover:underline">Explorar cadenas <Icono nombre="flecha" size={16} /></Link>}
          >
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cadenas.map((c) => {
                const residuos = c.etapas.reduce((a, e) => a + e.residuos.length, 0);
                const nombre = c.id === "empaques-y-apoyo" ? "Empaques y apoyo" : c.nombre;
                return (
                  <li key={c.id}>
                    <Link href={`/aprovechamiento/cadena/${c.id}`} className="block h-full rounded-card border border-line bg-white p-4 shadow-card transition hover:border-nav-600">
                      <span className="flex items-center gap-1.5 text-xs text-ink-700">
                        <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${CLASE_SECTOR[c.sector].linea}`} />
                        {c.sector === "OTRO" ? "Todos los sectores" : (nombreSector(c.sector)?.split(" y ")[0] ?? "Varios sectores")}
                      </span>
                      <span className="mt-1.5 block text-base font-semibold text-nav-900">{nombre}</span>
                      <span className="num mt-1 block text-sm text-ink-500">{c.etapas.length} {c.etapas.length === 1 ? "etapa" : "etapas"} · {residuos} residuos</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-sm">
              <Link href="/aprovechamiento/mype" className="inline-flex min-h-10 items-center gap-1 font-semibold text-nav-700 hover:underline">
                Soy MYPE: ver usos a mi alcance <Icono nombre="flecha" size={16} />
              </Link>
            </p>
          </Seccion>
        </div>
      </main>

      <footer className="border-t border-line bg-white px-4 py-5 text-center text-sm text-ink-500">
        Prototipo; datos de ejemplo · SeedTech UDEP 2026
        <details className="mx-auto mt-1 max-w-xl text-xs">
          <summary className="inline-flex min-h-10 cursor-pointer items-center font-semibold text-nav-700">Ver aviso</summary>
          <p>Todos los datos de la demostración son ficticios; los rangos de precio son datos de ejemplo hasta cargar compras reales.</p>
        </details>
      </footer>
    </div>
  );
}
