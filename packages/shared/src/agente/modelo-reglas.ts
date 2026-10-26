import { buscarCadenas, buscarResiduos, buscarSectores } from '../cadenas';
import { textoPlano } from '../conocimiento';
import { T, leerCantidad, textoAyuda } from './herramientas';
import type { Decision, EntradaModelo, Modelo } from './tipos';

const PUBLICAR = /\b(publicar|publico|vender|vendo|regalar|regalo|donar|dono|deshacer|deshacerme|ya no (uso|necesito|quiero|ocupo)|me sobra|me sobran|tengo (un|una|unos|unas|varios|varias|\d+))\b/;
const USOS = /(que (puedo )?hacer con|que hago con|para que sirve|usos? de|aprovechar|como reutilizo|como aprovecho|vidas? de|valorizar|sacarle provecho|me sobra|me sobran)/;
const PRECIO = /(a cuanto|cuanto (pago|pagar|vale|valen|cuesta|deberia|puedo)|precio|cotiza|referencia|benchmark|justo|ofrecer|ofrezco|vale la pena)/;
const PENDIENTES = /(por cotizar|pendiente|reportaron|reporto|que me falta|sin cotizar|nuevos reportes|reportes nuevos)/;
const RED = /(mi red|proveedores|quien no ha reportado|quienes no|sin reportar|cuantos proveedores)/;
const COMPRADORES = /(quien (me )?(compra|compraria|recibe|se lleva|lleva)|a quien(es)? (le |les )?(puedo )?(vendo|vender|entrego|entregar|ofrezco|ofrecer)|compradores?|donde (lo |la |los |las )?(vendo|vender|entrego|entregar|llevo|llevar))/;
const CADENA = /(que (residuos|subproductos|mermas|desechos) (genera|generan|tiene|tienen|salen|sale|deja|dejan|produce|producen)|cadena|etapas|ver (el )?proceso)/;
const SEGUIMIENTO = /(mis transacciones|mi transaccion|pendiente|mi impacto|impacto|co2|que debo hacer|solicitud|estado de|mis tratos)/;

/** Quita el relleno inicial de la frase («busco», «necesito»…) para quedarse con lo que se necesita. */
const limpiar = (t: string) => t.replace(/^\s*(hola[, ]*)?(por favor[, ]*)?(busco|necesito|quiero|quisiera|dame|encuentra(me)?|hay|tienen|me interesa(n)?|estoy buscando)\s+/i, '').trim();

/**
 * Modelo de respaldo sin IA generativa: decide con reglas simples y determinísticas. Se usa cuando
 * Gemini Nano no está disponible (otro navegador, poco espacio en disco, descarga pendiente) o falla,
 * para que el asistente siga siendo útil. Usa exactamente el mismo protocolo de decisión que el modelo real.
 */
export class ModeloReglas implements Modelo {
  readonly nombre = 'reglas';

  async decidir(e: EntradaModelo): Promise<Decision> {
    const nombres = new Set(e.herramientas.map((h) => h.nombre));
    const ultimo = e.pasos.at(-1);
    if (ultimo) return this.trasObservacion(e, nombres, ultimo);

    const t = textoPlano(e.pedido);
    const usar = (herramienta: string, argumentos: Record<string, string | number>, razon?: string): Decision => ({ accion: 'herramienta', herramienta, argumentos, razon });

    // Asistente del intermediario (B2B2B): agente plano con herramientas de conocimiento, precios y operación.
    if (nombres.has(T.VIDAS)) {
      if (PENDIENTES.test(t)) return usar(T.PENDIENTE, {}, 'pregunta por lo pendiente');
      if (RED.test(t)) return usar(T.RED, {}, 'pregunta por su red');
      if (COMPRADORES.test(t)) return usar(T.COMPRADORES, { material: e.pedido }, 'pregunta a quién vender');
      if (CADENA.test(t)) return usar(T.CADENA, { cadena: e.pedido }, 'pregunta por los residuos de un rubro');
      if (PRECIO.test(t)) {
        const { cantidad, unidad } = leerCantidad(e.pedido);
        return usar(T.BENCHMARK, { material: e.pedido.replace(/[¿?]/g, ''), cantidad, unidad }, 'pregunta por un precio');
      }
      if (USOS.test(t) || buscarResiduos(t, 1).length) return usar(T.VIDAS, { material: e.pedido }, 'pregunta qué hacer con un residuo');
      if (buscarCadenas(t).length || buscarSectores(t).length) return usar(T.CADENA, { cadena: e.pedido }, 'nombra un rubro');
      return { accion: 'responder', texto: textoAyuda(e.herramientas) };
    }
    // Orquestador del marketplace: elige a quién delegar.
    if (nombres.has('delegar_buscador')) {
      if (USOS.test(t) && nombres.has(T.USOS)) {
        const material = e.pedido.replace(/.*?\b(con|de|del)\b/i, '').replace(/[?¿!¡.]/g, '').trim() || e.pedido;
        return usar(T.USOS, { material }, 'pregunta por usos de un material');
      }
      if (PUBLICAR.test(t)) return usar('delegar_publicador', { peticion: e.pedido }, 'quiere publicar algo');
      if (SEGUIMIENTO.test(t)) return usar('delegar_seguimiento', { peticion: e.pedido }, 'pregunta por su actividad');
      return usar('delegar_buscador', { peticion: e.pedido }, 'busca algo');
    }
    // Especialistas del marketplace.
    if (nombres.has(T.BUSCAR)) return usar(T.BUSCAR, { texto: limpiar(e.pedido) || e.pedido });
    if (nombres.has(T.CLASIFICAR)) return usar(T.CLASIFICAR, { descripcion: e.pedido });
    if (nombres.has(T.TRANSACCIONES)) return usar(/impacto|co2|toneladas/.test(t) ? T.IMPACTO : T.TRANSACCIONES, {});
    return { accion: 'responder', texto: 'No sé cómo ayudarte con eso todavía.' };
  }

  private trasObservacion(e: EntradaModelo, nombres: Set<string>, ultimo: EntradaModelo['pasos'][number]): Decision {
    if (!ultimo.ok) return { accion: 'responder', texto: `No pude completarlo: ${ultimo.resumen}` };
    // Sin resultados: ofrecer una alerta (requiere confirmación del usuario).
    if (ultimo.herramienta === T.BUSCAR && ultimo.resumen.startsWith('Sin resultados') && nombres.has(T.ALERTA) && !e.pasos.some((p) => p.herramienta === T.ALERTA)) {
      return { accion: 'herramienta', herramienta: T.ALERTA, argumentos: { texto: String(ultimo.argumentos.texto), radioKm: 100 }, razon: 'no hay resultados; ofrece avisar' };
    }
    return { accion: 'responder', texto: ultimo.respuesta ?? ultimo.resumen };
  }
}
