"use client";

import maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MLMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { circulo } from "@/lib/format";
import { ESTILO } from "./MapView";

// Mapas del marketplace (docs/diseno/estructura-web.md §6): pines con precio en la vista Mapa,
// un punto aproximado en el detalle del producto y un pin que el vendedor mueve al publicar.

type Punto = { lat: number; lng: number };
export interface PinPrecio extends Punto { id: string; etiqueta: string }

const CENTRO: [number, number] = [-80.2, -5.8]; // norte del Perú

const CLASE_PIN = "cursor-pointer whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold shadow-md ring-1 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nav-600";
const PIN_NORMAL = "bg-white text-nav-900 ring-black/10 hover:bg-nav-50";
const PIN_ELEGIDO = "bg-nav-900 text-white ring-nav-900";

function crearMapa(el: HTMLDivElement, centro: [number, number] = CENTRO, zoom = 6.3) {
  const m = new maplibregl.Map({ container: el, style: ESTILO, center: centro, zoom, attributionControl: { compact: true } });
  m.on("error", (e) => console.warn("[mapa]", e.error?.message ?? e));
  m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
  return m;
}

/** Vista Mapa: cada oferta es un pin con su precio; al tocarlo se elige (la mini tarjeta la dibuja la página). */
export function MapaOfertas({ pins, seleccionado, onSelect, origen, className = "h-[60vh]" }: {
  pins: PinPrecio[];
  seleccionado: string | null;
  onSelect: (id: string) => void;
  origen?: Punto | null;
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const marcadores = useRef(new Map<string, { m: Marker; boton: HTMLButtonElement }>());
  const cb = useRef(onSelect);
  cb.current = onSelect;

  useEffect(() => {
    if (!el.current) return;
    const m = crearMapa(el.current);
    map.current = m;
    const actuales = marcadores.current;
    return () => {
      actuales.clear();
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    marcadores.current.forEach(({ m: mk }) => mk.remove());
    marcadores.current.clear();
    const b = new maplibregl.LngLatBounds();
    for (const p of pins) {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = `${CLASE_PIN} ${PIN_NORMAL}`;
      boton.textContent = p.etiqueta;
      boton.setAttribute("aria-label", `Oferta a ${p.etiqueta}`);
      boton.addEventListener("click", (e) => {
        e.stopPropagation();
        cb.current(p.id);
      });
      marcadores.current.set(p.id, { m: new maplibregl.Marker({ element: boton }).setLngLat([p.lng, p.lat]).addTo(m), boton });
      b.extend([p.lng, p.lat]);
    }
    let yo: Marker | null = null;
    if (origen) {
      const punto = document.createElement("span");
      punto.className = "block size-4 rounded-full border-[3px] border-white bg-pri-600 shadow-md";
      punto.title = "Tu zona";
      yo = new maplibregl.Marker({ element: punto }).setLngLat([origen.lng, origen.lat]).addTo(m);
      b.extend([origen.lng, origen.lat]);
    }
    if (!b.isEmpty()) m.fitBounds(b, { padding: 60, maxZoom: 12, duration: 400 });
    return () => {
      yo?.remove();
    };
  }, [pins, origen]);

  useEffect(() => {
    marcadores.current.forEach(({ m: mk, boton }, id) => {
      const elegido = id === seleccionado;
      boton.className = `${CLASE_PIN} ${elegido ? PIN_ELEGIDO : PIN_NORMAL}`;
      mk.getElement().style.zIndex = elegido ? "2" : "";
    });
  }, [seleccionado, pins]);

  return <div ref={el} className={`w-full overflow-hidden rounded-card border border-line ${className}`} />;
}

/**
 * Un solo punto. Con `onChange` el pin se arrastra (o se mueve tocando el mapa): así el vendedor escoge la ubicación.
 * Con `radioKm` se dibuja una zona en lugar de un pin: el comprador ve solo la ubicación aproximada.
 */
export function MapaUbicacion({ punto, onChange, radioKm, zoom = 13, className = "h-56" }: {
  punto: Punto | null;
  onChange?: (p: Punto) => void;
  radioKm?: number;
  zoom?: number;
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const pin = useRef<Marker | null>(null);
  const [listo, setListo] = useState(false);
  const cb = useRef(onChange);
  cb.current = onChange;
  const editable = !!onChange;
  /** El último cambio vino del propio mapa (arrastre o toque): no hay que recentrar. */
  const desdeMapa = useRef(false);
  const mover = (p: Punto) => {
    desdeMapa.current = true;
    cb.current?.(p);
  };

  useEffect(() => {
    if (!el.current) return;
    const m = crearMapa(el.current, punto ? [punto.lng, punto.lat] : CENTRO, punto ? zoom : 6.3);
    m.on("load", () => {
      m.addSource("zona", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "zona-fill", type: "fill", source: "zona", paint: { "fill-color": "#0b6b57", "fill-opacity": 0.15 } });
      m.addLayer({ id: "zona-line", type: "line", source: "zona", paint: { "line-color": "#0b6b57", "line-width": 2 } });
      setListo(true);
    });
    if (editable) {
      m.on("click", (e) => mover({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
    }
    map.current = m;
    return () => {
      pin.current = null;
      m.remove();
      map.current = null;
      setListo(false);
    };
    // El mapa se crea una vez; el punto se sigue en el efecto de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable]);

  useEffect(() => {
    const m = map.current;
    if (!m || !listo) return;
    const zona = m.getSource("zona") as GeoJSONSource | undefined;
    if (!punto) {
      pin.current?.remove();
      pin.current = null;
      zona?.setData({ type: "FeatureCollection", features: [] });
      return;
    }
    if (radioKm) {
      zona?.setData(circulo(punto.lat, punto.lng, radioKm));
    } else if (!pin.current) {
      pin.current = new maplibregl.Marker({ color: "#0b6b57", draggable: editable }).setLngLat([punto.lng, punto.lat]).addTo(m);
      pin.current.on("dragend", () => {
        const p = pin.current!.getLngLat();
        mover({ lat: p.lat, lng: p.lng });
      });
    } else {
      pin.current.setLngLat([punto.lng, punto.lat]);
    }
    // Al arrastrar el pin el mapa no salta; si el punto llegó de fuera (dirección escrita) se centra en él.
    if (desdeMapa.current) desdeMapa.current = false;
    else m.easeTo({ center: [punto.lng, punto.lat], zoom: Math.max(m.getZoom(), zoom - 1), duration: 400 });
  }, [punto, radioKm, listo, editable, zoom]);

  return <div ref={el} className={`w-full overflow-hidden rounded-card border border-line ${className}`} />;
}
