"use client";

import { RequiereModo } from "@/components/ShellMarket";
import { sumaTotales, TablaOperaciones, useTransaccionesDelModo } from "@/components/Transacciones";
import { Cargando, KpiFranja, LinkBtn, PageHeader, Vacio } from "@/components/ui";
import { soles } from "@/lib/format";

/** Mis compras y pagos (modo comprador). */
export default function Compras() {
  return (
    <RequiereModo modo="comprador">
      <Contenido />
    </RequiereModo>
  );
}

function Contenido() {
  const items = useTransaccionesDelModo();
  if (!items) return <Cargando />;
  const cerradas = items.filter((t) => t.etapa === "CERRADA");
  const enCurso = items.filter((t) => t.etapa === "PROPUESTA" || t.etapa === "ACEPTADA");
  const porPagar = items.filter((t) => t.estado === "ACORDADO" && t.modalidad === "VENTA");

  return (
    <>
      <PageHeader titulo="Mis compras y pagos" sub="Lo que compraste, lo que está en curso y lo que falta pagar." />
      <KpiFranja
        className="mb-5"
        items={[
          { etiqueta: "Compras cerradas", valor: cerradas.length, nota: soles(sumaTotales(cerradas)) },
          { etiqueta: "En curso", valor: enCurso.length, nota: soles(sumaTotales(enCurso)) },
          { etiqueta: "Por pagar", valor: porPagar.length, nota: porPagar.length ? soles(sumaTotales(porPagar)) : "Nada pendiente", tono: porPagar.length ? "alerta" : "neutro" },
        ]}
      />
      {items.length === 0 ? (
        <Vacio titulo="Aún no tienes compras" texto="Cuando chatees con un vendedor y acuerden, la compra aparece aquí." accion={<LinkBtn href="/lotes">Ir al marketplace</LinkBtn>} />
      ) : (
        <TablaOperaciones items={items} comoVendedor={false} />
      )}
      <p className="mt-3 text-xs text-ink-500">El pago queda en garantía hasta que confirmas la entrega. En esta versión los pagos son simulados.</p>
    </>
  );
}
