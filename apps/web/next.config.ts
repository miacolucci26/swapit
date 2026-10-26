import type { NextConfig } from "next";

const esDev = process.env.NODE_ENV !== "production";

/** Origen (https://host) de una URL; undefined si no es una URL válida. */
function origen(url: string | undefined): string | undefined {
  try {
    return url ? new URL(url).origin : undefined;
  } catch {
    return undefined;
  }
}

// Orígenes externos que la web usa a propósito. Todo lo demás queda bloqueado por la CSP.
const TESELAS_LIBRES = "https://tiles.openfreemap.org"; // estilo, glifos, sprites y teselas vectoriales del mapa (sin clave)
const MAPBOX = "https://api.mapbox.com"; // solo si hay NEXT_PUBLIC_MAPBOX_TOKEN
const SUPABASE = origen(process.env.NEXT_PUBLIC_SUPABASE_URL); // imágenes subidas cuando el almacenamiento es Supabase Storage
const API = origen(process.env.API_URL); // la web llama a la API por /api (rewrite); se añade por si alguna imagen llega con URL absoluta

const unico = (xs: (string | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x))];

/**
 * Política de seguridad de contenidos. Estática (sin nonce): Next inyecta scripts en línea para hidratar, y un nonce por petición
 * obligaría a renderizar todas las páginas en el servidor en cada visita. Contrapartida: `script-src` conserva 'unsafe-inline';
 * el riesgo se compensa con que no hay `dangerouslySetInnerHTML` ni HTML de terceros en la app y con el resto de directivas.
 * Si más adelante se quiere una CSP estricta, ver docs/seguridad.md (nonce con proxy.ts o SRI experimental de Next).
 */
function csp(): string {
  const mapas = [TESELAS_LIBRES, MAPBOX];
  const directivas: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'unsafe-eval' solo en desarrollo: React lo usa para reconstruir pilas de error; en producción no hace falta.
    "script-src": ["'self'", "'unsafe-inline'", ...(esDev ? ["'unsafe-eval'"] : [])],
    // Tailwind y Next dejan estilos en línea; MapLibre ajusta estilos por CSSOM.
    "style-src": ["'self'", "'unsafe-inline'"],
    // Fotos de lotes (propia API o Supabase Storage), logos, íconos del mapa (data:/blob:) y teselas ráster de Mapbox.
    "img-src": unico(["'self'", "data:", "blob:", SUPABASE, API, ...mapas]),
    "font-src": ["'self'", "data:"],
    // Fetch/XHR: la propia web (que reenvía /api), el estilo/teselas del mapa y, en desarrollo, el HMR por WebSocket.
    "connect-src": unico(["'self'", ...mapas, ...(esDev ? ["ws:", "wss:", "http://localhost:*", API] : [])]),
    // MapLibre calcula en un Web Worker creado desde un blob.
    "worker-src": ["'self'", "blob:"],
    "child-src": ["'self'", "blob:"],
    "media-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "frame-src": ["'none'"],
  };
  return Object.entries(directivas)
    .map(([k, v]) => (v.length ? `${k} ${v.join(" ")}` : k))
    .join("; ");
}

/** Cabeceras para todas las rutas. */
const cabecerasBase = [
  // HSTS solo en producción (en http://localhost no tiene efecto y confunde). 2 años, subdominios incluidos.
  ...(esDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
  { key: "X-Content-Type-Options", value: "nosniff" },
  // frame-ancestors de la CSP ya lo cubre; X-Frame-Options por compatibilidad con navegadores antiguos.
  { key: "X-Frame-Options", value: "DENY" },
  // Hacia otros sitios solo viaja el origen (nunca la ruta: el enlace de captación lleva un token secreto).
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // La app no usa cámara ni micrófono ni ubicación del dispositivo. (Subir una foto usa <input type=file>, que no necesita el permiso de cámara.)
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), serial=(), browsing-topics=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@swapit/shared"],
  poweredByHeader: false,
  async rewrites() {
    const api = process.env.API_URL ?? "http://localhost:4000";
    return [{ source: "/api/:path*", destination: `${api}/api/:path*` }];
  },
  async headers() {
    return [
      { source: "/:path*", headers: cabecerasBase },
      // La CSP va en las páginas, no en /api/* (esas respuestas vienen de la API, que pone las suyas, p. ej. la de los SVG de demo).
      { source: "/((?!api/).*)", headers: [{ key: "Content-Security-Policy", value: csp() }] },
      // El enlace de captación es una credencial: sin referrer, sin caché y fuera de los buscadores.
      {
        source: "/captacion/:token*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
