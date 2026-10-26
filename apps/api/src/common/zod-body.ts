import { BadRequestException } from '@nestjs/common';
import type { ZodType } from 'zod';

/** Valida un body con Zod y lanza 400 con los errores por campo. */
export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException({
      message: 'Datos inválidos',
      errores: result.error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
    });
  }
  return result.data;
}
