import { contactoVisibleEn } from '@swapit/shared';

export interface ContactoContraparte {
  /** Persona de contacto de la otra empresa (si la registró). */
  nombre: string | null;
  /** Teléfono en formato E.164 (+51987654321), si la otra empresa lo registró. */
  telefono: string | null;
  /** Enlace wa.me con un mensaje prellenado; null si no hay teléfono. */
  whatsappUrl: string | null;
  mensajeSugerido: string;
}

/** Enlace de WhatsApp (wa.me) con texto prellenado. Solo dígitos en el número, texto codificado. */
export function construirWhatsappUrl(telefonoE164: string | null | undefined, texto: string): string | null {
  const digitos = (telefonoE164 ?? '').replace(/\D/g, '');
  if (!/^\d{8,15}$/.test(digitos)) return null;
  return `https://wa.me/${digitos}?text=${encodeURIComponent(texto)}`;
}

/**
 * Datos de contacto de la contraparte. Regla de privacidad: SOLO cuando la transacción está ACORDADA o más avanzada (y no
 * cancelada) y SOLO para una de las dos partes. Antes del acuerdo la conversación ocurre dentro de la plataforma; nadie más
 * (ni un tercero ni un administrador ajeno a la operación) recibe estos datos por este camino.
 */
export function contactoDeContraparte(args: {
  estado: string;
  esParte: boolean;
  contraparte: { contactoNombre: string | null; telefono: string | null };
  tituloLote: string;
  cantidadTexto: string;
}): ContactoContraparte | null {
  if (!args.esParte || !contactoVisibleEn(args.estado)) return null;
  const nombre = args.contraparte.contactoNombre;
  const telefono = args.contraparte.telefono;
  const mensajeSugerido = `Hola${nombre ? ` ${nombre.split(' ')[0]}` : ''}, te escribo por el acuerdo en Swap It: ${args.tituloLote} (${args.cantidadTexto}). ¿Coordinamos el recojo y la entrega?`;
  return { nombre, telefono, whatsappUrl: construirWhatsappUrl(telefono, mensajeSugerido), mensajeSugerido };
}
