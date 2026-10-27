import Link from "next/link";
import { Logo } from "./Logo";
import ToggleTema from "./ToggleTema";
import { Icono, type NombreIcono } from "./vis/Iconos";

// Frase principal: provisional (pendiente en docs/diseno/estructura-web.md §8).
const FRASE = "Lo que a ti te sobra, a alguien le sirve.";
const SUBFRASE = "Compra y vende cerca de ti, con fotos, precios claros y chat con quien publica.";

function BotonModo({ modo, titulo, texto, icono }: { modo: "comprador" | "vendedor"; titulo: string; texto: string; icono: NombreIcono }) {
  const vendedor = modo === "vendedor";
  return (
    <div className="flex flex-1 flex-col gap-2">
      <Link
        href={`/login?modo=${modo}`}
        className={`group flex min-h-24 items-center gap-4 rounded-2xl px-5 py-4 text-left shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-nav-600 ${vendedor ? "bg-nav-900 text-white" : "bg-pri-600 text-white"}`}
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white/15"><Icono nombre={icono} size={24} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold leading-tight">{titulo}</span>
          <span className="block text-sm text-white/80">{texto}</span>
        </span>
        <Icono nombre="flecha" size={20} className="shrink-0 transition group-hover:translate-x-1" />
      </Link>
      <Link href={`/registro?modo=${modo}`} className="inline-flex min-h-10 items-center justify-center text-sm text-ink-700 hover:text-nav-900">
        ¿Nuevo? <span className="ml-1 font-semibold text-nav-700 underline underline-offset-4">Crear cuenta de {modo}</span>
      </Link>
    </div>
  );
}

/** Pantalla de inicio (docs/diseno/estructura-web.md §2): una frase y dos botones, comprador y vendedor. */
export default function InicioMarket() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-50">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(16,185,129,0.18),transparent_70%)]" />
      <header className="relative">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Logo />
          <ToggleTema />
        </div>
      </header>
      <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-4 py-12">
        <div className="text-center">
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">{FRASE}</h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-zinc-600 sm:text-lg">{SUBFRASE}</p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row">
          <BotonModo modo="comprador" titulo="Ingresar como Comprador" texto="Busca, guarda y chatea" icono="usuario" />
          <BotonModo modo="vendedor" titulo="Ingresar como Vendedor" texto="Publica y vende" icono="tienda" />
        </div>
        <p className="text-center text-xs text-zinc-500">Una misma cuenta puede tener los dos modos: el segundo se activa desde tu Perfil.</p>
      </main>
    </div>
  );
}
