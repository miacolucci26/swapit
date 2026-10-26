"use client";

import { useCallback, useEffect, useState } from "react";
import { zonaAprox } from "@/components/LoteCard";
import { Badge, Btn, Card, Cargando, Estrellas, Field, inputCls, InsigniaDemo } from "@/components/ui";
import { Icono, type NombreIcono } from "@/components/vis/Iconos";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";

interface Empresa {
  id: string; tipo: "EMPRESA" | "PERSONA"; ruc: string | null; razonSocial: string; rol: string; direccion: string; representanteLegal: string | null;
  estadoKyb: "PENDIENTE" | "VERIFICADA" | "RECHAZADA"; ubicacion: { lat: number; lng: number } | null;
  badgeCircular: boolean; confidencial: boolean; logoUrl: string | null; colorMarca: string | null; ratingProm: number; nTransacciones: number; certificaciones: { id: string; nombre: string }[];
  /** Cómo se decidió la verificación. Opcional: una API antigua no lo envía. */
  metodoVerificacion?: "SIMULADA" | "MANUAL" | "API" | null;
  demo?: boolean;
  contactoNombre?: string | null; telefono?: string | null;
}

// Estado de verificación = color + ícono + palabra. «Rechazada» se muestra como «No verificada».
const KYB: Record<string, { tono: "verde" | "ambar" | "rojo" | "gris"; icono: NombreIcono; texto: string }> = {
  VERIFICADA: { tono: "verde", icono: "check", texto: "Verificada" },
  PENDIENTE: { tono: "ambar", icono: "reloj", texto: "Pendiente" },
  RECHAZADA: { tono: "rojo", icono: "alerta", texto: "No verificada" },
  NO_APLICA: { tono: "gris", icono: "info", texto: "No aplica" },
};

/** Estado de verificación honesto: una verificación simulada nunca se presenta como comprobación real. */
function estadoVerificacion(e: Empresa) {
  const base = KYB[e.estadoKyb] ?? KYB.NO_APLICA;
  const simulada = e.metodoVerificacion === "SIMULADA";
  const metodo =
    e.metodoVerificacion === "SIMULADA" ? { titulo: "Verificación simulada (demo)", detalle: "Es una demostración: solo revisa que el RUC tenga un formato válido y no consulta ningún registro externo." }
    : e.metodoVerificacion === "MANUAL" ? { titulo: "Revisión manual del equipo de Swap It", detalle: "Una persona del equipo revisa los datos de la empresa." }
    : e.metodoVerificacion === "API" ? { titulo: "Consulta automática a un registro tributario", detalle: "El RUC se consulta en un proveedor externo." }
    : null;
  // Verificada por simulación: tono neutro (no genera confianza que no existe).
  const tono = simulada && e.estadoKyb === "VERIFICADA" ? ("gris" as const) : base.tono;
  return { ...base, tono, simulada, metodo };
}
const COLOR_INICIAL = "#1f3a64";

