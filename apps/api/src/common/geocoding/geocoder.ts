import { Injectable, Logger } from '@nestjs/common';

export interface Coordenadas {
  lat: number;
  lng: number;
  fuente: 'mapbox' | 'aproximada';
}

export abstract class Geocoder {
  abstract geocodificar(direccion: string): Promise<Coordenadas | null>;
}

// Centros aproximados de las zonas industriales del norte del Perú (fallback sin API key).
const ZONAS: [string, number, number][] = [
  ['sullana', -4.9039, -80.6853],
  ['paita', -5.0892, -81.1144],
  ['talara', -4.5772, -81.2719],
  ['sechura', -5.5569, -80.8222],
  ['piura', -5.1945, -80.6328],
  ['chiclayo', -6.7714, -79.8409],
  ['lambayeque', -6.7011, -79.9061],
  ['ferreñafe', -6.6386, -79.7889],
  ['olmos', -5.9833, -79.7333],
  ['motupe', -6.15, -79.7167],
  ['trujillo', -8.1116, -79.0288],
  ['chao', -8.5333, -78.6833],
  ['tumbes', -3.5669, -80.4515],
];

/** Desplazamiento determinista (~±2 km) para que dos direcciones de una misma ciudad no coincidan. */
function jitter(texto: string): [number, number] {
  let h = 0;
  for (const c of texto) h = (h * 31 + c.charCodeAt(0)) | 0;
  const a = ((h & 0xffff) / 0xffff - 0.5) * 0.036;
  const b = (((h >>> 16) & 0xffff) / 0xffff - 0.5) * 0.036;
  return [a, b];
}

/** Sin token: ubica por nombre de ciudad. Con MAPBOX_TOKEN: geocodifica la dirección exacta. */
@Injectable()
export class MapboxGeocoder extends Geocoder {
  private readonly log = new Logger(MapboxGeocoder.name);

  async geocodificar(direccion: string): Promise<Coordenadas | null> {
    const token = process.env.MAPBOX_TOKEN;
    if (token) {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(direccion)}.json?country=pe&limit=1&language=es&access_token=${token}`;
        const res = await fetch(url);
        const data: any = await res.json();
        const f = data.features?.[0];
        if (f?.center) return { lng: f.center[0], lat: f.center[1], fuente: 'mapbox' };
      } catch (e) {
        this.log.warn(`Mapbox falló (${(e as Error).message}); uso ubicación aproximada`);
      }
    }
    return this.aproximada(direccion);
  }

  aproximada(direccion: string): Coordenadas | null {
    const t = direccion.toLowerCase();
    const zona = ZONAS.find(([n]) => t.includes(n));
    if (!zona) return null;
    const [dLat, dLng] = jitter(t);
    return { lat: zona[1] + dLat, lng: zona[2] + dLng, fuente: 'aproximada' };
  }
}
