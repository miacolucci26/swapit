"use client";

import Link from "next/link";
import { useState } from "react";
import { CADENAS, nombreSector, residuoPorId, vidasParaMype } from "@swapit/shared";
import { Segmented, Seccion } from "./ui";
import { CLASE_SECTOR } from "./vis/CadenaFlujo";
import { Icono } from "./vis/Iconos";
import HeroDiaNoche from "./vis/HeroDiaNoche";
import { BarraRango, MensajeWhatsApp, SUPERFICIE, TarjetaCertificado, VistaPreviaProducto } from "./vis/PremiumVisuals";
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

/** Bento: cada tarjeta muestra la función con una ilustración en CSS/SVG. */
const BENTO = [
  { titulo: "Reportes por WhatsApp", linea: "0 cuentas que crear a tus proveedores.", escena: "whatsapp" },
  { titulo: "Precio de referencia", linea: "Sabes si tu oferta es justa.", escena: "rango" },
  { titulo: "Certificado con tu logo", linea: "Tu cliente lo verifica en segundos.", escena: "certificado" },
] as const;

function EscenaBento({ escena }: { escena: (typeof BENTO)[number]["escena"] }) {
  if (escena === "whatsapp") return <MensajeWhatsApp compacto />;
  if (escena === "rango") {
    return (
      <div className="flex flex-col gap-3">
        <p className="font-mono text-2xl font-semibold tracking-tight tabular-nums text-zinc-900">S/ 4,50<span className="ml-1 text-xs font-normal text-zinc-500">/ kg</span></p>
        <BarraRango />
      </div>
    );
  }
  return <TarjetaCertificado />;
}

/** Sector → color del borde al pasar el cursor (clases literales para que Tailwind las incluya). */
const HOVER_SECTOR: Record<string, string> = {
  AGRO: "hover:border-emerald-400/70 hover:shadow-[0_8px_30px_-12px_rgba(16,185,129,0.45)]",
  AGROINDUSTRIA: "hover:border-emerald-400/70 hover:shadow-[0_8px_30px_-12px_rgba(16,185,129,0.45)]",
  PESCA: "hover:border-sky-400/70 hover:shadow-[0_8px_30px_-12px_rgba(14,165,233,0.45)]",
  TEXTIL: "hover:border-fuchsia-400/70 hover:shadow-[0_8px_30px_-12px_rgba(192,38,211,0.35)]",
  MANUFACTURA: "hover:border-amber-400/70 hover:shadow-[0_8px_30px_-12px_rgba(245,158,11,0.40)]",
  SERVICIOS: "hover:border-indigo-400/70 hover:shadow-[0_8px_30px_-12px_rgba(99,102,241,0.40)]",
  OTRO: "hover:border-zinc-400/80 hover:shadow-[0_8px_30px_-12px_rgba(24,24,27,0.30)]",
};

const GARANTIAS = ["Tus clientes son solo tuyos", "Sin comisión por operación", "Tus precios no se comparten"];

