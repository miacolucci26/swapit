// Función de Vercel (proyecto «swapit-api», Root Directory = apps/api). El código real vive en src/serverless.ts y se
// compila con `nest build` a dist/. vercel.json reescribe todas las rutas hacia esta función.
module.exports = require('../dist/serverless').default;
