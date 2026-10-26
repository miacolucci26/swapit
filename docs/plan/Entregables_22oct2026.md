# Entregables del plan de trabajo (22–23 oct. 2026)

## 1. Pantallas del plan y estado

| Pantalla | Prioridad | Estado | Archivo principal |
|---|---|---|---|
| 01 Inicio (Publicar → Encontrar → Negociar) | P0 | Hecho | `components/LandingMarketplace.tsx` |
| 02 Explorar (lista con fotos, filtros, mapa secundario) | P0 | Hecho. «Busco» no existe en el modelo: queda para después del pitch | `app/(app)/lotes/page.tsx` |
| 03 Ficha (galería, volumen, condiciones, usos, «Proponer acuerdo») | P0 | Hecho; el contacto directo se habilita solo con acuerdo | `app/(app)/lotes/[id]/page.tsx` |
| 04 Publicar en 3 pasos | P0 | Hecho; campos técnicos opcionales | `app/(app)/lotes/nuevo/page.tsx` |
| 05 Mi actividad (Propuesta → Aceptada → Cerrada) | P0 | Hecho (`etapaSimple` en `packages/shared`) | `app/(app)/transacciones/**` |
| 06 Mi empresa (Pendiente / Verificada) | P1 | Hecho; el validador SUNAT es simulado y no se rotula oficial | `app/(app)/perfil/page.tsx` |
| 07 Impacto (toneladas y acuerdos primero) | P1 | Hecho; CO₂e solo como estimación demostrativa | `app/impacto/page.tsx` |
| 08 Vistas secundarias | P1 | Aprovechamiento (proceso productivo, usos, calculadora) y modo acopiadores en el mismo estilo | `app/aprovechamiento/**`, `app/(app)/{panel,red,material,...}` |

No se activó el asistente de WhatsApp con IA en la demo (queda apagado salvo `WHATSAPP_IA=on` y clave de Gemini).

## 2. Qué se conservó y qué se cambió
- Conservado: migraciones, endpoints, datos de semilla, modo B2B2B (`pnpm demo:b2b`), base de conocimiento (12 cadenas, 52 residuos con sus usos), certificados, benchmark.
- Cambiado: diseño completo (sobrio, tablas, sin ilustraciones infantiles), menú de 4 opciones, ofertas con foto, estados simplificados, seguridad y preparación para Vercel/Supabase.
- Nada se eliminó de forma destructiva.

## 3. Pruebas
- `pnpm typecheck`: sin errores.
- `pnpm --filter @swapit/api test`: 282 de 282 en verde.
- `pnpm humo` y `pnpm build`: pasaron al cerrar el despliegue; el entorno real (Supabase/Vercel) **no** se probó por falta de cuentas.
- Revisión visual en escritorio y móvil (390 px) de Explorar, Ficha, Publicar y Mi actividad.

## 4. Demo de 60–90 s
1. `iniciar-swapit.bat` (o `pnpm demo`) y abrir http://localhost:3000.
2. Entrar como `carlos@biocompost.pe` / `demo1234`.
3. **Explorar:** filtrar por «Plástico», abrir una oferta.
4. **Ficha:** revisar fotos y volumen; «Proponer acuerdo» con cantidad y precio.
5. **Mi actividad:** entrar como el ofertante (`ana@vallesol.pe`), aceptar; el contacto se habilita; marcar entregado y cerrar.
6. **Impacto:** toneladas intercambiadas y acuerdos cerrados.

## 5. Pendiente después del pitch
- Fotos reales de materiales (hoy son ilustraciones etiquetadas «Demo»).
- Pantalla «Busco» (demandas publicadas): requiere cambio de modelo.
- Pagos reales (hoy simulados), SUNAT real (hoy verificación manual), factores de CO₂e documentados.
- Límite de tasa compartido (Upstash/Redis) y revocación de sesiones en producción.
- Desplegar: crear proyecto en Supabase y dos proyectos en Vercel según `docs/despliegue.md`; apagar `REGISTRO_ABIERTO` cuando los dos clientes reales se hayan registrado.
- Incorporar WhatsApp con IA cuando exista la clave de Gemini.
