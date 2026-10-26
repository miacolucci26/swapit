# Swapit: referencias visuales y guía de identidad

Fecha: 2026-10-21. Alcance: investigación y propuesta; no se tocó código del proyecto.

Leyenda de confianza: **[Visto]** = abrí la página en el navegador y leí estilos/DOM reales; **[Propio]** = criterio mío, no sale de una fuente. Los ratios WCAG de la sección 2 los calculó un script (WCAG 2.x, luminancia sRGB), no son estimados.

---

## 1. Referencias reales (8)

| # | Sitio | Qué tomar (patrón concreto) | Qué evitar |
|---|---|---|---|
| 1 | **Treinta** (app de gestión para negocios pequeños, LatAm) https://www.treinta.co | [Visto] Hero en blanco con **una palabra resaltada**: "Punto de venta" en amarillo `#FECB18` sobre píldora azul-marino `#1A2732`. Tres líneas cortas con ícono lineal en vez de párrafo. Cifras grandes con ícono ("+7.000.000 negocios", "+21 países", Nunito Sans 700, 30 px). Botones redondeados 16 px, mockup de teléfono. Tipografía: Lexend Deca (cuerpo) + Nunito Sans (títulos). | Hero con mockup de laptop + teléfono (demasiado producto, poco material). Animación de entrada que deja el hero vacío 1-2 s en conexión lenta. |
| 2 | **Plastic Bank** https://plasticbank.com | [Visto] Fondo de malla de degradados (radiales violeta `rgba(134,61,224)`, celeste `rgb(31,159,199)`, verde `rgb(55,164,80)`). Titular gigante en mayúsculas, peso 900, con el punto final como cuadrado verde. Historia de **una persona** ("Elizabeth recoge plástico") en vez de explicación. Botón blanco píldora 52 px de alto, texto `#002A3D`. Cifra héroe: "10.5 billion bottles exchanged for income". | Fotos/video como única fuente de emoción (Swapit no tendrá fotos). Fondos de degradado en pantallas con tablas (bajan la legibilidad). |
| 3 | **Too Good To Go (portal de negocios)** https://www.toogoodtogo.com/en-us/surplus-food-marketplace | [Visto] Fondo plano teal `#00615F`, kicker amarillo pálido `#FFFB9B`, titular condensado en mayúsculas, botón blanco píldora 51 px alto (radio 120 px). Flujo en **4 tarjetas "STEP ONE-FOUR"** con una frase cada una. Dato héroe con unidad: "2.7 KG de CO2e evitados por bolsa". Cinta de categorías en loop (PAN, FLORES, SUSHI...) = patrón para chips de material. | Párrafos de 30+ palabras bajo cada paso. Fuente de marca con licencia (no replicable). |
| 4 | **Watershed** https://watershed.com | [Visto] Fondo blanco-azulado `#F5F8FF`, CTA azul `#265CFF`. Bloques planos de color (verde `#1B7A5A`, naranja `#FF6633`, azul) y **tarjetas flotantes conectadas por línea** ("Denim" → "Jeans assembly") para explicar cadena de suministro. Kicker en monoespaciada con cuadrito de color. | Titular de 72 px peso 500 muy largo ("Where climate leaders are market leaders") y lenguaje de ejecutivos. Radio 2 px: se ve frío para público no técnico. |
| 5 | **DeHaat Shop** (agrotech India, web móvil) https://dehaat.in | [Visto, emulando 375 px] Interfaz en hindi, **buscador con micrófono** (voz) al lado, hoja inferior (bottom sheet) con **dos botones de ancho completo apilados**: primario verde sólido `#0F8040` y secundario con tinte verde claro. Botón ≈ 48 px de alto. Es el patrón de oro para gente con poca alfabetización: un solo camino principal y un secundario suave. | Dejar el fondo gris sin contexto detrás del modal (pierde orientación). |
| 6 | **Circularise** https://circularise.com | [Visto] Tres tarjetas **Collect / Trace / Share** con etiqueta de estado "REQUIRED / NOT REQUIRED", y una "ficha de pasaporte" ilustrada (ID, química, sello VERIFIED). Un acento violeta (≈`#5B4FD6`) sobre azul noche `#101D33`; Inter 800 de 64 px. Útil para el diseño del **certificado con QR** (ficha con campos + sello). | Todo el estilo: fondo oscuro, jerga normativa ("DPP", "ISCC"), tarjetas con 40 palabras. Público equivocado. |
| 7 | **Recykal** (marketplace de reciclables, India) https://www.recykal.com | [Visto] **Embudo de números grandes**: 65 M MT generados → 43 M recolectados → 12 M tratados / 31 M descartados. Es el patrón para el ciclo reportado → cotizado → acopiado → despachado en cifras. Poppins 700 en titulares. | Hero con foto oscura de basura y titular de 4 líneas: pesado de cargar y deprimente. |
| 8 | **Excess Materials Exchange** https://excess.company | [Visto] Sección "How it works": **01 / 02 / 03** con título de 3 palabras ("Upload Materials", "Track and Trade in Real-Time", "Grow Revenue...") y una línea. Fondo blanco con degradado lavanda; Inter Display 500, 80 px. | Texto gris claro sobre lavanda (contraste bajo en el hero), mockup de laptop pálido, cero color por material. |

