const PESOS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

/** Dígito verificador de un RUC peruano a partir de sus primeros 10 dígitos (módulo 11). */
export function digitoVerificadorRuc(base10: string): number {
  const suma = PESOS.reduce((acc, p, i) => acc + p * Number(base10[i]), 0);
  const dv = 11 - (suma % 11);
  return dv === 10 ? 0 : dv === 11 ? 1 : dv;
}

/** Formato (11 dígitos, prefijo 10/15/17/20) + dígito verificador. */
export function validarRuc(ruc: string): boolean {
  if (!/^(10|15|17|20)\d{9}$/.test(ruc)) return false;
  return digitoVerificadorRuc(ruc.slice(0, 10)) === Number(ruc[10]);
}

/** Completa el dígito verificador; útil para generar RUCs válidos en datos semilla y tests. */
export function construirRuc(base10: string): string {
  return base10 + digitoVerificadorRuc(base10);
}
