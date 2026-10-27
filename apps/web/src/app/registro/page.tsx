"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { registroSchema } from "@swapit/shared";
import { Logo } from "@/components/Logo";
import { CamposTienda, tiendaDeForm } from "@/components/ModosCuenta";
import { Btn, Field, inputCls, Segmented } from "@/components/ui";
import { Icono, type NombreIcono } from "@/components/vis/Iconos";
import { api, ApiError } from "@/lib/api";
import { useModo } from "@/lib/modo";
import { guardarModo, modoDeUrl, type ModoUso } from "@/lib/modoUso";

/** Cabecera sobria con logo y título, común a los dos registros. */
function Cabecera() {
  return (
    <header className="border-b border-zinc-200/70 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center px-4 py-2"><Logo /></div>
    </header>
  );
}

function Titulo({ titulo, sub }: { titulo: string; sub?: string }) {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{titulo}</h1>
      {sub && <p className="mt-1 text-sm text-ink-500">{sub}</p>}
    </div>
  );
}

function Seccion({ titulo, children }: { icono?: NombreIcono; titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 w-full border-b border-line pb-1.5 text-sm font-semibold text-nav-900">{titulo}</legend>
      {children}
    </fieldset>
  );
}

const ID_ERRORES = "registro-errores";

function Errores({ errores }: { errores: string[] }) {
  if (!errores.length) return null;
  return (
    <ul id={ID_ERRORES} role="alert" className="space-y-1 rounded-control border border-error/30 bg-error-tint p-3 text-sm font-medium text-error-ink">
      {errores.map((m) => (
        <li key={m} className="flex items-start gap-2"><Icono nombre="alerta" size={16} className="mt-0.5 shrink-0" />{m}</li>
      ))}
    </ul>
  );
}

/** Registro de un intermediario (modo B2B2B): sus proveedores no se registran, los da de alta él. */
function RegistroIntermediario() {
  const router = useRouter();
  const [errores, setErrores] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrores([]);
    const f = new FormData(e.currentTarget);
    const body = {
      tipo: "EMPRESA",
      empresa: { ruc: f.get("ruc"), razonSocial: f.get("razonSocial"), rol: "INTERMEDIARIO", direccion: f.get("direccion"), representanteLegal: f.get("representanteLegal") },
      usuario: { nombre: f.get("nombre"), email: f.get("email"), password: f.get("password") },
    };
    const parsed = registroSchema.safeParse(body);
    if (!parsed.success) {
      setErrores(parsed.error.issues.map((i) => i.message));
      return;
    }
    setLoading(true);
    try {
      await api("/auth/registro", { method: "POST", json: parsed.data });
      router.push("/panel");
    } catch (err) {
      setErrores(err instanceof ApiError ? (err.errores?.map((x) => x.mensaje) ?? [err.message]) : ["No se pudo conectar con el servidor"]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <Cabecera />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-8">
        <Titulo titulo="Crea tu cuenta" sub="Tus proveedores no se registran: tú los das de alta." />
        <form onSubmit={onSubmit} aria-describedby={errores.length ? ID_ERRORES : undefined} className="flex flex-col gap-5 rounded-2xl border border-zinc-200/80 bg-white/80 p-5 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_1px_2px_rgba(24,24,27,0.04),0_16px_40px_-16px_rgba(24,24,27,0.18)] backdrop-blur-xl">
          <Seccion icono="empresa" titulo="Tu empresa">
            <Field label="RUC"><input name="ruc" required inputMode="numeric" maxLength={11} placeholder="11 dígitos" className={inputCls} /></Field>
            <Field label="Razón social"><input name="razonSocial" required className={inputCls} /></Field>
            <Field label="Dirección del acopio"><input name="direccion" required className={inputCls} /></Field>
            <Field label="Representante legal"><input name="representanteLegal" required className={inputCls} /></Field>
          </Seccion>
          <Seccion icono="inicio" titulo="Tu usuario">
            <Field label="Tu nombre"><input name="nombre" required autoComplete="name" className={inputCls} /></Field>
            <Field label="Email"><input name="email" type="email" required autoComplete="email" className={inputCls} /></Field>
            <Field label="Contraseña" hint="Mínimo 8 caracteres"><input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputCls} /></Field>
          </Seccion>
          <Errores errores={errores} />
          <Btn disabled={loading} className="min-h-11">{loading ? "Creando cuenta…" : "Crear cuenta"}</Btn>
        </form>
        <p className="text-center text-sm text-ink-700">¿Ya tienes cuenta? <Link href="/login" className="inline-flex min-h-10 items-center font-semibold text-nav-700 underline underline-offset-4">Ingresar</Link></p>
      </main>
    </div>
  );
}

