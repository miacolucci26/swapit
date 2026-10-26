"use client";

import { useEffect, useRef, useState } from "react";
import PublicNav from "../PublicNav";
import { LinkBtn } from "../ui";

/**
 * Hero a pantalla completa con escena día/noche (concepto inspirado en «Elsewhere», de @gughigug en 21st.dev; implementación propia).
 * El fondo es una foto del valle (public/hero-valle.webp); el interruptor cambia de día a noche con un fundido, y el paisaje
 * sonoro opcional se genera en el navegador con Web Audio (sin archivos): notas suaves de día, cigarras de noche. Silencio por defecto.
 */

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

/** Fondo: la foto del valle; de noche se oscurece y vira a azul con filtros (la misma imagen, sin un segundo archivo). */
function Fondo({ noche }: { noche: boolean }) {
  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden bg-sky-700">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero-valle.webp"
        alt=""
        fetchPriority="high"
        className={`size-full object-cover object-[50%_85%] transition-[filter] duration-[1400ms] ease-in-out motion-reduce:transition-none ${noche ? "brightness-[0.38] contrast-110 hue-rotate-[200deg] saturate-[0.8]" : "brightness-100"}`}
      />
      <div className={`absolute inset-0 bg-indigo-950/40 transition-opacity duration-[1400ms] motion-reduce:transition-none ${noche ? "opacity-100" : "opacity-0"}`} />
      {/* Velos: contraste del texto arriba y fusión con la página abajo */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/35" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-zinc-50" />
    </div>
  );
}

/** Hero de la portada: escena día/noche, panel de cristal con el título y los CTA. */
export default function HeroDiaNoche() {
  const [noche, setNoche] = useState(false);
  const [sonido, setSonido] = useState(false);
  useSonido(sonido, noche);

  return (
    <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden text-white" aria-label="Presentación">
      <Fondo noche={noche} />
      <PublicNav sobreHero />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 pb-40 pt-28 text-center md:pb-48">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
          <span className="relative flex size-2" aria-hidden="true">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300 opacity-70 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          Piura · Lambayeque
        </p>
        <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight [text-shadow:0_2px_30px_rgba(0,0,0,0.4)] sm:text-6xl md:text-8xl">Acopia con precio justo.</h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-white/90 [text-shadow:0_1px_16px_rgba(0,0,0,0.5)] md:text-xl">Tus proveedores reportan por WhatsApp. Tú cotizas con precio de referencia y certificas cada despacho.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <LinkBtn href="/login" className="min-h-12 rounded-full bg-white px-7 text-zinc-900 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.5)] hover:bg-zinc-100">Probar la demo</LinkBtn>
          <LinkBtn href="/registro" variante="borde" className="min-h-12 rounded-full border-white/40 bg-white/10 px-7 text-white backdrop-blur-md hover:border-white/60 hover:bg-white/20">Crear cuenta</LinkBtn>
        </div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-center gap-2 px-4 pb-24 md:justify-end md:pb-28">
        <BotonSonido activo={sonido} onChange={setSonido} />
        <Interruptor noche={noche} onChange={setNoche} />
      </div>
    </section>
  );
}
