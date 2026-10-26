"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { registroSchema } from "@swapit/shared";
import { Logo } from "@/components/Logo";
import { Btn, Field, inputCls } from "@/components/ui";
import { Icono, type NombreIcono } from "@/components/vis/Iconos";
import { api, ApiError } from "@/lib/api";
import { useModo } from "@/lib/modo";

type Tipo = "PERSONA" | "EMPRESA";

/** Cabecera sobria con logo y título, común a los dos registros. */
function Cabecera() {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-5xl items-center px-4 py-2"><Logo /></div>
    </header>
  );
}

function Titulo({ titulo, sub }: { titulo: string; sub?: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-nav-900">{titulo}</h1>
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
    <div className="flex min-h-screen flex-col bg-bg">
      <Cabecera />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-8">
        <Titulo titulo="Crea tu cuenta" sub="Tus proveedores no se registran: tú los das de alta." />
        <form onSubmit={onSubmit} aria-describedby={errores.length ? ID_ERRORES : undefined} className="flex flex-col gap-5 rounded-card border border-line bg-white p-5 shadow-card">
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
  if (modo === null) return null;
  return modo === "MARKETPLACE" ? <RegistroMarketplace /> : <RegistroIntermediario />;
}

/** Registro del producto anterior (marketplace): persona o empresa. */
function RegistroMarketplace() {
  const router = useRouter();
  // La experiencia de intercambio es solo entre empresas: no se ofrece la opción «Persona».
  const tipo = "EMPRESA" as Tipo;
  const [errores, setErrores] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrores([]);
    const f = new FormData(e.currentTarget);
    const usuario = { nombre: f.get("nombre"), email: f.get("email"), password: f.get("password") };
    const body =
      tipo === "PERSONA"
        ? { tipo, persona: { direccion: f.get("direccion") }, usuario }
        : {
            tipo,
            empresa: { ruc: f.get("ruc"), razonSocial: f.get("razonSocial"), rol: f.get("rol"), direccion: f.get("direccion"), representanteLegal: f.get("representanteLegal") },
            usuario,
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
      if (err instanceof ApiError) setErrores(err.errores?.map((x) => x.mensaje) ?? [err.message]);
      else setErrores(["No se pudo conectar con el servidor"]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <Cabecera />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-8">
        <Titulo titulo="Registra tu empresa" sub="Intercambia excedentes con otras empresas del norte." />
        {tipo && (
          <form key={tipo} onSubmit={onSubmit} aria-describedby={errores.length ? ID_ERRORES : undefined} className="flex flex-col gap-5 rounded-card border border-line bg-white p-5 shadow-card">
            {tipo === "EMPRESA" ? (
              <Seccion icono="empresa" titulo="Tu empresa">
                <Field label="RUC"><input name="ruc" required inputMode="numeric" maxLength={11} placeholder="11 dígitos" className={inputCls} /></Field>
                <Field label="Razón social"><input name="razonSocial" required className={inputCls} /></Field>
                <Field label="Qué haces">
                  <select name="rol" defaultValue="AMBOS" className={inputCls}>
                    <option value="OFERTANTE">Genero residuos o excedentes</option>
                    <option value="RECEPTOR">Busco materiales como insumo</option>
                    <option value="AMBOS">Ambos</option>
                  </select>
                </Field>
                <Field label="Dirección de planta u oficina"><input name="direccion" required className={inputCls} /></Field>
                <Field label="Representante legal"><input name="representanteLegal" required className={inputCls} /></Field>
              </Seccion>
            ) : (
              <Seccion icono="ubicacion" titulo="Tu ubicación">
                <Field label="Barrio y ciudad" hint="Los demás solo ven una zona aproximada."><input name="direccion" required placeholder="Ej. San Eduardo, Piura" className={inputCls} /></Field>
              </Seccion>
            )}
            <Seccion icono="inicio" titulo={tipo === "EMPRESA" ? "Tu usuario" : "Tus datos"}>
              <Field label={tipo === "EMPRESA" ? "Tu nombre" : "Nombre y apellido"} hint={tipo === "PERSONA" ? "Los demás ven solo la inicial del apellido." : undefined}>
                <input name="nombre" required autoComplete="name" className={inputCls} />
              </Field>
              <Field label="Email"><input name="email" type="email" required autoComplete="email" className={inputCls} /></Field>
              <Field label="Contraseña" hint="Mínimo 8 caracteres"><input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputCls} /></Field>
            </Seccion>
            <Errores errores={errores} />
            <Btn disabled={loading} className="min-h-11">{loading ? "Creando cuenta…" : "Crear cuenta"}</Btn>
          </form>
        )}
        <p className="text-center text-sm text-ink-700">
          ¿Ya tienes cuenta? <Link href="/login" className="inline-flex min-h-10 items-center font-semibold text-nav-700 underline underline-offset-4">Ingresar</Link>
        </p>
      </main>
    </div>
  );
}
