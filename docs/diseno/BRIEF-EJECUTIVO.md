# Brief: diseño EJECUTIVO (reemplaza el estilo «colorido» de BRIEF-IMPLEMENTACION.md)

Feedback del equipo (22-oct-2026): el rediseño colorido quedó «aniñado». Se pide algo **ejecutivo, estructurado, de reporte: un dashboard empresarial**, sobrio, que se parezca más a la primera versión (verde y blanco) pero con más información útil. Además:
- Se perdió demasiado: hay que **recuperar y mostrar el proceso productivo** (de dónde sale cada residuo en su cadena) y **en qué se puede convertir cada insumo** (las «vidas», con su nivel de valor, evidencia y quién las compra). Esa información vive en `packages/shared/src/cadenas*.ts` y en las páginas públicas `/aprovechamiento/*`.
- **Demasiadas secciones al explorar**: menos controles, más agrupados. Nadie abre muchas secciones.
- **Fotos reales** donde existan; sin ilustraciones infantiles ni pictogramas grandes en círculos de colores.
- Menú de 4 entradas (Explorar, Publicar, Mi actividad, Mi empresa). Lo demás se aglomera DENTRO de esas pantallas (pestañas o secciones plegables), no en el menú.

## Lenguaje visual
- **Sobrio y denso**: fondo gris muy claro (`bg`), superficies blancas con borde fino (`line`) y sombra casi nula, radios de 8–10 px (no 20), títulos de 20–28 px, cuerpo de 14–15 px, etiquetas de 12–13 px. Números grandes solo en KPI (28–32 px, tabulares). Tipografía **Inter** para todo (pesos 400/500/600/700), `tabular-nums` en cifras.
- **Color con disciplina**: navy (`nav-*`) para estructura (barra lateral, encabezados de tabla, enlaces), verde (`pri-*`) para la acción primaria y lo positivo, ámbar (`ambar-*`) SOLO para atención/pendiente, rojo para error. Las categorías de material se indican con un **punto de color pequeño** + texto, no con tarjetas coloridas. Máximo 2 colores de énfasis por pantalla.
- **Estructura de reporte**: franja de KPI arriba (3–5 indicadores), luego tabla o tarjetas compactas, luego detalle. Encabezados de sección con título + una línea de contexto + acción a la derecha. Tablas con cabecera gris, filas de 44–52 px, filtros arriba en una sola barra.
- **Iconografía**: solo íconos de trazo del set `components/vis/Iconos.tsx` a 16–20 px, en gris o navy. Prohibido: emojis, `Pictograma` grandes, círculos de colores con íconos como decoración, degradados llamativos, formas decorativas.
- **Imágenes**: fotos de los lotes (cuando hay) en miniatura 56–72 px en tablas y 16:10 en tarjetas. Si no hay foto: bloque neutro `surface-2` con la inicial/ícono de la categoría en gris, nunca ilustraciones de caricatura. Etiqueta «Demo» (insignia gris pequeña) en ofertas/empresas de demostración.
- **Texto**: conciso pero informativo (más datos útiles, menos adornos). Verbos claros en botones («Proponer acuerdo», «Publicar», «Aceptar»).
- Accesibilidad: contraste AA, foco visible, zonas táctiles ≥ 40 px en móvil, sin desbordes horizontales a 390 px, la barra inferior móvil con 4 entradas.

## Tokens (los define `globals.css`; úsalos por clase)
`bg-bg`, `bg-surface-2`, `border-line`, `text-ink-900/700/500`, `bg-nav-900/800/700/600/50`, `text-nav-700`, `bg-pri-600` (acción) `hover:bg-pri-700`, `bg-pri-50` `text-pri-700`, `bg-ambar-50 text-ambar-700`, `text-error`, categorías: `bg-cat-agro`, `bg-cat-pesca`, `bg-cat-textil`, `bg-cat-plastico`, `bg-cat-otros` (puntos). Las clases antiguas `sol-*` y `marino-*` desaparecen (se renombran a `pri-*` y `nav-*`).
