"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Btn, Field, inputCls } from "@/components/ui";
import { Icono } from "@/components/vis/Iconos";
import { api, ApiError } from "@/lib/api";
import { useModo } from "@/lib/modo";

interface Demo { email: string; pass: string; titulo: string; rol: string }

const DEMO_B2B: Demo[] = [
  { email: "gerencia@acopiostallanes.pe", pass: "demo1234", titulo: "Acopios Tallanes", rol: "Piura · 6 proveedores · con suscripción" },
  { email: "operaciones@reciclajesnorte.pe", pass: "demo1234", titulo: "Reciclajes del Norte", rol: "Sullana · sin suscripción" },
];

// En la experiencia de intercambio solo hay empresas (y la moderación): las cuentas de personas no se ofrecen.
const DEMO: Demo[] = [
  { email: "ana@vallesol.pe", pass: "demo1234", titulo: "Agroexport Vallesol", rol: "Empresa ofertante · Piura" },
  { email: "carlos@biocompost.pe", pass: "demo1234", titulo: "BioCompost Piura", rol: "Empresa receptora" },
  { email: "admin@swapit.pe", pass: "admin12345", titulo: "Administrador", rol: "Moderación" },
];

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const modo = useModo();

  async function entrar(email: string, password: string) {
    setError("");
    setLoading(true);
    try {
      await api("/auth/login", { method: "POST", json: { email, password } });
      router.push("/panel");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo conectar con el servidor");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl items-center px-4 py-2"><Logo /></div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-nav-900">Ingresar</h1>
          <p className="mt-1 text-sm text-ink-500">Accede con el correo y la contraseña de tu empresa.</p>
        </div>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const email = String(f.get("email") ?? "").trim();
            const password = String(f.get("password") ?? "");
            if (!email || !password) {
              setError("Escribe tu correo y tu contraseña.");
              return;
            }
            entrar(email, password);
          }}
          className="flex flex-col gap-3 rounded-card border border-line bg-white p-5 shadow-card"
        >
          <Field label="Correo electrónico">
            <input name="email" type="email" required autoComplete="email" aria-invalid={!!error} aria-describedby={error ? "login-error" : undefined} className={`${inputCls} min-h-11`} />
          </Field>
          <Field label="Contraseña">
            <input name="password" type="password" required autoComplete="current-password" aria-invalid={!!error} aria-describedby={error ? "login-error" : undefined} className={`${inputCls} min-h-11`} />
          </Field>
          {error && (
            <p id="login-error" role="alert" className="flex items-start gap-2 rounded-control border border-error/30 bg-error-tint p-3 text-sm font-medium text-error-ink">
              <Icono nombre="alerta" size={16} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}
          <Btn disabled={loading} className="min-h-11">{loading ? "Ingresando…" : "Ingresar"}</Btn>
          <p className="text-center text-sm text-ink-700">¿Sin cuenta? <Link href="/registro" className="inline-flex min-h-10 items-center font-semibold text-nav-700 underline underline-offset-4">Crear cuenta</Link></p>
        </form>

        <section aria-labelledby="demo" className="rounded-card border border-line bg-white p-4 shadow-card">
          <h2 id="demo" className="text-sm font-semibold text-nav-900">Cuentas de demostración</h2>
          <p className="mt-0.5 text-xs text-ink-500">Datos de ejemplo. Un clic y entras.</p>
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-control border border-line">
            {(modo === "MARKETPLACE" ? DEMO : DEMO_B2B).map((d) => (
              <li key={d.email}>
                <button type="button" disabled={loading} onClick={() => entrar(d.email, d.pass)} className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface-2 disabled:opacity-60">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-tight text-ink-900">{d.titulo}</span>
                    <span className="block text-xs text-ink-500">{d.rol}</span>
                  </span>
                  <Icono nombre="flecha" size={16} className="shrink-0 text-ink-500" />
                </button>
              </li>
            ))}
          </ul>
        </section>
        {modo !== "MARKETPLACE" && modo !== null && (
          <p className="text-sm text-ink-500">¿Eres proveedor? Usa el enlace que te envió tu acopiador.</p>
        )}
      </main>
    </div>
  );
}
