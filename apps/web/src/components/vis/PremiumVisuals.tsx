/**
 * Piezas visuales de la portada (estilo Linear / Apple): vista previa del producto, escenas del Bento y QR vectorial.
 * Son ilustraciones con datos de ejemplo; no consultan la API.
 */

/** Superficie base: borde fino, sombra multicapa y brillo interno superior. */
export const SUPERFICIE =
  "relative rounded-2xl border border-zinc-200/80 bg-white/80 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_-8px_rgba(24,24,27,0.10)] backdrop-blur-xl";

/** QR decorativo y determinista (no es un código escaneable): tres marcas de esquina y módulos fijos. */
export function QrVectorial({ size = 72, className = "" }: { size?: number; className?: string }) {
  const n = 21;
  const modulos: [number, number][] = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const enMarca = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
      if (!enMarca && ((x * 7 + y * 13 + x * y) % 5 < 2)) modulos.push([x, y]);
    }
  const marca = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" rx="1" fill="#18181b" />
      <rect x={x + 1} y={y + 1} width="5" height="5" rx="0.5" fill="#fff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" rx="0.5" fill="#18181b" />
    </g>
  );
  return (
    <svg viewBox={`-1 -1 ${n + 2} ${n + 2}`} width={size} height={size} role="img" aria-label="Código QR de verificación (ilustración)" className={className}>
      <rect x="-1" y="-1" width={n + 2} height={n + 2} rx="2" fill="#fff" />
      {marca(0, 0)}
      {marca(14, 0)}
      {marca(0, 14)}
      {modulos.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#18181b" />)}
    </svg>
  );
}

