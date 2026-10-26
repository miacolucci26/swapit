// Simula la función de Vercel (apps/api/api/index.js) con un servidor http normal: comprueba que el manejador sin servidor arranca la
// aplicación Nest en frío, enruta /api/* y lee cuerpos JSON. Lo usa scripts/humo.mjs.
const http = require('node:http');
const manejador = require('../apps/api/api/index.js');
http.createServer((req, res) => manejador(req, res)).listen(Number(process.env.PUERTO_SERVERLESS), () => console.log('función de Vercel simulada lista'));