/** Logo de la empresa (o su inicial sobre el color de marca) con una franja del color de marca. */
function Identidad({ empresa, color, hijos }: { empresa: Empresa; color: string; hijos: React.ReactNode }) {
  return (
    <div className="mb-5 overflow-hidden rounded-card border border-line bg-white shadow-card">
      <div className="h-1.5" style={{ background: color }} aria-hidden />
      <div className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
        {empresa.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={empresa.logoUrl} alt={`Logo de ${empresa.razonSocial}`} className="size-16 shrink-0 rounded-card sm:size-20 border border-line bg-white object-contain p-1" />
        ) : (
          <span className="grid size-16 shrink-0 place-items-center rounded-card text-3xl font-semibold text-white sm:size-20" style={{ background: color }} aria-hidden>
            {empresa.razonSocial.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold leading-tight tracking-tight text-nav-900 md:text-[26px]">{empresa.razonSocial}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">{hijos}</div>
        </div>
      </div>
    </div>
  );
}

export default function Perfil() {
  const { user, refresh } = useSession();
  const [nombre, setNombre] = useState("");
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [direccion, setDireccion] = useState("");
  const [cert, setCert] = useState("");
  const [aviso, setAviso] = useState("");
  const [color, setColor] = useState(COLOR_INICIAL);
  const [contactoNombre, setContactoNombre] = useState("");
  const [telefono, setTelefono] = useState("");

  const cargar = useCallback(async () => {
    const e = await api<Empresa>("/empresas/mi");
    setEmpresa(e);
    setDireccion(e.direccion);
    setColor(e.colorMarca ?? COLOR_INICIAL);
    setContactoNombre(e.contactoNombre ?? "");
    setTelefono(e.telefono ?? "");
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { if (user) setNombre(user.nombre); }, [user]);

  async function accion(fn: () => Promise<unknown>, ok: string) {
    setAviso("");
    try { await fn(); setAviso(ok); await cargar(); await refresh(); }
    catch (err) { setAviso(err instanceof ApiError ? (err.errores?.map((x) => x.mensaje).join(", ") ?? err.message) : "Error de conexión"); }
  }

  if (!empresa) return <Cargando />;

  const avisoUi = aviso && (
    <p role="status" className="mb-4 flex items-center gap-2 rounded-card bg-nav-50 px-3 py-2.5 text-sm font-medium text-nav-800"><Icono nombre="info" size={18} />{aviso}</p>
  );

  if (empresa.tipo === "PERSONA") {
    return (
      <>
        <Identidad
          empresa={empresa}
          color={color}
          hijos={
            <>
              <Badge tono="rosa"><Icono nombre="empresa" size={14} />Persona</Badge>
              <Estrellas v={empresa.ratingProm} n={empresa.nTransacciones} />
              {empresa.badgeCircular && <Badge tono="verde"><Icono nombre="reciclar" size={14} />Miembro circular</Badge>}
            </>
          }
        />
        {avisoUi}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="text-base font-semibold text-nav-900">Tus datos</h2>
            <form className="mt-3 flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); accion(() => api("/empresas/mi", { method: "PATCH", json: { nombre } }), "Nombre actualizado"); }}>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} minLength={3} className={inputCls} aria-label="Nombre y apellido" />
              <p className="text-sm text-ink-500">Los demás ven «{empresa.razonSocial}».</p>
              <div><Btn>Guardar nombre</Btn></div>
            </form>
          </Card>
          <Card>
            <h2 className="text-base font-semibold text-nav-900">Ubicación</h2>
            <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); accion(() => api("/empresas/mi", { method: "PATCH", json: { direccion } }), "Ubicación actualizada"); }}>
              <input value={direccion} onChange={(e) => setDireccion(e.target.value)} className={inputCls} aria-label="Barrio y ciudad" />
              <Btn>Guardar</Btn>
            </form>
            <p data-testid="coords" className="mt-2 flex items-start gap-2 text-sm text-ink-700">
              <Icono nombre="ubicacion" size={18} className="mt-0.5 shrink-0" />
              {empresa.ubicacion ? `Zona aproximada en el mapa: ${empresa.ubicacion.lat.toFixed(2)}, ${empresa.ubicacion.lng.toFixed(2)}. Nunca mostramos tu domicilio exacto.` : "No pudimos ubicar tu zona. Incluye tu ciudad (ej. «Piura», «Sullana»)."}
            </p>
          </Card>
        </div>
      </>
    );
  }

  const kyb = estadoVerificacion(empresa);
  const etiquetaCabecera = kyb.simulada && empresa.estadoKyb === "VERIFICADA" ? "Verificación simulada (demo)" : kyb.texto;
  const zona = zonaAprox(empresa.ubicacion);
  const esIntermediario = user?.modo === "B2B2B" && empresa.rol === "INTERMEDIARIO";

  return (
    <>
      <Identidad
        empresa={empresa}
        color={color}
        hijos={
          <>
            {empresa.demo && <InsigniaDemo />}
            {empresa.ruc && <Badge tono="gris">RUC {empresa.ruc}</Badge>}
            <Badge tono="azul"><Icono nombre="empresa" size={14} />{empresa.rol}</Badge>
            <Badge tono={kyb.tono}><Icono nombre={kyb.icono} size={14} />{etiquetaCabecera}</Badge>
            {empresa.badgeCircular && <Badge tono="verde"><Icono nombre="reciclar" size={14} />Empresa circular</Badge>}
            <Estrellas v={empresa.ratingProm} n={empresa.nTransacciones} />
          </>
        }
      />
      {avisoUi}
      {empresa.demo && (
        <p className="mb-4 flex items-start gap-2 rounded-card border border-line bg-white px-3 py-2.5 text-sm text-ink-700"><Icono nombre="info" size={16} className="mt-0.5 shrink-0 text-ink-500" />Esta es una empresa de demostración: sus datos y publicaciones son de ejemplo.</p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-nav-900">Verificación de empresa</h2>
              <p className="mt-1 flex flex-wrap items-center gap-2" data-testid="kyb"><Badge tono={kyb.tono}><Icono nombre={kyb.icono} size={14} />{kyb.simulada && empresa.estadoKyb === "VERIFICADA" ? "Verificada (simulada)" : kyb.texto}</Badge></p>
            </div>
            <Btn variante="borde" onClick={() => accion(() => api("/empresas/mi/verificar-kyb", { method: "POST" }), "Verificación reevaluada")}>Volver a verificar</Btn>
          </div>
          <dl className="mt-3 text-sm">
            <div className="flex justify-between gap-3 border-b border-line py-1.5"><dt className="text-ink-500">Método</dt><dd className="text-right font-medium text-ink-900">{kyb.metodo?.titulo ?? "No informado"}</dd></div>
          </dl>
          {kyb.metodo && <p className="mt-2 flex items-start gap-1.5 text-sm text-ink-500"><Icono nombre="info" size={16} className="mt-0.5 shrink-0" />{kyb.metodo.detalle}</p>}
          {empresa.estadoKyb === "RECHAZADA" && <p className="mt-3 flex items-start gap-2 text-sm font-medium text-error-ink"><Icono nombre="alerta" size={18} className="mt-0.5 shrink-0" />No se pudo verificar la empresa con el RUC registrado. No podrás publicar ni solicitar lotes hasta corregirlo.</p>}
          {empresa.estadoKyb === "PENDIENTE" && <p className="mt-3 text-sm text-ambar-800">La verificación está pendiente. Otras empresas verán que aún no está verificada.</p>}
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-nav-900">Contacto para coordinar</h2>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-500"><Icono nombre="candado" size={16} className="mt-0.5 shrink-0" />Se comparten solo con la otra empresa después de aceptar un acuerdo.</p>
          <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={(e) => {
            e.preventDefault();
            accion(() => api("/empresas/mi", { method: "PATCH", json: { ...(contactoNombre.trim() ? { contactoNombre: contactoNombre.trim() } : {}), ...(telefono.trim() ? { telefono: telefono.trim() } : {}) } }), "Contacto actualizado");
          }}>
            <Field label="Persona de contacto"><input value={contactoNombre} onChange={(e) => setContactoNombre(e.target.value)} minLength={2} maxLength={120} autoComplete="name" className={inputCls} /></Field>
            <Field label="Teléfono / WhatsApp" hint="Ej. 987654321"><input value={telefono} onChange={(e) => setTelefono(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" className={inputCls} /></Field>
            <div className="sm:col-span-2"><Btn variante="borde" disabled={!contactoNombre.trim() && !telefono.trim()}>Guardar contacto</Btn></div>
          </form>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-nav-900">Ubicación aproximada</h2>
          <p data-testid="coords" className="mt-1 flex items-start gap-2 text-sm text-ink-700">
            <Icono nombre="ubicacion" size={18} className="mt-0.5 shrink-0 text-ink-500" />
            {empresa.ubicacion ? <span>Otras empresas ven <b>{zona}</b> como zona aproximada. Nunca mostramos la dirección exacta.</span> : "No pudimos ubicar la dirección. Incluye la ciudad (ej. «Piura», «Chiclayo»)."}
          </p>
          <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); accion(() => api("/empresas/mi", { method: "PATCH", json: { direccion } }), "Dirección actualizada"); }}>
            <input value={direccion} onChange={(e) => setDireccion(e.target.value)} className={inputCls} aria-label="Dirección (solo se usa para ubicarte)" />
            <Btn variante="borde">Guardar</Btn>
          </form>
          <p className="mt-1.5 text-xs text-ink-500">La dirección solo se usa para ubicar tu zona.</p>
        </Card>

        {user?.modo !== "B2B2B" && (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base font-semibold text-nav-900"><Icono nombre="candado" size={18} className="text-nav-600" />Modo confidencial</h2>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
                <input type="checkbox" className="size-5 accent-pri-600" checked={empresa.confidencial} onChange={(e) => accion(() => api("/empresas/mi", { method: "PATCH", json: { confidencial: e.target.checked } }), e.target.checked ? "Modo confidencial activado" : "Modo confidencial desactivado")} />
                {empresa.confidencial ? "Activado" : "Desactivado"}
              </label>
            </div>
            <details className="mt-1 text-sm text-ink-700">
              <summary className="min-h-11 cursor-pointer py-2 font-medium text-nav-700">Ver qué cambia</summary>
              <p>Tu empresa se muestra como «Empresa confidencial · sector», con ubicación aproximada de ~5 km, hasta que respondas una solicitud. Tu verificación, calificación y certificaciones siguen visibles. El certificado de una operación concretada sí identifica a las dos partes.</p>
            </details>
          </Card>
        )}

        {esIntermediario && (
          <Card className="lg:col-span-2">
            <h2 className="text-base font-semibold text-nav-900">Marca de tus certificados</h2>
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-[1fr_1.2fr]">
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">Logo (PNG o JPG)
                  <input type="file" accept="image/png,image/jpeg" className="min-h-11 w-full min-w-0 text-sm font-normal file:mr-3 file:min-h-10 file:cursor-pointer file:rounded-control file:border-0 file:bg-nav-50 file:px-4 file:font-semibold file:text-nav-800" onChange={async (ev) => {
                    const f = ev.target.files?.[0];
                    if (!f) return;
                    const fd = new FormData();
                    fd.append("file", f);
                    const res = await fetch("/api/uploads", { method: "POST", body: fd, credentials: "include" });
                    const d = await res.json().catch(() => ({}));
                    if (!res.ok) return setAviso(d.message ?? "No se pudo subir el logo");
                    accion(() => api("/empresas/mi", { method: "PATCH", json: { logoUrl: d.url } }), "Logo actualizado");
                  }} />
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-3 text-sm font-medium text-ink-700">Color de marca
                    <input type="color" value={color} onChange={(ev) => setColor(ev.target.value)} className="h-10 w-16 cursor-pointer rounded-control border border-ink-300" />
                  </label>
                  <Btn variante="borde" type="button" onClick={() => accion(() => api("/empresas/mi", { method: "PATCH", json: { colorMarca: color } }), "Color actualizado")}>Guardar color</Btn>
                </div>
              </div>
              <div className="overflow-hidden rounded-card border border-line" role="img" aria-label="Vista previa del encabezado del certificado">
                <div className="flex items-center gap-3 px-4 py-4 text-white" style={{ background: color }}>
                  {empresa.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={empresa.logoUrl} alt="" className="size-12 rounded bg-white/90 object-contain p-0.5" />
                  )}
                  <div><div className="font-semibold">{empresa.razonSocial}</div><div className="text-xs opacity-90">Certificado de Manejo y Destino Final</div></div>
                </div>
                <div className="flex items-center gap-2 p-4 text-sm text-ink-500"><Icono nombre="certificado" size={18} />Vista previa</div>
              </div>
            </div>
          </Card>
        )}

        <Card className={esIntermediario ? "lg:col-span-2" : ""}>
          <h2 className="text-base font-semibold text-nav-900">Certificaciones</h2>
          <p className="mt-0.5 text-sm text-ink-500">Las declara la propia empresa; Swap It no las audita.</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {empresa.certificaciones.map((c) => (
              <li key={c.id} className="flex items-center gap-1 rounded-md bg-ink-100 py-0.5 pl-2.5 pr-0.5 text-sm font-medium text-ink-900">
                {c.nombre}
                <button aria-label={`Quitar ${c.nombre}`} className="grid size-9 place-items-center rounded-md text-ink-500 hover:bg-white hover:text-ink-900" onClick={() => accion(() => api(`/empresas/mi/certificaciones/${c.id}`, { method: "DELETE" }), "Certificación eliminada")}><Icono nombre="cerrar" size={16} /></button>
              </li>
            ))}
            {empresa.certificaciones.length === 0 && <li className="text-sm text-ink-500">Sin certificaciones (ISO 14001, BPA…).</li>}
          </ul>
          <form className="mt-3 flex gap-2 sm:max-w-md" onSubmit={(e) => { e.preventDefault(); accion(() => api("/empresas/mi/certificaciones", { method: "POST", json: { nombre: cert } }), "Certificación agregada"); setCert(""); }}>
            <input value={cert} onChange={(e) => setCert(e.target.value)} required placeholder="Ej. ISO 14001" className={inputCls} aria-label="Nueva certificación" />
            <Btn variante="borde">Agregar</Btn>
          </form>
        </Card>
      </div>
    </>
  );
}
