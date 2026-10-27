"use client";

import maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { circulo } from "@/lib/format";

export interface Punto {
  id: string;
  lat: number;
  lng: number;
  modalidad?: string;
  titulo?: string;
  peso?: number;
}

interface Props {
  puntos: Punto[];
  origen?: { lat: number; lng: number } | null;
  radioKm?: number | null;
  modo?: "lotes" | "calor";
  seleccionado?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
// Mapa base: OpenFreeMap (vectorial, gratuito y SIN clave; datos © OpenStreetMap). CARTO dejó de servir sus teselas
// raster sin API key (mostraba «API KEY REQUIRED»). Con NEXT_PUBLIC_MAPBOX_TOKEN se usa Mapbox.
const ESTILO_LIBRE = "https://tiles.openfreemap.org/styles/positron";
export const ESTILO: string | maplibregl.StyleSpecification = TOKEN
  ? {
      version: 8,
      glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
      sources: {
        base: {
          type: "raster",
          tiles: [`https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${TOKEN}`],
          tileSize: 256,
          attribution: "© Mapbox © OpenStreetMap",
        },
      },
      layers: [{ id: "base", type: "raster", source: "base" }],
    }
  : ESTILO_LIBRE;

type Feat = { type: "Feature"; properties: Record<string, unknown>; geometry: { type: "Point"; coordinates: number[] } | { type: "Polygon"; coordinates: number[][][] } };
const vacio = { type: "FeatureCollection" as const, features: [] as Feat[] };
const aFeatures = (p: Punto[]) => ({
  type: "FeatureCollection" as const,
  features: p.map((x) => ({
    type: "Feature" as const,
    properties: { id: x.id, modalidad: x.modalidad ?? "", titulo: x.titulo ?? "", peso: x.peso ?? 1 },
    geometry: { type: "Point" as const, coordinates: [x.lng, x.lat] },
  })),
});

export default function MapView({ puntos, origen, radioKm, modo = "lotes", seleccionado, onSelect, className = "h-[420px]" }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const [listo, setListo] = useState(false);
  const cb = useRef(onSelect);
  cb.current = onSelect;

  // Crear el mapa una vez
  useEffect(() => {
    if (!el.current) return;
    const m = new maplibregl.Map({ container: el.current, style: ESTILO, center: [-80.2, -5.8], zoom: 6.3, attributionControl: { compact: true } });
    m.on("error", (e) => console.warn("[mapa]", e.error?.message ?? e));
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    m.on("load", () => {
      m.addSource("radio", { type: "geojson", data: vacio });
      m.addLayer({ id: "radio-fill", type: "fill", source: "radio", paint: { "fill-color": "#2d4a78", "fill-opacity": 0.08 } });
      m.addLayer({ id: "radio-line", type: "line", source: "radio", paint: { "line-color": "#2d4a78", "line-width": 1.5, "line-dasharray": [2, 2] } });

      // «Tu planta»: capa del mapa (no un marcador HTML) para que quede debajo de los números de los clusters.
      m.addSource("origen", { type: "geojson", data: vacio });
      m.addLayer({ id: "origen-halo", type: "circle", source: "origen", paint: { "circle-radius": 14, "circle-color": "rgba(255,138,0,0.28)" } });
      m.addLayer({ id: "origen-punto", type: "circle", source: "origen", paint: { "circle-radius": 8, "circle-color": "#0b6b57", "circle-stroke-width": 3, "circle-stroke-color": "#fff" } });

      m.addSource("puntos", { type: "geojson", data: vacio, cluster: modo === "lotes", clusterRadius: 42, clusterMaxZoom: 11 });
      if (modo === "lotes") {
        m.addLayer({
          id: "clusters", type: "circle", source: "puntos", filter: ["has", "point_count"],
          paint: { "circle-color": ["step", ["get", "point_count"], "#41608e", 5, "#2d4a78", 10, "#162c4d"], "circle-radius": ["step", ["get", "point_count"], 17, 5, 22, 10, 28], "circle-stroke-width": 3, "circle-stroke-color": "rgba(255,255,255,0.75)" },
        });
        m.addLayer({
          id: "cluster-count", type: "symbol", source: "puntos", filter: ["has", "point_count"],
          layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Bold"], "text-size": 13 },
          paint: { "text-color": "#fff" },
        });
        m.addLayer({
          id: "punto", type: "circle", source: "puntos", filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-radius": 9,
            "circle-color": ["match", ["get", "modalidad"], "VENTA", "#2d4a78", "DONACION", "#0b6b57", "CREDITOS", "#64748b", "INTERCAMBIO", "#7a5fc0", "#56667d"],
            "circle-stroke-width": 3, "circle-stroke-color": "#fff",
          },
        });
        m.addLayer({ id: "punto-sel", type: "circle", source: "puntos", filter: ["==", ["get", "id"], ""], paint: { "circle-radius": 15, "circle-color": "rgba(0,0,0,0)", "circle-stroke-width": 3, "circle-stroke-color": "#0f172a" } });

        m.on("click", "clusters", async (e: maplibregl.MapLayerMouseEvent) => {
          const f = m.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
          const src = m.getSource("puntos") as GeoJSONSource;
          const z = await src.getClusterExpansionZoom(f.properties.cluster_id);
          m.easeTo({ center: (f.geometry as unknown as { coordinates: [number, number] }).coordinates, zoom: z });
        });
        m.on("click", "punto", (e: maplibregl.MapLayerMouseEvent) => {
          const id = e.features?.[0]?.properties?.id;
          if (id) cb.current?.(id);
        });
        for (const l of ["clusters", "punto"]) {
          m.on("mouseenter", l, () => (m.getCanvas().style.cursor = "pointer"));
          m.on("mouseleave", l, () => (m.getCanvas().style.cursor = ""));
        }
      } else {
        m.addLayer({
          id: "calor", type: "heatmap", source: "puntos",
          paint: {
            "heatmap-weight": ["interpolate", ["linear"], ["get", "peso"], 0, 0.2, 60, 1],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 5, 28, 10, 60],
            "heatmap-intensity": 1.2,
            "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(16,185,129,0)", 0.25, "rgba(110,231,183,0.55)", 0.5, "rgba(250,204,21,0.75)", 0.75, "rgba(249,115,22,0.85)", 1, "rgba(220,38,38,0.9)"],
          },
        });
        m.addLayer({ id: "calor-pts", type: "circle", source: "puntos", minzoom: 7, paint: { "circle-radius": 5, "circle-color": "#065f46", "circle-stroke-width": 2, "circle-stroke-color": "#fff" } });
      }
      setListo(true);
    });
    map.current = m;
    if (process.env.NODE_ENV !== "production") (window as unknown as { __swapitMap?: MLMap }).__swapitMap = m; // depuración en desarrollo
    return () => {
      m.remove();
      map.current = null;
      setListo(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo]);

