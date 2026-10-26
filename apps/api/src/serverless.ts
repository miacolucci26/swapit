import type { IncomingMessage, ServerResponse } from 'node:http';
import { crearAplicacion } from './bootstrap';

type Manejador = (req: IncomingMessage, res: ServerResponse) => void;

// La aplicación se crea una vez por instancia en caliente y se reutiliza entre peticiones (el arranque en frío es lo más caro).
let iniciando: Promise<Manejador> | undefined;

async function iniciar(): Promise<Manejador> {
  const app = await crearAplicacion();
  await app.init();
  return app.getHttpAdapter().getInstance() as Manejador;
}

/** Función de Vercel: `api/index.js` la exporta y `vercel.json` reescribe todas las rutas hacia ella. */
export default async function manejador(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    iniciando ??= iniciar();
    (await iniciando)(req, res);
  } catch (e) {
    iniciando = undefined; // reintenta en la siguiente petición
    // Solo el mensaje: nunca variables de entorno ni trazas con secretos.
    console.error('No se pudo iniciar la API:', e instanceof Error ? e.message : 'error desconocido');
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ message: 'Servicio no disponible' }));
  }
}
