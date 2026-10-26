"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Logo } from "./Logo";
import ToggleTema from "./ToggleTema";
import { Cargando } from "./ui";
import { Icono, type NombreIcono } from "./vis/Iconos";

interface ItemNav {
  href: string;
  etiqueta: string;
  icono: NombreIcono;
  /** Rutas que no están en el menú pero pertenecen a esta sección (para marcarla como activa). */
  tambien?: string[];
}

// Intercambio entre empresas (modo MARKETPLACE): 4 opciones. Créditos, alertas y cumplimiento se alcanzan desde «Mi actividad».
const NAV: ItemNav[] = [
  { href: "/lotes", etiqueta: "Explorar", icono: "buscar", tambien: ["/mapa"] },
  { href: "/lotes/nuevo", etiqueta: "Publicar", icono: "mas" },
  { href: "/transacciones", etiqueta: "Mi actividad", icono: "acuerdos", tambien: ["/creditos", "/matching", "/cumplimiento", "/panel"] },
  { href: "/perfil", etiqueta: "Mi empresa", icono: "empresa" },
];

// Swapit para intermediarios (modo B2B2B, por defecto): su red de proveedores, precios de referencia y certificados.
const NAV_B2B: ItemNav[] = [
  { href: "/panel", etiqueta: "Panel", icono: "inicio" },
  { href: "/red", etiqueta: "Mi red", icono: "red" },
  { href: "/material", etiqueta: "Material", icono: "material" },
  { href: "/acuerdos", etiqueta: "Acuerdos", icono: "acuerdos" },
  { href: "/destinos", etiqueta: "Destinos", icono: "destinos" },
  { href: "/benchmark", etiqueta: "Precios", icono: "precio" },
  { href: "/aprovechamiento", etiqueta: "Aprovechamiento", icono: "aprovechamiento" },
  { href: "/certificados", etiqueta: "Certificados", icono: "certificado" },
  { href: "/facturacion", etiqueta: "Facturación", icono: "facturacion" },
  { href: "/perfil", etiqueta: "Mi empresa", icono: "empresa" },
];
/** Lo que va en la barra inferior del celular; el resto queda en «Más». */
const PRINCIPALES_MOVIL = ["/panel", "/red", "/material", "/acuerdos"];

/** Pantallas del marketplace anterior: en modo B2B2B no existen y se vuelve al panel. */
const RUTAS_MARKETPLACE = ["/lotes", "/mapa", "/matching", "/creditos", "/transacciones", "/cumplimiento"];