/** Portada del modo B2B2B: Swapit como herramienta para acopiadores y agregadores regionales (no un marketplace). */
export default function LandingB2B() {
  const [sel, setSel] = useState(RECORRIDOS[0].id);
  const rec = RECORRIDOS.find((r) => r.id === sel) ?? RECORRIDOS[0];
  const cadenas = IDS_CADENAS.map((id) => CADENAS.find((c) => c.id === id)).filter((c) => c !== undefined);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <main className="flex-1">
        <HeroDiaNoche />
        <section className="relative z-20 -mt-16 px-4 pb-4">
          <VistaPreviaProducto />
        </section>

        <div className="mx-auto flex max-w-5xl flex-col gap-16 px-4 pb-12 pt-16 md:pb-16 md:pt-20">
          {/* Cómo funciona */}
          <Seccion id="como-funciona" titulo="Cómo funciona" descripcion="Cuatro pasos, desde el reporte del proveedor hasta el certificado.">
            <ol aria-label="Cómo funciona" className="relative grid gap-3 md:grid-cols-4">
              <div aria-hidden="true" className="absolute left-[12%] right-[12%] top-[30px] hidden h-px bg-gradient-to-r from-transparent via-zinc-300 to-transparent md:block" />
              {CICLO.map((c, k) => (
                <li key={c.t} className={`${SUPERFICIE} flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:border-zinc-300`}>
                  <span aria-hidden="true" className="relative z-10 w-fit rounded-md border border-emerald-600/20 bg-emerald-50 px-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-emerald-700">{String(k + 1).padStart(2, "0")}</span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold tracking-tight text-zinc-900">{c.t}</h3>
                    <p className="mt-1 text-sm text-zinc-600">{c.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Seccion>

          {/* Recorridos */}
          <Seccion titulo="Elige un recorrido" descripcion="Tres ejemplos de principio a fin.">
            <Segmented
              etiqueta="Recorrido"
              valor={sel}
              onChange={setSel}
              opciones={RECORRIDOS.map((r) => ({ valor: r.id, etiqueta: r.corto }))}
              className="mb-4"
            />
            <div className={`${SUPERFICIE} p-4 md:p-6`}>
              <h3 className="mb-4 text-base font-semibold tracking-tight text-zinc-900">{rec.titulo}</h3>
              <RecorridoIlustrado key={rec.id} pasos={rec.pasos} color={rec.color} titulo={rec.titulo} />
            </div>
          </Seccion>

          {/* Beneficios */}
          <Seccion id="beneficios" titulo="Qué te da Swapit" descripcion="Una herramienta para acopiadores, no un marketplace.">
            <ul className="grid gap-3 md:grid-cols-3">
              {BENTO.map((b) => (
                <li key={b.titulo} className={`${SUPERFICIE} flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:border-zinc-300`}>
                  <div aria-hidden="true" className="min-h-[148px] border-b border-zinc-200/70 bg-gradient-to-b from-zinc-50 to-white p-4">
                    <EscenaBento escena={b.escena} />
                  </div>
                  <div className="p-4">
                    <h3 className="text-base font-semibold tracking-tight text-zinc-900">{b.titulo}</h3>
                    <p className="mt-0.5 text-sm text-zinc-600">{b.linea}</p>
                  </div>
                </li>
              ))}
            </ul>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
              {GARANTIAS.map((g) => (
                <li key={g} className="flex min-h-9 items-center gap-1.5 text-sm font-medium text-zinc-900">
                  <Icono nombre="check" size={16} className="text-emerald-600" />{g}
                </li>
              ))}
            </ul>
            <details className="mt-2 text-sm text-zinc-600">
              <summary className="inline-flex min-h-10 cursor-pointer items-center font-semibold text-zinc-900">Cómo se paga</summary>
              <p className="pb-2">Suscripción mensual y un costo por certificado. En esta demo, los precios y cobros son de ejemplo y simulados.</p>
            </details>
          </Seccion>

          {/* Cadenas */}
          <Seccion
            titulo="Cada residuo, varias vidas"
            descripcion="Qué residuos salen de cada proceso productivo y en qué se pueden convertir. Información libre."
            acciones={<Link href="/aprovechamiento" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline">Explorar cadenas <Icono nombre="flecha" size={16} /></Link>}
          >
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cadenas.map((c) => {
                const residuos = c.etapas.reduce((a, e) => a + e.residuos.length, 0);
                const nombre = c.id === "empaques-y-apoyo" ? "Empaques y apoyo" : c.nombre;
                return (
                  <li key={c.id}>
                    <Link href={`/aprovechamiento/cadena/${c.id}`} className={`${SUPERFICIE} group block h-full p-4 transition duration-200 hover:-translate-y-1 ${HOVER_SECTOR[c.sector] ?? HOVER_SECTOR.OTRO}`}>
                      <span className="flex items-center gap-1.5 text-xs text-zinc-600">
                        <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${CLASE_SECTOR[c.sector].linea}`} />
                        {c.sector === "OTRO" ? "Todos los sectores" : (nombreSector(c.sector)?.split(" y ")[0] ?? "Varios sectores")}
                      </span>
                      <span className="mt-1.5 flex items-start justify-between gap-2 text-base font-semibold tracking-tight text-zinc-900">
                        {nombre}
                        <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-zinc-100 text-sm text-zinc-500 transition group-hover:bg-zinc-900 group-hover:text-white">↗</span>
                      </span>
                      <span className="mt-1 block font-mono text-sm tabular-nums text-zinc-500">{c.etapas.length} {c.etapas.length === 1 ? "etapa" : "etapas"} · {residuos} residuos</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-sm">
              <Link href="/aprovechamiento/mype" className="inline-flex min-h-10 items-center gap-1 font-semibold text-emerald-700 hover:underline">
                Soy MYPE: ver usos a mi alcance <Icono nombre="flecha" size={16} />
              </Link>
            </p>
          </Seccion>
        </div>
      </main>

      <footer className="border-t border-zinc-200/80 bg-white px-4 py-5 text-center text-sm text-zinc-500">
        Prototipo; datos de ejemplo · SeedTech UDEP 2026
        <details className="mx-auto mt-1 max-w-xl text-xs">
          <summary className="inline-flex min-h-10 cursor-pointer items-center font-semibold text-zinc-900">Ver aviso</summary>
          <p>Todos los datos de la demostración son ficticios; los rangos de precio son datos de ejemplo hasta cargar compras reales.</p>
        </details>
      </footer>
    </div>
  );
}
