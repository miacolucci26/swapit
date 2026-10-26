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
  { email: "gerencia@acopiostallanes.pe", pass: "demo1234", titulo: "Acopios Tallanes", rol: "6 proveedores · con suscripción" },
  { email: "operaciones@reciclajesnorte.pe", pass: "demo1234", titulo: "Reciclajes del Norte", rol: "Sullana · sin suscripción" },
];

// En la experiencia de intercambio solo hay empresas (y la moderación): las cuentas de personas no se ofrecen.
const DEMO: Demo[] = [
  { email: "ana@vallesol.pe", pass: "demo1234", titulo: "Agroexport Vallesol", rol: "Empresa ofertante" },
  { email: "carlos@biocompost.pe", pass: "demo1234", titulo: "BioCompost", rol: "Empresa receptora" },
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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-50">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(50%_60%_at_50%_0%,rgba(16,185,129,0.14),transparent_70%)]" />
      <header className="relative border-b border-zinc-200/70 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center px-4 py-2"><Logo /></div>
      </header>

      <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-10">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Ingresar</h1>
          <p className="mt-1.5 text-sm text-zinc-500">Accede con el correo y la contraseña de tu empresa.</p>
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
          className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white/80 p-5 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_1px_2px_rgba(24,24,27,0.04),0_16px_40px_-16px_rgba(24,24,27,0.18)] backdrop-blur-xl"
        >
          <Field label="Correo electrónico">
            <input name="email" type="email" required autoComplete="email" aria-invalid={!!error} aria-describedby={error ? "login-error" : undefined} className={`${inputCls} min-h-11 rounded-xl border-zinc-200 focus:border-emerald-500 focus:ring-emerald-500/20`} />
          </Field>
          <Field label="Contraseña">
            <input name="password" type="password" required autoComplete="current-password" aria-invalid={!!error} aria-describedby={error ? "login-error" : undefined} className={`${inputCls} min-h-11 rounded-xl border-zinc-200 focus:border-emerald-500 focus:ring-emerald-500/20`} />
          </Field>
          {error && (
            <p id="login-error" role="alert" className="flex items-start gap-2 rounded-control border border-error/30 bg-error-tint p-3 text-sm font-medium text-error-ink">
              <Icono nombre="alerta" size={16} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}
          <Btn disabled={loading} className="min-h-11 rounded-xl bg-zinc-900 dark:text-zinc-50 shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_1px_2px_rgba(24,24,27,0.2)] hover:bg-zinc-700">{loading ? "Ingresando…" : "Ingresar"}</Btn>
          <p className="text-center text-sm text-zinc-600">¿Sin cuenta? <Link href="/registro" className="inline-flex min-h-10 items-center font-semibold text-emerald-700 underline underline-offset-4">Crear cuenta</Link></p>
        </form>

        <section aria-labelledby="demo">
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h2 id="demo" className="text-sm font-semibold tracking-tight text-zinc-900">Cuentas de demostración</h2>
            <p className="text-xs text-zinc-500">Datos de ejemplo. Un clic y entras.</p>
          </div>
          <ul className="flex flex-col gap-2">
            {(modo === "MARKETPLACE" ? DEMO : DEMO_B2B).map((d) => (
              <li key={d.email}>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => entrar(d.email, d.pass)}
                  className="group relative flex min-h-16 w-full items-center gap-3 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/80 px-4 py-3 text-left shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_1px_2px_rgba(24,24,27,0.04)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-emerald-400/70 hover:shadow-[0_8px_24px_-10px_rgba(16,185,129,0.4)] focus-visible:outline-2 focus-visible:outline-emerald-500 disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl bg-zinc-900 text-sm font-semibold text-white dark:text-zinc-50">{d.titulo.charAt(0)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-tight tracking-tight text-zinc-900">{d.titulo}</span>
                    <span className="block text-xs text-zinc-500">{d.rol}</span>
                  </span>
                  <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-500 transition group-hover:bg-emerald-600 group-hover:text-white">
                    <Icono nombre="flecha" size={14} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        {modo !== "MARKETPLACE" && modo !== null && (
          <p className="text-center text-sm text-zinc-500">¿Eres proveedor? Usa el enlace que te envió tu acopiador.</p>
        )}
      </main>
    </div>
  );
}
