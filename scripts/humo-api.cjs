// Lanzador de la API para scripts/humo.mjs (modo producción local).
// La validación de producción de la API rechaza, con razón, una base en la máquina local con sslmode=disable. Para el recorrido de humo
// la base ES local (PGlite en memoria), así que SOLO el valor de DATABASE_URL que se pasa al validador se sustituye por uno con forma de
// producción; Prisma usa la URL real de process.env. El resto de la validación (JWT_SECRET, WEB_ORIGIN https, TRUST_PROXY, almacenamiento…)
// se aplica tal cual, y el servidor corre con NODE_ENV=production (cookies Secure, cabeceras de seguridad, etc.).
const { crearAplicacion } = require('../apps/api/dist/bootstrap');

(async () => {
  const envParaValidar = { ...process.env, DATABASE_URL: 'postgresql://swapit:x@db.ejemplo.supabase.co:6543/postgres?sslmode=require&pgbouncer=true' };
  const app = await crearAplicacion(envParaValidar);
  await app.listen(Number(process.env.API_PORT));
  console.log(`API de humo escuchando en :${process.env.API_PORT}`);
})().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
