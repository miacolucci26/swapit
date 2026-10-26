import { SetMetadata } from '@nestjs/common';

/**
 * Modo de la plataforma. Swapit pasó de un marketplace de dos lados (personas y empresas que se encuentran,
 * negocian y pagan entre sí) a un SaaS para intermediarios regionales (acopiadores/agregadores) que gestionan
 * su red de proveedores. Lo del marketplace sigue en el código detrás de este interruptor hasta que se decida
 * borrarlo (ver docs/decisiones/0001-pivote-b2b2b.md):
 *   SWAPIT_MODO=B2B2B        (por defecto)  intermediarios, proveedores, benchmark, certificados co-marcados
 *   SWAPIT_MODO=MARKETPLACE  el producto anterior (transacciones P2P, créditos, personas, matching)
 */
export type Modo = 'B2B2B' | 'MARKETPLACE';

/** Se lee en cada petición (no al importar) para que las pruebas y el arranque puedan fijarlo. */
export const modo = (): Modo => (process.env.SWAPIT_MODO === 'MARKETPLACE' ? 'MARKETPLACE' : 'B2B2B');
export const esB2B = () => modo() === 'B2B2B';

/** Marca un endpoint (o un controlador) que solo existe en modo MARKETPLACE: en B2B2B responde 404. */
export const SoloMarketplace = () => SetMetadata('soloMarketplace', true);