Revisadas y descartadas (para no repetir trabajo): Cropin Trace (oscuro, Manrope 500, `#07090D`; el patrón útil es "páginas por cultivo", ya cubierto), Koltiva (hero con foto desenfocada y titulares de 20+ palabras; sí tiene contadores "2M productores"), cirplus (empresa en liquidación, el sitio ya no explica el producto), Ninjacart (la página no renderizó en el navegador), Twiga (el dominio devolvió 404), Hello Tractor (la navegación fue denegada). No las cito como referencia.

**Síntesis de patrones para Swapit [Propio, derivada de lo visto]:**
1. Una palabra resaltada con "marcador" de color por titular (Treinta, TGTG).
2. Flujos en 3-4 tarjetas numeradas, una frase por tarjeta (TGTG, EME).
3. Cifra grande + unidad + 2 palabras de etiqueta en lugar de párrafo (Recykal, Treinta, Plastic Bank).
4. Botón primario de ancho completo + secundario suave, abajo (DeHaat).
5. Persona/lote concreto como historia ("Lote de mango, Piura") en vez de definición abstracta (Plastic Bank).

---

## 2. Paleta

Idea: **sol y mar del norte**. Mango (acción) + azul marino (confianza, estructura) + limón (resaltador). Los verdes se reservan a "Agro" y "éxito"; no hay verde de marca.

Colores de marca: `sol` = primaria (naranja mango), `marino` = secundaria (azul), `limon` = acento cálido.