  // Datos, radio y encuadre
  useEffect(() => {
    const m = map.current;
    if (!m || !listo || !m.getSource("puntos") || !m.getSource("radio") || !m.getSource("origen")) return; // StrictMode: el mapa recreado aún no cargó sus capas
    (m.getSource("puntos") as GeoJSONSource).setData(aFeatures(puntos));
    (m.getSource("radio") as GeoJSONSource).setData(origen && radioKm ? circulo(origen.lat, origen.lng, radioKm) : vacio);

    (m.getSource("origen") as GeoJSONSource).setData(origen ? aFeatures([{ id: "origen", lat: origen.lat, lng: origen.lng }]) : vacio);

    const b = new maplibregl.LngLatBounds();
    puntos.forEach((p) => b.extend([p.lng, p.lat]));
    if (origen) b.extend([origen.lng, origen.lat]);
    if (radioKm && origen) {
      const r = radioKm / 111;
      b.extend([origen.lng - r, origen.lat - r]);
      b.extend([origen.lng + r, origen.lat + r]);
    }
    if (!b.isEmpty()) m.fitBounds(b, { padding: 50, maxZoom: 11, duration: 500 });
  }, [puntos, origen, radioKm, listo]);

  useEffect(() => {
    const m = map.current;
    if (!m || !listo || modo !== "lotes" || !m.getLayer("punto-sel")) return;
    m.setFilter("punto-sel", ["==", ["get", "id"], seleccionado ?? ""]);
  }, [seleccionado, listo, modo]);

  return <div ref={el} className={`w-full overflow-hidden rounded-card border border-line ${className}`} />;
}
