# Seguridad de Swapit: revisión previa al lanzamiento con clientes reales

Revisión de seguridad de aplicación (AppSec) hecha sobre el código del repositorio el 22–23 de octubre de 2026, antes de que dos empresas reales carguen datos, se conecten y hagan compras y ofertas. Alcance: `apps/api` (NestJS 11, Prisma 6, SQL crudo con PostGIS/pgvector), `apps/web` (Next 16), `packages/shared`, despliegue previsto en Vercel + Supabase.

## 1. Resumen ejecutivo

- **El código quedó en un estado razonable para un piloto con dos clientes**, siempre que se cumpla la lista de la sección 5 (variables de entorno, Supabase, cierre del registro, rotación de secretos).
- **Hallazgos graves corregidos:** (1) Next.js 16.3.6 tenía ejecución remota de código sin autenticación (`use cache` y optimización de imágenes): actualizado a 16.4.2. (2) Cualquiera podía subir archivos al servidor por el portal de captación sin tener un enlace válido: el guard ahora corre antes de leer el archivo. (3) No se validaba el contenido de las imágenes (solo la extensión): ahora se valida por firma de bytes y se rechazan SVG, HTML, políglotas. (4) No había cabeceras de seguridad, CORS de lista blanca, defensa CSRF, límites de tasa ni límite de cuerpo: implementados en `aplicarSeguridad`. (5) El webhook de WhatsApp aceptaba mensajes sin firma si faltaba el secreto: en producción ahora responde 503. (6) Sesiones: algoritmo no fijado, secreto de desarrollo por defecto, bcrypt de coste 10, contraseñas desde 8 caracteres, sin freno a la fuerza bruta: corregido.
- **Lo que NO está resuelto y conviene saber** (detalle en la sección 3): los pagos son un **simulacro** (no se cobra dinero real, ver sección 6); la verificación de empresas (KYB) con SUNAT es un simulacro (cualquiera con un RUC de dígito verificador válido puede registrarse como intermediario salvo que se cierre el registro o se revise a mano); los límites de tasa son en memoria (por instancia, débiles en funciones sin servidor); el cierre de sesión no revoca el token en el servidor; hay carreras de concurrencia en pagos y créditos del modo marketplace; `maplibre-gl` tiene un aviso crítico que no es alcanzable hoy pero exige actualizar a la versión 6.
- **Pruebas:** 7 archivos nuevos en `apps/api/test/seguridad/` (acceso cruzado entre empresas en ambos modos, sesiones y contraseñas, cabeceras/CORS/CSRF/límites/errores, subidas con archivos falsos, webhook firmado, validación de entorno, inventario automático de rutas que exige 401 sin sesión).

## 2. Qué se corrigió (y dónde)

