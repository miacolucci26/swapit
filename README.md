# Swapit — Intercambio de excedentes y residuos entre empresas (prototipo)

Swapit es la herramienta del **intermediario regional** (acopiador, agregador de residuos y subproductos), no un marketplace: digitaliza **cómo capta material de su red de proveedores** (portal por enlace y bot de WhatsApp), le dice **si el precio que ofrece es justo** (benchmark por subtipo de material) y le deja **certificar la trazabilidad a sus clientes** (certificados co-marcados con QR y hash). Cobro: suscripción mensual + fee por certificado; sin comisión por operación. Foco: Piura y Lambayeque.

> **Dos experiencias (22 oct. 2026).** Tras la mentoría #6, la demo por defecto (`pnpm demo`) es el **intercambio entre empresas**: catálogo con fotos y detalle del material (mapa como vista secundaria), oferta de precio dentro de la plataforma, contacto solo al llegar a un acuerdo, vista dual ofertante/demandante e impacto. Menú de 4 opciones; sin asistente de IA ni WhatsApp en el menú. La herramienta para acopiadores (red de proveedores, precio justo, acuerdos de temporada, destinos, certificados) sigue disponible con `pnpm demo:b2b`. Diseño nuevo: [docs/diseno/](docs/diseno/). Publicar en un dominio público: [docs/despliegue.md](docs/despliegue.md).
>
> **Modos comprador y vendedor (27 oct. 2026).** El marketplace (`pnpm demo`) sigue la estructura de [docs/diseno/estructura-web.md](docs/diseno/estructura-web.md): inicio con frase y dos botones, ingreso y registro por modo, marketplace con Lista/Mapa y buscador, «Publicar» con pin en el mapa y menú de bolita (Perfil, Mis compras, Favoritos, Chats · Perfil, Mis productos, Finanzas, Chats). Una cuenta activa el segundo modo desde su Perfil.

> **Pivote (15 oct. 2026):** el producto anterior (marketplace de personas y empresas con chat, pago en garantía y créditos) sigue en el código detrás de un interruptor. Por qué y qué queda: [docs/decisiones/0001-pivote-b2b2b.md](docs/decisiones/0001-pivote-b2b2b.md). El nombre se mantiene: **Swapit**.

> **Diseño ejecutivo y despliegue (23 oct. 2026).** La interfaz es un panel sobrio (azul marino de estructura, verde de acción, Inter, tablas y franja de indicadores; sin pictogramas decorativos). Pantallas del plan de trabajo en [docs/plan/](docs/plan/): Inicio, Explorar, Ficha, Publicar en 3 pasos, Mi actividad (Propuesta → Aceptada → Cerrada), Mi empresa e Impacto. Seguridad: [docs/seguridad.md](docs/seguridad.md) (cabeceras, CORS, CSRF, límites de tasa, validación de imágenes, webhook firmado, verificación manual de empresas). Despliegue en Vercel + Supabase: [docs/despliegue.md](docs/despliegue.md); `pnpm humo` prueba la API de punta a punta. 282 pruebas de API en verde. Pagos, SUNAT y fotos de las ofertas de demo son simulados y se marcan «Demo».

Monorepo pnpm: `apps/api` (NestJS + Prisma), `apps/web` (Next.js + Tailwind + MapLibre), `packages/shared` (Zod, enums, benchmark, agente).

## Ver el prototipo (un comando)