function SelloVerificado({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 ${className}`}>
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M8 1l2 1.4 2.4-.2.9 2.2 2 1.4-.8 2.3.8 2.3-2 1.4-.9 2.2-2.4-.2L8 15l-2-1.4-2.4.2-.9-2.2-2-1.4.8-2.3-.8-2.3 2-1.4.9-2.2 2.4.2L8 1z" fill="#10b981" /><path d="M5.2 8.2l1.8 1.8 3.4-3.6" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      Verificado
    </span>
  );
}

/** Notificación de WhatsApp del proveedor. */
export function MensajeWhatsApp({ compacto = false }: { compacto?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-emerald-500 text-white">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm5.3 14c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.4.1.2.1.8-.2 1.5z" /></svg>
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-xs font-semibold text-zinc-900">Agrícola Los Olivos</p>
          <p className="text-[11px] text-zinc-500">WhatsApp · ahora</p>
        </div>
      </div>
      <div className="rounded-2xl rounded-tl-md bg-zinc-100 px-3 py-2 text-[13px] leading-snug text-zinc-800">
        Bidones de PEAD azules, <span className="font-mono font-medium tabular-nums">600 kg</span>, a <span className="font-mono font-medium tabular-nums">S/ 4,50</span>
      </div>
      {!compacto && (
        <div className="self-end rounded-2xl rounded-tr-md bg-emerald-500 px-3 py-1.5 text-[12px] font-medium text-white shadow-sm">
          Recibido. Subtipo: PEAD ✓
        </div>
      )}
    </div>
  );
}

/** Barra del rango de referencia con el marcador activo en la zona verde. */
export function BarraRango({ marcador = 52, etiqueta = true }: { marcador?: number; etiqueta?: boolean }) {
  return (
    <div>
      <div className="relative h-2.5 rounded-full bg-zinc-100 ring-1 ring-inset ring-zinc-200/80">
        <div className="absolute inset-y-0 left-[28%] w-[44%] rounded-full bg-gradient-to-r from-emerald-300 to-emerald-500" />
        <span
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-emerald-600 shadow-[0_0_0_4px_rgba(16,185,129,0.18),0_2px_6px_rgba(24,24,27,0.25)]"
          style={{ left: `${marcador}%` }}
        />
      </div>
      {etiqueta && (
        <div className="mt-1.5 flex justify-between font-mono text-[10.5px] tabular-nums text-zinc-500">
          <span>S/ 3,20</span><span className="text-emerald-700">p25–p75</span><span>S/ 5,80</span>
        </div>
      )}
    </div>
  );
}

/** Termómetro de precio justo (columna 2 de la vista previa). */
function PrecioJusto() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-zinc-900">Precio de referencia</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-500" />Precio justo
        </span>
      </div>
      <p className="font-mono text-2xl font-semibold tracking-tight tabular-nums text-zinc-900">S/ 4,50<span className="ml-1 text-xs font-normal text-zinc-500">/ kg</span></p>
      <BarraRango />
      <p className="text-[11px] text-zinc-500">Dentro del rango · datos de ejemplo</p>
    </div>
  );
}

/** Tarjeta del certificado con QR y sello. */
export function TarjetaCertificado({ compacta = false }: { compacta?: boolean }) {
  return (
    <div className="flex gap-3">
      <QrVectorial size={compacta ? 64 : 76} className="shrink-0 rounded-lg ring-1 ring-zinc-200" />
      <div className="min-w-0 flex flex-col justify-between">
        <div>
          <p className="text-xs font-semibold text-zinc-900">Certificado de trazabilidad</p>
          <p className="mt-0.5 font-mono text-[11px] tabular-nums text-zinc-500">SW-2026-000142</p>
        </div>
        <div className="flex flex-col items-start gap-1">
          <p className="text-[11px] text-zinc-600">PEAD · <span className="font-mono tabular-nums">600 kg</span></p>
          <SelloVerificado />
        </div>
      </div>
    </div>
  );
}

/** Conector entre columnas (solo en pantallas anchas). */
function Conector() {
  return (
    <div aria-hidden="true" className="relative hidden w-8 shrink-0 items-center md:flex">
      <div className="h-px w-full bg-gradient-to-r from-zinc-200 via-emerald-400 to-zinc-200" />
      <span className="absolute right-0 size-1.5 -translate-y-px rotate-45 border-r border-t border-emerald-500" />
    </div>
  );
}

const ETIQUETA_COLUMNA = "mb-3 flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-wider text-zinc-400";

/** Marco tipo ventana de macOS con las tres etapas conectadas: reporte → precio justo → certificado. */
export function VistaPreviaProducto() {
  return (
    <div className="relative mx-auto mt-12 max-w-4xl [perspective:1600px]" aria-label="Vista previa del flujo de Swapit (ilustración con datos de ejemplo)">
      <div aria-hidden="true" className="pointer-events-none absolute -inset-x-6 -top-8 bottom-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(16,185,129,0.16),transparent_70%)]" />
      <div className="origin-top overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-50/80 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_2px_4px_rgba(24,24,27,0.04),0_24px_60px_-20px_rgba(24,24,27,0.25)] backdrop-blur-xl md:[transform:rotateX(4deg)]">
        <div className="flex items-center gap-2 border-b border-zinc-200/80 bg-white/70 px-4 py-2.5">
          <span aria-hidden="true" className="flex gap-1.5"><i className="size-2.5 rounded-full bg-[#ff5f57]" /><i className="size-2.5 rounded-full bg-[#febc2e]" /><i className="size-2.5 rounded-full bg-[#28c840]" /></span>
          <span className="mx-auto rounded-md bg-zinc-100 px-3 py-0.5 font-mono text-[11px] text-zinc-500">swapit · Material · Bidones PEAD</span>
          <span className="w-12" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-3 p-4 md:flex-row md:items-stretch md:gap-0 md:p-5">
          <section className={`${SUPERFICIE} flex-1 p-4`}>
            <p className={ETIQUETA_COLUMNA}><span className="font-semibold text-emerald-600">01</span>Reporte</p>
            <MensajeWhatsApp />
          </section>
          <Conector />
          <section className={`${SUPERFICIE} flex-1 p-4`}>
            <p className={ETIQUETA_COLUMNA}><span className="font-semibold text-emerald-600">02</span>Cotización</p>
            <PrecioJusto />
          </section>
          <Conector />
          <section className={`${SUPERFICIE} flex-1 p-4`}>
            <p className={ETIQUETA_COLUMNA}><span className="font-semibold text-emerald-600">03</span>Certificado</p>
            <TarjetaCertificado />
          </section>
        </div>
      </div>
    </div>
  );
}
