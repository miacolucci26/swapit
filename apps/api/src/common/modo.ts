import { SetMetadata } from '@nestjs/common';

/**
 * Modo de la plataforma. Swapit es un marketplace con modos comprador y vendedor (docs/diseno/estructura-web.md).
 * La herramienta para intermediarios regionales (acopiadores) sigue en el código detrás de un interruptor propio:
 *   (sin variable)          marketplace: comprador y vendedor, chat, mapa
 *   SWAPIT_ACOPIADORES=1    intermediarios, proveedores, benchmark, certificados co-marcados
 * La variable anterior SWAPIT_MODO ya no se lee: despliegues que la tenían en B2B2B pasan solos al marketplace.
 */
export type Modo = 'B2B2B' | 'MARKETPLACE';

/** Se lee en cada petición (no al importar) para que las pruebas y el arranque puedan fijarlo. */
export const modo = (): Modo => (process.env.SWAPIT_ACOPIADORES === '1' ? 'B2B2B' : 'MARKETPLACE');
export const esB2B = () => modo() === 'B2B2B';

/** Marca un endpoint (o un controlador) que solo existe en modo MARKETPLACE: en B2B2B responde 404. */
export const SoloMarketplace = () => SetMetadata('soloMarketplace', true);
