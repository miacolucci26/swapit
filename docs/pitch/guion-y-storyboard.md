# Swapit: guion, storyboard y plan de video para el pitch de 2 minutos

Demo Day SeedTech UDEP (Piura). Fecha de este documento: 2026-10-22. Alcance: documento de trabajo; no se tocó código del proyecto.

**Cómo leerlo.** Cuatro partes: (1) investigación de Higgsfield y alternativas, (2) storyboard de la historia de 45 s y clips de pantalla, (3) guion hablado de 2 min con plan B de 90 s, (4) recomendaciones y checklist de demo.

**Leyenda de confianza.** **[Abierta]** = abrí la página y leí su contenido. **[Solo buscador]** = el dato viene de un resumen del buscador, sin abrir la página; no lo uses sin verificar. **[Propio]** = criterio mío. **[Dato firme]** = dato propio del equipo dado por el encargo.

**Pendientes que dependen de otros documentos** (al cerrar este archivo, `docs/pitch/` solo contenía la carpeta `capturas/`; no existían `investigacion-mercado.md` ni `investigacion-competencia-modelo.md`):
- Lámina 6 (mercado): hay un hueco marcado `{CIFRA VERIFICADA}`. Rellénalo solo con una cifra marcada como verificada en `investigacion-mercado.md`. Si no hay ninguna, usa la versión sin cifra que dejo en la lámina.
- Lámina 5 (modelo): los documentos del repo no coinciden. `README.md` y la decisión `0001` dicen «suscripción mensual + fee por certificado, sin comisión»; `docs/investigacion-y-mejoras.md` dice «comisión sobre venta». Escribí el guion con «comisión por operación cerrada + certificados de impacto» como **provisional**. Confírmalo con `investigacion-competencia-modelo.md` antes de ensayar.
- Lámina 7 (competidores): la comparación con Facebook Marketplace es una caracterización de uso (lo que dijo la mentora), no una cifra. Si el documento de competencia trae datos verificados, súmalos; si no, no inventes ninguno.
- Los factores de CO₂eq del prototipo son **de ejemplo** (la propia pantalla dice «Estimación con factores de ejemplo»). En voz alta di «estimado».
- Las 33 ofertas y las 15 empresas del prototipo son **de demostración** (ilustradas, ficticias). Dilo una vez en el pitch; la credibilidad vale más que el efecto.
- «Swapit» ya existe como nombre de app en Google Play (`docs/validacion-y-mejoras.md`). No digas «nombre único» ni «marca registrada».

---

## PARTE 1. Higgsfield: qué es, qué ofrece y qué verificar

