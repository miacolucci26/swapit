import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

export interface PagoRef {
  referencia: string;
  monto: number;
}

/** Contrato de pasarela con retención tipo escrow. TODO: implementación real con Culqi/Niubiz. */
export abstract class PaymentProvider {
  abstract retener(transaccionId: string, monto: number): Promise<PagoRef>;
  abstract liberar(referencia: string): Promise<void>;
  abstract reembolsar(referencia: string): Promise<void>;
}

/** MOCK: no mueve dinero; solo simula referencias para modelar el flujo completo. */
@Injectable()
export class MockPaymentProvider extends PaymentProvider {
  async retener(_transaccionId: string, monto: number): Promise<PagoRef> {
    return { referencia: `MOCK-${randomBytes(5).toString('hex').toUpperCase()}`, monto };
  }
  async liberar(): Promise<void> {}
  async reembolsar(): Promise<void> {}
}
