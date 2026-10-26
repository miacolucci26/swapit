# 0003 — Enfoque en empresas e intermediarios; personas fuera de la oferta

**Estado:** propuesta (21-oct-2026). Falta confirmación del equipo.

## Contexto
La encuesta a personas (n = 23) muestra un segmento pequeño, sesgado a 18-24 años, con poca disposición a pagar y solo 2 de 23 dispuestos a probar. Las conversaciones con empresas y MYPE muestran que el dolor es **qué hacer con un residuo y a quién entregarlo**, no la falta de demanda. El producto ya se había pivotado a intermediarios (decisión 0001).

## Decisión
1. **Personas no forman parte de la oferta.** Ya estaban detrás de `SWAPIT_MODO=MARKETPLACE`; en el modo por defecto no hay registro de personas, ni rutas ni menú.
2. **El valor para empresas viene de tres cosas:** información libre de cadenas y residuos (`/aprovechamiento`), herramientas operativas del intermediario (red, precio justo, acuerdos de temporada, destinos, certificados) y un asistente que pregunta bien.
3. **Hipótesis a validar, no a construir todavía:** *campañas de acopio con puntos de entrega* (colegios, universidades, municipios), donde un intermediario capta usados de muchas familias a la vez. El comprador sigue siendo el intermediario, no la familia.
4. **El código del modo marketplace no se borra aún.** Se propone eliminarlo en un commit aparte cuando el equipo lo confirme (criterio en 0001): se retiran `apps/api/test/marketplace/`, las rutas con `@SoloMarketplace()` y las pantallas de lotes, mapa, matching, créditos y transacciones.

## Consecuencias
- Menos superficie que mantener y que explicar; la portada habla solo a intermediarios, productores y MYPE.
- Se pierde la opción de un efecto de red entre familias; se acepta porque la evidencia no la respalda.
- El nombre «Swapit» se mantiene (orden del equipo); queda el riesgo de que ya exista una app con ese nombre en Google Play.
