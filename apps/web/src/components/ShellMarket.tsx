"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BusquedaProvider, useBusqueda } from "@/lib/busqueda";
import { ETIQUETA_MODO, otroModo, type ModoUso } from "@/lib/modoUso";
import { useSession } from "@/lib/session";
import type { TransaccionItem } from "@/lib/types";
import { Logo } from "./Logo";
import MenuBolita, { opcionesBolita } from "./MenuBolita";
import ToggleTema from "./ToggleTema";
import { Btn, LinkBtn } from "./ui";
import { Icono } from "./vis/Iconos";

/** Rol de la transacción que corresponde a cada modo: el comprador recibe, el vendedor ofrece. */
export const ROL_DE_MODO: Record<ModoUso, TransaccionItem["rol"]> = { comprador: "RECEPTOR", vendedor: "OFERTANTE" };

function Buscador({ className = "" }: { className?: string }) {
  const { q, setQ } = useBusqueda();
  const path = usePathname();
  const router = useRouter();
  return (
    <form
      role="search"
      className={`relative min-w-0 ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (path !== "/lotes") router.push("/lotes");
      }}
    >
      <Icono nombre="buscar" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar productos…"
        aria-label="Buscar productos"
        className="min-h-11 w-full rounded-full border border-ink-300 bg-white pl-10 pr-4 text-base outline-none transition placeholder:text-ink-400 focus:border-nav-600 focus:ring-2 focus:ring-nav-100 md:text-[15px]"
      />
    </form>
  );
}

/** Chip con el modo actual; si la cuenta tiene los dos, cambia de modo con un toque. */
function ChipModo() {
  const { modoUso, modos, cambiarModo } = useSession();
  const router = useRouter();
  const otro = otroModo(modoUso);
  const puede = modos.includes(otro);
  return (
    <button
      type="button"
      onClick={() => {
        if (puede) {
          cambiarModo(otro);
          router.push("/lotes");
        } else router.push(`/perfil?activar=${otro}`);
      }}
      title={puede ? `Cambiar a modo ${ETIQUETA_MODO[otro].toLowerCase()}` : `Registrarme como ${ETIQUETA_MODO[otro].toLowerCase()}`}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-zinc-200/80 bg-white/70 px-3 text-xs font-semibold text-zinc-800 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset] backdrop-blur-xl transition hover:bg-zinc-100"
    >
      <span aria-hidden="true" className={`size-2 rounded-full ${modoUso === "vendedor" ? "bg-amber-500" : "bg-emerald-500"}`} />
      {ETIQUETA_MODO[modoUso]}
      <span className="sr-only">. {puede ? `Cambiar a modo ${ETIQUETA_MODO[otro].toLowerCase()}` : `Registrarme como ${ETIQUETA_MODO[otro].toLowerCase()}`}</span>
    </button>
  );
}

/**
 * Estructura del marketplace (docs/diseno/estructura-web.md): barra superior con logo, buscador,
 * «Publicar» (solo vendedor) y la bolita del menú. Sin barra lateral.
 */
export default function ShellMarket({ children }: { children: React.ReactNode }) {
  return (
    <BusquedaProvider>
      <Estructura>{children}</Estructura>
    </BusquedaProvider>
  );
}

function Estructura({ children }: { children: React.ReactNode }) {
  const { user, modoUso } = useSession();
  const path = usePathname();
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    api<TransaccionItem[]>("/transacciones")
      .then((t) => setPendientes(t.filter((x) => x.requiereMiAccion && x.rol === ROL_DE_MODO[modoUso]).length))
      .catch(() => undefined);
  }, [path, modoUso]);

  const vendedor = modoUso === "vendedor";
  const opciones = opcionesBolita(modoUso, pendientes, user?.rol === "ADMIN");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6 lg:px-8">
          <Link href="/lotes" aria-label="Ir al marketplace" className="shrink-0"><Logo tamano={30} enlace={false} /></Link>
          <Buscador className="order-last w-full sm:order-none sm:w-auto sm:flex-1" />
          {vendedor && (
            <LinkBtn href="/publicar" className="shrink-0 rounded-full max-sm:ml-auto max-sm:min-h-9 max-sm:px-3">
              <Icono nombre="mas" size={16} />Publicar
            </LinkBtn>
          )}
          <span className={`flex shrink-0 items-center gap-2 ${vendedor ? "" : "max-sm:ml-auto"}`}>
            <ChipModo />
            <span className="max-sm:hidden"><ToggleTema /></span>
            <MenuBolita opciones={opciones} />
          </span>
        </div>
      </header>
      <main className="min-w-0 flex-1 px-4 pb-16 pt-5 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}

/** Pantalla que pertenece a un solo modo: si se está en el otro, se ofrece cambiar o registrarse en él. */
export function RequiereModo({ modo, children }: { modo: ModoUso; children: React.ReactNode }) {
  const { modoUso, modos, cambiarModo } = useSession();
  if (modoUso === modo) return <>{children}</>;
  const tiene = modos.includes(modo);
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-zinc-200/80 bg-white/80 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_-8px_rgba(24,24,27,0.10)] backdrop-blur-xl p-6 text-center">
      <Icono nombre={modo === "vendedor" ? "tienda" : "usuario"} size={28} className="mx-auto text-nav-700" />
      <h1 className="mt-2 text-lg font-semibold text-nav-900">Esta sección es del modo {ETIQUETA_MODO[modo].toLowerCase()}</h1>
      <p className="mt-1 text-sm text-ink-500">
        {tiene ? `Estás navegando como ${ETIQUETA_MODO[modoUso].toLowerCase()}.` : `Tu cuenta aún no tiene el modo ${ETIQUETA_MODO[modo].toLowerCase()}. Actívalo con los datos que faltan; no se repite el registro.`}
      </p>
      <div className="mt-4 flex justify-center">
        {tiene ? (
          <Btn onClick={() => cambiarModo(modo)}>Cambiar a modo {ETIQUETA_MODO[modo].toLowerCase()}</Btn>
        ) : (
          <LinkBtn href={`/perfil?activar=${modo}`}>Registrarme como {ETIQUETA_MODO[modo].toLowerCase()}</LinkBtn>
        )}
      </div>
    </div>
  );
}