### Reglas de uso (obligatorias)
- **Sobre `sol-500` el texto va siempre en tinta (`ink-900`)**, nunca blanco (blanco sobre sol-500 = 2.36:1, falla).
- `sol-500` solo como relleno (botón, barra). Para texto, ícono o gráfico sobre blanco: `sol-700` (5.24:1).
- `alerta` (amarillo `#F5B800`) nunca como ícono/borde solo sobre blanco (1.79:1): usar `alerta-ink` `#7A5200` para el ícono y el borde.
- Rojo y negro no se usan como color de categoría: en la norma peruana de residuos (NTP 900.058, fuente: [Andina](https://andina.pe/ingles/noticia-inacal-promueve-uso-codigo-colores-para-segregacion-responsable-residuos-solidos-840364.aspx), abierta) rojo = peligrosos y negro = no aprovechables; verde = aprovechables. Por eso verde es "éxito" y "Agro", y rojo solo error.
- Color nunca es la única señal: toda categoría y estado lleva ícono + palabra.

### Tokens

```css
/* globals.css, pegar tras @import "tailwindcss"; */
@theme {
  /* Marca: SOL (primaria, mango) */
  --color-sol-50:  #FFF4E5;
  --color-sol-100: #FFE3BD;
  --color-sol-200: #FFC97A;
  --color-sol-300: #FFAE3D;
  --color-sol-400: #FF9A14;
  --color-sol-500: #FF8A00; /* botón primario, texto encima: ink-900 */
  --color-sol-600: #E87500; /* hover */
  --color-sol-700: #B34E00; /* texto/ícono/KPI sobre blanco */
  --color-sol-800: #8A3C00;
  --color-sol-900: #5C2800;

  /* Marca: MARINO (secundaria, azul) */
  --color-marino-50:  #EAF0FF;
  --color-marino-100: #D3E0FF;
  --color-marino-200: #A9C2FF;
  --color-marino-500: #3B6BF0;
  --color-marino-600: #2459D6; /* enlaces, botón secundario, info */
  --color-marino-700: #1D47AD;
  --color-marino-800: #16367F;
  --color-marino-900: #0E2352; /* hero oscuro, logo */
  --color-marino-950: #0A1838; /* barra inferior */

  /* Acento cálido: LIMÓN (resaltador; solo con tinta encima) */
  --color-limon-100: #FFF7C2;
  --color-limon-300: #FFE45C;
  --color-limon-400: #FFD60A;
  --color-limon-ink: #4D3B00;

  /* Neutros (azulados, no gris plano) */
  --color-ink-900: #0F1B33; /* texto principal */
  --color-ink-700: #33425E; /* texto secundario */
  --color-ink-500: #5B6B86; /* texto atenuado (mín. permitido) */
  --color-ink-400: #8795AD; /* borde de campo, placeholder */
  --color-ink-300: #B7C1D3;
  --color-ink-100: #E9EEF6;
  --color-line:      #DDE4EF; /* divisores decorativos */
  --color-surface-2: #F3F6FB;
  --color-bg:        #F8FAFD; /* fondo de la app */
  --color-cream:     #FFF9EF; /* fondo de la sección educativa */

  /* Categorías de material: sólido / tinte / tinta */
  --color-agro:          #2B8412;  --color-agro-tint:     #E6F5DA;  --color-agro-ink:     #1C5A0B;
  --color-pesca:         #0A7F96;  --color-pesca-tint:    #DFF4F8;  --color-pesca-ink:    #0A5163;
  --color-textil:        #C42885;  --color-textil-tint:   #FCE6F2;  --color-textil-ink:   #86175A;
  --color-plastico:      #8B3FD9;  --color-plastico-tint: #F0E6FC;  --color-plastico-ink: #51269A;
  --color-otros:         #8B5A2B;  --color-otros-tint:    #F5EBDD;  --color-otros-ink:    #5C3A18;

  /* Semánticos */
  --color-exito:  #0C8467;  --color-exito-tint:  #DDF4EC;  --color-exito-ink:  #08573F;
  --color-alerta: #F5B800;  --color-alerta-tint: #FFF6D6;  --color-alerta-ink: #7A5200;
  --color-error:  #D92D20;  --color-error-tint:  #FEE9E7;  --color-error-ink:  #9C1C13;
  --color-info:   #2459D6;  --color-info-tint:   #EAF0FF;  --color-info-ink:   #16367F; /* = marino */

  /* Tipografía (variables creadas con next/font, ver sección 3) */
  --font-display: var(--font-lexend), system-ui, sans-serif;
  --font-sans: var(--font-atkinson), system-ui, sans-serif;

  /* Forma */
  --radius-card: 20px;
  --radius-control: 14px;
  --radius-pill: 9999px;
  --shadow-card: 0 1px 2px rgb(15 27 51 / .06), 0 8px 24px -8px rgb(15 27 51 / .12);
}
```

Fondo y degradado sugeridos: hero `linear-gradient(135deg, var(--color-marino-900), var(--color-marino-700))` con una forma `sol-500` y otra `limon-400` por detrás. Foco de teclado: anillo 3 px `marino-600` (sobre fondos oscuros, `limon-400`).

Mapeo de categorías: Agro = mango, limón, arroz, caña; Pesca = pescado, concha; Textil; Plástico; Otros = cartón, madera, aceite.

### Tabla de contraste (calculada con script, WCAG 2.x)

| Pareja (texto sobre fondo) | Ratio | Mínimo | Resultado |
|---|---|---|---|
| ink-900 `#0F1B33` sobre bg `#F8FAFD` | 16.40 | 4.5 | OK |
| ink-900 sobre blanco | 17.14 | 4.5 | OK |
| ink-700 `#33425E` sobre blanco | 10.09 | 4.5 | OK |
| ink-500 `#5B6B86` sobre blanco | 5.40 | 4.5 | OK |
| ink-500 sobre surface-2 `#F3F6FB` | 4.98 | 4.5 | OK |
| ink-400 `#8795AD` borde de campo sobre blanco | 3.03 | 3 (UI) | OK, límite: no bajar de este tono |
| **ink-900 sobre sol-500 `#FF8A00` (botón primario)** | 7.26 | 4.5 | OK |
| ink-900 sobre sol-600 (hover) | 5.69 | 4.5 | OK |
| blanco sobre sol-500 | 2.36 | 4.5 | **FALLA: prohibido** |
| sol-500 como ícono/gráfico sobre blanco | 2.36 | 3 | **FALLA: usar sol-700** |
| sol-600 gráfico sobre blanco | 3.01 | 3 | OK (justo) |
| sol-700 `#B34E00` texto sobre blanco | 5.24 | 4.5 | OK |
| sol-700 sobre sol-50 / sobre cream | 4.82 / 5.00 | 4.5 | OK |
| sol-800 sobre sol-100 | 6.22 | 4.5 | OK |
| blanco sobre marino-600 `#2459D6` | 6.04 | 4.5 | OK |
| marino-600 enlace sobre blanco / sobre bg | 6.04 / 5.78 | 4.5 | OK |
| blanco sobre marino-700 / 800 / 900 / 950 | 8.21 / 11.24 / 15.21 / 17.49 | 4.5 | OK |
| sol-400 sobre marino-900 (acento en hero oscuro) | 7.16 | 4.5 | OK |
| sol-500 sobre marino-950 (ítem activo, barra inferior) | 7.40 | 4.5 | OK |
| limon-400 sobre marino-900 | 10.77 | 4.5 | OK |
| marino-200 sobre marino-950 (ítem inactivo) | 9.87 | 4.5 | OK |
| ink-900 sobre limon-400 (resaltador) | 12.14 | 4.5 | OK |
| limon-ink sobre limon-100 | 9.96 | 4.5 | OK |
| Agro: blanco sobre `#2B8412` / ink sobre tinte | 4.76 / 7.33 | 4.5 | OK |
| Pesca: blanco sobre `#0A7F96` / ink sobre tinte | 4.68 / 7.78 | 4.5 | OK |
| Textil: blanco sobre `#C42885` / ink sobre tinte | 5.26 / 7.77 | 4.5 | OK |
| Plástico: blanco sobre `#8B3FD9` / ink sobre tinte | 5.51 / 8.32 | 4.5 | OK |
| Otros: blanco sobre `#8B5A2B` / ink sobre tinte | 5.84 / 8.59 | 4.5 | OK |
| Éxito: blanco sobre `#0C8467` / ink sobre tinte | 4.65 / 7.45 | 4.5 | OK |
| Alerta: ink-900 sobre `#F5B800` / alerta-ink sobre tinte | 9.58 / 6.40 | 4.5 | OK |
| alerta `#F5B800` como ícono sobre blanco | 1.79 | 3 | **FALLA: usar alerta-ink (6.92)** |
| Error: blanco sobre `#D92D20` / ink sobre tinte | 4.83 / 6.96 | 4.5 | OK |
| Info: blanco sobre `#2459D6` / ink sobre tinte | 6.04 / 9.85 | 4.5 | OK |
| ink-900 sobre cualquier tinte de categoría | 14.2 a 15.1 | 4.5 | OK |
| ink-900 sobre cream `#FFF9EF` | 16.37 | 4.5 | OK |
| Anillo de foco marino-600 sobre blanco / limon-400 sobre marino-900 | 6.04 / 10.77 | 3 | OK |

Distinción entre colores (CIEDE2000, también calculada): categorías entre sí ≥ 19.8 de ΔE (textil/plástico es el par más cercano); plástico vs marino-600 = 16.3; agro vs éxito = 17.0 (verdes cercanos: por eso se distinguen siempre con ícono y contexto: pictograma de material vs. check de estado); alerta vs limón = 8.7 (misma familia a propósito: limón es decoración, alerta solo aparece en cajas con ícono triángulo).

---

## 3. Tipografía

**Dos familias, ambas verificadas como disponibles en `next/font/google` en la versión instalada del proyecto** (leí `font-data.json` de `node_modules/next`): 

| Rol | Familia | Pesos | Por qué |
|---|---|---|---|
| Títulos, botones, etiquetas, cifras KPI | **Lexend** (variable `wght`) | 600, 700, 800 | Diseñada para facilitar la lectura (letra ancha, espaciado abierto; el sitio de Lexend afirma mejoras de lectura en un estudio pequeño, tómese como afirmación del proveedor). Treinta usa la hermana Lexend Deca en producción. Peso del archivo latin: ≈ 39.7 KB (medido con HEAD a Google Fonts). |
| Cuerpo, tablas, formularios | **Atkinson Hyperlegible Next** (variable `wght`) | 400, 500, 700 | Hecha por Braille Institute para distinguir caracteres parecidos (1/I/l, 0/O, B/8): clave para precios, kg y códigos de lote. Archivo latin ≈ 34 KB. |

Total ≈ 74 KB en 2 archivos woff2 (variables, cargados con `display: swap`, solo subset `latin`). Si el peso importa más que la lectura de cifras, se puede usar solo Lexend (39.7 KB): fallback aceptable. [Propio]

```ts
// layout.tsx (referencia para el implementador)
import { Lexend, Atkinson_Hyperlegible_Next } from "next/font/google";
const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend", display: "swap" });
const atkinson = Atkinson_Hyperlegible_Next({ subsets: ["latin"], variable: "--font-atkinson", display: "swap" });
// <html className={`${lexend.variable} ${atkinson.variable}`}>
```

Escala (móvil 390 px / escritorio ≥ 1024 px). Cuerpo nunca menor de 16 px: iOS amplía los campos de texto menores de 16 px y en teléfonos baratos los 14 px cansan.

| Uso | Familia / peso | Móvil | Escritorio | Interlineado |
|---|---|---|---|---|
| Display (hero público) | Lexend 800 | 36 px | 56 px | 1.1 |
| h1 | Lexend 700 | 28 px | 36 px | 1.15 |
| h2 | Lexend 700 | 22 px | 26 px | 1.2 |
| h3 / título de tarjeta | Lexend 600 | 18 px | 20 px | 1.25 |
| Cuerpo | Atkinson 400 | 16 px | 17 px | 1.5 |
| Cuerpo pequeño (ayuda, fecha) | Atkinson 400 | 14 px (solo secundario, ink-500 o más oscuro) | 14 px | 1.45 |
| Etiqueta / chip / botón | Lexend 600 | 14-16 px (botón 17 px) | 15 px | 1 |
| **Número grande de KPI** | Lexend 800, `font-variant-numeric: tabular-nums` | 44 px | 56 px | 1 |
| Unidad del KPI ("kg", "S/ por t") | Lexend 600 | 16 px | 18 px | 1 |

Notas: no usar cursiva ni mayúsculas en frases; mayúsculas solo en kickers de 1-2 palabras con `letter-spacing: .04em`. No comprobé en navegador si Lexend trae cifras tabulares nativas; si `tabular-nums` no tiene efecto, cambiar solo los KPI a Atkinson 800 [Propio, por verificar].

---

## 4. Logo

Se generaron 3 conceptos en `D:\Seedtech\simbio\docs\diseno\logos\` (12 SVG + `_preview.html`). Todos: isotipo en `viewBox 0 0 48 48`; horizontal con la palabra "Swapit" **convertida a trazos (path)** desde Lexend 700 (con `fontTools`, sin depender de la fuente), con el punto de la "i" en mango; versión blanca sobre cuadro marino-900. Los 12 archivos son XML válido y los vi renderizados en el navegador del entorno a 24 px, 48 px, 120 px y en versión horizontal 24/64 px.

| Concepto | Idea | Archivos | Lo que vi renderizado |
|---|---|---|---|
| **A. Trueque** | Una "S" formada por dos arcos tangentes (marino y mango) que se tocan en el centro; cada punta termina en una "ficha" del color del otro: cada lado entrega y recibe. | `a-trueque-isotipo.svg`, `-isotipo-blanco.svg`, `-horizontal.svg`, `-horizontal-blanco.svg` | A 24 px sigue leyéndose como S bicolor y las fichas se ven como puntos; a 120 px es muy reconocible. En blanco sobre marino es una S limpia. |
| **B. Encuentro** | Dos discos (productor = mango, comprador = azul) y la lente de intersección en limón = el intermediario. | `b-encuentro-*.svg` | Muy legible a 24 px y la más colorida; no contiene la S, depende del texto. En blanco la lente se vuelve un hueco: pierde significado. Parecido de estructura a logos de tarjetas de pago (Venn de dos círculos), por eso no es la favorita. |
| **C. Sol y Mar** | Disco partido por una ola: arriba sol (mango), abajo mar (marino). Cuenta el norte del Perú. | `c-solymar-*.svg` | Se ve bien a todos los tamaños, pero el disco con corte ondulado recuerda al yin-yang y no dice "intercambio" ni "S". |

**Recomendación: A "Trueque".** Razones: (1) es la única que lleva la inicial y el verbo del nombre (swap) en un solo gesto; (2) la S de trazo grueso (8/48) aguanta 24 px y favicon; (3) en una tinta (blanco) mantiene la forma completa; (4) usa los dos colores de marca, y las fichas se pueden reutilizar como motivo (puntos de color en patrones y bullets); (5) no usa hoja verde ni flecha circular. Pendiente de pulido [Propio]: la S se ve algo inclinada hacia la derecha por la ficha superior; un diseñador puede ajustar el radio de las fichas (5.2) y probar 4.6. Usar B como motivo secundario (lente limón) en ilustraciones de "intermediario", y C solo como ilustración de la sección Aprovechamiento.

Isotipo A (copiar tal cual; el archivo es `a-trueque-isotipo.svg`):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" role="img" aria-label="Swapit">
  <path d="M32.66 11A10 8 0 1 0 24 23" fill="none" stroke="#2459D6" stroke-width="8"/>
  <path d="M24 23A10 8 0 1 1 15.34 35" fill="none" stroke="#FF8A00" stroke-width="8"/>
  <circle cx="32.66" cy="11" r="5.2" fill="#FF8A00"/>
  <circle cx="15.34" cy="35" r="5.2" fill="#2459D6"/>
</svg>
```

Uso: zona de respeto = ancho de una ficha (≈ 10 px en el isotipo de 48) alrededor; tamaño mínimo 20 px (isotipo) y 80 px de ancho (horizontal); sobre fondos oscuros usar `-blanco`; nunca sobre `sol-500` en blanco (contraste 2.36). Favicon/ícono PWA: cuadro redondeado marino-900 con isotipo blanco (`a-trueque-isotipo-blanco.svg`).

---

## 5. Estilo de ilustración e íconos

**Estilo: formas planas de 3 tonos, sin contornos, esquinas redondeadas, sobre una "mancha" de color de la categoría.** Reglas: (1) cada pictograma usa base + sombra (misma tonalidad, más oscura) + luz (más clara); (2) fondo del tile = tinte de la categoría y el pictograma en el sólido de la categoría y sus dos variantes; (3) un solo detalle de acento por objeto (hoja verde, ojo, ventana); (4) lienzo 64×64, margen 4 px, curvas con `C`/`A` y círculos, nada de trazos finos (se pierden en pantallas baratas). Íconos de interfaz (menú, buscar, WhatsApp, QR): **trazo uniforme 2 px, extremos redondos, 24×24**, color `ink-700`; nunca emoji.

Patrones de fondo con SVG (sin imágenes): (a) cuadrícula de puntos de 2 px cada 16 px en `ink-300` al 30 % para tarjetas vacías; (b) ondas suaves `marino-100` en la base de los héroes; (c) mosaico de cuartos de círculo en los 5 colores de categoría para encabezado de "Aprovechamiento".

### Librería de 12 pictogramas

| # | Pictograma | Cómo dibujarlo con formas simples | Paleta |
|---|---|---|---|
| 1 | Mango | Óvalo ligeramente inclinado + media luna oscura a la derecha + elipse clara a la izquierda + hoja y rabito | sol-500 / sol-600 / sol-200; hoja agro |
| 2 | Limón | Elipse con dos botones laterales (círculos), media luna inferior oscura, brillo y hoja | limon-400 / `#F5B800` / limon-100 |
| 3 | Arroz | Tres espigas curvas (trazos gruesos con granos como elipses pequeñas) | amarillo `#E8C547` / agro |
| 4 | Caña | Dos cañas verticales con nudos (rectángulos redondeados con línea corta) y hojas largas | agro / agro-ink |
| 5 | Concha de abanico | Abanico (sector circular) con 5 surcos radiales y base trapezoidal | textil-tint / `#F4A6A0` / sol-200 |
| 6 | Pescado | Elipse de cuerpo + triángulo de cola + vientre claro + aleta + ojo | pesca / `#7FD3E3` / pesca-ink |
| 7 | Textil | Rollo: rectángulo con extremo circular y franjas diagonales | textil / textil-ink / textil-tint |
| 8 | Plástico | Botella: rectángulo redondeado + cuello + tapa + franja de etiqueta | plastico / plastico-ink / plastico-tint |
| 9 | Cartón | Caja en vista frontal: rectángulo + solapa superior + cinta central | otros / otros-ink / sol-200 |
| 10 | Madera | Tronco en corte: círculo con 2 anillos concéntricos + corteza | otros / `#C99A63` / otros-ink |
| 11 | Aceite | Gota grande + bidón (rectángulo con asa) | limon-400 / sol-600 / otros-ink |
| 12 | Camión / acopio | Caja + cabina con ventana + dos ruedas | marino-600 / sol-500 / marino-900 |

Ejemplos funcionales (también guardados y verificados en `D:\Seedtech\simbio\docs\diseno\pictogramas\`: `mango.svg`, `limon.svg`, `pescado.svg`, `acopio.svg`; los vi renderizados a 128 y 32 px y se reconocen):

```svg
<!-- mango -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M32 12c15 0 24 12 22 26-2 12-13 18-25 14C17 48 9 37 12 27 15 18 22 12 32 12z" fill="#FF8A00"/><path d="M46 15c7 7 8 17 5 26-3 8-10 12-18 11 11-4 17-14 14-26-.5-4-1-8-1-11z" fill="#E87500"/><ellipse cx="22" cy="29" rx="3.8" ry="8" transform="rotate(18 22 29)" fill="#FFC97A"/><path d="M33 13c1-6 8-9 15-7-1 6-8 10-15 7z" fill="#2B8412"/><path d="M32 13c0-3 1-5 2-7" stroke="#5C2800" stroke-width="3" stroke-linecap="round" fill="none"/></svg>

<!-- pescado -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M6 32C14 18 36 16 46 28L58 18l-2 14 2 14-12-10C36 48 14 46 6 32z" fill="#0A7F96"/><path d="M9 35c10 10 27 10 37 1l4 3C38 52 17 49 9 35z" fill="#7FD3E3"/><path d="M26 21c4-8 12-7 14 1z" fill="#0A5163"/><circle cx="18" cy="30" r="3" fill="#FFFFFF"/><circle cx="18.6" cy="30" r="1.4" fill="#0E2352"/></svg>

<!-- camión / acopio -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="5" y="18" width="34" height="26" rx="3" fill="#2459D6"/><rect x="5" y="36" width="34" height="8" fill="#1D47AD"/><path d="M39 27h10l9 9v8H39z" fill="#FF8A00"/><path d="M43 30h5l5 5h-10z" fill="#FFE3BD"/><circle cx="18" cy="46" r="6.5" fill="#0E2352"/><circle cx="18" cy="46" r="2.5" fill="#A9C2FF"/><circle cx="48" cy="46" r="6.5" fill="#0E2352"/><circle cx="48" cy="46" r="2.5" fill="#A9C2FF"/></svg>
```

(El limón está en `pictogramas/limon.svg`.) Los otros 8 pictogramas siguen la receta de la tabla y no están dibujados todavía [Propio].

---

## 6. Layout móvil (390 px) y menos texto

### Layout
- **Contenedor**: margen lateral 16 px, tarjetas de ancho completo (358 px), separación vertical 12 px entre tarjetas, 24 px entre secciones. Radio de tarjeta 20 px, sombra suave (`--shadow-card`).
- **Zonas táctiles ≥ 44 px** (objetivo 48): botones 52 px de alto, chips 40 px de alto con 8 px de separación (el área táctil se extiende con `padding` hasta 44), ícono-botón 48×48, filas de lista 64 px.
- **Una acción primaria por pantalla**: botón sol-500 de ancho completo fijo abajo (por encima de la barra), texto en ink-900 de 17 px; secundaria = botón con tinte (`marino-50` + texto marino-800) o enlace. Patrón DeHaat.
- **Barra inferior** de 4 pestañas máx. (Inicio, Material, Proveedores, Aprovechar): fondo `marino-950`, 64 px de alto + safe-area, ícono 24 px + etiqueta de 12 px 600, activa en `sol-500` (7.40:1), inactiva `marino-200` (9.87:1). El hueco de "reportar material" puede ser un botón central circular sol-500 de 56 px.
- **Jerarquía por color**: (1) lo accionable = sol-500; (2) estructura y navegación = marino; (3) material = color de su categoría (siempre pictograma + tinte); (4) estado = semánticos solo en chips/avisos; (5) fondo blanco para tarjetas sobre `bg`. Máximo 3 colores saturados visibles al mismo tiempo en una pantalla (más el color del material).
- **Espacios**: escala de 4 px (4, 8, 12, 16, 24, 32, 48). Interior de tarjeta 16 px. Texto nunca pegado al borde (mín. 12 px).
- **Ciclo del material** como **barra de 4 pasos** (reportado → cotizado → acopiado → despachado): 4 círculos de 32 px conectados, el actual en sol-500 con el pictograma, los hechos en éxito con check, los futuros en ink-100. Debajo, UNA frase del estado.
- **Precio justo**: banda horizontal con 3 marcas (bajo / justo / alto) y un punto; el rango en verde `exito-tint`, el precio del usuario como círculo sol-500; el número grande arriba.
- Tablas: en móvil se convierten en tarjetas de 3 líneas (nombre + número grande + chip).
- Prueba mínima: ver todo en un teléfono de 360×640 con red 3G simulada y sin fuentes externas cacheadas.

### 6 reglas de "menos texto"
1. **Titular ≤ 6 palabras; bajada ≤ 12 palabras; tarjeta ≤ 20 palabras en total** (título + una línea). Si no cabe, se corta o se mueve a "Ver más".
2. **Un párrafo máximo por pantalla y ≤ 30 palabras.** Todo lo demás, en pictogramas, pasos o números.
3. **Si hay un número, es el protagonista**: cifra de 44 px + unidad + etiqueta de 2-3 palabras ("S/ 1.20 por kg · precio justo"), nunca "El precio justo estimado para este material es...".
4. **Procesos = pasos numerados con ícono, máx. 4 pasos y ≤ 8 palabras por paso** (patrón TGTG/EME). No listas con viñetas de oraciones.
5. **Un verbo por botón** ("Reportar", "Cotizar", "Despachar", "Ver certificado"): ≤ 2 palabras, con ícono; nada de "Haz clic aquí para...".
6. **Cada texto explicativo debe tener un dibujo que lo reemplace primero**: si un concepto (vida del residuo, destino, certificado) se puede mostrar como escalera de 3 escalones, flujo de 3 cajas o ficha con sello, se muestra así y el texto queda como leyenda de ≤ 8 palabras. Las "vidas" del residuo = escalera de colores de mayor a menor valor (sol-500 arriba, tintes abajo).

### Cuándo usar número grande + etiqueta en lugar de párrafo
Cuando la frase contiene una cantidad, una comparación o un estado de avance: precios, toneladas acopiadas, % de avance, días, cantidad de proveedores, destinos disponibles, "resultado" de un certificado.

---

## Decisiones recomendadas (≤ 10)

1. Adoptar la identidad **Sol (mango) + Marino + Limón**; borrar stone/emerald genéricos y usar los tokens del bloque CSS en `@theme`.
2. **Texto sobre `sol-500` siempre `ink-900`**; sol-700 para texto/ícono naranja sobre blanco. Añadir una regla de lint/revisión: prohibido `text-white` sobre `bg-sol-500`.
3. **Logo oficial: concepto A "Trueque"** (`logos/a-trueque-*.svg`); usar `a-trueque-isotipo-blanco.svg` como favicon/PWA. Pedir pulido de la inclinación de la S antes de imprimir.
4. Cargar **Lexend + Atkinson Hyperlegible Next** con `next/font/google` (variables, subset latin, ≈ 74 KB); cuerpo ≥ 16 px, KPI 44 px Lexend 800.
5. Cada categoría de material = **color + pictograma + palabra** (agro, pesca, textil, plástico, otros); no reutilizar rojo ni negro para categorías (significan peligroso y no aprovechable en la norma peruana).
6. Dibujar los 12 pictogramas con el estilo de 3 tonos planos (4 ya están en `docs/diseno/pictogramas/` como base) y reemplazar todos los emoji.
7. Móvil primero: tarjetas de ancho completo, objetivo táctil 48 px, un botón primario naranja por pantalla, barra inferior `marino-950` de 4 pestañas.
8. Explicar el **ciclo del material** con una barra de 4 pasos y el **precio justo** con una banda de 3 marcas; "Aprovechamiento" con la escalera de vidas en colores.
9. Aplicar las 6 reglas de menos texto como criterio de revisión de cada pantalla (límites 6/12/20 palabras).
10. Antes de implementar, probar contraste real en pantalla de teléfono barato (brillo bajo, sol directo): si algún tinte `-tint` se pierde, subir un paso en la escala.