### 1.1 Qué es
Higgsfield AI es una plataforma creativa de imagen y video con IA, fundada en 2023, que reúne «30+ modelos» y «40+ herramientas» en un mismo lugar: genera y edita video a partir de texto, imágenes o referencias. La portada hoy destaca los modelos de video Kling 4.0 y Seedance 2.5, la herramienta Genjutsu (rehace el movimiento de un clip con tus propios personajes, lugares o productos), Cinema Studio y un agente llamado Supercomputer; menciona además Nano Banana Pro (imagen), Sora 2 y Veo 3.1. **[Abierta: https://higgsfield.ai]**

Es decir, no es un solo modelo sino un **agregador**: puedes elegir el modelo de video según el plano.

### 1.2 Herramientas de video a partir de imagen o texto
- **Imagen a video y texto a video**: subes o generas una imagen, describes la escena y obtienes el clip. Hay un flujo unificado texto → imagen → refinamiento → imagen a video dentro del mismo proyecto. **[Abierta: https://unite.ai/higgsfield-ai-review/ y https://dev.to/aniruddhaadak/how-to-create-hollywood-shots-with-ai-using-higgsfield-cinema-studio-3lp8]**
- **Movimientos de cámara**: dolly, push in, pull out, pan, track, zoom, planos cenitales y laterales **[Abierta: https://blog.segmind.com/higgsfield-ai-enhanced-video-creation/]**. Una reseña habla de «Higgsfield DOP» con 250+ presets de cámara o control manual, y de Cinema Studio con distancia focal, tamaño de sensor y movimiento **[Abierta: unite.ai, arriba]**. Cinema Studio añade perfiles de cámara (ejemplo: ARRI Alexa 35), lentes, «style anchors» (ARRI, Panavision) y grano/etalonaje de película **[Abierta: dev.to, arriba]**.
- **Fotograma inicial y final (Start/End Frame)** en Cinema Studio: fijas cómo abre el plano y hacia dónde debe llegar la cámara **[Abierta: dev.to]**.
- **Estilos**: Cinema Studio y los presets de Kling ajustan iluminación, energía de movimiento y estilo visual **[Abierta: segmind y dev.to]**.
- **Duración, resolución y formato**: una reseña indica clips de **4 a 15 s**, **480p / 720p / 1080p** y formatos cuadrado, vertical y horizontal (por tanto 16:9 existe) **[Abierta: unite.ai]**. Los límites exactos **varían por modelo** (no pude abrir la página oficial de cada modelo): verifícalos en el selector de la propia herramienta antes de planificar.
- **Otras**: Lipsync Studio, Popcorn (storyboard), inpainting, face swap, upscaling **[Abierta: unite.ai]**.

### 1.3 Cómo escribir un buen prompt (lo que dicen las fuentes + criterio propio)
- Describe como si dieras indicaciones a un director de fotografía: escena, personaje, ánimo y entorno **[Abierta: dev.to]**. Define tipo de plano, trayectoria de cámara y «energía» del movimiento (lento o audaz) **[Abierta: segmind]**.
- Estructura que uso en todos los prompts de este documento **[Propio]**: `plano + sujeto + acción (un solo verbo principal) + lugar/hora/luz + movimiento de cámara + estilo fijo + negativos`.
- Un movimiento de cámara y una acción por clip. Prompts de 50–90 palabras; más texto aumenta las contradicciones **[Propio]**.
- Los **negativos**: si el modelo elegido tiene campo «negative prompt», úsalo; si no, añade al final `Avoid: ...` **[Propio; no verifiqué qué modelos tienen el campo]**.
- Nada de texto legible en cuadro (las IA de video deforman letras): los rótulos y logos se ponen luego en edición **[Propio, práctica común]**.
- Itera refinando encuadre y movimiento, no regenerando a ciegas **[Abierta: dev.to]**.

### 1.4 Consistencia de personajes y escenarios entre clips
1. **Soul ID**: crear un personaje a partir de varias fotos en ángulos distintos y reutilizarlo en imágenes y videos; además «Elements» guarda personajes y lugares reutilizables **[Abierta: unite.ai]**. (Otra fuente describe un sistema de identidad que mantiene rostros consistentes, sin llamarlo Soul ID **[Abierta: segmind]**.)
2. **Un fotograma héroe por clip**: invierte el esfuerzo en una imagen inicial aprobada y haz imagen a video desde ella; reutiliza la misma cámara, lente y style anchor en todas las tomas **[Abierta: dev.to]**.
3. **Ficha de personaje pegada literal** al inicio de cada prompt (abajo, en la «biblia de estilo») **[Propio]**.
4. Limitación reconocida: puede perder consistencia en escenas complejas o de movimiento rápido **[Abierta: unite.ai]**. Por eso la historia usa planos lentos, pocos personajes y ninguno corriendo.

### 1.5 Planes y límites gratuitos
- **Plan gratuito**: una guía comparativa dice 10 créditos al día y solo modelos básicos (sin Veo 3.1 ni Kling 3.0) **[Abierta, pero es contenido de marketing de un competidor, Creatify: https://creatify.ai/blog/higgsfield-pricing-(2026)-plans-and-what-you-ll-actually-pay]**. Otros resúmenes del buscador dicen 0 créditos y marca de agua; **no lo pude confirmar: la página oficial de precios (https://higgsfield.ai/pricing) abre sin los datos de los planes**.
- **Planes de pago**: esa misma guía lista Starter $15/mes (200 créditos), Plus $34 (1 000) y Ultra $84 (3 000), con 40–70 créditos por generación en modelos premium **[Abierta, de competidor; verificar]**. Otras guías del buscador dan cifras distintas (p. ej. $9/$23/$59) **[Solo buscador]**: los precios **cambian y se contradicen entre fuentes**.
- **Costo real de referencia**: un redactor de reseña pagó 192 créditos por 2 generaciones de 8 s a 1080p **[Abierta: unite.ai]** (≈ 96 créditos por clip de ese tipo).
- **Uso comercial**: la guía dice que los términos sobre caras generadas en anuncios pagados «requieren verificación» **[Abierta]**. Para un pitch académico no es problema, pero **no uses los clips en publicidad pagada sin leer los términos**.

**Presupuesto estimado para esta historia** **[Propio, sobre cifras no verificadas]**: 7 clips + 3 de pantalla ≈ 10 generaciones finales; con 2–3 intentos por clip son 20–30 generaciones. Con borradores a 720p y 5 s para probar y 1080p solo para el intento final, un plan de gama media durante **un mes** (≈ 1 000 créditos) alcanza; el plan de 200 créditos, no. Si no hay créditos, usa las alternativas de 1.6.

### 1.6 Alternativas equivalentes (5 líneas)
1. **Runway**: plan gratuito con una concesión única de 125 créditos; Gen-4.5 cuesta 60 créditos por clip de 5 s (12 créditos por segundo); Standard $12/mes (625 créditos, sin marca de agua) **[Abierta: https://runway.com/pricing]**.
2. **Kling** (kling.ai): ofrece imagen a video y control de movimiento; la portada no muestra duración, resolución ni créditos gratuitos **[Abierta: https://kling.ai/; detalles sin verificar]**. También está disponible dentro de Higgsfield.
3. **Luma (Dream Machine / Luma Agents)**: anima imágenes fijas, transiciones entre fotogramas y movimiento de cámara; Plus $30/mes con 10 000 créditos; la página no detalla duración ni límites del plan gratuito **[Abierta: https://lumalabs.ai/dream-machine]**.
4. **Google Flow (Veo)**: la página abrió solo con título e inicio de sesión, sin características ni planes **[Abierta: https://flow.google.com/; no pude verificar nada más]**. Veo 3.1 aparece como modelo dentro de Higgsfield.
5. **Plan sin créditos**: generar los fotogramas héroe con cualquier generador de imágenes gratuito y animarlos con zoom/paneo lento (efecto Ken Burns) en CapCut o Canva, o mezclar con **fotos y video reales** de la visita a planta. Es lo más honesto y a menudo lo más convincente ante este jurado **[Propio]**.

---

## PARTE 2. Storyboard: «El lote de mango de don Walter» (44 s, 7 clips, 16:9)

**Personajes ficticios.** Walter Ruiz, dueño de una pequeña planta de congelado de mango; Rosa, dueña de una planta pequeña de alimento balanceado y compost. Son una **dramatización**: pon en pantalla la leyenda discreta «Recreación ilustrativa» durante los clips. No los presentes como clientes reales.

**Hilo emocional.** Fruta buena que se va a perder → una foto → alguien que la quiere → un precio → un trato → el camión se va y el patio queda limpio → una cifra. La historia usa tu producto real: foto del lote, oferta de precio en la plataforma, contacto solo al llegar a un acuerdo, panel de impacto.

### 2.1 Biblia de estilo (5 líneas, pegar al inicio de CADA prompt)

```
STYLE: photorealistic documentary look, natural sunlight, muted warm grade with mango-orange and deep-navy accents, subtle 35mm film grain, shallow depth of field, 24fps, 16:9, slow gimbal-smooth camera, Piura (northern Peru) dry equatorial forest with algarrobo trees and sandy ground.
WALTER: Walter, 55-year-old Peruvian man from Piura, tan skin, short graying hair, gray mustache, kind tired eyes, white work shirt, orange hi-vis vest, white rubber boots.
ROSA: Rosa, 42-year-old Peruvian woman from Piura, dark hair in a low ponytail, navy polo shirt, beige cap, confident.
PROPS: blue plastic harvest crates (jabas) full of Kent mangoes (green skin with red blush), corrugated-metal roofs, a white flatbed truck.
NEGATIVE: no text, no letters, no logos, no watermark, no subtitles, no deformed hands, no extra fingers, no distorted faces, no flicker, no morphing, no crowd, no cartoon, no oversaturation.
```

Reglas de continuidad **[Propio]**: (a) misma ropa de Walter y Rosa en todos los clips; (b) la luz **progresa** a propósito del amanecer al atardecer (es el reloj de la historia, no un error); (c) cámara siempre lenta, un solo movimiento por clip; (d) nunca pantallas legibles en cuadro: las pantallas reales entran como clips de la Sección 2.3.

### 2.2 Los 7 clips

Flujo recomendado para cada clip: (1) generar la **imagen inicial** (prompt «IMG») con Soul ID de Walter/Rosa si hay créditos, (2) animarla con el prompt «VIDEO» en modo imagen a video. Si no hay imagen inicial, el prompt «VIDEO» sirve en texto a video (peor consistencia).

#### Clip 1: El montón (6 s) — hook visual
| Campo | Detalle |
|---|---|
| Plano | General amplio, cámara baja |
| Acción | Un montón de jabas con mango de descarte; Walter, pequeño en cuadro a la izquierda, lo mira con los brazos en jarras |
| Ambiente | 6:30 am, luz dorada baja y suave; patio de una planta de congelado cerca de Tambogrande, Piura; techo de calamina, algarrobos, suelo arenoso |
| Cámara | Dolly in (push in) lento, a ras de suelo |
| Imagen inicial | Patio de planta con una pila de jabas azules llenas de mango Kent de unos 3 m de altura, algarrobos al fondo, Walter de espaldas-tres-cuartos mirando la pila |

**IMG:** `[STYLE] [WALTER] Wide low-angle shot at dawn of a small mango freezing plant yard near Tambogrande, Piura: a huge mound of blue plastic crates overflowing with blemished Kent mangoes about three meters tall, corrugated metal roof, algarrobo trees, Walter standing small on the left looking at the pile with hands on hips, soft golden low sunlight. [NEGATIVE]`

**VIDEO (6 s):** `[STYLE] Slow dolly in at ground level toward the mound of mango crates, Walter stands still on the left, tiny dust motes drifting in the golden dawn light, a gentle breeze moves the algarrobo leaves. One continuous shot, calm, melancholic mood. [NEGATIVE]`

#### Clip 2: Buena por dentro (6 s)
| Campo | Detalle |
|---|---|
| Plano | Primerísimo primer plano (detalle de manos) |
| Acción | Walter sostiene medio mango Kent: cáscara con manchas por fuera, pulpa dorada perfecta por dentro; lo gira lentamente hacia la cámara |
| Ambiente | 8:30 am, sombra abierta junto al montón, luz suave y cálida |
| Cámara | Fija con cambio de foco (rack focus) de la mancha de la cáscara a la pulpa |
| Imagen inicial | Manos con piel curtida sosteniendo medio mango: cáscara verde-roja con manchas, pulpa amarillo oro brillante |

**IMG:** `[STYLE] [WALTER] Extreme close-up of weathered hands holding a halved Kent mango: the skin is green and red with dark blemishes, the flesh inside is perfect bright golden yellow and juicy, blurred pile of crates behind, soft open-shade light. [NEGATIVE]`

**VIDEO (6 s):** `[STYLE] Static macro shot, the hands slowly rotate the halved mango toward the camera, rack focus from the blemished skin to the glossy golden flesh, shallow depth of field, a drop of juice slides down a finger. One slow motion only. [NEGATIVE]`

#### Clip 3: La foto (6 s)
| Campo | Detalle |
|---|---|
| Plano | Medio, sobre el hombro |
| Acción | Walter se agacha y fotografía el montón con su celular; mira la pantalla (no legible) y asiente |
| Ambiente | 10:30 am, sol fuerte y sombras duras; patio de la planta |
| Cámara | Arco (orbit) lento de unos 30° alrededor de Walter |
| Imagen inicial | Walter agachado de lado, celular alzado frente al montón de jabas |

**IMG:** `[STYLE] [WALTER] Medium over-the-shoulder shot of Walter crouching and holding a smartphone up to photograph the mound of mango crates, bright late-morning sun with hard shadows, the phone screen is not visible. [NEGATIVE]`

**VIDEO (6 s):** `[STYLE] Slow orbit of about 30 degrees around Walter as he lifts the phone, takes a photo, lowers it and nods slightly, looking at the screen with a small hopeful expression. Phone screen never visible. Steady, natural motion. [NEGATIVE]`

→ Después entra el **clip de pantalla A** (Sección 2.3): la publicación aparece en el catálogo.

#### Clip 4: Alguien la mira (7 s)
| Campo | Detalle |
|---|---|
| Plano | Medio a primer plano |
| Acción | Rosa, en la oficina de su planta de alimento balanceado y compost, mira fotos en su laptop (pantalla fuera de cuadro), sonríe, teclea una cifra |
| Ambiente | 11:30 am, luz natural que entra por la puerta abierta; escritorio de madera, costales de alimento al fondo, ventilador de pie |
| Cámara | Push in lento del plano medio al primer plano de su rostro |
| Imagen inicial | Rosa de tres cuartos frente a un laptop abierto cuya pantalla da la espalda a la cámara; luz azulada tenue sobre su rostro |

**IMG:** `[STYLE] [ROSA] Medium shot of Rosa seated at a wooden desk in the small office of an animal-feed and compost plant in Piura, laptop open with its screen facing away from the camera, soft daylight through an open door, sacks of feed in the background, a floor fan. [NEGATIVE]`

**VIDEO (7 s):** `[STYLE] Slow push in from medium shot to close-up on Rosa's face as she studies the screen, raises her eyebrows with interest, smiles and types with two fingers. Screen is never visible. Natural subtle motion, no sudden moves. [NEGATIVE]`

→ Después entra el **clip de pantalla B**: la oferta de precio.

#### Clip 5: Trato hecho (6 s)
| Campo | Detalle |
|---|---|
| Plano | Medio corto |
| Acción | El celular vibra sobre una jaba; Walter lo toma, lee, exhala aliviado y sonríe |
| Ambiente | 1:00 pm, sombra de un algarrobo, luz filtrada y cálida |
| Cámara | Fija con ligero pulso de mano (handheld sutil) |
| Imagen inicial | Walter sentado en una jaba bajo un algarrobo, celular en la mano |

**IMG:** `[STYLE] [WALTER] Medium close-up of Walter sitting on an upturned blue crate in the dappled shade of an algarrobo tree at midday, looking down at a smartphone in his hand, relieved expression. [NEGATIVE]`

**VIDEO (6 s):** `[STYLE] Medium close-up, subtle handheld. The phone buzzes, Walter reads it, lets out a long breath of relief and a wide smile appears, he looks up toward the horizon. Phone screen not visible. [NEGATIVE]`

#### Clip 6: El camión (7 s)
| Campo | Detalle |
|---|---|
| Plano | Medio-general, con Walter y Rosa en primer plano |
| Acción | Dos operarios con polo azul marino cargan jabas en un camión baranda; en primer plano Walter y Rosa se miran y se dan la mano |
| Ambiente | 4:30 pm, hora dorada, contraluz suave; patio de la planta |
| Cámara | Travelling lateral (track) de izquierda a derecha |
| Imagen inicial | Camión blanco con jabas parcialmente cargadas; Walter y Rosa, de perfil, a punto de darse la mano |

**IMG:** `[STYLE] [WALTER] [ROSA] Medium-wide shot in the golden hour: a white flatbed truck being loaded with blue crates of mangoes by two workers in navy polos, in the foreground Walter and Rosa face each other in profile about to shake hands. [NEGATIVE]`

**VIDEO (7 s):** `[STYLE] Slow lateral tracking shot left to right, workers lift crates onto the truck, in the foreground Walter and Rosa shake hands and nod, warm backlight, dust in the air. Hands slightly out of focus. [NEGATIVE]`

*Plan B para este clip:* los apretones de manos son difíciles para la IA. Si sale mal, pide solo «they exchange a nod and Walter taps the crate» o encuádralo de espaldas y en siluetas.

#### Clip 7: Patio limpio (6 s) — cierre
| Campo | Detalle |
|---|---|
| Plano | General; cierra en plano medio de Walter |
| Acción | El camión se aleja por un camino de tierra entre algarrobos levantando polvo; el patio detrás de Walter ya está vacío y barrido; él se quita la gorra, se seca la frente y sonríe |
| Ambiente | 5:45 pm, atardecer, cielo anaranjado; Piura |
| Cámara | Pedestal up (grúa hacia arriba) con ligero pull out, revela el patio vacío |
| Imagen inicial | Camino de tierra entre algarrobos, camión lejano, polvo a contraluz; Walter en primer plano, patio vacío detrás |

**IMG:** `[STYLE] [WALTER] Wide shot at sunset: a white flatbed truck driving away along a dirt road lined with algarrobo trees, dust glowing in backlight, in the foreground Walter standing with his cap in hand, behind him a clean empty plant yard, orange sky. [NEGATIVE]`

**VIDEO (6 s):** `[STYLE] Slow crane up with a slight pull out, the truck drives away down the dirt road and dust drifts, Walter wipes his forehead with his cap and smiles faintly, the swept empty yard is revealed behind him. Peaceful, relieved mood. [NEGATIVE]`

→ Después entra el **clip de pantalla C**: el panel de impacto.

**Duración total:** 6 + 6 + 6 + 7 + 6 + 7 + 6 = **44 s** de IA, más 3 clips de pantalla (≈ 10 s) = **≈ 54 s** de versión completa. Los clips de pantalla se intercalan; en la versión larga sustituyen a los planos de transición.

### 2.3 Tres clips cortos de la PANTALLA del producto (3–4 s)

Capturas disponibles en `D:\Seedtech\simbio\docs\pitch\capturas\` (`catalogo-tarjetas.png`, `ficha.png`, `actividad.png`, `mapa.png`, `catalogo.png`). **Aviso de honestidad:** esas capturas usan ofertas de demostración y la de impacto dice «Estimación con factores de ejemplo»; no cubras esa línea.

**Recomendación fuerte [Propio]:** no animes la interfaz con IA. Los modelos de video deforman letras y números, y el jurado lee la pantalla. Mejor: (1) **grabación real del prototipo** con OBS o con el grabador de Windows (Win+G) a 1080p, 30 fps; o (2) animar las capturas en CapCut, Canva o PowerPoint con fotogramas clave (zoom 100 → 112 %, paneo, aro de resalte, contador). Los prompts de Higgsfield de abajo quedan como **opción** si quieres probarlos; verifica que el texto salga intacto.

| Clip | Captura base | Qué debe verse (3,5 s) | Animación en editor (opción 2) | Prompt Higgsfield (opción 3, imagen a video) |
|---|---|---|---|---|
| **A. Catálogo con fotos** | `catalogo-tarjetas.png` | Rejilla de tarjetas con foto grande, precio por tonelada, ubicación «Piura · 6 km», insignia «Verificada» y botón «Ver detalle» | Desplazamiento vertical suave de 80 px en 3 s; aro naranja que pulsa sobre una tarjeta; fundido a la ficha | `Static UI screenshot of a marketplace catalog with photo cards. Very slow vertical scroll down by a few pixels, a soft highlight glow on the first card. All text, numbers and buttons must stay perfectly sharp and unchanged. No camera shake. Avoid: warping, text distortion, new elements, flicker.` |
| **B. Oferta de precio** | `ficha.png` | Foto grande, «S/ 800 /t», cantidad 2 t, campo «Tu precio», total «S/ 1,600», botón «Ofertar» y la línea «El contacto directo se habilita al llegar a un acuerdo» | Zoom lento hacia el panel derecho (100 → 115 %); el total se actualiza (conmuta de imagen fija a otra con otro monto); aro en «Ofertar» y subrayado de la línea del candado | `Static UI screenshot of a product page with an offer form. Slow smooth zoom in toward the right-hand panel with the price fields and the orange Offer button, a subtle pulse around the button. All text and numbers must stay sharp and unchanged. Avoid: warping, text distortion, flicker, extra UI.` |
| **C. Impacto** | `actividad.png` | Panel «Llevas 16 t intercambiadas = 7,2 t de CO₂eq evitadas», operaciones cerradas, certificados, barras por mes | Contador que sube de 0 a 16 t en 2 s y luego 0 a 7,2 t; zoom suave al bloque azul; la línea «Estimación…» queda visible | `Static dashboard screenshot with a large impact number panel. Slow gentle push in toward the dark blue impact card, the bars at the right subtly rise. All numbers and text must remain sharp and unchanged. Avoid: warping, text distortion, flicker.` |

> Nota de consistencia: en `actividad.png` el ejemplo del panel muestra una operación de **cáscara de limón** y 16 t. Para que la historia sea coherente con el mango, genera una captura del prototipo con un intercambio de mango (el seed ya incluye «Mango Kent de descarte en jabas», 28 t, S/ 40/t, de demostración) antes del Demo Day. Si no alcanza el tiempo, di «un intercambio como este» en vez de afirmar que es el de don Walter.

### 2.4 Cómo entran los clips al pitch (sin que sea un video)

| Tiempo | Lámina | Qué se ve | Duración de video |
|---|---|---|---|
| 0:00–0:12 | 1 Intro | Clip 1 a pantalla completa + 3 s de clip 2, **sin audio**, voz en vivo encima | ≈ 9 s |
| 0:12–0:24 | 2 Problema | Fotograma fijo del clip 3 + texto (no video) | 0 |
| 0:24–0:36 | 3 Solución | Clip de pantalla A + B | ≈ 7 s |
| 0:36–0:48 | 4 Valor | Clip de pantalla C | ≈ 3,5 s |
| 0:48–2:00 | 5 a 10 | Diapositivas fijas; en la 10, el último fotograma del clip 7 como fondo | 0 |

**Total de video durante el pitch: ≈ 20 s de 120 s (17 %).** La versión de 54 s completa queda para la mesa de networking, la web y las respuestas a preguntas.

---

## PARTE 3. Guion hablado de 2 minutos

**Ritmo.** ≈ 12 s por lámina, ≈ 2,2 palabras por segundo (unas 130 palabras por minuto). El texto de abajo suma **≈ 270 palabras** (con la cifra de mercado reemplazada por una frase de ≈ 12 palabras, o con la versión alterna sin cifra; no sumes ambas variantes de la lámina 6). Si en el ensayo pasas de 2:00, recorta primero la lámina 7 y luego la 2.

**Lo que debe recordar el jurado (una línea por bloque):** 1. «Lo que a uno le sobra, a otro le falta.» 2. «No falta demanda: falta encontrarse.» 3. «Foto, oferta, acuerdo: así se intercambia.» 4. «Cada tonelada llega con foto, precio y huella.» 5. «Solo ganamos si ellos intercambian.» 6. La cifra de mercado + «Empezamos en Piura». 7. «Marketplace es vitrina; Swapit cierra el trato.» 8. «Siete empresas ya nos abrieron la puerta.» 9. «Construimos y salimos a validar.» 10. «Su próximo descarte puede tener comprador.»

### Lámina 1. Intro / contexto (0:00–0:12)
- **Línea para recordar:** Lo que a uno le sobra, a otro le falta.
- **Hablado:** «Esto es mango Kent: dulce por dentro, rechazado por fuera. Cada campaña en Piura deja montañas así. Lo que a uno le sobra, a otro le falta.»
- **Recurso visual:** clip 1 a pantalla completa, luego 3 s del clip 2. Leyenda pequeña «Recreación ilustrativa». Cero texto de diapositiva. Si hay foto real de un descarte de las visitas a planta, úsala en lugar del clip 1.
- **Transición:** el clip empieza ya en movimiento (dolly in) cuando dices «mango»; al decir «a otro le falta» **corte seco** a la lámina 2. No digas «hola»: empieza con el mango en la mano si tienes uno real (ver recomendación 3).

### Lámina 2. Problema (0:12–0:24)
- **Línea para recordar:** No falta demanda: falta encontrarse.
- **Hablado:** «No falta demanda: falta encontrarse. Hoy el residuo se mueve por conocidos y fotos sueltas, sin precio ni garantía. Las empresas nos lo dijeron: no saben qué hacer con él ni a quién dárselo.»
- **Recurso visual:** fotograma fijo del clip 3 (Walter fotografiando) a la izquierda; a la derecha tres palabras que aparecen una a una: «Sin foto. Sin precio. Sin garantía.» Fuente de 44 pt o más.
- **Transición:** las tres frases aparecen con **entrada por fundido** sincronizada con tu voz (una por beat). Cierra con silencio de medio segundo.

### Lámina 3. Solución (0:24–0:36)
- **Línea para recordar:** Foto, oferta, acuerdo: así se intercambia.
- **Hablado:** «Swapit es ese lugar de encuentro. Fotografías tu lote y lo publicas. La empresa interesada ve fotos y detalle, y ofrece un precio. Solo con acuerdo se habilita el contacto directo.»
- **Recurso visual:** secuencia de 3 pasos en la diapositiva (1 Foto, 2 Oferta, 3 Acuerdo) con íconos del prototipo; debajo o encima, los clips de pantalla A (catálogo) y B (oferta).
- **Transición:** **empuje horizontal** de izquierda a derecha entre pasos (como un flujo); el candado «contacto solo con acuerdo» aparece con un pequeño **zoom** en el paso 3.

### Lámina 4. Propuesta de valor (0:36–0:48)
- **Línea para recordar:** Cada tonelada llega con foto, precio y huella.
- **Hablado:** «Quien ofrece, vende lo que hoy estorba. Quien busca, consigue materia prima con foto, precio y origen. Cada tonelada llega con su huella: CO₂ evitado, estimado.»
- **Recurso visual:** pantalla dividida «Ofertante | Demandante» (vista dual del prototipo) y a la derecha el clip de pantalla C con el contador.
- **Transición:** **aparición de cifra**: el número del contador sube en vivo a «16 t → 7,2 t CO₂eq (estimado)»; la barra «Ofertante/Demandante» alterna con **fundido** a los 6 s.

### Lámina 5. Modelo de negocio (0:48–1:00)
- **Línea para recordar:** Solo ganamos si ellos intercambian.
- **Hablado:** «Solo ganamos si ellos intercambian: una comisión por operación cerrada, más certificados de impacto para quien debe reportarlo.»  *(Provisional: confirmar con `investigacion-competencia-modelo.md`.)*
- **Recurso visual:** diagrama de dos flechas «Ofertante ⇄ Demandante» con un círculo central «Swapit» y dos etiquetas: «Comisión por cierre» y «Certificado de impacto». Sin montos si no están validados.
- **Transición:** las dos etiquetas aparecen **una tras otra con fundido**; el círculo central hace un **pulso** al decir «ganamos».

### Lámina 6. Tamaño de mercado (1:00–1:12)
- **Línea para recordar:** Empezamos en Piura; el norte es el mercado.
- **Hablado (con cifra):** «Empezamos donde vivimos: mango, limón y concha de abanico de Sechura. {CIFRA VERIFICADA de `investigacion-mercado.md`, en una sola frase con unidad y año}. El norte del Perú es nuestro primer mercado.»
- **Hablado (alterno, sin cifra):** «Empezamos donde vivimos: mango, limón y concha de abanico de Sechura. Doce cadenas productivas y cincuenta y dos residuos ya están documentados. El norte del Perú es nuestro primer mercado.» *(los números 12 y 52 son datos firmes; no se pueden presentar como tamaño de mercado, solo como alcance de lo documentado).*
- **Recurso visual:** mapa sencillo del norte (Piura, Sechura, Lambayeque, Tumbes) con tres pictogramas de producto (`mango.svg`, `limon.svg`, `pescado.svg` de `docs/diseno/pictogramas`) y UNA cifra grande.
- **Transición:** **zoom** desde el mapa del Perú hacia Piura; la cifra grande aparece al final con **escala + fundido** y se queda 3 s en silencio.

### Lámina 7. Factor diferenciador / competidores (1:12–1:24)
- **Línea para recordar:** Marketplace es vitrina; Swapit cierra el trato.
- **Hablado:** «Facebook Marketplace es una vitrina. Swapit es un intercambio: fotos, oferta dentro de la plataforma, contacto solo con acuerdo, impacto medido. Y detrás, doce cadenas productivas y cincuenta y dos residuos.»
- **Recurso visual:** tabla de 2 columnas (Vitrina de anuncios | Swapit) con 4 filas: Fotos y detalle · Oferta de precio dentro de la plataforma · Contacto solo con acuerdo · Impacto medido. Casillas ✗ a la izquierda, ✓ en naranja a la derecha. **No pongas el logo de Facebook**; escribe «Marketplace de anuncios».
- **Transición:** las filas entran **una por una** con **empuje desde abajo** al ritmo de tu lista; el ✓ aparece con **aparición instantánea** (sin rebote).

### Lámina 8. KPIs / tracción (1:24–1:36)
- **Línea para recordar:** Siete empresas ya nos abrieron la puerta.
- **Hablado:** «Antes de cobrar, validamos. Siete empresas ya nos abrieron la puerta y ofrecieron visitas a planta. Una agroexportadora de mango cierra su descarte con un precio y una fecha de recojo. El prototipo ya funciona.»
- **Recurso visual:** cuatro cifras grandes en fila: **7** empresas validadas · **4** conversaciones profundas · **12** cadenas / **52** residuos · **160** pruebas automáticas. Al pie, en pequeño: «33 ofertas de demostración (15 empresas ficticias)».
- **Transición:** las cifras **cuentan hacia arriba** (de 0 al valor) en 1 s, de izquierda a derecha; el texto pequeño de demostración entra al final con **fundido** y se queda en pantalla.

### Lámina 9. Equipo (1:36–1:48)
- **Línea para recordar:** Construimos y salimos a validar.
- **Hablado:** «Somos David Blas y Josué Farfán, de SeedTech UDEP 2026. Construimos el prototipo y salimos a validar con las empresas.»
- **Recurso visual:** **foto real** de los dos (idealmente en una visita a planta o ante el prototipo), nombres y programa. Sin organigrama inventado ni roles que no hayan sido confirmados.
- **Transición:** **fundido suave** a la foto; si no tienen foto con una empresa, una con el prototipo en pantalla.

### Lámina 10. Call to action (1:48–2:00)
- **Línea para recordar:** Su próximo descarte puede tener comprador.
- **Hablado:** «Buscamos una planta para un primer intercambio piloto, y mentores que nos presenten compradores. Su próximo descarte puede tener comprador. Escríbanos.»
- **Recurso visual:** fondo con el último fotograma del clip 7 (camión yéndose, patio limpio), en tinta oscura al 60 %; dos botones grandes: «Primer piloto» y «Presentaciones»; **QR** al contacto del equipo y correo. (Contacto y QR: pendientes de poner; no inventé ninguno.)
- **Transición:** **fundido a negro lento** en la última palabra, QR que **aparece** a los 8 s y se queda en pantalla durante las preguntas.

### Plan B: versión de 90 segundos (~210 palabras, 6 láminas)

Úsalo si el moderador baja el tiempo o si la demo falla. Se funden láminas; se quita la demo y el clip 2.

| Bloque | Láminas | Tiempo | Hablado |
|---|---|---|---|
| A | 1+2 | 0:00–0:16 | «Esto es mango Kent: dulce por dentro, rechazado por fuera. Cada campaña en Piura deja montañas así. No falta demanda: falta encontrarse. Hoy el residuo se mueve por conocidos y fotos sueltas, sin precio ni garantía.» |
| B | 3+4 | 0:16–0:38 | «Swapit es el lugar de encuentro. Fotografías tu lote y lo publicas; la empresa interesada ve fotos y detalle, y ofrece un precio. Solo con acuerdo se habilita el contacto directo. Cada tonelada llega con su huella: lo intercambiado y el CO₂ evitado, estimado.» |
| C | 5+6 | 0:38–0:52 | «Solo ganamos si ellos intercambian: una comisión por operación cerrada. Empezamos en Piura, y el norte del Perú es el primer mercado. {CIFRA VERIFICADA}» |
| D | 7 | 0:52–1:04 | «Marketplace es una vitrina; Swapit cierra el trato: fotos, oferta dentro de la plataforma, contacto solo con acuerdo, impacto medido.» |
| E | 8+9 | 1:04–1:20 | «Antes de cobrar, validamos: siete empresas ya nos abrieron la puerta y ofrecieron visitas a planta. El prototipo ya funciona. Somos David Blas y Josué Farfán, de SeedTech UDEP 2026.» |
| F | 10 | 1:20–1:30 | «Buscamos una planta para un primer intercambio piloto. Su próximo descarte puede tener comprador.» |

Visuales del plan B: clip 1 (6 s) en A, clip de pantalla B en B, tabla en D, cifras en E, QR en F. Total de video: ≈ 13 s.

---

## PARTE 4. Recomendaciones y checklist

### 4.1 Doce recomendaciones de oratoria y diseño

1. **Una sola historia, un solo objeto.** Todo el pitch gira en torno al lote de mango. Cada lámina responde «¿qué le pasa a ese lote ahora?»: sobra → nadie lo ve → se fotografía → se oferta → se acuerda → se recoge → se mide.
2. **Una línea por bloque, dicha dos veces.** La línea para recordar aparece en la diapositiva (como título) y en tu voz. Es la única frase que debe poder repetir el jurado.
3. **Abre con el objeto, no con tu nombre.** Un mango real (o el clip 1) en las manos, 2 s de silencio y la frase «Esto es mango Kent…». Los nombres van en la lámina 9, donde ya los quieren saber.
4. **Voz de Piura, no de folleto.** Dilo como lo diría un empresario de la zona: «jabas», «campaña», «descarte», «recojo». Evita «sinergias», «ecosistema», «disrumpir», «solución integral». Frases de máximo 15 palabras.
5. **Un número por lámina, grande.** Si una diapositiva tiene dos ideas, son dos láminas. Texto mínimo de 32 pt; cifra héroe de 96 pt o más. Si hay más de 25 palabras en pantalla, sobran.
6. **Los clips son ilustración, no argumento.** Máximo 20 s de video de 120 (17 %); siempre **mudos**: la voz eres tú. Entran al inicio de una idea y salen antes de que termine tu frase. Leyenda «Recreación ilustrativa».
7. **Pantalla real > video IA para el producto.** El jurado detecta lo hecho todo por IA. La prueba de que el producto existe es el prototipo en vivo o la grabación real, nunca un clip generado. Pon las **fotos reales** de las visitas y entrevistas siempre que puedas.
8. **Cuenta la validación con humildad concreta.** «Siete empresas nos recibieron bien» es verificable; «validado por el mercado» no. Di qué es de demostración (las 33 ofertas) antes de que alguien pregunte.
9. **Anticipa las dos preguntas obvias y prepárales una respuesta de 15 s:** (a) «¿Y si las empresas se saltan la plataforma?» Respuesta: el contacto solo se habilita con acuerdo y el impacto certificado solo existe dentro (confirma que sea cierto con el modelo final). (b) «¿Cómo se diferencia de WhatsApp o Marketplace?» → la lámina 7.
10. **Diseño: dos colores y mucho aire.** Marino y naranja del producto, blanco, un solo acento por lámina. Sobre naranja el texto va en tinta oscura (regla de contraste del propio manual de marca). Fuentes de la marca (Lexend). Nada de clip art.
11. **Ensaya con cronómetro y por bloque.** Cada lámina entre 10 y 13 s. Graba tu voz, mide palabras por minuto (meta ≈ 130) y cronometra en tres ensayos seguidos. Deja 5 s de «aire» al final para la cifra de la lámina 6 y la del CTA.
12. **Cierra con un pedido, no con un agradecimiento.** «Buscamos una planta para un primer intercambio piloto» es una petición concreta; «Gracias por su atención» no suma. Deja el QR en pantalla durante las preguntas.

### 4.2 Checklist de demo en vivo (20 s)

**Antes (la víspera y 30 min antes)**
- [ ] Prototipo corriendo en local en el computador del pitch (`pnpm demo`) y con datos de demostración cargados; **probar con el Wi-Fi apagado** para saber qué depende de red (mapa y fuentes pueden fallar: no uses el mapa en vivo).
- [ ] Sesión ya iniciada con el usuario de demostración (no escribir contraseñas delante del jurado); ventana del navegador a pantalla completa (F11), zoom al 110–125 %, notificaciones del sistema apagadas.
- [ ] Pestaña 1: Explorar; pestaña 2: Mi actividad. Estado inicial reiniciado con `reiniciar-datos-swapit.bat` para que la oferta no aparezca ya enviada.
- [ ] Copia de respaldo: video de pantalla de 30 s del flujo completo, y las capturas de `docs/pitch/capturas/` en una carpeta del escritorio.
- [ ] Hotspot del celular listo y un segundo equipo con el mismo respaldo.

**Los 20 segundos (guion de manos)**
1. (0–4 s) **Explorar**: se ve el catálogo con foto grande. Decir: «Cada oferta tiene foto, cantidad y precio.»
2. (4–8 s) Escribir «mango» en el buscador y abrir **«Mango Kent de descarte en jabas»** (28 t, S/ 40/t; es una oferta de demostración).
3. (8–14 s) En la ficha: cantidad y precio → **Ofertar**. Señalar la línea del candado: «El contacto directo se habilita al llegar a un acuerdo.»
4. (14–20 s) Ir a **Mi actividad**: señalar el panel «Llevas X t = Y t de CO₂eq evitadas (estimado)» y la vista dual **Como ofertante | Como demandante**.
5. Cierra la demo diciendo: «Esto es de demostración; la idea es la misma con su lote.» Volver a las diapositivas.

**Si falla**
- **No carga o se cae el servidor:** pasar al **video de respaldo** (mismo guion, mudo; tú narras). Decir: «Les muestro la grabación del mismo flujo» y no pedir disculpas largas.
- **Sin internet pero la app local abre:** seguir la demo sin mapa; si una pantalla se queda en blanco, retroceder con Alt+Flecha izquierda.
- **Nada abre:** capturas fijas (`catalogo-tarjetas.png` → `ficha.png` → `actividad.png`) en ese orden; el relato sigue igual, 5 s por captura.
- **Regla de oro:** si pasan 5 s sin respuesta, cambia al respaldo. Nunca esperar delante del jurado.
- **Tiempo:** si llevas retraso, salta la oferta y muestra solo catálogo → ficha → impacto (12 s).

---

## Fuentes abiertas (para verificar o ampliar)
- https://higgsfield.ai — portada (modelos, herramientas).
- https://unite.ai/higgsfield-ai-review/ — reseña: duración 4–15 s, 480p–1080p, Soul ID, Elements, DOP con 250+ presets, costo de 192 créditos por 2 clips.
- https://dev.to/aniruddhaadak/how-to-create-hollywood-shots-with-ai-using-higgsfield-cinema-studio-3lp8 — Cinema Studio: cámara, lente, Start/End Frame, consistencia.
- https://blog.segmind.com/higgsfield-ai-enhanced-video-creation/ — movimientos de cámara y energía de movimiento.
- https://creatify.ai/blog/higgsfield-pricing-(2026)-plans-and-what-you-ll-actually-pay — precios y costo por generación (fuente de un competidor; verificar).
- https://runway.com/pricing, https://kling.ai/, https://lumalabs.ai/dream-machine, https://flow.google.com/ — alternativas.
- **No se pudo abrir:** `higgsfield.ai/pricing` (sin datos de planes), `higgsfield.ai/blog/...` (404) y la página oficial de cada modelo. Por eso la duración máxima, resolución y límites del plan gratuito por modelo quedan **sin verificar**.
