# Validación con entrevistas → mejoras generales de Swapit

Documento impersonal: resume lo que dicen la encuesta a personas (n = 23), las conversaciones con MYPE y una entrevista adicional a una agroexportadora de mango, y lo traduce en mejoras generales del producto. No cita a personas ni a empresas.

## Qué dicen los datos (resumen)
- **Personas / familias:** muestra sesgada a 18-24 años (82,6 %); 56,5 % acumula lo que ya no usa; solo 21,7 % dice que sus canales actuales funcionan; 56,5 % desistió de dar algo por logística; la utilidad percibida de la IA de publicación (47,8 %) quedó bajo el umbral propio (55 %) en dos rondas; solo 2 de 23 dejaron contacto para probar. Es un rubro pequeño y con poca disposición a pagar por sí mismo.
- **Empresas y MYPE:** la desintermediación es el riesgo mayor; el dolor real no es la falta de demanda sino **no saber qué se puede hacer con un residuo ni a quién dárselo**; casi nadie intercambia residuo «en crudo» (hay transformación de por medio); piden **información de uso por producto**, **más categorización** (tipo de actor, presentación del producto) y una **interfaz simple**; las cooperativas son hoy 100 % cara a cara; una agroexportadora cierra el descarte **antes de la campaña con un precio y una fecha de recojo**, no tiene stock y usa su propio ERP.
- **Riesgo de marca:** «Swapit» ya existe como nombre de app en Google Play (confirmado por dos encuestados). La decisión vigente es mantener el nombre; queda como riesgo antes de cualquier lanzamiento público.

## Mejoras generales (hallazgo → qué se hizo → qué falta)

| Hallazgo | Mejora | Estado |
|---|---|---|
| Falta información de uso por producto; hay que saber qué hacer con cada residuo | Base de **cadenas productivas**: etapas, residuos, **vidas** ordenadas por la jerarquía del DL 1278, quién las recibe, cómo se gana, qué cumplir y con qué **evidencia** (práctica común / reportado / por validar) | Hecho: `packages/shared/src/cadenas*.ts` (12 cadenas, 52 flujos) |
| La información debe ser libre y educar | Sección pública **Aprovechamiento** (`/aprovechamiento`): buscador, cadenas, residuos, diagnóstico por proceso, guía y calculadora para MYPE | Hecho |
| «Lo importante es la pregunta, no la respuesta» | El asistente **pregunta** cuando el residuo es ambiguo (botones de respuesta) y cada residuo lista qué preguntar antes de cerrar | Hecho |
| El asistente con Gemini Nano «no funciona» | Rediseño por etapas (ruta → argumentos → redacción) con ejemplos, respaldo por decisión, tiempo máximo y pausa, y **autodiagnóstico** en pantalla. Causa real hallada en un Chromium 152: declarar solo español hacía que Chrome respondiera «no disponible» | Hecho; **Nano real sin verificar de punta a punta** (falta la descarga del modelo) |
| Personas: rubro pequeño | Ver decisión propuesta abajo | Pendiente de confirmar |
| Más categorización (tipo de actor, sector, presentación del producto) | Campos `sector`, `tipoActor`, `presentacion`, `residuoRef` en proveedor y material, con filtros | Pendiente (migración 0011) |
| Acuerdos antes de la campaña (precio + fecha de recojo) | Módulo de **acuerdos de temporada** y «registrar recojo» | Pendiente |
| Liquidez: «¿hay compradores mapeados?» | **Directorio de destinos** del intermediario, ligado a los tipos de comprador de cada residuo | Pendiente (el asistente ya lo consulta si existe) |
| Usan su propio ERP; deben ahorrar tiempo | **Exportar a Excel** el material (y destinos) | Pendiente |
| Interfaz simple para gente de negocio | Lista de primeros pasos en el panel | Pendiente |

## Decisión propuesta sobre personas
El producto se enfoca en **empresas e intermediarios**. El segmento personas queda fuera de la oferta (ya estaba detrás del interruptor `SWAPIT_MODO=MARKETPLACE`). Como hipótesis a validar, no a construir todavía: **campañas de acopio con puntos de entrega** (colegios, universidades, municipios) donde el intermediario capte usados de muchas familias a la vez. El código de personas no se borra todavía; se propone borrarlo en un commit aparte cuando se confirme.

## Límites
- Los valores de las vidas son **cualitativos**; no hay precios de mercado validados.
- Las vidas «reportadas» o «por validar» necesitan contraste con compradores y técnicos de la región; falta sumar fuentes citables por vida.
- Falta una entrevista con una cooperativa o asociación agraria (adopción digital).
