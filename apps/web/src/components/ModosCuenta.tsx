"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MetodoCobro } from "@swapit/shared";
import { api, ApiError } from "@/lib/api";
import { ETIQUETA_MODO, esModoUso, type ModoUso } from "@/lib/modoUso";
import { useSession } from "@/lib/session";
import { Badge, Btn, Field, inputCls } from "./ui";
import { Icono } from "./vis/Iconos";

const METODO: Record<string, string> = { YAPE: "Yape", PLIN: "Plin", TRANSFERENCIA: "Transferencia bancaria" };

/** Campos de la tienda (registro, activación del modo vendedor y edición). */
export function CamposTienda({ valores }: { valores?: { nombre?: string | null; cobroMetodo?: string | null; cobroCuenta?: string | null } }) {
  return (
    <>
      <Field label="Nombre de tu tienda" hint="Es el nombre que verán los compradores.">
        <input name="tiendaNombre" required minLength={3} maxLength={80} defaultValue={valores?.nombre ?? ""} className={inputCls} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Cómo cobras">
          <select name="cobroMetodo" defaultValue={valores?.cobroMetodo ?? "YAPE"} className={inputCls}>
            {MetodoCobro.map((m) => <option key={m} value={m}>{METODO[m]}</option>)}
          </select>
        </Field>
        <Field label="Número o cuenta" hint="Celular de Yape/Plin o número de cuenta (CCI).">
          <input name="cobroCuenta" required minLength={6} maxLength={40} defaultValue={valores?.cobroCuenta ?? ""} className={inputCls} />
        </Field>
      </div>
    </>
  );
}

/** Lee los campos de `CamposTienda` de un formulario. */
export const tiendaDeForm = (f: FormData) => ({
  nombre: String(f.get("tiendaNombre") ?? "").trim(),
  cobroMetodo: String(f.get("cobroMetodo") ?? ""),
  cobroCuenta: String(f.get("cobroCuenta") ?? "").trim(),
});

const errorDe = (e: unknown) => (e instanceof ApiError ? (e.errores?.[0]?.mensaje ?? e.message) : "No se pudo conectar con el servidor");

/**
 * Perfil del marketplace: quién eres, con qué modo navegas y los modos de la cuenta.
 * Desde aquí se activa el otro modo («Registrarme como vendedor / comprador») sin repetir el registro.
 */
