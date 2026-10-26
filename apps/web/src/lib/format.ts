export const soles = (n: number | null | undefined) =>
  n == null ? "—" : `S/ ${n.toLocaleString("es-PE", { maximumFractionDigits: 0 })}`;

export const num = (n: number | null | undefined, dec = 1) =>
  n == null ? "—" : n.toLocaleString("es-PE", { maximumFractionDigits: dec });

export const fecha = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const hora = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }) : "";

export const MODALIDAD: Record<string, { etiqueta: string; corta: string; color: string; punto: string; ayuda: string }> = {
  VENTA: { etiqueta: "Venta directa", corta: "Venta", color: "bg-nav-50 text-nav-700", punto: "#2d4a78", ayuda: "Pago en soles con retención en garantía hasta la entrega." },
  DONACION: { etiqueta: "Donación", corta: "Donación", color: "bg-pri-50 text-pri-700", punto: "#0b6b57", ayuda: "Sin costo por el material. Ganas créditos circulares al confirmarse la entrega." },
  CREDITOS: { etiqueta: "Créditos circulares", corta: "Créditos", color: "bg-surface-2 text-ink-700", punto: "#64748b", ayuda: "El receptor paga con créditos internos de la plataforma." },
  INTERCAMBIO: { etiqueta: "Intercambio directo", corta: "Intercambio", color: "bg-surface-2 text-ink-700", punto: "#7a5fc0", ayuda: "Sin dinero de por medio: se acuerda a cambio de otro lote o artículo." },
};

/** Grupo de color (punto de categoría) y nombre legible de cada categoría de material. */
export type GrupoCategoria = "agro" | "pesca" | "textil" | "plastico" | "otros";
export const GRUPO_CATEGORIA: Record<string, { grupo: GrupoCategoria; nombre: string }> = {
  ORGANICO_AGRO: { grupo: "agro", nombre: "Orgánico agro" },
  BIOMASA: { grupo: "agro", nombre: "Biomasa" },
  PESCA_MARISCOS: { grupo: "pesca", nombre: "Pesca y mariscos" },
  TEXTIL: { grupo: "textil", nombre: "Textil" },
  PLASTICO: { grupo: "plastico", nombre: "Plástico" },
  PLASTICO_PET: { grupo: "plastico", nombre: "Plástico PET" },
  PLASTICO_PEAD: { grupo: "plastico", nombre: "Plástico PEAD" },
  PLASTICO_PP: { grupo: "plastico", nombre: "Plástico PP" },
  PLASTICO_FILM: { grupo: "plastico", nombre: "Film plástico" },
  PLASTICO_PVC: { grupo: "plastico", nombre: "Plástico PVC" },
  PLASTICO_MIXTO: { grupo: "plastico", nombre: "Plástico mixto" },
  METAL: { grupo: "otros", nombre: "Metal" },
  PAPEL_CARTON: { grupo: "otros", nombre: "Papel y cartón" },
  CONSTRUCCION: { grupo: "otros", nombre: "Construcción" },
  ARTICULOS_PERSONALES: { grupo: "otros", nombre: "Artículos personales" },
  MAQUINARIA_EQUIPOS: { grupo: "otros", nombre: "Maquinaria y equipos" },
  INSUMOS_RECICLADOS: { grupo: "otros", nombre: "Insumos reciclados" },
  MADERA_PALLETS: { grupo: "otros", nombre: "Madera y pallets" },
  VIDRIO_CERAMICA: { grupo: "otros", nombre: "Vidrio y cerámica" },
  ACEITES_USADOS: { grupo: "otros", nombre: "Aceites usados" },
  RAEE: { grupo: "otros", nombre: "RAEE" },
  OTROS: { grupo: "otros", nombre: "Otros" },
};

