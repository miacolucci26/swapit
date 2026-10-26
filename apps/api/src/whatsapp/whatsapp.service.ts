import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ETIQUETA_ESTADO_LOTE, extraerCantidad, formatoCantidad, normalizarTelefono, posicionPrecio, precioPorTon, type EstadoLote } from '@swapit/shared';
import { BenchmarkService } from '../benchmark/benchmark.service';
import { limitar } from '../common/limite-tasa';
import { GeminiService } from '../ia/gemini.service';
import { IaService } from '../ia/ia.service';
import { MaterialService } from '../material/material.service';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappProvider } from './whatsapp.provider';

type Paso = 'INICIO' | 'DESCRIPCION' | 'CANTIDAD' | 'PRECIO' | 'CONFIRMAR';
interface Borrador {
  descripcion?: string;
  categoriaCodigo?: string;
  categoriaNombre?: string;
  requiereRevision?: boolean;
  cantidad?: number;
  unidad?: 'kg' | 'ton';
  precioEsperado?: number | null;
}

/** El teléfono que manda Meta viene sin «+» («51987654321»): se lleva al formato E.164 que guardamos. */
export function aE164(t: string) {
  const limpio = t.replace(/[\s().-]/g, '');
  return /^\d{10,15}$/.test(limpio) ? `+${limpio}` : normalizarTelefono(limpio);
}

const SI = /^(s[ií]|sip|ok|okey|dale|claro|confirmo|confirmado|enviar|env[ií]alo|1)$/i;
const NO = /^(no|nop|cancelar|cancela|2)$/i;
const SIN_PRECIO = /^(no s[eé]|no lo s[eé]|ns|omitir|ninguno|n\/a|-|no)$/i;
const AYUDA = 'Puedes escribirme «hola» para reportar material, «estado» para ver tus reportes o «cancelar» para empezar de nuevo.';

/**
 * Conversación guiada por WhatsApp para que un proveedor reporte material sin abrir el formulario:
 * material → cantidad → precio → confirmación. Es determinista (no usa IA generativa): reutiliza el clasificador y el
 * benchmark, y crea el mismo lote REPORTADO que el portal. El envío real está detrás de `WhatsappProvider`.
 */
@Injectable()
export class WhatsappService {
  private readonly log = new Logger(WhatsappService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: WhatsappProvider,
    private readonly ia: IaService,
    private readonly benchmark: BenchmarkService,
    private readonly material: MaterialService,
    private readonly gemini: GeminiService,
  ) {}

  private async enviar(intermediarioId: string, telefono: string, textos: string[], simulado = false) {
    for (const t of textos) await this.provider.enviarTexto(intermediarioId, telefono, t, { simulado });
  }

  /** Procesa un mensaje entrante y envía la(s) respuesta(s). Devuelve lo respondido. */
  async procesar(intermediarioId: string, telefonoCrudo: string, texto: string, opciones: { simulado?: boolean } = {}): Promise<string[]> {
    const simulado = !!opciones.simulado;
    const telefono = aE164(telefonoCrudo);
    limitar(`whatsapp:${intermediarioId}:${telefono}`, 120, 3600_000);
    await this.prisma.mensajeWhatsapp.create({ data: { intermediarioId, telefono, direccion: 'ENTRANTE', texto: texto.slice(0, 1000) } });

    const proveedor = await this.prisma.empresa.findFirst({ where: { intermediarioId, rol: 'GENERADOR', activo: true, telefono } });
    const inter = await this.prisma.empresa.findUniqueOrThrow({ where: { id: intermediarioId }, select: { razonSocial: true } });
    if (!proveedor) {
      const r = [`Hola. Este número todavía no está registrado en la red de ${inter.razonSocial}. Pídele a tu acopiador que te agregue y te escribiremos.`];
      await this.enviar(intermediarioId, telefono, r, simulado);
      return r;
    }

    const conv = await this.prisma.conversacionWhatsapp.upsert({
      where: { intermediarioId_telefono: { intermediarioId, telefono } },
      update: {},
      create: { intermediarioId, telefono, proveedorId: proveedor.id, paso: 'INICIO' },
    });
    const t = texto.trim();
    const guardar = (paso: Paso, borrador: Borrador | null) =>
      this.prisma.conversacionWhatsapp.update({ where: { id: conv.id }, data: { paso, borrador: (borrador ?? Prisma.DbNull) as Prisma.InputJsonValue } });
    const b: Borrador = (conv.borrador as Borrador | null) ?? {};
    let respuesta: string[];

    if (/^(cancelar|salir|reiniciar|empezar de nuevo)$/i.test(t)) {
      await guardar('INICIO', null);
      respuesta = ['Listo, cancelé lo que estábamos haciendo. Escribe «hola» cuando quieras reportar material.'];
    } else if (/^(ayuda|menu|menú|\?)$/i.test(t)) {
      respuesta = [AYUDA];
    } else if (/^(estado|mis reportes|reportes)$/i.test(t)) {
      respuesta = [await this.estado(intermediarioId, proveedor.id)];
    } else {
      respuesta = await this.paso(conv.paso as Paso, t, b, { intermediarioId, proveedor, interNombre: inter.razonSocial, guardar });
    }
    await this.enviar(intermediarioId, telefono, respuesta, simulado);
    return respuesta;
  }

