import type { Decision, EntradaModelo, Modelo, RegistroModelo } from './tipos';

/**
 * Prueba el modelo principal (Gemini Nano) y, si una decisión falla o llega inválida, decide ESA decisión con el modelo de
 * reglas. Así un error del modelo local nunca deja al usuario sin respuesta, y la interfaz puede avisar que hubo degradación y
 * por qué. Las decisiones siguientes del mismo turno vuelven a intentar con el principal (p. ej. si falló la elección de la
 * herramienta, la redacción de la respuesta todavía puede salir bien), salvo que ya haya fallado dos veces.
 */
export class ModeloConRespaldo implements Modelo {
  private usado = '';
  private fallos = 0;
  private errores: RegistroModelo[] = [];
  private desde = 0;
  ultimoError: string | null = null;

  constructor(private readonly primario: Modelo | null, private readonly respaldo: Modelo) {
    this.usado = (primario ?? respaldo).nombre;
    this.desde = primario?.bitacora?.().length ?? 0;
  }

  get nombre() {
    return (this.primario ?? this.respaldo).nombre;
  }

  /** Llamar antes de cada pregunta del usuario. */
  reiniciar() {
    this.usado = (this.primario ?? this.respaldo).nombre;
    this.fallos = 0;
    this.errores = [];
    this.ultimoError = null;
    this.desde = this.primario?.bitacora?.().length ?? 0;
  }

  async decidir(e: EntradaModelo): Promise<Decision> {
    if (this.primario && this.fallos < 2) {
      try {
        const d = await this.primario.decidir(e);
        this.usado = this.primario.nombre;
        return d;
      } catch (err) {
        this.fallos++;
        this.ultimoError = err instanceof Error ? err.message : String(err);
        this.errores.push({ etapa: 'respaldo', detalle: 'Esta decisión la tomó el modelo de reglas', ms: 0, error: this.ultimoError });
      }
    }
    this.usado = this.respaldo.nombre;
    return this.respaldo.decidir(e);
  }

  estado() {
    return { motor: this.usado, degradado: this.primario !== null && this.fallos > 0 };
  }

  /** Llamadas al modelo principal de este turno más los errores que hicieron recurrir al respaldo. */
  bitacora(): RegistroModelo[] {
    return [...(this.primario?.bitacora?.().slice(this.desde) ?? []), ...this.errores];
  }
}
