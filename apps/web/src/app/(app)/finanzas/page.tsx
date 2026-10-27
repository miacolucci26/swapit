"use client";

import { RequiereModo } from "@/components/ShellMarket";
import { sumaTotales, TablaOperaciones, useTransaccionesDelModo } from "@/components/Transacciones";
import { Cargando, KpiFranja, LinkBtn, PageHeader, Vacio } from "@/components/ui";
import { Icono } from "@/components/vis/Iconos";
import { soles } from "@/lib/format";
import { useSession } from "@/lib/session";

const METODO: Record<string, string> = { YAPE: "Yape", PLIN: "Plin", TRANSFERENCIA: "Transferencia bancaria" };

/** Muestra solo los últimos 4 caracteres de la cuenta de cobro. */
const enmascarar = (c: string) => (c.length <= 4 ? c : `•••• ${c.slice(-4)}`);

/** Finanzas (modo vendedor): ventas, ingresos y cobros. */
export default function Finanzas() {
  return (
    <RequiereModo modo="vendedor">
      <Contenido />
    </RequiereModo>
  );
}

function Contenido() {
  const { user } = useSession();
  const items = useTransaccionesDelModo();
  if (!items) return <Cargando />;
  const cerradas = items.filter((t) => t.etapa === "CERRADA");
  const porCobrar = items.filter((t) => t.etapa === "ACEPTADA");
  const negociando = items.filter((t) => t.etapa === "PROPUESTA");
  const e = user?.empresa;

  return (
    <>
      <PageHeader titulo="Finanzas" sub="Tus ventas, lo que ya ingresó y lo que está por cobrar." />
      <KpiFranja
        className="mb-5"
        items={[
          { etiqueta: "Ingresos", valor: soles(sumaTotales(cerradas)), nota: `${cerradas.length} ${cerradas.length === 1 ? "venta cerrada" : "ventas cerradas"}`, tono: "ok" },
          { etiqueta: "Por cobrar", valor: soles(sumaTotales(porCobrar)), nota: `${porCobrar.length} con acuerdo`, tono: porCobrar.length ? "alerta" : "neutro" },
          { etiqueta: "En conversación", valor: negociando.length, nota: soles(sumaTotales(negociando)) },
        ]}
      />

      <section className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white/80 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_-8px_rgba(24,24,27,0.10)] backdrop-blur-xl p-4">
        <Icono nombre="dinero" size={22} className="text-pri-700" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-nav-900">Dónde cobras</h2>
          {e?.cobroMetodo ? (
            <p className="text-sm text-ink-700">{METODO[e.cobroMetodo] ?? e.cobroMetodo} · <span className="num">{enmascarar(e.cobroCuenta ?? "")}</span>{e.nombreTienda ? ` · ${e.nombreTienda}` : ""}</p>
          ) : (
            <p className="text-sm text-ink-500">Aún no registras un medio de cobro.</p>
          )}
        </div>
        <LinkBtn href="/perfil" variante="borde">Cambiar en Perfil</LinkBtn>
      </section>

      <h2 className="mb-2 text-base font-semibold text-nav-900">Ventas</h2>
      {items.length === 0 ? (
        <Vacio titulo="Aún no tienes ventas" texto="Cuando un comprador te escriba y acuerden, la venta aparece aquí." accion={<LinkBtn href="/publicar">Publicar</LinkBtn>} />
      ) : (
        <TablaOperaciones items={items} comoVendedor />
      )}
      <p className="mt-3 text-xs text-ink-500">El pago del comprador queda en garantía y se libera cuando confirma la entrega. En esta versión los cobros son simulados.</p>
    </>
  );
}