export default function ModosCuenta() {
  const { user, modoUso, modos, cambiarModo, refresh, logout } = useSession();
  const router = useRouter();
  const [activar, setActivar] = useState<ModoUso | null>(null);
  const [formVendedor, setFormVendedor] = useState(false);
  const [editTienda, setEditTienda] = useState(false);
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const caja = useRef<HTMLElement>(null);

  // /perfil?activar=vendedor llega desde el ingreso, la bolita o una pantalla del otro modo.
  useEffect(() => {
    const a = new URLSearchParams(window.location.search).get("activar");
    if (esModoUso(a) && !modos.includes(a)) {
      setActivar(a);
      if (a === "vendedor") setFormVendedor(true);
      caja.current?.scrollIntoView({ block: "start" });
    }
  }, [modos]);

  if (!user) return null;
  const e = user.empresa;

  async function activarModo(modo: ModoUso, f?: FormData) {
    setEnviando(true);
    setError("");
    try {
      await api("/empresas/mi/activar-modo", {
        method: "POST",
        json: modo === "vendedor" ? { modo: "VENDEDOR", tienda: tiendaDeForm(f!) } : { modo: "COMPRADOR" },
      });
      await refresh();
      cambiarModo(modo);
      setFormVendedor(false);
      setActivar(null);
      setAviso(`Listo: ya tienes el modo ${ETIQUETA_MODO[modo].toLowerCase()} y estás navegando con él.`);
      router.replace("/perfil");
    } catch (err) {
      setError(errorDe(err));
    } finally {
      setEnviando(false);
    }
  }

  async function guardarTienda(f: FormData) {
    setEnviando(true);
    setError("");
    try {
      await api("/empresas/mi", { method: "PATCH", json: { tienda: tiendaDeForm(f) } });
      await refresh();
      setEditTienda(false);
      setAviso("Datos de tu tienda actualizados.");
    } catch (err) {
      setError(errorDe(err));
    } finally {
      setEnviando(false);
    }
  }

  const tarjeta = (modo: ModoUso) => {
    const tiene = modos.includes(modo);
    const actual = modoUso === modo;
    return (
      <div className={`flex flex-col gap-3 rounded-card border bg-white p-4 shadow-card ${actual ? "border-nav-600" : "border-line"}`}>
        <div className="flex items-center gap-2">
          <Icono nombre={modo === "vendedor" ? "tienda" : "usuario"} size={20} className="text-nav-700" />
          <h3 className="flex-1 font-semibold text-nav-900">Modo {ETIQUETA_MODO[modo].toLowerCase()}</h3>
          {tiene ? <Badge tono={actual ? "azul" : "verde"}>{actual ? "Usándolo ahora" : "Activo"}</Badge> : <Badge tono="gris">Sin activar</Badge>}
        </div>

        {modo === "vendedor" && tiene && !editTienda && (
          <p className="text-sm text-ink-700">
            {e.nombreTienda ? <><b className="font-semibold">{e.nombreTienda}</b> · </> : null}
            {e.cobroMetodo ? `Cobras por ${METODO[e.cobroMetodo] ?? e.cobroMetodo}` : "Sin medio de cobro registrado"}
            <button type="button" onClick={() => setEditTienda(true)} className="ml-2 font-semibold text-nav-700 underline-offset-2 hover:underline">Editar</button>
          </p>
        )}
        {modo === "vendedor" && tiene && editTienda && (
          <form onSubmit={(ev) => { ev.preventDefault(); guardarTienda(new FormData(ev.currentTarget)); }} className="flex flex-col gap-3">
            <CamposTienda valores={{ nombre: e.nombreTienda, cobroMetodo: e.cobroMetodo, cobroCuenta: e.cobroCuenta }} />
            <div className="flex gap-2">
              <Btn disabled={enviando}>Guardar</Btn>
              <Btn type="button" variante="borde" onClick={() => setEditTienda(false)}>Cancelar</Btn>
            </div>
          </form>
        )}
        {modo === "comprador" && <p className="text-sm text-ink-500">Explora ofertas, guarda favoritas, chatea con vendedores y sigue tus compras.</p>}
        {modo === "vendedor" && !tiene && !formVendedor && <p className="text-sm text-ink-500">Publica productos, gestiona tus ventas y cobra. Solo pide los datos de tu tienda y cómo cobras.</p>}

        {tiene ? (
          !actual && <Btn variante="borde" onClick={() => { cambiarModo(modo); router.push("/lotes"); }}>Cambiar a modo {ETIQUETA_MODO[modo].toLowerCase()}</Btn>
        ) : modo === "comprador" ? (
          <Btn onClick={() => activarModo("comprador")} disabled={enviando}>Registrarme como comprador</Btn>
        ) : formVendedor ? (
          <form onSubmit={(ev) => { ev.preventDefault(); activarModo("vendedor", new FormData(ev.currentTarget)); }} className="flex flex-col gap-3">
            <CamposTienda />
            <div className="flex gap-2">
              <Btn disabled={enviando}>{enviando ? "Activando…" : "Activar modo vendedor"}</Btn>
              <Btn type="button" variante="borde" onClick={() => setFormVendedor(false)}>Cancelar</Btn>
            </div>
          </form>
        ) : (
          <Btn onClick={() => setFormVendedor(true)}>Registrarme como vendedor</Btn>
        )}
      </div>
    );
  };

  return (
    <section ref={caja} aria-labelledby="perfil-titulo" className="mb-6 scroll-mt-20">
      <div className="mb-4 flex flex-wrap items-center gap-4 rounded-card border border-line bg-white p-4 shadow-card">
        <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-full bg-nav-700 text-2xl font-semibold text-white">{user.nombre.charAt(0).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <h1 id="perfil-titulo" className="truncate text-xl font-semibold text-nav-900">{user.nombre}</h1>
          <p className="truncate text-sm text-ink-500">{user.email} · Navegando como <b className="font-semibold text-nav-800">{ETIQUETA_MODO[modoUso].toLowerCase()}</b></p>
        </div>
        <Btn variante="borde" onClick={logout}><Icono nombre="salir" size={16} />Cerrar sesión</Btn>
      </div>

      {activar && (
        <p role="status" className="mb-3 flex items-start gap-2 rounded-card bg-ambar-50 px-3 py-2.5 text-sm font-medium text-ambar-800">
          <Icono nombre="info" size={18} className="mt-0.5 shrink-0" />
          Tu cuenta aún no tiene el modo {ETIQUETA_MODO[activar].toLowerCase()}. Actívalo aquí con los datos que faltan: es la misma cuenta, no se repite el registro.
        </p>
      )}
      {aviso && <p role="status" className="mb-3 rounded-card bg-pri-50 px-3 py-2.5 text-sm font-medium text-pri-800">{aviso}</p>}
      {error && <p role="alert" className="mb-3 rounded-card bg-error-tint px-3 py-2.5 text-sm font-medium text-error-ink">{error}</p>}

      <h2 className="mb-2 text-base font-semibold text-nav-900">Tus modos</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {tarjeta("comprador")}
        {tarjeta("vendedor")}
      </div>
    </section>
  );
}