  private async estado(intermediarioId: string, proveedorId: string) {
    const lotes = await this.material.listar(intermediarioId, { proveedorId });
    if (!lotes.length) return 'Aún no has reportado material. Escribe «hola» para empezar.';
    return ['Tus últimos reportes:', ...lotes.slice(0, 5).map((l, i) => `${i + 1}. ${l.titulo} (${formatoCantidad(l.cantidad, l.unidad)}) — ${ETIQUETA_ESTADO_LOTE[l.estado as EstadoLote] ?? l.estado}${l.precioOfrecido != null ? `, te ofrecen S/ ${l.precioOfrecido}` : ''}`)].join('\n');
  }

  private async paso(
    paso: Paso,
    t: string,
    b: Borrador,
    c: { intermediarioId: string; proveedor: { id: string; contactoNombre: string | null }; interNombre: string; guardar: (p: Paso, b: Borrador | null) => Promise<unknown> },
  ): Promise<string[]> {
    switch (paso) {
      case 'INICIO': {
        await c.guardar('DESCRIPCION', {});
        const nombre = c.proveedor.contactoNombre?.split(' ')[0] ?? '';
        return [`Hola${nombre ? ` ${nombre}` : ''}, soy el asistente de ${c.interNombre}. Te ayudo a reportar tu material.`, '¿Qué material tienes? Dime el tipo y el estado (ej. «bidones de PEAD azules enjuagados»).'];
      }
      case 'DESCRIPCION': {
        if (t.length < 5) return ['Cuéntame un poco más del material: el tipo y el estado.'];
        // Asistente con IA (apagado por defecto: WHATSAPP_IA=on + GEMINI_API_KEY). Solo EXTRAE campos del mensaje libre; si está apagado o
        // falla devuelve null y todo sigue por las reglas de siempre. Lo extraído es un borrador que la persona confirma con «SÍ».
        const borradorIa = await this.gemini.interpretarMensaje(t);
        const textoMaterial = borradorIa?.descripcion ?? t;
        const cl = await this.ia.clasificar(textoMaterial, [], 'EMPRESA');
        const nuevo: Borrador = { descripcion: textoMaterial, categoriaCodigo: cl.categoriaCodigo, categoriaNombre: cl.categoriaNombre.split('(')[0].trim(), requiereRevision: cl.requiereRevision };
        const nota = `Entendido: lo clasifico como «${nuevo.categoriaNombre}»${cl.requiereRevision ? ' (no estoy seguro del tipo exacto; tu acopiador lo confirmará)' : ''}.`;
        if (borradorIa?.cantidad != null && borradorIa.unidad) {
          const conCantidad: Borrador = { ...nuevo, cantidad: borradorIa.cantidad, unidad: borradorIa.unidad };
          if (borradorIa.precio != null) {
            const completo: Borrador = { ...conCantidad, precioEsperado: borradorIa.precio };
            await c.guardar('CONFIRMAR', completo);
            return [nota, `Anoté ${formatoCantidad(borradorIa.cantidad, borradorIa.unidad)}.`, ...(await this.lineasConfirmacion(c, completo))];
          }
          await c.guardar('PRECIO', conCantidad);
          return [nota, `Anoté ${formatoCantidad(borradorIa.cantidad, borradorIa.unidad)}.`, `¿A cuánto lo vendes hoy, en soles por ${borradorIa.unidad === 'kg' ? 'kilo' : 'tonelada'}? Si no lo sabes, escribe «no sé».`];
        }
        await c.guardar('CANTIDAD', nuevo);
        return [`Entendido: lo clasifico como «${nuevo.categoriaNombre}»${cl.requiereRevision ? ' (no estoy seguro del tipo exacto; tu acopiador lo confirmará)' : ''}.`, '¿Cuánto tienes? Escríbelo con la unidad (ej. 800 kg o 2 toneladas).'];
      }
      case 'CANTIDAD': {
        const q = extraerCantidad(t);
        if (!q) return ['No entendí la cantidad. Escríbela con la unidad, por ejemplo «800 kg» o «2 toneladas».'];
        await c.guardar('PRECIO', { ...b, cantidad: q.cantidad, unidad: q.unidad });
        return [`Anotado: ${formatoCantidad(q.cantidad, q.unidad)}.`, `¿A cuánto lo vendes hoy, en soles por ${q.unidad === 'kg' ? 'kilo' : 'tonelada'}? Si no lo sabes, escribe «no sé».`];
      }
      case 'PRECIO': {
        let precio: number | null = null;
        if (!SIN_PRECIO.test(t)) {
          const m = t.match(/(\d+(?:[.,]\d+)?)/);
          if (!m) return ['No entendí el precio. Escribe solo el número (ej. 1.40) o «no sé».'];
          precio = Number(m[1].replace(',', '.'));
        }
        const nuevo: Borrador = { ...b, precioEsperado: precio };
        await c.guardar('CONFIRMAR', nuevo);
        return this.lineasConfirmacion(c, nuevo);
      }
      case 'CONFIRMAR': {
        if (SI.test(t)) {
          const l = await this.material.reportar(c.proveedor.id, { descripcion: b.descripcion as string, categoriaCodigo: b.categoriaCodigo, cantidad: b.cantidad as number, unidad: b.unidad as 'kg' | 'ton', precioEsperado: b.precioEsperado ?? undefined, imagenes: [] }, 'WHATSAPP', c.intermediarioId);
          await c.guardar('INICIO', null);
          return [`¡Listo! Registré tu reporte («${l.titulo}»). ${c.interNombre} te responderá con su oferta.`, 'Escribe «estado» cuando quieras ver cómo va.'];
        }
        if (NO.test(t)) {
          await c.guardar('INICIO', null);
          return ['Está bien, no lo envié. Escribe «hola» si quieres reportar otro material.'];
        }
        return ['Responde SÍ para enviar el reporte o NO para descartarlo.'];
      }
    }
  }