**Requisitos:** [Node.js](https://nodejs.org) 22 o superior y [pnpm](https://pnpm.io/installation) 9 (con Node instalado: `corepack enable`). Necesita internet para el mapa (teselas de OpenFreeMap). No requiere Docker, base de datos ni claves.

```bash
git clone https://github.com/davidblas5000/swap-it.git   # repositorio privado: pide acceso a David
cd swap-it
pnpm install
pnpm demo          # intercambio entre empresas: BD embebida + migraciones + datos de demo + API + web
pnpm demo:b2b      # Swapit para acopiadores (intermediarios)
```

Abre http://localhost:3000 (la primera vez tarda 1-2 minutos en compilar y sembrar). Ctrl+C lo detiene. `pnpm demo:reset` recrea los datos de demostración y muestra en consola los enlaces del portal de captación de algunos proveedores.

**Cuentas de demo** (botones en `/login`, contraseña `demo1234`; **todos los datos son ficticios**):
- `gerencia@acopiostallanes.pe` — *Acopios Tallanes*: red de 6 proveedores, material en todos los estados, suscripción activa y 2 certificados emitidos.
- `operaciones@reciclajesnorte.pe` — *Reciclajes del Norte*: otra red, aislada de la primera, **sin suscripción** (no puede emitir certificados).

### Recorrido sugerido
1. **Panel:** material por atender y qué tan justos son tus precios.
2. **Mi red:** da de alta un proveedor (con o sin RUC) y copia su enlace o ábrelo por WhatsApp.
3. **Portal del proveedor** (`/captacion/<enlace>`, pensado para el celular): reporta «bidones de PEAD azules, 600 kg, a S/ 4,50» → la IA sugiere el subtipo, ve el rango de referencia y que su precio está encima.
4. **Material → ficha:** rango de referencia (p25–p75), semáforo del precio que pide y del que ofreces; cotiza, registra el acopio, despacha a tu cliente y **emite el certificado** (PDF con tu logo y color; `/verificar/<código>` es público).
5. **Benchmark:** consulta por subtipo (PET, PEAD, PP, film, PVC, mixto), volumen y zona; importa tus compras en CSV para que el rango sea tuyo.
6. **WhatsApp (simulador):** escribe «como» un proveedor y mira cómo el bot arma el reporte paso a paso.
7. **Asistente:** «¿a cuánto debería pagar 800 kg de bidones de PEAD?» o «¿qué tengo por cotizar?».

### Sin usar la terminal (Windows)
En la carpeta del proyecto hay tres archivos que se abren con **doble clic**:
- **`iniciar-swapit.bat`**: enciende todo y abre http://localhost:3000 en el navegador. Aparece una ventana negra: **déjala abierta mientras uses la app**.
- **`detener-swapit.bat`**: apaga Swapit. También se apaga al cerrar la ventana negra (o con Ctrl+C dentro de ella).
- **`reiniciar-datos-swapit.bat`**: borra lo que hayas probado y vuelve a crear los datos de demostración (pide confirmación).

## Qué es real y qué es simulado

| Real (probado) | Simulado / modo demo |
|---|---|
| PostgreSQL con **PostGIS** (distancias) y **pgvector** (similitud de precios) | Base embebida PGlite en desarrollo; en producción Neon/Supabase con el mismo esquema |
| Roles intermediario/generador, aislamiento entre redes, ciclo reportado → cotizado → acopiado → despachado | **Cobros**: proveedor mock (suscripción y fee por certificado; Culqi/Niubiz pendientes) |
| Certificados verificables (QR + SHA-256) co-marcados, PDF, portal de captación por token con límite de tasa | **KYB/SUNAT**: mock determinista (RUC con «00» en las posiciones 9-10 = dado de baja) |
| Benchmark por similitud (pgvector + PostGIS + volumen + recencia), importación CSV, consentimiento para compartir | **Precios de referencia de la demo: DATOS DE EJEMPLO** (semilla sintética, rotulada en pantalla); no son precios de mercado |
| Webhook de WhatsApp con verificación de reto y firma, conversación guiada | **WhatsApp**: el envío es un mock; la integración real está en [docs/whatsapp-roadmap.md](docs/whatsapp-roadmap.md) |
| | **IA**: sin `ANTHROPIC_API_KEY` el clasificador es local por palabras clave; sin `OPENAI_API_KEY`, embeddings por hashing |

Para activar la IA real crea `apps/api/.env` con `ANTHROPIC_API_KEY=…` y/o `OPENAI_API_KEY=…`. ⚠️ Si activas OpenAI, ejecuta `pnpm demo:reset` para reindexar: no se pueden mezclar embeddings de proveedores distintos.

## Modelo B2B2B en una página
- **`Empresa.rol = INTERMEDIARIO`** es la cuenta que se suscribe y paga. **`GENERADOR`** es un proveedor de su red: lo crea el intermediario, no tiene usuario y reporta por enlace (`tokenCaptacion`) o por WhatsApp; su RUC es opcional (hay proveedores informales).
- **`Lote`** es el material reportado por un proveedor; pertenece a la red de su intermediario. Ciclo: `REPORTADO → COTIZADO → ACOPIADO → DESPACHADO` (o `RECHAZADO`).
- **Aislamiento por intermediario:** nadie ve proveedores ni lotes de otra red (404, no un nombre oculto). Los precios de cada intermediario son suyos salvo que active «compartir» (anónimo, revocable).
- **Taxonomía:** el plástico se separa en `PLASTICO_PET/PEAD/PP/FILM/PVC/MIXTO` (familia `PLASTICO`); si la IA no distingue el polímero, pide revisión.
- **Benchmark:** `packages/shared/src/benchmark.ts` (pesos: material 45 %, cercanía 20 %, volumen 20 %, recencia 15 %). Otros subtipos de la familia solo se usan de respaldo; con ≥ 5 precios reales del subtipo, los datos de ejemplo dejan de usarse.
- **Certificados:** `transaccionId` o `loteId` de origen; el hash cubre generador, intermediario emisor y cliente destino; los certificados del marketplace siguen verificando. Exige suscripción activa y registra un fee.

## Dos modos: `SWAPIT_ACOPIADORES`
| | |
|---|---|
| `SWAPIT_ACOPIADORES=1` (con `pnpm demo:b2b`) | Intermediarios, proveedores, benchmark, certificados co-marcados, portal y WhatsApp. Lo del marketplace responde **404**. |
| Sin la variable (por defecto del código y de `pnpm demo`): marketplace comprador/vendedor | Intercambio entre empresas: personas y empresas, transacciones con chat y pago en garantía, créditos, búsqueda y alertas, modo confidencial, cumplimiento REP. `pnpm demo:marketplace` (o `:reset`). |

Las pruebas del modo anterior están en `apps/api/test/marketplace/` y fijan el modo; se borrarán junto con ese código (criterio en la decisión 0001).

## Asistente local
`packages/shared/src/agente/`: mini-ADK en TypeScript (agente con herramientas tipadas, sub-agentes, bucle con sesión). Usa **Gemini Nano** por la API Prompt de Chrome con salida JSON restringida y, si no está disponible o falla, un **modelo de reglas**. El del intermediario **solo consulta** (benchmark, material por cotizar, estado de la red): no tiene herramientas que cambien datos. Requisitos de Nano y límites: [docs/investigacion-y-mejoras.md](docs/investigacion-y-mejoras.md#6-el-agente-local-gemini-nano). ⚠️ Las pruebas usan un Nano simulado; **Nano real no se verificó en este entorno**.

## Comandos

| | |
|---|---|
| `pnpm demo` / `pnpm demo:reset` | Prototipo de intercambio entre empresas (modo `MARKETPLACE`) con 33 ofertas ilustradas |
| `pnpm demo:b2b` / `pnpm demo:b2b:reset` | Swapit para acopiadores (modo `B2B2B`) |
| `pnpm --filter @swapit/api test` | 160 pruebas contra un **Postgres real en memoria** (PostGIS + pgvector), de los dos modos |
| `pnpm typecheck` / `pnpm build` | Verificación de tipos / compilación |

Para producción: crear la BD en Neon (`CREATE EXTENSION postgis; CREATE EXTENSION vector;`), poner `DATABASE_URL` en `apps/api/.env` y ejecutar `pnpm --filter @swapit/api prisma:deploy`. La conexión `?pgbouncer=true&connection_limit=1` del `.env` de desarrollo es solo para la base embebida (una sola sesión).

## Supuestos y advertencias
- **Los precios del benchmark de la demo son datos de ejemplo.** Sin compras reales cargadas (CSV o acopios), el rango sirve para ver cómo funciona, no como precio de mercado; la interfaz lo rotula.
- **Precio de la suscripción, fee por certificado, factores de CO₂eq, créditos y precios de referencia por categoría son placeholders** (`ConfigPlataforma`, `packages/shared/src/factores-co2.ts`). Presentarlos como estimaciones.
- El certificado es una **constancia de trazabilidad**; no reemplaza el Manifiesto de Residuos Sólidos Peligrosos ni las declaraciones oficiales ante SIGERSOL/OEFA (lo indica el propio PDF). Identifica al proveedor, al intermediario y al cliente destino.
- La normativa de residuos aplicable a una mype y el tratamiento de datos personales (teléfonos de proveedores) no se han verificado en detalle.
- El mapa usa teselas abiertas (OpenFreeMap/OpenStreetMap); con `NEXT_PUBLIC_MAPBOX_TOKEN` usa Mapbox. Las teselas gratuitas no son para tráfico de producción.
- Los datos de empresas, RUC, teléfonos, precios y logos del seed son ficticios; los nombres no corresponden a empresas reales.
- Investigación y análisis previos al pivote: [docs/investigacion-y-mejoras.md](docs/investigacion-y-mejoras.md).

## Cuentas de demo del intercambio (contraseña `demo1234`)
- **Ofertantes:** `ana@vallesol.pe`, `luis@losandes.pe`, `jorge@molinosnorte.pe`, `patricia@agrotallan.pe`, `wilmer@sitalara.pe` (confidencial).
- **Demandantes:** `carlos@biocompost.pe`, `henry@plastirecicla.pe`, `sandra@energiaverde.pe`, `rocio@calizassechura.pe`.
- Las fotos de la demo son **ilustraciones generadas** (`apps/api/src/seed/imagenes-demo.ts`); se reemplazan por fotos reales cuando las empresas suban las suyas. Todos los datos son ficticios.
