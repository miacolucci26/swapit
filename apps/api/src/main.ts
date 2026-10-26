import { crearAplicacion } from './bootstrap';

// Entrada del servidor normal (desarrollo, `pnpm demo`, Docker o cualquier Node). En Vercel se usa `serverless.ts` vía `api/index.js`.
async function bootstrap() {
  const app = await crearAplicacion();
  // PORT lo define Vercel/Render/Railway; API_PORT es el nombre propio del proyecto.
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
  await app.listen(port);
  console.log(`Swap It API escuchando en http://localhost:${port}/api`);
}
bootstrap().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