| Área | Cambio | Archivos |
|---|---|---|
| Sesión | Cookie `swapit_token`: HttpOnly, `SameSite=Lax`, `Secure` en producción, vigencia 12 h con renovación deslizante y tope absoluto de 7 días. JWT fijado a HS256 (impide `alg: none`). El guard comprueba en la base que el usuario exista y que su rol y empresa no cambiaron: un usuario borrado o degradado pierde el acceso de inmediato. | `src/auth/auth.config.ts`, `auth.guard.ts`, `auth.module.ts`, `auth.controller.ts` |
| Secretos | En producción la API no arranca sin `JWT_SECRET` de ≥ 32 caracteres, no de ejemplo ni de poca variedad. Fuera de producción, sin secreto se usa uno aleatorio por proceso (nunca uno conocido). | `src/auth/auth.config.ts` (`jwtSecret`), `src/common/config-env.ts` |
| Contraseñas | bcrypt coste 12 (los hashes antiguos se suben solos al primer acceso correcto), mínimo 10 caracteres, rechazo de contraseñas comunes, repetitivas, que contengan el correo o pasen de 72 bytes. | `src/auth/auth.service.ts`, `packages/shared/src/schemas.ts` |
| Fuerza bruta | Login: 8 fallos por cuenta y 25 por IP en 15 min bloquean con 429 (también para correos inexistentes: no revela si existen); 40 intentos por IP en 15 min; registro: 10 por hora por IP. Mensaje único «Credenciales incorrectas» y comparación bcrypt contra un hash señuelo cuando el correo no existe (misma latencia). Correo sin distinguir mayúsculas. | `src/auth/auth.service.ts`, `src/common/limite-tasa.ts`, `src/common/seguridad.ts` |
| HTTP | `aplicarSeguridad(app)`: helmet (CSP `default-src 'none'`, nosniff, anti-framing, sin referrer, HSTS en producción), `x-powered-by` apagado, `trust proxy` configurable (`TRUST_PROXY`), CORS de lista blanca exacta desde `WEB_ORIGIN` (varios separados por coma, sin comodines, con credenciales), defensa CSRF por `Origin`/`Referer`, JSON máx. 1 MB, `Cache-Control: no-store` en toda la API, límites de tasa por IP (global 1500/min; captación 100/min y 30 escrituras/10 min; verificación pública 60/min; webhook 300/min; IA 120/h; subidas 60/10 min), filtro global de errores sin trazas ni mensajes de Prisma/SQL. | `src/common/seguridad.ts` |
| Subidas | `validarImagen` por firma de bytes (JPG, PNG, WEBP; rechaza SVG, HTML, GIF, PDF, ejecutables, archivos truncados y políglotas con `<script>`/`<html>`/`<svg>`). Lo integra `StorageService` (nombre aleatorio y extensión según el contenido real, nunca la declarada). Portal de captación: el guard valida el enlace **antes** de leer el archivo. | `src/common/imagen-segura.ts`, `src/auth/captacion.guard.ts`, `src/captacion/captacion.controller.ts` |
| Referencias a imágenes | Los nombres de archivo que envía el cliente (`imagenes`, `fotoEntrega`) solo admiten `[A-Za-z0-9._-]`, sin `..` ni barras. `logoUrl` solo admite `/api/uploads/…` o `https://`. | `packages/shared/src/schemas.ts` |
| Webhook WhatsApp | Firma `X-Hub-Signature-256` **obligatoria** en producción (sin `WHATSAPP_APP_SECRET`: 503, no procesa nada); comparación en tiempo constante; en la verificación GET el token por defecto `swapit-demo` ya no vale en producción; reto saneado; payload validado (forma, tamaños, remitente solo dígitos). | `src/whatsapp/whatsapp.controller.ts` |
| Datos públicos | El mapa de calor público (`/impacto/publico`) aproxima a ~5 km la ubicación de **todas** las empresas (antes solo las confidenciales). `/lotes/:id` ya no muestra lotes del ciclo B2B2B de otro intermediario. `/auth/me` no devuelve `tokenCaptacion` ni `notasInternas`. | `src/impacto/impacto.service.ts`, `src/lotes/lotes.service.ts`, `src/auth/auth.service.ts` |
| Validación de parámetros | `GET /lotes` y `GET /matching/buscar` validan enum, radio y largo (antes un valor inválido llegaba a SQL y producía un error de base de datos). | `src/lotes/lotes.controller.ts`, `src/matching/matching.controller.ts` |
| Entorno | `validarEntorno(env)` lanza un error con **todos** los problemas juntos; `erroresEntorno(env)` devuelve la lista. En producción exige `DATABASE_URL` (sin credenciales de desarrollo, sin `localhost`, sin `sslmode=disable`), `JWT_SECRET` fuerte, `WEB_ORIGIN` (https, exacto), `TRUST_PROXY`, y prohíbe `RATE_LIMIT_FACTOR` y `BCRYPT_COST` (atajos de las pruebas). | `src/common/config-env.ts`, llamada desde `src/bootstrap.ts` |
| Frontend | Cabeceras en `next.config.ts`: HSTS (producción), nosniff, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` (sin cámara, micrófono ni geolocalización), COOP, y **CSP** adaptada a MapLibre/OpenFreeMap/Mapbox, Supabase Storage y la propia API. `/captacion/*` sin referrer, sin caché y `noindex` (su URL lleva un secreto). Verificado con `next build` + `next start` y el mapa de `/impacto` cargando teselas sin violaciones de CSP. `poweredByHeader` apagado. | `apps/web/next.config.ts` |
| Dependencias | `next` 16.3.6 → **16.4.2** (cierra 3 críticos y varios altos/moderados); `helmet` 8 añadido; `source-map-js` y `uuid` forzados a versiones corregidas (`pnpm.overrides` en el `package.json` raíz). | `apps/web/package.json`, `apps/api/package.json`, `package.json` |

## 3. Tabla de hallazgos

Severidad según impacto con datos reales de dos empresas. «Corregido» significa con prueba automática salvo indicación.

| # | Sev. | Hallazgo | Ubicación | Estado |
|---|---|---|---|---|
| 1 | Crítica | Next 16.3.6: RCE sin autenticación (optimización de imágenes y `use cache`), SSRF, DoS de Server Actions | `apps/web/package.json` | **Corregido** (16.4.2) |
| 2 | Alta | Subida anónima de archivos: multer escribía el archivo antes de comprobar el enlace de captación | `captacion/captacion.controller.ts:93-100` | **Corregido** (`auth/captacion.guard.ts`) |
| 3 | Alta | Imágenes validadas solo por extensión del nombre (SVG/HTML renombrado, políglotas) | `common/uploads.ts`, `common/imagen-segura.ts` | **Corregido** |
| 4 | Alta | Webhook de WhatsApp: sin `WHATSAPP_APP_SECRET` procesaba mensajes sin firma; token de verificación por defecto `swapit-demo` | `whatsapp/whatsapp.controller.ts:42-65` | **Corregido** (503 en producción) |
| 5 | Alta | Secreto JWT con valor por defecto conocido (`dev-secret-inseguro`; `scripts/demo.mjs:19`) y sin longitud mínima | `auth/auth.module.ts`, `auth.config.ts:37` | **Corregido** (producción rechaza secretos débiles y los de ejemplo, incluido el de `demo.mjs`) |
| 6 | Alta | Sin límites de tasa, CSRF por origen, cabeceras, CORS de lista blanca ni límite de cuerpo | `main.ts` (antes), `common/seguridad.ts` | **Corregido** |
| 7 | Alta | Sin freno a fuerza bruta y enumeración de usuarios por latencia (sin comparación bcrypt cuando el correo no existe) | `auth/auth.service.ts:97-118` | **Corregido** |
| 8 | Alta | Registro público abierto con KYB simulado: se puede registrar el RUC de otra empresa y emitir «certificados» a su nombre | `auth/auth.service.ts` (`registrar`), `common/sunat/sunat.validator.ts` | **Mitigado** (`REGISTRO_ABIERTO=false` cierra el registro; el equipo de despliegue añadió revisión manual de KYB en `empresas/admin-empresas.controller.ts`). **Pendiente:** verificación real contra SUNAT y que una empresa PENDIENTE no emita certificados |
| 9 | Media | Contraseñas de 8 caracteres, bcrypt coste 10 | `packages/shared/src/schemas.ts:26`, `auth.service.ts:69` | **Corregido** |
| 10 | Media | Mapa de calor público con la ubicación exacta de empresas no confidenciales | `impacto/impacto.service.ts:126` | **Corregido** |
| 11 | Media | `GET /lotes/:id` devolvía lotes del ciclo B2B2B de otro intermediario (solo con ambos modos en la misma base) | `lotes/lotes.service.ts:143` | **Corregido** |
| 12 | Media | Parámetros de consulta sin validar llegaban a SQL (`modalidad::enum`, `radioKm`) y producían errores de base de datos visibles | `lotes/lotes.controller.ts`, `matching/matching.controller.ts` | **Corregido** |
| 13 | Media | Errores internos (Prisma/SQL) podían llegar al cliente | `common/seguridad.ts:130` (`FiltroExcepciones`) | **Corregido** |
| 14 | Media | Sesión no revocable al cerrar sesión (JWT sin estado); una cookie copiada vale hasta caducar (≤ 12 h) | `auth/auth.controller.ts` (`logout`) | **Pendiente (aceptado)**: mitigado por vigencia corta y por la comprobación de usuario/rol en cada petición. Para anular todas las sesiones: rotar `JWT_SECRET`. Para revocar una sola haría falta una columna `sesionDesde` en `Usuario` (migración) |
| 15 | Media | Límites de tasa en memoria: cada instancia/función sin servidor lleva su contador, así que en Vercel el tope efectivo es mayor y se reinicia con cada arranque en frío | `common/limite-tasa.ts` | **Pendiente**: usar Upstash/Redis o el cortafuegos de Vercel (WAF) para login, registro y captación |
| 16 | Media | Carreras en el modo marketplace: `pagar`/`aceptar` comprueban el estado fuera de la transacción (doble retención posible con solicitudes simultáneas); `canjear` créditos comprueba el saldo y gasta sin bloqueo | `transacciones/transacciones.service.ts:274`, `creditos/creditos.service.ts:61` | **Pendiente** (archivos de otros equipos; modo desactivado por defecto). Corrección: `updateMany` condicionado al estado, o `SELECT … FOR UPDATE` |
| 17 | Media | Aceptación de términos sin versión: la otra parte puede cambiar los términos justo antes de que se acepten | `transacciones/transacciones.service.ts` (`proponer`/`aceptar`) | **Pendiente** (marketplace). Corrección: enviar el hash de los términos al aceptar |
| 18 | Baja | `maplibre-gl` 5.24 con aviso crítico (bypass del sanitizador de HTML de popups) | `apps/web/package.json` | **Pendiente**: la app no usa popups con HTML (`setHTML`/`Popup`), no es alcanzable hoy; actualizar a 6.x |
| 19 | Baja | `deepmerge-ts` (dependencia de la CLI de Prisma, solo configuración) con DoS por objetos recursivos | `@prisma/client > prisma > @prisma/config` | **Pendiente**: no se ejecuta en el servidor con entrada de usuarios; subir Prisma cuando salga el parche |
| 20 | Baja | `POST /transacciones/:id/cancelar` con `motivo` que no es texto produce 500 (respuesta genérica, sin fuga) | `transacciones/transacciones.controller.ts:80` | **Pendiente** (validar con Zod) |
| 21 | Baja | `POST /admin/incidencias/:id/estado` sin validar el cuerpo (ahora responde 400 por el filtro, solo ADMIN) | `transacciones/admin.controller.ts:29` | **Pendiente** (validar con Zod) |
| 22 | Baja | Registro revela si un correo o RUC ya existe (409) | `auth/auth.service.ts` | **Aceptado**: acotado por el tope de 10 registros/hora/IP |
| 23 | Baja | El código de certificado `SWP-AAAA-XXXXXXXX` tiene 32 bits aleatorios; la verificación pública devuelve razón social y RUC de las partes | `certificados/certificados.service.ts:51` | **Aceptado**: tope de 60 consultas/min/IP; subir a 64 bits exige cambiar el formato esperado por las pruebas existentes |
| 24 | Baja | `/api/health` público informa el modo y la presencia de extensiones | `common/health.controller.ts` | **Aceptado** (necesario para monitoreo) |
| 25 | Info | CSP con `script-src 'unsafe-inline'` (Next inyecta scripts de hidratación y un nonce obligaría a renderizar todo en el servidor) | `apps/web/next.config.ts` | **Aceptado**; mejora futura: nonce con `proxy.ts` o SRI experimental de Next |
| 26 | Info | `uuid` (dependencia de `exceljs`) con aviso moderado en funciones con `buf`: no se usan | `apps/api` | **Mitigado** (override a `^11.1.1`) |

### Lo que se revisó y está bien

- **SQL:** todos los `$queryRaw`/`$executeRaw` son plantillas etiquetadas o `Prisma.sql` con parámetros; no hay `$queryRawUnsafe`, `Prisma.raw` ni interpolación de texto del usuario. El `LIKE` escapa `%`, `_` y `\`. Prueba con cargas de inyección en filtros y operadores `qs` (`?estado[not]=x`).
- **Autorización:** cada controlador no público lleva `AuthGuard`; el inventario automático de rutas (`http.test.ts`) falla si aparece una ruta sin sesión fuera de la lista de públicas. El aislamiento por intermediario (material, proveedores, destinos, acuerdos, certificados, benchmark, WhatsApp simulado, facturación) y por empresa (transacciones, chat, alertas, créditos) responde 404 al acceso cruzado y nunca modifica el recurso.
- **Datos en respuestas:** ningún JSON devuelve `passwordHash`, JWT ni el `tokenCaptacion` de otra cuenta; el teléfono/contacto de la contraparte solo sale cuando la transacción está acordada y solo a las dos partes.
- **ReDoS:** no hay `new RegExp` con entrada del usuario; las regex de WhatsApp están ancladas y acotadas.
- **Asistente:** es de consulta. Lo único que escribe es crear una alerta, tras confirmación explícita (prueba que lee el código del agente). El asistente de WhatsApp con Gemini (apagado por defecto) solo extrae campos, sin herramientas, con salida validada por Zod estricto y borrador confirmado por la persona con «SÍ». El clasificador con Claude trata la descripción como dato y valida la categoría contra la lista.
- **Subida de archivos servida:** `nosniff` siempre; el SVG de la demo sale con `Content-Security-Policy: default-src 'none'; sandbox`; subir SVG no es posible.
- **Excel:** las celdas se escriben como texto (no hay inyección de fórmulas).
- **Secretos en el repositorio:** `git ls-files` solo trae `.env.example` (marcadores); búsqueda de patrones de claves (Anthropic, OpenAI, AWS, Mapbox, GitHub, JWT, claves privadas) y de contraseñas en todo el historial: sin hallazgos. La única credencial «literal» es la de la demo (`demo1234`, `admin12345`) y el `JWT_SECRET` de `scripts/demo.mjs`, ambos solo para local (ver sección 5).

## 4. Dependencias

`pnpm audit --prod` antes: 3 críticas, 5 altas, 6 moderadas, 1 baja (15). Después de actualizar `next` y fijar `source-map-js` y `uuid`: quedan **2** (ver 18 y 19).

No actualizado y motivo:
- `maplibre-gl` 5 → 6.4.1: cambio de versión mayor; hay que probar mapas y estilos. No alcanzable con el uso actual.
- `deepmerge-ts` (vía Prisma CLI): lo trae `prisma@6.19`; sin parche compatible en esa línea.

## 5. Lista de verificación antes del lanzamiento con dos clientes reales

**Variables de entorno de producción (API)** — `validarEntorno` impide arrancar si faltan o son de desarrollo:
- `NODE_ENV=production`
- `DATABASE_URL` del pooler de Supabase (6543, `?pgbouncer=true&connection_limit=1`), con TLS (`sslmode=require`); `DIRECT_URL` solo para migraciones
- `JWT_SECRET` ≥ 32 caracteres aleatorios: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
- `WEB_ORIGIN=https://tu-dominio` (varios separados por coma: `https://app…,https://www…`); las vistas previas de Vercel (`*.vercel.app`) **no** pasarán el CORS ni el CSRF salvo que se añadan a propósito
- `TRUST_PROXY=1` en Vercel (un salto de proxy). Si queda sin definir, la API no arranca; si se pone mal, la limitación por IP ve la IP del proxy y bloquea a todos a la vez
- `WHATSAPP_APP_SECRET` y `WHATSAPP_VERIFY_TOKEN` propios (si se usa WhatsApp); si no, el webhook responde 503
- No definir `RATE_LIMIT_FACTOR` ni `BCRYPT_COST`; no definir `SWAPIT_MODO=MARKETPLACE` salvo que se quiera ese producto
- `REGISTRO_ABIERTO=false` después de crear las cuentas de los dos clientes (o antes, y abrirlo solo el tiempo del alta)

**Web (Vercel):** `API_URL` (se lee en **tiempo de compilación**: cambiarla exige redesplegar), `NEXT_PUBLIC_SUPABASE_URL` si las imágenes se sirven de Supabase Storage (entra en la CSP), `NEXT_PUBLIC_MAPBOX_TOKEN` solo si se usa Mapbox (token público con restricción de URL).

**Supabase:**
- La API se conecta con el rol de la cadena de conexión (propietario de las tablas) y es quien aplica toda la autorización. Por eso **activar RLS en todas las tablas del esquema `public` sin políticas** (denegar todo): así la clave pública (`anon`) y la API REST/GraphQL automática de Supabase no pueden leer ni escribir nada. Prisma, al ser dueño de las tablas, no se ve afectado. Verificar con el asesor de seguridad de Supabase (`get_advisors`) que no queden tablas expuestas.
- Bucket de imágenes: público de solo lectura; escritura solo con la clave de servicio (`service_role`), que **nunca** va en el navegador ni en variables `NEXT_PUBLIC_*`.
- Restringir la base a conexiones del pooler; contraseña del rol `postgres` rotada y distinta a la de desarrollo; activar copias de seguridad diarias (plan Pro) y **Point-in-Time Recovery**; probar una restauración antes del lanzamiento.
- Extensiones `postgis` y `vector` habilitadas; migraciones con `prisma migrate deploy`.

**Datos y cuentas:**
- **No** ejecutar el seed de demostración en producción (crea `admin@swapit.pe`/`admin12345` y cuentas `demo1234`). Crear el primer ADMIN con una contraseña propia de ≥ 10 caracteres y borrar o desactivar cualquier cuenta de demostración.
- Verificar a mano (KYB) a las dos empresas antes de dejarlas operar.

**Rotación de secretos:** al lanzar y después cada 90 días o ante cualquier sospecha: `JWT_SECRET` (cierra todas las sesiones), `WHATSAPP_APP_SECRET`, claves de Anthropic/OpenAI/Gemini/Mapbox, clave de servicio de Supabase y contraseña de la base. Nada de esto debe estar en el repositorio ni en el historial (verificado).

**Monitoreo y alertas:** registros de Vercel con drenaje a un servicio persistente; alertas por tasa de 401/403/429 y 5xx; `/api/health` con un monitor externo; revisar que los registros no contienen contraseñas, tokens ni cuerpos (el filtro de errores solo registra método, ruta —con el token de captación enmascarado— y mensaje); considerar WAF/Reglas de Vercel para login y captación (los límites en memoria no bastan en funciones sin servidor).

**Respuesta a incidentes (plan mínimo):**
1. Contener: rotar `JWT_SECRET` (cierra sesiones), rotar el enlace de captación afectado (botón «rotar enlace»), desactivar el proveedor o la cuenta, cerrar el registro.
2. Evaluar: revisar registros de Vercel y la tabla de auditoría de administración; identificar qué empresa y qué datos.
3. Restaurar: copia de seguridad / PITR de Supabase si hubo alteración de datos.
4. Notificar a las empresas afectadas y, si hay datos personales, a la autoridad de protección de datos personales (Perú: Ley 29733) dentro de los plazos que indique la norma vigente.
5. Documentar causa raíz y agregar una prueba en `apps/api/test/seguridad/`.

**Otros:** dominio propio con HTTPS (HSTS ya se envía en producción; enviar el dominio a la lista de precarga solo cuando haya certeza), política de privacidad y términos antes de recoger datos reales, y cuenta de correo de contacto de seguridad.

## 6. Pagos y compras: estado real y riesgos

**Hoy no se cobra dinero real.** `PaymentProvider` (retención tipo escrow entre empresas, modo marketplace) y `BillingProvider` (suscripción mensual y fee por certificado del modo B2B2B) tienen solo implementación **MOCK** (`common/payments/payment.provider.ts`, `common/billing/billing.provider.ts`): devuelven una referencia `MOCK-…` y no mueven fondos. La verificación de RUC (`SunatValidator`) también es un simulacro. Las suscripciones se «activan» sin pagar y los certificados se emiten sin cobro efectivo.

Riesgos de presentar «pagos» a clientes reales sin pasarela:
- **Engaño:** la pantalla dice «pago retenido en garantía» pero nadie retiene nada; una empresa podría entregar material creyendo que cobrará. Puede ser publicidad engañosa y generar responsabilidad civil.
- **Sin garantía real ni conciliación:** no hay comprobante, ni contracargos, ni reembolsos, ni conciliación contable.
- **Facturación:** el fee y la suscripción no generan comprobante electrónico (SUNAT); las comisiones sobre ventas entre terceros pueden implicar obligaciones fiscales.
- **Retención de fondos de terceros:** un escrow propio puede requerir autorización como entidad de pago; lo habitual es delegarlo en una pasarela que lo ofrezca.
- **Certificados:** un certificado «de manejo y destino final» emitido sin suscripción pagada o sin KYB real puede usarse como evidencia ante OEFA; el aviso legal ya aclara que no reemplaza el manifiesto oficial, pero hay que reforzar la verificación de identidad.

Qué falta para pagos reales (Culqi, Niubiz u otra pasarela), **sin implementar aquí**:
1. Implementación de `PaymentProvider`/`BillingProvider` con la pasarela elegida (checkout alojado o tokenización en el navegador para que **los datos de tarjeta nunca toquen el servidor**; alcance PCI-DSS SAQ A).
2. **Webhooks de la pasarela** con verificación de firma, idempotencia por identificador de evento y tabla de transacciones de pago; el estado del pedido solo cambia por el webhook confirmado, nunca por el navegador.
3. Estados y tiempos: autorización, captura, liberación, reembolso parcial/total, expiración, contracargo; conciliación diaria contra el reporte de la pasarela.
4. Montos calculados siempre en el servidor, en céntimos enteros (no `Float`), con moneda explícita; eliminar la posibilidad de doble pago (bloqueo/`updateMany` condicionado al estado, ver hallazgo 16).
5. Comprobantes electrónicos (facturación electrónica SUNAT) y términos y condiciones de pago; cuenta de la empresa verificada (KYB real) antes de recibir fondos.
6. Pruebas en el entorno de pruebas de la pasarela, límites de monto por operación, alertas de fraude y registro de auditoría.
Mientras no esté: dejar claro en pantalla y en el contrato con los clientes que los cobros son simulados, o desactivar las pantallas de pago y facturación.

## 7. Limitaciones de esta revisión (lo que no se pudo verificar)

- No se probó contra Supabase ni Vercel reales: la base fue PGlite en memoria; RLS, pooler, TLS y variables de Vercel están en la lista de verificación pero sin ejecutar. Tampoco se probó el comportamiento de `req.ip` y `TRUST_PROXY` detrás de la red real de Vercel ni cómo reenvía el rewrite de Next el encabezado `Origin` (se espera el del navegador; en caso contrario el CSRF por origen devolvería 403 a las llamadas legítimas y habría que revisarlo en el primer despliegue).
- No se hizo prueba de penetración dinámica externa ni fuzzing; las pruebas son automáticas y de caja blanca.
- El navegador solo se usó para comprobar la CSP del mapa de `/impacto` con una API simulada; no se recorrieron todas las pantallas con la CSP de producción (sí compila y la política se envía en todas las páginas, excepto `/api/*`).
- Servicios externos (Claude, OpenAI, Gemini, Mapbox, Meta WhatsApp Cloud API, Supabase Storage) se revisaron en el código, no en su configuración real.
- No se auditó el contenido de `docs/` ni de presentaciones, ni los scripts `.bat`.
- Los modos `MARKETPLACE` y `B2B2B` se probaron por separado; la mezcla de ambos en la misma base solo se cubre con el caso del hallazgo 11.
- El rendimiento de bcrypt coste 12 en funciones sin servidor (≈ 250 ms de CPU por inicio de sesión) no se midió en Vercel.