  /** Referencia de precio + resumen para que la persona confirme con SÍ o NO. */
  private async lineasConfirmacion(c: { intermediarioId: string; proveedor: { id: string }; interNombre: string }, b: Borrador): Promise<string[]> {
    const precio = b.precioEsperado ?? null;
    return [
      await this.referencia(c.intermediarioId, c.proveedor.id, b),
      `Resumen: ${b.categoriaNombre}, ${formatoCantidad(b.cantidad as number, b.unidad as string)}${precio != null ? `, pides S/ ${precio} por ${b.unidad === 'kg' ? 'kilo' : 'tonelada'}` : ''}. ¿Lo envío a ${c.interNombre}? Responde SÍ o NO.`,
    ];
  }

  /** Rango de referencia (y dónde cae el precio que pide el proveedor) en una frase corta. */
  private async referencia(intermediarioId: string, proveedorId: string, b: Borrador) {
    const ub = await this.benchmark.ubicacionDe(proveedorId);
    const unidad = b.unidad as 'kg' | 'ton';
    const e = await this.benchmark.estimar({ categoriaCodigo: b.categoriaCodigo as string, descripcion: b.descripcion, cantidad: b.cantidad as number, unidad, lat: ub?.lat, lng: ub?.lng, intermediarioId });
    if (!e.rango) return 'Todavía no tengo precios de referencia para este material.';
    const s = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: unidad === 'ton' ? 0 : 2, maximumFractionDigits: unidad === 'ton' ? 0 : 2 })}`;
    let msg = `Precio de referencia: ${s(e.rango.p25)} a ${s(e.rango.p75)} por ${unidad === 'kg' ? 'kilo' : 'tonelada'}${e.esSemilla ? ' (datos de ejemplo)' : ''}.`;
    if (b.precioEsperado != null) {
      const pos = posicionPrecio(precioPorTon(b.precioEsperado, unidad, null), e.rangoPorTon);
      // `precioPorTon` con «kg» no necesita el peso por unidad; con «ton» es la identidad.
      msg += pos === 'DENTRO' ? ' Tu precio está dentro de lo habitual.' : pos === 'ENCIMA' ? ' Tu precio está por encima de lo habitual: pueden negociarlo a la baja.' : pos === 'DEBAJO' ? ' Tu precio está por debajo de lo habitual: podrías pedir más.' : '';
    }
    return msg;
  }

  // ---------- Simulador ----------

  mensajes(intermediarioId: string, telefonoCrudo: string) {
    return this.prisma.mensajeWhatsapp.findMany({ where: { intermediarioId, telefono: aE164(telefonoCrudo) }, orderBy: { createdAt: 'asc' }, take: 200, select: { id: true, direccion: true, texto: true, createdAt: true } });
  }

  async reiniciar(intermediarioId: string, telefonoCrudo: string) {
    const telefono = aE164(telefonoCrudo);
    await this.prisma.conversacionWhatsapp.deleteMany({ where: { intermediarioId, telefono } });
    await this.prisma.mensajeWhatsapp.deleteMany({ where: { intermediarioId, telefono } });
  }

  /** Procesa un mensaje del webhook sin que un error de un mensaje afecte a los demás (Meta reintenta si no recibe 200). */
  async procesarSeguro(intermediarioId: string, telefono: string, texto: string) {
    try {
      await this.procesar(intermediarioId, telefono, texto);
    } catch (e) {
      this.log.warn(`No se pudo procesar un mensaje de WhatsApp: ${(e as Error).message}`);
    }
  }
}