export const CATEGORIA: Record<string, { emoji: string; from: string; to: string }> = {
  ORGANICO_AGRO: { emoji: "🍇", from: "#15803d", to: "#65a30d" },
  BIOMASA: { emoji: "🌾", from: "#b45309", to: "#ca8a04" },
  TEXTIL: { emoji: "🧵", from: "#7c3aed", to: "#db2777" },
  PLASTICO: { emoji: "♻️", from: "#0369a1", to: "#0891b2" },
  METAL: { emoji: "🔩", from: "#475569", to: "#71717a" },
  PAPEL_CARTON: { emoji: "📦", from: "#92400e", to: "#a16207" },
  CONSTRUCCION: { emoji: "🧱", from: "#9a3412", to: "#b45309" },
  ARTICULOS_PERSONALES: { emoji: "🎒", from: "#be185d", to: "#f97316" },
  MAQUINARIA_EQUIPOS: { emoji: "⚙️", from: "#334155", to: "#0f766e" },
  INSUMOS_RECICLADOS: { emoji: "🔁", from: "#0d9488", to: "#65a30d" },
  PESCA_MARISCOS: { emoji: "🐚", from: "#0e7490", to: "#0891b2" },
  MADERA_PALLETS: { emoji: "🪵", from: "#78350f", to: "#a16207" },
  VIDRIO_CERAMICA: { emoji: "🫙", from: "#0f766e", to: "#0284c7" },
  ACEITES_USADOS: { emoji: "🛢️", from: "#a16207", to: "#b45309" },
  RAEE: { emoji: "💻", from: "#4338ca", to: "#0369a1" },
  PLASTICO_PET: { emoji: "🧴", from: "#0369a1", to: "#0891b2" },
  PLASTICO_PEAD: { emoji: "🪣", from: "#1d4ed8", to: "#0369a1" },
  PLASTICO_PP: { emoji: "🧺", from: "#0e7490", to: "#0d9488" },
  PLASTICO_FILM: { emoji: "🛍️", from: "#0284c7", to: "#38bdf8" },
  PLASTICO_PVC: { emoji: "🚰", from: "#475569", to: "#0369a1" },
  PLASTICO_MIXTO: { emoji: "🔀", from: "#57534e", to: "#0369a1" },
  OTROS: { emoji: "🔄", from: "#57534e", to: "#78716c" },
};

export const corto = (nombre: string) => nombre.split("(")[0].trim();

/** Sufijo del precio según la unidad del lote: "/t", "/kg" o "/und." */
export const porUnidad = (unidad: string) => (unidad === "kg" ? "/kg" : unidad === "und" ? "/und." : "/t");

export const CONDICION: Record<string, string> = {
  NUEVO: "Nuevo",
  COMO_NUEVO: "Como nuevo",
  BUEN_ESTADO: "Buen estado",
  USO_VISIBLE: "Con señales de uso",
  PARA_REPARAR: "Para reparar o repuestos",
};

export const ENTREGA: Record<string, { corta: string; etiqueta: string; ayuda: string }> = {
  RECOJO_RECEPTOR: { corta: "Lo recoge quien lo recibe", etiqueta: "Lo recoge quien lo recibe", ayuda: "Se coordina el recojo en el lugar del publicador." },
  PUNTO_ENCUENTRO: { corta: "Punto de encuentro público", etiqueta: "Nos encontramos en un punto público", ayuda: "Elijan un lugar público y concurrido (plaza, centro comercial, puerta de la universidad) y a plena luz." },
  ENVIO_OFERTANTE: { corta: "Yo lo llevo o lo envío", etiqueta: "Yo lo llevo o lo envío", ayuda: "El publicador se encarga del traslado; acuerden antes quién paga el flete." },
};

export const FRECUENCIA: Record<string, string> = { UNICO: "Lote único", RECURRENTE: "Recurrente", ESTACIONAL: "Estacional" };

/** Círculo geodésico aproximado como polígono GeoJSON (para dibujar el radio de búsqueda). */
export function circulo(lat: number, lng: number, km: number, pasos = 64) {
  const coords: [number, number][] = [];
  for (let i = 0; i <= pasos; i++) {
    const a = (i / pasos) * 2 * Math.PI;
    const dLat = (km / 111.32) * Math.sin(a);
    const dLng = (km / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.cos(a);
    coords.push([lng + dLng, lat + dLat]);
  }
  return { type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [coords] } };
}

/** Precio por unidad del lote con los decimales que corresponden: por tonelada sin decimales; por kilo o unidad con dos. */
export const precioUnidad = (n: number | null | undefined, unidad: string) =>
  n == null ? "—" : `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: unidad === "ton" ? 0 : 2, maximumFractionDigits: unidad === "ton" ? 0 : 2 })}${porUnidad(unidad)}`;

export const VIA_REPORTE: Record<string, { icono: string; etiqueta: string }> = {
  PORTAL: { icono: "🔗", etiqueta: "Portal" },
  WHATSAPP: { icono: "💬", etiqueta: "WhatsApp" },
  INTERMEDIARIO: { icono: "☎️", etiqueta: "Registrado por ti" },
};

/** Enlace de WhatsApp (wa.me) para escribirle a un proveedor; el teléfono debe estar en formato E.164. */
export const enlaceWhatsapp = (telefono: string | null | undefined, texto: string) =>
  telefono ? `https://wa.me/${telefono.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}` : null;
