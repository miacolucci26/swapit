# Asistente local con Gemini Nano

El asistente corre en el navegador de cada persona. Si Gemini Nano (API Prompt de Chrome) no está disponible o falla, cada decisión pasa a un **modelo de reglas** sin IA generativa. Todo funciona sin claves de API.

## Cómo decide (por etapas cortas)
1. **Ruta:** elige una herramienta de una lista cerrada (esquema JSON con `enum`) viendo ejemplos de cada una como turnos `user/assistant`.
2. **Argumentos:** extrae los datos de ESA herramienta (esquema solo con sus parámetros). Lo que los modelos pequeños suelen hacer mal se corrige sin IA: las cantidades salen de la frase (`Herramienta.completar`).
3. **Redacción:** solo en respuestas de conocimiento. Si el texto trae cifras que no estaban en los datos (`respuestaFiel`), se descarta y se usa el texto verificable de la herramienta.
- El asistente del intermediario **solo consulta**; no tiene herramientas que cambien datos.
- Si el residuo es ambiguo («mango», «bagazo»), **pregunta** con botones de respuesta.

## Herramientas
`vidas_de_residuo`, `explorar_cadena`, `compradores_para` (base de cadenas, `packages/shared/src/cadenas*.ts`), `consultar_benchmark`, `material_pendiente`, `mi_red`.

## Fallos y diagnóstico
- Cada llamada queda en una bitácora (`etapa`, `ms`, salida o error). El motivo de un respaldo se ve en la respuesta («Respondió: …») y en el panel de la página.
- Tiempo máximo por llamada (30 s) y **pausa de 1 minuto** tras un fallo del navegador, para no hacer esperar a nadie.
- **«Probar Gemini Nano»** (en `/asistente`) recorre: API presente, disponibilidad, sesión/descarga, respuesta simple, JSON restringido, español y elección real de herramientas. «Copiar informe» genera un texto para pegar en un reporte.

## Lo aprendido (importante)
- En un Chromium 152 real, declarar **español** en `expectedInputs/expectedOutputs` devolvía `unavailable`, mientras `en` o sin declarar devolvían `downloadable`. El primer diseño declaraba solo español y por eso nunca ofrecía la descarga. Ahora se prueba español → inglés → sin declarar y se usa el primero aceptado (`ESTRATEGIAS_IDIOMA`).
- `create()` exige un **gesto real del usuario** (clic) mientras el modelo está `downloadable`; un clic programático falla con `NotAllowedError`.
- Requisitos de Chrome: escritorio, ~22 GB libres, GPU > 4 GB de VRAM o CPU con 16 GB de RAM; según la versión puede requerir banderas en `chrome://flags` (estado en `chrome://on-device-internals`).

## Cómo probarlo en una máquina real
1. Abre `/asistente` en Chrome de escritorio.
2. Pulsa **Probar Gemini Nano** (descarga el modelo si hace falta; son varios GB).
3. Si algo falla, **Copiar informe** y compártelo.

## Pendiente
Nano real sin verificar de punta a punta en este proyecto (la descarga no se disparó sin permiso). Las pruebas usan un Nano simulado que ve los mismos mensajes y esquemas que el real.
