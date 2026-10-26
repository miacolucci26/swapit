import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

export interface CobroRef {
  referencia: string;
  monto: number;
}

/**
 * Cobro del SaaS al intermediario: suscripción mensual recurrente y fee por certificado. No hay retención ni liberación
 * de pagos entre terceros (eso era del marketplace, ver `common/payments`).
 * TODO: implementación real con Culqi/Niubiz (cobros recurrentes y comprobantes electrónicos).
 */
export abstract class BillingProvider {
  abstract crearSuscripcion(empresaId: string, plan: string, monto: number): Promise<CobroRef>;
  abstract cancelarSuscripcion(referencia: string): Promise<void>;
  abstract cobrarFee(empresaId: string, concepto: string, monto: number): Promise<CobroRef>;
}

/** MOCK: no mueve dinero; solo devuelve referencias para modelar el flujo completo. */
@Injectable()
export class MockBillingProvider extends BillingProvider {
  private ref(prefijo: string) {
    return `MOCK-${prefijo}-${randomBytes(4).toString('hex').toUpperCase()}`;
  }
  async crearSuscripcion(_empresaId: string, _plan: string, monto: number): Promise<CobroRef> {
    return { referencia: this.ref('SUB'), monto };
  }
  async cancelarSuscripcion(): Promise<void> {}
  async cobrarFee(_empresaId: string, _concepto: string, monto: number): Promise<CobroRef> {
    return { referencia: this.ref('FEE'), monto };
  }
}
