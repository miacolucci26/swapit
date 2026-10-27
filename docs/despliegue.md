# Despliegue: Vercel + Supabase, paso a paso

Estado: **preparado, no publicado.** Este repositorio no trae cuentas ni claves; todo lo que sigue lo haces tú (o quien administre el proyecto). Los pasos están ordenados para hacerlos una vez y en orden. Referencias de la plataforma consultadas el 22-oct-2026: [NestJS en Vercel](https://vercel.com/docs/frameworks/backend/nestjs), [monorepos](https://vercel.com/docs/monorepos), [vercel.json](https://vercel.com/docs/project-configuration/vercel-json) y [límites de las funciones](https://vercel.com/docs/functions/limitations). Las plataformas cambian: ante una diferencia manda su documentación.

## 0. Cómo queda armado

```
 navegador ──► swapit-web  (Vercel · Next.js · Root Directory apps/web)
                   │   reescribe /api/*  ──────────────┐
                   ▼                                   ▼
            páginas y mapa                     swapit-api  (Vercel · NestJS · Root Directory apps/api)
                                                  │              función única: api/index.js → dist/serverless.js
                                                  ├──► Supabase Postgres (PostGIS + pgvector)   pooler :6543
                                                  ├──► Supabase Storage (bucket público «lotes»)  imágenes
                                                  └──► opcionales: WhatsApp Cloud API · Gemini · proveedor SUNAT
```

- **Dos proyectos de Vercel**, uno por carpeta (la vía que Vercel documenta para monorepos). La web reenvía `/api/*` a la API con una reescritura de Next (`API_URL`), así que el navegador solo habla con **un dominio** y las cookies de sesión son de primera parte.
- La API es **una sola función** (Fluid compute). `apps/api/vercel.json` fija la región `gru1` (São Paulo, la más cercana a Perú), `maxDuration` 60 s y los archivos que la función necesita (`dist/**`, el esquema de Prisma). Prisma genera binarios para `native` y `rhel-openssl-3.0.x` (el entorno de Vercel).
- Alternativa soportada por Vercel (cero configuración): dejar que detecte NestJS por `src/main.ts` (el archivo ya cumple el formato: crea la app y hace `listen`). Preferimos `api/index.js` porque deja el empaquetado bajo nuestro control y se prueba en local (`pnpm humo`).

## 1. Supabase (base de datos e imágenes)

1. Crea una cuenta y un **proyecto nuevo** en [supabase.com](https://supabase.com). Región: **South America (São Paulo)**. Guarda la contraseña de la base en tu gestor de contraseñas.
2. **Extensiones.** En *Database → Extensions* activa **postgis** y **vector**; o en el *SQL Editor*:
   ```sql
   create extension if not exists postgis;
   create extension if not exists vector;
   ```
3. **Cadenas de conexión** (*Project Settings → Database → Connection string*, botón *Connect*):
   - `DATABASE_URL` = el **pooler en modo transacción** (puerto **6543**) y al final `?pgbouncer=true&connection_limit=1`. Es la que usa la API en Vercel (muchas funciones, pocas conexiones cada una).
   - `DIRECT_URL` = conexión que admita migraciones: la **directa (5432)** o, si tu red no tiene IPv6, el **pooler en modo sesión (5432)** del mismo panel. Prisma Migrate no funciona con el pooler en modo transacción.
4. **Bucket de imágenes.** *Storage → New bucket*: nombre `lotes`, marcado **Public** (lectura pública; nadie puede escribir sin la clave de servicio). Sin políticas extra.
5. **Claves de la API** (*Project Settings → API Keys*): copia la **URL del proyecto** (`https://PROYECTO.supabase.co`) y la clave de servicio (*service_role* o *secret key*, `sb_secret_…`). **Es un secreto de servidor**: solo va a la API de Vercel; nunca a la web ni al navegador.

## 2. Esquema de la base (migraciones)

Se aplican **desde tu máquina**, una vez y en cada despliegue que traiga migraciones nuevas (0001–0012 hoy). No se ejecutan en la build de Vercel a propósito: un fallo a medias no debe romper una publicación.

```powershell
# PowerShell, en la raíz del repositorio (pnpm install ya hecho)
cd apps/api
$env:DATABASE_URL = "postgresql://…:6543/postgres?pgbouncer=true&connection_limit=1"
$env:DIRECT_URL   = "postgresql://…:5432/postgres"
.\node_modules\.bin\prisma.CMD migrate deploy
.\node_modules\.bin\prisma.CMD migrate status     # debe decir «Database schema is up to date»
```
En bash: `DATABASE_URL=… DIRECT_URL=… npx prisma migrate deploy`. (Cierra la terminal después: las variables no deben quedarse.)

## 3. Primera carga (sin datos de demostración)

El seed de demostración **se niega a correr con `NODE_ENV=production`** salvo `SEED_PERMITIR_PRODUCCION=1`; no lo uses. Para producción hay una carga mínima que no borra nada y se puede repetir:

```powershell
cd apps/api
$env:DATABASE_URL = "…"; $env:DIRECT_URL = "…"
$env:ADMIN_EMAIL = "tu-correo@tudominio.pe"; $env:ADMIN_PASSWORD = "una-clave-larga-de-12+"
pnpm primera-carga
```
Hace dos cosas: (1) carga el **catálogo base** (22 categorías de residuo y la configuración) y (2) crea la **cuenta de administración** que verificará empresas. Las empresas reales no se crean aquí: se **registran ellas mismas** en la web (§7). No hay ninguna cuenta con contraseña conocida.

## 4. Proyecto de Vercel «swapit-api»

1. En [vercel.com/new](https://vercel.com/new) importa el repositorio → **Root Directory: `apps/api`** (déjalo activado *Include source files outside of the Root Directory*: la API usa `packages/shared`).
2. **Framework Preset: Other** (el `vercel.json` ya trae `"framework": null`). Install, Build y Output salen de `apps/api/vercel.json` (instalación filtrada del monorepo con pnpm, `shared build` + `prisma generate` + `nest build`). No los cambies en el panel. Node.js 22.x.
3. **Variables de entorno** (Production): ver la tabla del §6. Mínimo: `DATABASE_URL`, `JWT_SECRET`, `WEB_ORIGIN`, `TRUST_PROXY=1`, `STORAGE_DRIVER=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`, `OCULTAR_DEMO=1`. Si falta algo, **la API no arranca** y el log dice qué falta (validación de producción en `common/config-env.ts` y `bootstrap.ts`).
4. **Deployment Protection** (*Settings → Deployment Protection*): la API debe ser alcanzable por la web. Si la protección estándar bloquea el dominio de la API (la web recibiría 401), usa un dominio propio para la API (p. ej. `api.tudominio.pe`) o desactiva la protección en producción para este proyecto.
5. Despliega y comprueba `https://<dominio-de-la-api>/api/health`: debe responder `{"ok":true,"db":true,"postgis":true,"pgvector":true}`. Un `503` significa que la base no contesta o faltan las extensiones.

## 5. Proyecto de Vercel «swapit-web»

1. Otro proyecto desde el mismo repositorio → **Root Directory: `apps/web`**, framework **Next.js**. Install/Build salen de `apps/web/vercel.json`.
2. Variables: `API_URL` = la URL pública de la API (sin `/` final), `NEXT_PUBLIC_SUPABASE_URL` (para que la política de seguridad de contenidos permita las fotos), opcional `NEXT_PUBLIC_MAPBOX_TOKEN`. **`API_URL` se lee al compilar** (la reescritura se fija en el build): si la cambias, **redespliega**.
3. Despliega y entra: login, listado de lotes y, en el navegador, una petición a `/api/health` por el dominio de la web debe dar 200 (prueba de que la reescritura funciona).

## 6. Variables de entorno

Plantilla completa y comentada: [`.env.example`](../.env.example). En Vercel marca las secretas como **Sensitive**. **Nunca** las pegues en el chat, en capturas ni en el repositorio.

| Variable | Proyecto | ¿Secreto? | Para qué |
|---|---|---|---|
| `DATABASE_URL` | api | **Sí** | Pooler de Supabase (6543, `pgbouncer=true&connection_limit=1`) |
| `DIRECT_URL` | solo para migraciones (tu máquina) | **Sí** | Conexión directa/sesión (5432) de Prisma Migrate |
| `JWT_SECRET` | api | **Sí** | Firma de sesiones; ≥ 32 caracteres, no de ejemplo |
| `JWT_EXPIRES_IN` | api | no | Duración de la sesión (máx. 7d) |
| `WEB_ORIGIN` | api | no | URL pública de la web (CORS, CSRF, cookies); `https` |
| `TRUST_PROXY` | api | no | `1` en Vercel (IP real para los límites de uso) |
| `REGISTRO_ABIERTO` | api | no | `false` cierra el registro público (ver §7) |
| `SWAPIT_ACOPIADORES` | api | no | Sin definir (por defecto): marketplace comprador/vendedor. `1`: herramienta para acopiadores. `SWAPIT_MODO` ya no se lee. |
| `STORAGE_DRIVER` | api | no | `supabase` en producción (`local` solo desarrollo) |
| `SUPABASE_URL` | api | no | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | api | **Sí** | Escribir en Storage (clave de servicio) |
| `SUPABASE_BUCKET` | api | no | Bucket público de lectura (`lotes`) |
| `UPLOAD_MAX_MB` | api | no | Tamaño máx. de imagen (tope 4 MB en Vercel) |
| `OCULTAR_DEMO` | api | no | `1`: la lista pública y el mapa no muestran lotes de empresas demo |
| `SUNAT_PROVIDER` / `SUNAT_API_URL` | api | no | `api` + plantilla de URL con `{ruc}` (ver §9) |
| `SUNAT_API_TOKEN` | api | **Sí** | Token Bearer del proveedor de SUNAT |
| `WHATSAPP_TOKEN` | api | **Sí** | Token de la Cloud API (sin él: mock, no envía nada) |
| `WHATSAPP_PHONE_NUMBER_ID` | api | no | Id del número de WhatsApp Business |
| `WHATSAPP_GRAPH_VERSION` | api | no | Versión de la Graph API (por defecto `v26.0`) |
| `WHATSAPP_VERIFY_TOKEN` | api | **Sí** | Reto de verificación del webhook |
| `WHATSAPP_APP_SECRET` | api | **Sí** | Firma del webhook (obligatoria si hay `VERIFY_TOKEN`) |
| `WHATSAPP_IA` | api | no | `on` enciende el asistente con Gemini (fuera de la demo) |
| `GEMINI_API_KEY` | api | **Sí** | Clave de Google AI Studio |
| `GEMINI_MODEL` / `GEMINI_TIMEOUT_MS` | api | no | Modelo (por defecto `gemini-3.8-flash`; revisa el vigente) y tiempo máximo |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `MAPBOX_TOKEN` | api | **Sí** | Opcionales: clasificación con Claude, embeddings reales, geocodificación exacta |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | tu máquina, §3 | **Sí** (la clave) | Solo para `pnpm primera-carga` |
| `API_URL` | web | no | URL de la API (se lee al compilar) |
| `NEXT_PUBLIC_SUPABASE_URL` | web | no (público) | Permite las fotos en la política de contenidos |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | web | no (público) | Mapa con Mapbox (opcional) |
| `SEED_PERMITIR_PRODUCCION` | — | — | **No definir nunca en producción** |

## 7. Dominio y primera carga con las dos empresas reales

1. **Dominio:** en *Settings → Domains* del proyecto **web** agrega `app.tudominio.pe` (y el DNS que Vercel indique). Si usas dominio propio para la API, agrégalo al proyecto api. Actualiza `WEB_ORIGIN` (api) con el dominio final de la web y **redespliega la api**; `API_URL` (web) con el dominio de la API y **redespliega la web**.
2. Con `REGISTRO_ABIERTO` sin definir (abierto), cada empresa se **registra en la web** (RUC, razón social, representante, y —opcionales pero recomendados— *persona de contacto* y *teléfono*: es lo que la otra parte verá tras el acuerdo). Con el registro abierto cualquiera podría registrar un RUC ajeno, así que **ciérralo en cuanto estén las dos**: `REGISTRO_ABIERTO=false` y redespliega la api.
3. **Verificación manual.** El validador de SUNAT del repositorio es un **mock** (solo comprueba el formato del RUC). Por eso, en producción sin `SUNAT_PROVIDER`, toda empresa queda **PENDIENTE** y su perfil dice `metodoVerificacion: "MANUAL"`. Un administrador la verifica:
   - Comprueba el RUC en la [consulta oficial de SUNAT](https://e-consultaruc.sunat.gob.pe) (activo y habido) y confirma al representante por un canal independiente (llamada o correo corporativo).
   - Desde tu máquina:
     ```powershell
     $env:ADMIN_EMAIL="…"; $env:ADMIN_PASSWORD="…"; $env:API_URL="https://api.tudominio.pe"; $env:WEB_ORIGIN="https://app.tudominio.pe"
     node scripts/admin-verificar.mjs                               # lista las pendientes
     node scripts/admin-verificar.mjs <idEmpresa> VERIFICADA "RUC activo y habido; representante confirmado por teléfono"
     ```
     (o `PATCH /api/admin/empresas/:id/verificacion` con `{ "estado": "VERIFICADA" | "RECHAZADA" | "PENDIENTE", "nota": "…" }`, solo ADMIN; cada cambio queda en la tabla `AuditoriaAdmin`).
   - La interfaz no debe llamar «oficial» a lo simulado ni a lo pendiente: usa `estadoKyb` + `metodoVerificacion` (`SIMULADA` | `MANUAL` | `API`).
4. **Qué ven las empresas reales:** `OCULTAR_DEMO=1` y una base sin seed ⇒ solo los lotes de ellas. Los **pagos son simulados** (`PaymentProvider` es un mock: no se mueve dinero) y el «pago en garantía» no es real: acuérdenlo con las empresas y usen por ahora donación/intercambio o paguen fuera de la plataforma.
5. **Contacto:** el teléfono y el nombre de contacto de una empresa solo se muestran a su contraparte cuando la operación está **ACORDADA o más avanzada** (no cancelada), con un enlace `wa.me` y un mensaje prellenado. Antes del acuerdo no sale en ninguna respuesta.

## 8. Comprobaciones después de publicar

- [ ] `GET /api/health` (por el dominio de la web) → `ok`, `postgis` y `pgvector` en `true`.
- [ ] Registrar una cuenta de prueba (luego bórrala o recházala): queda **PENDIENTE** y `metodoVerificacion` = `MANUAL`.
- [ ] Iniciar sesión como administrador y verificar a una empresa (`scripts/admin-verificar.mjs`).
- [ ] Subir una foto desde *Publicar lote*: la URL empieza por `https://PROYECTO.supabase.co/storage/v1/object/public/lotes/…` y se ve en el catálogo.
- [ ] Recorrido completo con las dos empresas: publicar → proponer → aceptar → el contacto aparece **solo** tras aceptar.
- [ ] Cabeceras de seguridad de la web (HSTS, CSP) presentes y sin errores de CSP en la consola del navegador (mapa y fotos incluidos).
- [ ] *Runtime Logs* de Vercel sin errores 500; el primer arranque tras un rato inactivo puede tardar unos segundos (arranque en frío).
- [ ] Si activaste WhatsApp: ver §9. Antes de publicar, el mismo recorrido de humo corre en local con `pnpm humo` (modo producción, base en memoria, sin cuentas externas).

## 9. Integraciones (apagadas por defecto)

**WhatsApp Cloud API (Meta).** Con `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID` la API envía por la Cloud API (`https://graph.facebook.com/<versión>/<id>/messages`); sin ellas usa el mock. Pasos: app de Meta con WhatsApp, número verificado, **token permanente** de un usuario del sistema, webhook `https://<web>/api/whatsapp/webhook` con `WHATSAPP_VERIFY_TOKEN` y `WHATSAPP_APP_SECRET` (la firma `X-Hub-Signature-256` es obligatoria). Fuera de la ventana de 24 h solo se pueden enviar **plantillas aprobadas**, y el destinatario debe haber dado su consentimiento. El simulador del panel **nunca** envía mensajes reales. Ver `docs/whatsapp-roadmap.md`. Tras el primer despliegue prueba el webhook con un mensaje real: la firma se calcula sobre el cuerpo original (`rawBody`).

**Gemini (asistente de WhatsApp, fuera de la demo).** Solo si `WHATSAPP_IA=on` **y** hay `GEMINI_API_KEY`. Interpreta un mensaje libre («800 kilos de bidones PEAD a 1.40») y arma un **borrador** de material que la persona confirma con «SÍ»; no ejecuta acciones, el texto del usuario se trata como dato, la respuesta se valida con un esquema estricto y, si falla o tarda más de `GEMINI_TIMEOUT_MS`, el bot sigue por las reglas de siempre. El modelo se elige con `GEMINI_MODEL` (consulta el vigente en la [lista oficial](https://ai.google.dev/gemini-api/docs/models)); usa `generateContent` de la API v1beta con la clave en la cabecera `x-goog-api-key`.

**SUNAT por API.** Interfaz `SunatProvider` (`common/sunat/sunat.validator.ts`). Con `SUNAT_PROVIDER=api` y `SUNAT_API_URL=https://proveedor/…/{ruc}` (+ `SUNAT_API_TOKEN` si lo pide) se usa un adaptador HTTP genérico: `GET`, `Authorization: Bearer`, JSON con `estado` (ACTIVO/BAJA) y `condicion` (HABIDO/NO HABIDO), que se normaliza en `normalizarRespuestaSunat`. **No se supone ningún proveedor**: si el que elijas responde de otra forma, ajusta solo esa función. Una caída del proveedor devuelve 503 (no rechaza a la empresa). Con `api` el perfil dice `metodoVerificacion: "API"`.

## 10. Copia de seguridad y rotación de claves

- **Base de datos:** revisa qué copias incluye tu plan de Supabase (copias diarias y recuperación a un punto en el tiempo dependen del plan; los proyectos del plan gratuito pueden **pausarse por inactividad**: para uso real, plan de pago). Además, una copia propia semanal desde tu máquina: `pg_dump "<DIRECT_URL>" -Fc -f swapit-AAAA-MM-DD.dump` (guárdala cifrada y fuera del repositorio) y prueba restaurarla una vez en un proyecto vacío.
- **Imágenes:** el bucket `lotes` no se respalda con `pg_dump`; si importan, descárgalas periódicamente (CLI de Supabase o su API).
- **Rotación** (cada 6–12 meses o ante cualquier sospecha de filtración): `JWT_SECRET` (cierra todas las sesiones); contraseña de la base (*Database → Reset password*, luego `DATABASE_URL`/`DIRECT_URL` en Vercel y redespliegue); clave de servicio de Supabase (*API Keys → regenerar*); token de WhatsApp, `APP_SECRET`, `GEMINI_API_KEY` y `SUNAT_API_TOKEN` en sus consolas. Tras cambiar variables en Vercel **hay que redesplegar**. Si una clave apareció en un chat, captura o repositorio, considérala filtrada y rótala.

## 11. Limitaciones de Vercel que afectan a este proyecto

- **Tiempo de ejecución:** la API corre con `maxDuration` 60 s (el tope del plan es 300 s en Hobby; 800 s en Pro). Los certificados PDF, el Excel y la IA caben de sobra; una importación enorme no.
- **Arranque en frío:** Nest + Prisma tardan en arrancar la primera vez tras un rato sin tráfico (unos segundos). Fluid compute lo reduce, no lo elimina. Si molesta, un monitor externo que llame a `/api/health` cada 5 minutos mantiene la función caliente.
- **Subidas:** el cuerpo de una petición no puede pasar de **4,5 MB** en Vercel; por eso la API limita las imágenes a 4 MB (`UPLOAD_MAX_MB`). Fotos más grandes exigirían subir directo a Supabase con una URL firmada (pendiente).
- **Disco de solo lectura:** no se puede guardar archivos en el servidor ⇒ imágenes en Supabase Storage (`STORAGE_DRIVER=supabase`). El arranque falla si se pide el disco en Vercel.
- **Conexiones:** cada instancia abre pocas conexiones (`connection_limit=1`) a través del pooler de Supabase; no uses el puerto 5432 directo en `DATABASE_URL`.
- **Tareas programadas (cron):** no hay tareas en segundo plano en el servidor. Si hicieran falta (recordatorios, limpieza), Vercel Cron llama a una ruta HTTP con `CRON_SECRET`; los límites de frecuencia dependen del plan. Hoy no se usa.
- **Tamaño:** la función pesa bastante menos del límite de 250 MB; si una dependencia nueva lo acercara, muévela a `devDependencies`.
- **Datos en memoria:** el límite de uso por IP (`limite-tasa`) vive en la memoria de cada instancia: con varias instancias es aproximado. Para un límite estricto haría falta un almacén compartido (p. ej. Redis).
- **Embeddings locales:** sin `OPENAI_API_KEY` la búsqueda semántica usa embeddings por hashing (funcionan, son menos finos).

## 12. Desarrollo y pruebas locales

```powershell
pnpm demo            # BD embebida + datos de demostración + API + web (http://localhost:3000)
pnpm humo            # recorrido en MODO PRODUCCIÓN local: registro → login → publicar con foto → proponer → aceptar → contacto
pnpm --filter @swapit/api test
```
`scripts/demo.mjs` define también `DIRECT_URL` (la misma base embebida) porque el esquema de Prisma usa `directUrl`.
