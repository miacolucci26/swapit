"use client";

import { useEffect, useRef, useState } from "react";
import { LinkBtn } from "../ui";

/**
 * Hero a pantalla completa con escena día/noche (concepto inspirado en «Elsewhere», de @gughigug en 21st.dev; implementación propia).
 * El fondo es una escena CSS/SVG (sin video ni imágenes); el interruptor cambia de día a noche con un fundido, y el paisaje
 * sonoro opcional se genera en el navegador con Web Audio (sin archivos): notas suaves de día, cigarras de noche. Silencio por defecto.
 */

// Posiciones fijas (porcentaje) para que el render sea determinista entre servidor y cliente.
const ESTRELLAS: [number, number, number][] = [
  [8, 12, 2], [15, 30, 1], [22, 8, 1], [31, 22, 2], [38, 10, 1], [46, 28, 1], [54, 7, 2], [61, 19, 1],
  [68, 33, 1], [74, 11, 2], [82, 25, 1], [89, 9, 1], [93, 31, 2], [12, 44, 1], [27, 38, 1], [49, 41, 1],
  [71, 45, 1], [86, 42, 1],
];

const NOTAS_HZ = [261.63, 329.63, 392.0, 440.0, 523.25, 659.25]; // pentatónica de Do

function useSonido(activo: boolean, noche: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  useEffect(() => {
    if (!activo) return;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = ctxRef.current ?? new Ctx();
    ctxRef.current = ctx;
    void ctx.resume();
    const maestro = ctx.createGain();
    maestro.gain.value = 0.5;
    maestro.connect(ctx.destination);
    const limpiar: (() => void)[] = [() => maestro.disconnect()];

    if (!noche) {
      // Día: notas sueltas, suaves, con ataque y caída largos.
      const nota = () => {
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = NOTAS_HZ[Math.floor(Math.random() * NOTAS_HZ.length)];
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.06, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
        osc.connect(g).connect(maestro);
        osc.start(t);
        osc.stop(t + 2.7);
      };
      nota();
      const id = window.setInterval(nota, 2200);
      limpiar.push(() => window.clearInterval(id));
    } else {
      // Noche: ruido de banda estrecha modulado en amplitud (cigarras).
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const datos = buf.getChannelData(0);
      for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;
      const ruido = ctx.createBufferSource();
      ruido.buffer = buf;
      ruido.loop = true;
      const filtro = ctx.createBiquadFilter();
      filtro.type = "bandpass";
      filtro.frequency.value = 4600;
      filtro.Q.value = 9;
      const g = ctx.createGain();
      g.gain.value = 0.03;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 17;
      const profundidad = ctx.createGain();
      profundidad.gain.value = 0.03;
      lfo.connect(profundidad).connect(g.gain);
      ruido.connect(filtro).connect(g).connect(maestro);
      ruido.start();
      lfo.start();
      limpiar.push(() => {
        ruido.stop();
        lfo.stop();
      });
    }
    return () => limpiar.forEach((f) => f());
  }, [activo, noche]);
  useEffect(() => () => void ctxRef.current?.close(), []);
}

function Interruptor({ noche, onChange }: { noche: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={noche}
      aria-label="Modo noche de la ilustración"
      onClick={() => onChange(!noche)}
      className="relative inline-flex h-9 w-[72px] shrink-0 items-center rounded-full border border-white/25 bg-white/10 p-1 shadow-[0_1px_0_rgba(255,255,255,0.25)_inset] backdrop-blur-xl transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <span aria-hidden="true" className="absolute left-2.5 text-[13px]">☀</span>
      <span aria-hidden="true" className="absolute right-2.5 text-[13px] text-white">☾</span>
      <span aria-hidden="true" className={`relative size-7 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.3)] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${noche ? "translate-x-[36px]" : "translate-x-0"}`} />
    </button>
  );
}