export default function RegistroPage() {
  const modo = useModo();
  return modo === "MARKETPLACE" ? <RegistroMarketplace /> : <RegistroIntermediario />;
}

/**
 * Registro del marketplace por modo (docs/diseno/estructura-web.md §3): comprador o vendedor.
 * El vendedor completa además los datos de su tienda y cómo cobra. El otro modo se activa después desde el Perfil.
 */
function RegistroMarketplace() {
  const router = useRouter();
  const [modoUso, setModoUso] = useState<ModoUso>("comprador");
  const [errores, setErrores] = useState<string[]>([]);
  const [yaExiste, setYaExiste] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => setModoUso(modoDeUrl() ?? "comprador"), []);
  const vendedor = modoUso === "vendedor";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrores([]);
    setYaExiste(false);
    const f = new FormData(e.currentTarget);
    const body = {
      tipo: "PERSONA",
      modo: vendedor ? "VENDEDOR" : "COMPRADOR",
      persona: { direccion: f.get("direccion") },
      usuario: { nombre: f.get("nombre"), email: f.get("email"), password: f.get("password") },
      ...(vendedor ? { tienda: tiendaDeForm(f) } : {}),
    };
    const parsed = registroSchema.safeParse(body);
    if (!parsed.success) {
      setErrores([...new Set(parsed.error.issues.map((i) => i.message))]);
      return;
    }
    setLoading(true);
    try {
      await api("/auth/registro", { method: "POST", json: parsed.data });
      guardarModo(modoUso);
      router.push("/lotes");
    } catch (err) {
      if (err instanceof ApiError) {
        setErrores(err.errores?.map((x) => x.mensaje) ?? [err.message]);
        setYaExiste(err.status === 409 && /email/i.test(err.message));
      } else setErrores(["No se pudo conectar con el servidor"]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <Cabecera />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-8">
        <Titulo titulo={`Crea tu cuenta de ${modoUso}`} sub={vendedor ? "Tus datos, tu tienda y cómo cobras." : "Solo tus datos y tu zona para ver lo que hay cerca."} />
        <Segmented
          etiqueta="Modo"
          valor={modoUso}
          onChange={(v) => setModoUso(v as ModoUso)}
          opciones={[{ valor: "comprador", etiqueta: "Comprador" }, { valor: "vendedor", etiqueta: "Vendedor" }]}
        />
        <form key={modoUso} onSubmit={onSubmit} noValidate aria-describedby={errores.length ? ID_ERRORES : undefined} className="flex flex-col gap-5 rounded-2xl border border-zinc-200/80 bg-white/80 p-5 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_1px_2px_rgba(24,24,27,0.04),0_16px_40px_-16px_rgba(24,24,27,0.18)] backdrop-blur-xl">
          <Seccion titulo="Tus datos">
            <Field label="Nombre y apellido" hint="Los demás ven solo la inicial del apellido.">
              <input name="nombre" required autoComplete="name" className={inputCls} />
            </Field>
            <Field label="Email"><input name="email" type="email" required autoComplete="email" className={inputCls} /></Field>
            <Field label="Contraseña" hint="Mínimo 10 caracteres"><input name="password" type="password" required minLength={10} autoComplete="new-password" className={inputCls} /></Field>
            <Field label="Barrio y ciudad" hint="Los demás solo ven una zona aproximada.">
              <input name="direccion" required placeholder="Ej. San Eduardo, Piura" className={inputCls} />
            </Field>
          </Seccion>
          {vendedor && (
            <Seccion titulo="Tu tienda y cobro">
              <CamposTienda />
            </Seccion>
          )}
          <Errores errores={errores} />
          {yaExiste && (
            <p className="text-sm text-ink-700">
              Si ya tienes cuenta, <Link href={`/login?modo=${modoUso}`} className="font-semibold text-nav-700 underline underline-offset-4">ingresa</Link> y activa el modo {modoUso} desde tu Perfil: no hace falta otra cuenta.
            </p>
          )}
          <Btn disabled={loading} className="min-h-11">{loading ? "Creando cuenta…" : `Crear cuenta de ${modoUso}`}</Btn>
        </form>
        <p className="text-center text-sm text-ink-700">
          ¿Ya tienes cuenta? <Link href={`/login?modo=${modoUso}`} className="inline-flex min-h-10 items-center font-semibold text-nav-700 underline underline-offset-4">Ingresar</Link>
        </p>
      </main>
    </div>
  );
}
