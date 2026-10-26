/**
 * Heurística simple: distancia × tarifa por km por tonelada, con mínimo. No es una cotización real.
 * Para cargas menores a 50 kg (artículos personales) no aplica: la entrega se coordina en persona.
 */
export function estimarFlete(distanciaKm: number | null | undefined, toneladas: number, tarifaKmTon: number): number | null {
  if (distanciaKm == null || toneladas < 0.05) return null;
  return Math.round(Math.max(80, distanciaKm * tarifaKmTon * Math.max(toneladas, 1)));
}
