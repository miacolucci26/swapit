"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ModoUso } from "@/lib/modoUso";
import { Icono, type NombreIcono } from "./vis/Iconos";

interface Opcion { href: string; etiqueta: string; icono: NombreIcono; aviso?: number }

/** Opciones de la bolita según el modo (docs/diseno/estructura-web.md §5). */
export function opcionesBolita(modo: ModoUso, chatsPendientes: number, admin: boolean): Opcion[] {
  const chats: Opcion = { href: "/chats", etiqueta: "Chats", icono: "chat", aviso: chatsPendientes };
  const base: Opcion[] =
    modo === "comprador"
      ? [
          { href: "/perfil", etiqueta: "Perfil", icono: "usuario" },
          { href: "/compras", etiqueta: "Mis compras y pagos", icono: "documento" },
          { href: "/favoritos", etiqueta: "Favoritos", icono: "corazon" },
          chats,
        ]
      : [
          { href: "/perfil", etiqueta: "Perfil", icono: "usuario" },
          { href: "/mis-productos", etiqueta: "Mis productos", icono: "caja" },
          { href: "/finanzas", etiqueta: "Finanzas", icono: "documento" },
          chats,
        ];
  return admin ? [...base, { href: "/admin", etiqueta: "Moderación", icono: "candado" }] : base;
}

/**
 * La bolita con la tiendita: al presionarla se despliegan hacia abajo más bolitas con íconos.
 * Cada una lleva su etiqueta al pasar el cursor (en pantallas táctiles se ve siempre que el menú está abierto).
 */
export default function MenuBolita({ opciones }: { opciones: Opcion[] }) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const path = usePathname();
  useEffect(() => setAbierto(false), [path]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  const avisos = opciones.reduce((a, o) => a + (o.aviso ?? 0), 0);

  return (
    <div ref={caja} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-controls="menu-bolita"
        aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
        title="Menú"
        className={`relative grid size-12 place-items-center rounded-full text-white shadow-lg ring-4 ring-white transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nav-600 ${abierto ? "rotate-12 bg-nav-900" : "bg-pri-600 hover:bg-pri-700"}`}
      >
        <Icono nombre={abierto ? "cerrar" : "tienda"} size={22} />
        {!abierto && avisos > 0 && (
          <span className="num absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-error px-1 text-[11px] font-semibold text-white ring-2 ring-white">{avisos}</span>
        )}
      </button>

      <nav id="menu-bolita" aria-label="Menú" className={`absolute right-0 top-full z-50 pt-3 ${abierto ? "" : "pointer-events-none"}`}>
        <ul className="flex flex-col items-end gap-3">
          {opciones.map((o, i) => {
            const activo = path === o.href || path.startsWith(o.href + "/");
            return (
              <li
                key={o.href}
                className={`transition duration-200 ease-out motion-reduce:transition-none ${abierto ? "translate-y-0 scale-100 opacity-100" : "-translate-y-3 scale-75 opacity-0"}`}
                style={{ transitionDelay: abierto ? `${i * 40}ms` : "0ms" }}
              >
                <Link
                  href={o.href}
                  tabIndex={abierto ? 0 : -1}
                  aria-current={activo ? "page" : undefined}
                  className="group/op flex items-center gap-2 focus-visible:outline-none"
                >
                  <span className="pointer-events-none whitespace-nowrap rounded-lg bg-nav-900 px-2.5 py-1 text-xs font-semibold text-white opacity-0 shadow-md transition group-hover/op:opacity-100 group-focus-visible/op:opacity-100 [@media(hover:none)]:opacity-100">
                    {o.etiqueta}
                  </span>
                  <span
                    className={`relative grid size-11 shrink-0 place-items-center rounded-full shadow-md ring-1 transition group-hover/op:scale-110 group-focus-visible/op:outline-2 group-focus-visible/op:outline-offset-2 group-focus-visible/op:outline-nav-600 ${activo ? "bg-nav-900 text-white ring-nav-900" : "bg-white text-nav-800 ring-black/10"}`}
                  >
                    <Icono nombre={o.icono} size={20} />
                    {!!o.aviso && (
                      <span className="num absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-error px-1 text-[11px] font-semibold text-white ring-2 ring-white">{o.aviso}</span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