export { Logo };

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useSession();
  const path = usePathname();
  const router = useRouter();
  const [pendientes, setPendientes] = useState(0);
  const [masAbierto, setMasAbierto] = useState(false);
  useEffect(() => setMasAbierto(false), [path]);

  useEffect(() => {
    // Las transacciones P2P solo existen en modo marketplace.
    if (!user || user.modo === "B2B2B") return;
    api<{ requiereMiAccion: boolean }[]>("/transacciones")
      .then((t) => setPendientes(t.filter((x) => x.requiereMiAccion).length))
      .catch(() => undefined);
  }, [user, path]);

  const b2b = user?.modo === "B2B2B";
  const enRutaMarketplace = RUTAS_MARKETPLACE.some((r) => path === r || path.startsWith(r + "/"));
  useEffect(() => {
    if (b2b && enRutaMarketplace) router.replace("/panel");
  }, [b2b, enRutaMarketplace, router]);

  if (loading || !user) return <Cargando />;
  if (b2b && enRutaMarketplace) return <Cargando />;
  const base: ItemNav[] = b2b ? NAV_B2B : NAV;
  const items: ItemNav[] = user.rol === "ADMIN" && !b2b ? [...base, { href: "/admin", etiqueta: "Moderación", icono: "candado" }] : base;
  const estaActivo = (href: string) => {
    const n = items.find((x) => x.href === href);
    // «Explorar» no se marca al publicar: «Publicar» cuelga de /lotes/nuevo.
    if (href === "/lotes" && (path === "/lotes/nuevo" || path.startsWith("/lotes/nuevo/"))) return false;
    return path === href || path.startsWith(href + "/") || !!n?.tambien?.some((r) => path === r || path.startsWith(r + "/"));
  };
  const principales = b2b ? items.filter((n) => PRINCIPALES_MOVIL.includes(n.href)) : items.slice(0, 4);
  const secundarios = items.filter((n) => !principales.includes(n));
  const hayActivoEnMas = secundarios.some((n) => estaActivo(n.href));

  // Migas: sección activa + (si la ruta es más profunda que el ítem del menú) el nivel de detalle.
  const seccion = items.find((n) => estaActivo(n.href));
  const detalle = seccion && path !== seccion.href && !seccion.tambien?.includes(path) ? (path.endsWith("/nuevo") ? "Nuevo" : "Detalle") : null;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-white/5 bg-zinc-950 text-white md:sticky md:top-0 md:flex md:h-screen">
        <div className="px-5 py-5"><Logo claro /></div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3" aria-label="Menú principal">
          {items.map((n) => {
            const activo = estaActivo(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={activo ? "page" : undefined}
                className={`flex min-h-10 items-center gap-3 rounded-control border-l-2 px-3 py-2 text-sm font-medium transition ${activo ? "border-emerald-400 bg-white/10 text-white shadow-[0_1px_0_rgba(255,255,255,0.06)_inset]" : "border-transparent text-zinc-400 hover:bg-white/5 hover:text-white"}`}
              >
                <Icono nombre={n.icono} size={18} />
                <span className="flex-1">{n.etiqueta}</span>
                {n.href === "/transacciones" && pendientes > 0 && <span className="num rounded-md bg-ambar-100 px-1.5 text-xs font-semibold text-ambar-800">{pendientes}</span>}
              </Link>
            );
          })}
          {!b2b && (
            <Link href="/impacto" className="mt-3 flex min-h-10 items-center gap-3 rounded-control border-l-2 border-transparent px-3 py-2 text-sm text-nav-300 hover:bg-nav-800 hover:text-white">
              <Icono nombre="hoja" size={18} /> Impacto (público)
            </Link>
          )}
        </nav>
        <div className="border-t border-white/10 px-5 py-4 text-sm">
          <div className="truncate font-semibold">{user.empresa.razonSocial}</div>
          <div className="truncate text-xs text-zinc-400">{user.nombre}</div>
          <button onClick={logout} className="mt-2 text-xs font-medium text-zinc-400 underline-offset-2 hover:text-white hover:underline">Cerrar sesión</button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Cabecera de escritorio con migas */}
        <header className="sticky top-0 z-30 hidden h-14 items-center justify-between gap-4 border-b border-zinc-200/70 bg-white/70 px-6 backdrop-blur-xl md:flex lg:px-8">
          <nav aria-label="Migas" className="flex min-w-0 items-center gap-2 text-sm text-ink-500">
            <span className="truncate">{user.empresa.razonSocial}</span>
            {seccion && (
              <>
                <span aria-hidden="true">›</span>
                {detalle ? <Link href={seccion.href} className="text-nav-700 hover:underline">{seccion.etiqueta}</Link> : <span className="font-semibold text-nav-900">{seccion.etiqueta}</span>}
              </>
            )}
            {detalle && (
              <>
                <span aria-hidden="true">›</span>
                <span className="font-semibold text-nav-900">{detalle}</span>
              </>
            )}
          </nav>
          <span className="flex shrink-0 items-center gap-3 text-sm text-ink-500">{user.nombre}<ToggleTema /></span>
        </header>

        {/* Cabecera móvil */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200/70 bg-white/70 px-4 backdrop-blur-xl md:hidden">
          <Logo tamano={28} />
          <span className="flex items-center gap-1"><ToggleTema /><button onClick={logout} className="min-h-10 rounded-control px-2 text-sm font-medium text-nav-700">Salir</button></span>
        </header>

        <main className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 md:pb-10 md:pt-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      {masAbierto && (
        <div className="fixed inset-0 z-40 bg-nav-950/60 md:hidden" onClick={() => setMasAbierto(false)}>
          <div className="absolute inset-x-0 bottom-16 rounded-t-card border-t border-line bg-white p-3" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-3 gap-2">
              {secundarios.map((n) => (
                <Link key={n.href} href={n.href} className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-control p-2 text-center text-xs font-medium ${estaActivo(n.href) ? "bg-pri-50 text-pri-700" : "bg-surface-2 text-ink-700"}`}>
                  <Icono nombre={n.icono} size={20} />
                  {n.etiqueta}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-zinc-200/70 bg-white/80 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label="Menú principal">
        {principales.map((n) => {
          const activo = estaActivo(n.href);
          return (
            <Link key={n.href} href={n.href} aria-current={activo ? "page" : undefined} className={`relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] ${activo ? "font-semibold text-pri-700" : "font-medium text-ink-500"}`}>
              {activo && <span aria-hidden="true" className="absolute inset-x-4 top-0 h-0.5 rounded-b bg-pri-600" />}
              <Icono nombre={n.icono} size={22} />
              {n.etiqueta}
              {n.href === "/transacciones" && pendientes > 0 && <span className="num absolute right-3 top-2 rounded-md bg-ambar-100 px-1.5 text-[10px] font-semibold text-ambar-800">{pendientes}</span>}
            </Link>
          );
        })}
        {secundarios.length > 0 && (
          <button onClick={() => setMasAbierto((v) => !v)} aria-expanded={masAbierto} className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] ${hayActivoEnMas || masAbierto ? "font-semibold text-pri-700" : "font-medium text-ink-500"}`}>
            <Icono nombre="menu" size={22} />
            Más
          </button>
        )}
      </nav>
    </div>
  );
}