function BotonSonido({ activo, onChange }: { activo: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={() => onChange(!activo)}
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 text-xs font-medium text-white shadow-[0_1px_0_rgba(255,255,255,0.25)_inset] backdrop-blur-xl transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5L6 9H2v6h4l5 4V5z" />
        {activo ? <path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" /> : <path d="M22 9l-6 6M16 9l6 6" />}
      </svg>
      {activo ? "Sonido activado" : "Sonido apagado"}
    </button>
  );
}

/** Escena de fondo: dos cielos que se funden, astro, estrellas, nubes y colinas. Decorativa (aria-hidden). */
function Escena({ noche }: { noche: boolean }) {
  const fundido = "transition-opacity duration-[1200ms] ease-in-out motion-reduce:transition-none";
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-b from-sky-600 via-teal-400 to-emerald-200 ${fundido} ${noche ? "opacity-0" : "opacity-100"}`} />
      <div className={`absolute inset-0 bg-gradient-to-b from-zinc-950 via-indigo-950 to-teal-900 ${fundido} ${noche ? "opacity-100" : "opacity-0"}`} />

      {/* Sol y luna: suben y bajan por el cielo */}
      <div className={`absolute left-[72%] top-[16%] size-24 rounded-full bg-amber-100 shadow-[0_0_80px_30px_rgba(253,230,138,0.55)] transition-all duration-[1400ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none md:size-32 ${noche ? "translate-y-[120%] opacity-0" : "translate-y-0 opacity-100"}`} />
      <div className={`absolute left-[22%] top-[14%] size-20 rounded-full bg-zinc-100 shadow-[0_0_70px_18px_rgba(199,210,254,0.35)] transition-all duration-[1400ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none md:size-24 ${noche ? "translate-y-0 opacity-100" : "-translate-y-[120%] opacity-0"}`}>
        <span className="absolute left-[58%] top-[24%] size-4 rounded-full bg-zinc-300/70" />
        <span className="absolute left-[24%] top-[56%] size-5 rounded-full bg-zinc-300/60" />
      </div>

      {/* Estrellas */}
      <div className={`absolute inset-0 ${fundido} ${noche ? "opacity-100" : "opacity-0"}`}>
        {ESTRELLAS.map(([x, y, t], i) => (
          <span key={i} className={`absolute rounded-full bg-white ${t === 2 ? "size-[3px]" : "size-0.5"} ${i % 3 === 0 ? "animate-pulse motion-reduce:animate-none" : ""}`} style={{ left: `${x}%`, top: `${y}%` }} />
        ))}
      </div>

      {/* Nubes (solo de día) */}
      <div className={`absolute inset-0 ${fundido} ${noche ? "opacity-0" : "opacity-100"}`}>
        <span className="absolute left-[10%] top-[24%] h-8 w-44 rounded-full bg-white/50 blur-xl" />
        <span className="absolute left-[48%] top-[14%] h-7 w-56 rounded-full bg-white/40 blur-xl" />
        <span className="absolute left-[64%] top-[38%] h-6 w-40 rounded-full bg-white/35 blur-xl" />
      </div>

      {/* Colinas: tres planos, el color cambia con el modo */}
      <svg viewBox="0 0 1440 360" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[38%] w-full">
        <path d="M0 150 C 240 70 420 130 640 100 C 900 60 1120 140 1440 90 L1440 360 L0 360 Z" className={`transition-colors duration-[1200ms] motion-reduce:transition-none ${noche ? "fill-teal-900/70" : "fill-emerald-300/80"}`} />
        <path d="M0 210 C 200 150 440 230 700 180 C 960 130 1180 220 1440 170 L1440 360 L0 360 Z" className={`transition-colors duration-[1200ms] motion-reduce:transition-none ${noche ? "fill-emerald-950" : "fill-emerald-500"}`} />
        <path d="M0 280 C 260 230 520 300 780 260 C 1040 220 1240 290 1440 250 L1440 360 L0 360 Z" className={`transition-colors duration-[1200ms] motion-reduce:transition-none ${noche ? "fill-zinc-950" : "fill-emerald-700"}`} />
      </svg>
      {/* Velo para asegurar el contraste del texto */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/30" />
    </div>
  );
}

/** Hero de la portada: escena día/noche, panel de cristal con el título y los CTA. */
export default function HeroDiaNoche() {
  const [noche, setNoche] = useState(false);
  const [sonido, setSonido] = useState(false);
  useSonido(sonido, noche);

  return (
    <section className="relative isolate flex min-h-[calc(100svh-57px)] flex-col overflow-hidden text-white" aria-label="Presentación">
      <Escena noche={noche} />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 pb-32 pt-10 text-center md:pb-40">
        <div className="w-full max-w-2xl rounded-3xl border border-white/20 bg-white/10 p-6 shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_30px_80px_-30px_rgba(0,0,0,0.6)] backdrop-blur-2xl md:p-10">
          <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300 opacity-70 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            Piura · Lambayeque
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight [text-shadow:0_2px_24px_rgba(0,0,0,0.35)] md:text-6xl">Acopia con precio justo.</h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/85 md:text-lg">Tus proveedores reportan por WhatsApp. Tú cotizas con precio de referencia y certificas cada despacho.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <LinkBtn href="/login" className="min-h-11 rounded-xl bg-emerald-500 px-6 text-white shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_8px_24px_-8px_rgba(16,185,129,0.8)] hover:bg-emerald-400">Probar la demo</LinkBtn>
            <LinkBtn href="/registro" variante="borde" className="min-h-11 rounded-xl border-white/30 bg-white/10 px-6 text-white backdrop-blur hover:border-white/50 hover:bg-white/20">Crear cuenta</LinkBtn>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-center gap-2 px-4 pb-24 md:justify-end md:pb-28">
        <BotonSonido activo={sonido} onChange={setSonido} />
        <Interruptor noche={noche} onChange={setNoche} />
      </div>
    </section>
  );
}
