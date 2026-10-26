# Swapit — Competencia, diferenciación, propuesta de valor y modelo de negocio

Fecha de la investigación: 22 oct. 2026. Documento de trabajo para el pitch. No modifica el código del proyecto.

**Reglas de este documento**
- Solo cito URLs que abrí y que contienen lo que afirmo. Lo que no pude abrir o no encontré va marcado **[NO VERIFICADO]** o **[NO ENCONTRADO]**.
- Las cifras de las empresas son autoinformadas salvo que diga otra cosa, y muchas son antiguas (se indica el año).
- Lo que es supuesto mío va marcado **[SUPUESTO]**; los precios en soles son **[PLACEHOLDER]**.
- Las evidencias propias del equipo salen de `docs/validacion-y-mejoras.md`, `docs/investigacion-y-mejoras.md` y `docs/decisiones/0001-pivote-b2b2b.md`, más lo que indicó el equipo en el encargo. Las empresas se nombran de forma genérica, como hace el propio repositorio.

---

## 0. Hallazgos que corrigen supuestos previos (leer primero)

1. **Kyklos no es una plataforma de matching.** Su sitio la presenta como empresa B chilena de consultoría en sostenibilidad y economía circular; el texto abierto no menciona marketplace ni trazabilidad como servicio ([kyklos.cl](https://www.kyklos.cl); [La Tercera, etiqueta Kyklos](https://www.latercera.com/etiqueta/kyklos)). El ADR 0001 y `investigacion-y-mejoras.md` la agrupan con plataformas de matching directo. En el pitch conviene no citarla como competidora directa.
2. **Recylink es sobre todo gestión y trazabilidad de residuos con logística**, no solo una bolsa: conecta generadores, transportistas y receptores, apoya declaraciones SINADER/REP y lista un "marketplace" entre sus funciones ([recylink.com](https://recylink.com)).
3. **No encontré evidencia directa, en lo que abrí, de que Byproductplace, Recylink, Kyklos o EME pierdan transacciones por fuga fuera de la plataforma.** El ADR 0001 lo afirma como "patrón repetido". Lo que sí está sustentado es (a) investigación académica sobre fuga en plataformas (sección 4.3), (b) baja conversión de publicaciones a intercambios en dos casos (Recylink, Washington) y (c) las 3 fuentes de campo del equipo. Tratarlo como riesgo, no como hecho demostrado en competidores.
4. **Contradicción interna que hay que resolver antes del pitch:** el ADR 0001 y el README fijan "sin comisión por operación" para el modelo de intermediarios. El flujo actual (oferta de precio dentro de la plataforma, contacto al llegar a acuerdo) hace natural cobrar comisión. La sección 5 propone 3 fuentes de ingreso incluyendo comisión; requiere decisión del equipo.
5. **"7 empresas validadas":** no encontré ese conteo en el repositorio. Los documentos hablan de encuesta a 23 personas (muestra sesgada), conversaciones con MYPE y una entrevista a una agroexportadora de mango. Uso el dato como lo dio el equipo y lo marco "[según el equipo]".

---

## 1. Competidores

### 1.1 Ficha por competidor

| # | Competidor (país) | Qué hace | Modelo de ingresos (público) | Tracción pública | Debilidad para este mercado | Fuente abierta |
|---|---|---|---|---|---|---|
| 1 | **Excess Materials Exchange** (Países Bajos / UE) | Marketplace B2B de excedentes: listado de materiales, matching con compradores verificados, recomendación de uso por IA, tablero de impacto. Pasaporte de material y rastreo por código de barras/QR/chip | Paquetes por proyecto: Starter 5 500 EUR (4 semanas, 50 ítems), Activation 14 000 EUR (150 ítems), Scale-up a medida. No explica comisión por transacción | Los contadores de la página están incompletos ("0+"); sin cifras utilizables | Precio de entrada en euros incompatible con una MYPE o un acopiador del norte peruano; orientado a proyectos de gran empresa/construcción; sin foco en Perú ni en español **[NO VERIFICADO el idioma]** | [excess.company](https://excess.company/); [Renewable Matter](https://renewablematter.eu/en/excess-materials-exchange-a-website-for-material-dating) |
| 2 | **Recykal** (India) | Marketplace gestionado que conecta generadores, chatarreros, acopiadores, recicladores y fabricantes. Evalúa calidad, recoge, hace logística y pagos. Pronostica precios con IA (precisión de 95 % según la empresa). Piloto de sistema de depósito con QR en Goa | Los artículos abiertos no describen el modelo. Informan ingresos de Rs 745 crore (artículo de TBI) y "ARR" sobre Rs 1 200 crore (NITI Aayog). No son comparables entre sí | Más de 1 millón de toneladas canalizadas y más de 4 000 chatarreros conectados (autoinformado, NITI Aayog) | Modelo de operación pesada con logística propia, basado en reciclables urbanos/EPR; no cubre subproductos agro ni fichas de uso; idioma y regulación de India | [NITI Aayog](https://frontiertech.niti.gov.in/story/ai-and-data-are-bringing-millions-of-tonnes-of-waste-back-into-circulation/); [The Better India](https://thebetterindia.com/328356/hyderabad-recykal-marketplace-sell-waste-online-empower-scrap-dealers) |
| 3 | **Plastic Bank** (Canadá; opera en Filipinas, Indonesia, Tailandia, Brasil, Egipto) | Paga a recolectores por plástico; financiado por individuos y empresas (créditos de plástico, "Social Plastic"). Cada intercambio queda registrado (peso, sucursal, fecha) en blockchain | Venta de créditos/ofertas de compensación a empresas y apoyo de individuos; ingresos no divulgados | 56 352 personas, 10,5 mil millones de botellas desde 2013 (autoinformado) | No es un mercado entre empresas; solo plástico postconsumo; su valor es el "crédito", no el intercambio de excedentes | [plasticbank.com](https://plasticbank.com) |
| 4 | **Kyklos** (Chile) | Consultoría en sostenibilidad y economía circular; proyectos con PepsiCo, Komatsu Cummins, Soprole, etc. | No descrito; por sus clientes, parece servicios/proyectos con corporativos | 13 años; contadores de la página en "0" (no usables) | **No es plataforma ni bolsa**; no compite directamente. Es más bien un posible aliado/canal | [kyklos.cl](https://www.kyklos.cl); [La Tercera](https://www.latercera.com/etiqueta/kyklos) |
| 5 | **Recylink** (Chile, "3 países" sin nombrarlos) | Plataforma B2B de gestión de residuos: conecta con gestores y transportistas, trazabilidad, reportes, apoyo SINADER/REP, educación; menciona un marketplace | No publicado; evaluación inicial gratuita | "Más de 150 empresas" (página, sin fecha). En un artículo de julio de 2020: 7 305 t gestionadas y 620 valorizadas (8,5 %, cálculo mío), 28 generadores, 33 gestores, 38 receptores, desde mar. 2018 | Enfoque en cumplimiento y logística de residuos formales en Chile; no es compraventa con oferta de precio; baja valorización de lo gestionado | [recylink.com](https://recylink.com); [País Circular](https://www.paiscircular.cl/industria/recylink-la-empresa-que-conecta-con-un-click-a-los-actores-de-la-economia-circular/) |
| 6 | **Too Good To Go** (Dinamarca/global) | Marketplace de excedente de comida: los comercios arman "bolsas sorpresa" y los consumidores las reservan en la app | Según un análisis de terceros: cuota fija de 1,79 USD por pedido en EE. UU. y cuota anual de 89 USD (dato de 2022) | La página de negocios no se pudo abrir (HTTP 429); cifras de escala **[NO VERIFICADO]** | Es B2C (consumidor final), no B2B. **No pude verificar una oferta B2B de excedentes.** Útil como referencia de tarifa fija por operación, no como competidor | [ProductMint](https://productmint.com/too-good-to-go-business-model/) |
| 7 | **Byproductplace** (España, Almería) | Plataforma de intercambio de residuos y subproductos agroalimentarios (plástico y orgánico de invernaderos); gestión documental por transacción; trazabilidad del origen; logística | "Freemium": uso gratis; ingresos por datos y comisión por transacción; consultoría como soporte (según su solicitud a un premio de la UE) | Sin cifras de usuarios, transacciones ni ingresos; atiende a organizaciones de Almería y Andalucía | Es el competidor conceptual más cercano (agro + subproductos + trazabilidad), pero está en Andalucía, con red de socios locales, y sin precio de referencia ni foco en Perú. Estado actual **[NO VERIFICADO]**: byproductplace.com no abrió | [Premios Nueva Bauhaus Europea](https://prizes.new-european-bauhaus.europa.eu/past-applications/byproductplace) |
| 8 | **Rheaply** (EE. UU./Canadá) | Software de gestión de recursos y mercados de reutilización por ciudad/red (mobiliario, materiales de construcción). Compró el Materials Marketplace en 2022 | En una propuesta a un consejo de gobiernos de Texas (2023): primer año 62 000 USD, luego 12 000 USD anuales por 2 administradores, más 15 % por venta o 5 USD si el ítem cuesta 35 USD o menos | Opera en Chicago, Nueva York y Washington D. C.; recaudó 20 M USD en 2022 (Waste Dive) y habla de 30 M USD de inversionistas (presentación 2023). Sin usuarios ni volumen | Modelo de red patrocinada por municipios; categorías de oficina/construcción, no subproductos agro; precios en dólares | [Presentación NCTCOG (PDF)](https://www.nctcog.org/getmedia/613c1afb-1639-401c-af2d-c252d73fdae9/2023-02-14_Rheaply-Presentation.pdf?ext=.pdf); [Waste Dive](https://www.wastedive.com/news/rheaply-reuse-expansion-office-furniture-ohio/708039/) |
| 9 | **VG Resíduos** (Brasil, Minas Gerais) | Marketplace de residuos industriales: el generador registra tipo y cantidad; tratadores y recicladores de todo el país ofertan; el sistema elige la mejor oferta, como una subasta | El generador paga R$ 690 por mes por punto de recolección; los tratadores usan la plataforma gratis (artículo de 2018) | ~2 300 clientes (Cargill, Bombril, Usiminas), R$ 3,5 M de ingresos en 2017 (datos de 2018) | Datos de 2018; en portugués y para flujos industriales de Brasil. **Valida que se paga suscripción por punto de generación**, no que el modelo funcione en Perú | [Gazeta do Povo](https://www.gazetadopovo.com.br/economia/comercio-virtual-de-lixo-rende-milhoes-de-reais-a-startup-mineira-40n6zzpkzh9b01kxs1mtoycz8/) |
| 10 | **Bolsa de Resíduos SIBR / FIEMG** (Brasil) | Plataforma gratuita para negociar residuos en tiempo real entre empresas; vinculada al Programa Mineiro de Simbiose Industrial | Gratuita (programa de gremio industrial) | Cifras antiguas y no verificadas en lo que abrí | Bolsa gratuita de gremio: sin ficha técnica detallada ni certificados visibles; estado actual **[NO VERIFICADO]** | [FIEMG, SIBR](https://www.fiemg.com.br/regional-rio-doce/?p=1253) |
| 11 | **Conexión Reciclado** (Argentina, Buenos Aires) | Web de oferta y demanda de subproductos industriales, con **lista de precios de referencia** de los principales subproductos, bases de proveedores y cooperativas, mapa de recicladoras | Gratuita para las empresas (presentada en 2014 con la agencia ambiental porteña) | Sin cifras; estado actual **[NO VERIFICADO]** | Muestra que el precio de referencia ya existió en la región; es una nota de 2014, programa público | [Gobierno de la Ciudad, 2014](https://buenosaires.gob.ar/gcaba_historico/noticias/presentaron-una-plataforma-web-de-oferta-y-demanda-de-subproductos) |
| 12 | **BORSI** (Colombia, Medellín y nodos) | Bolsa web de residuos y subproductos industriales creada por el Centro Nacional de Producción Más Limpia; nodos regionales (BORSI-Caldas desde 2013) | Sin costo para los participantes | La presentación de 2017 no deja claro cuántos usuarios activos hay | Es un directorio, no un flujo de oferta y acuerdo; no confirmé que esté activo hoy | [Presentación BORSI-Caldas 2017 (PDF)](https://idea.manizales.unal.edu.co/publicaciones/eventos/CongresoInternacionalAmbiental/dia4/Biblioteca/1.pdf) |
| 13 | **Ciclos** (Colombia, piloto) | Web y app Android que conectan generadores, recuperadores y transformadores; datos trazables; gamificación de separación | Base gratuita; paquetes de datos para gobiernos; suscripciones Básico/Plata/Oro; ecoetiqueta anual y calificación corporativa | 4 empresas generadoras, 2 recolectoras y 1 transformadora (ficha de MIT Solve); metas 500 t y 50 empresas | Aún piloto minúsculo; confirma el patrón de suscripción + certificación | [MIT Solve, Ciclos](https://solve.mit.edu/solutions/15875) |
| 14 | **WasteMart** (México, Querétaro) | Marketplace de plástico postindustrial con certificación de calidad y precios de mercado | Comisión a generadores; pago por mejor posición de los recicladores; pago por certificación | Prototipo/piloto; no registrada formalmente; sin resultados medidos | Solo plástico y en etapa temprana: confirma el patrón comisión + certificación, no es competencia consolidada | [MIT Solve, WasteMart](https://solve.mit.edu/solutions/16434) |
| 15 | **Wazte / Regenera (Cemex)** (México) | Plataforma de recolección y gestión de residuos con cobro en línea y estimación de CO₂ mitigado | Cobro por servicio | Más de 350 clientes; 443 937 t recolectadas entre 2018 y 2022 (reportaje patrocinado de 2023) | No es una bolsa de compraventa: el artículo no menciona venta de residuos | [Milenio](https://amp.milenio.com/negocios/empresas-hogares-vida-residuos-regenera-cemex) |
| 16 | **Industria Circular** (Chile, Valparaíso y RM) | Plataforma de simbiosis industrial regional de residuos no peligrosos, liderada por una académica de la UV | No informado | Sin cifras; un caso de una constructora que redujo ~50 % sus desechos | Proyecto académico/gremial; sin costos ni funciones descritas | [descubre.vc](https://www.descubre.vc/noticia/industria-circular-busca-fomentar-la-reutilizaci-n-de-residuos-industriales-no-peligrosos-2023-11-22) |
| 17 | **Simbiosis Industrial EC** (Ecuador; Unacem y CERES) | Registro de residuos no peligrosos, reporte público tabulado y **contacto asistido** por CERES para armar conexiones | No se menciona costo | Sin cifras | El matching lo hace una persona (CERES), no la plataforma: se parece a lo que hoy hace el intermediario | [Vistazo](https://www.vistazo.com/enfoque/residuos-industriales-generan-encadenamiento-productivo-XG2190132) |
| 18 | **Reganvi** (Perú, preseed) | Marketplace B2B de reciclables que conecta proveedores pequeños, incluidos recicladores informales, con compradores industriales; trazabilidad, verificación de calidad, precios en tiempo real, pagos seguros | No especificado | Sin métricas | **Competidor local más cercano**, pero centrado en reciclables (no subproductos agro/pesca); sin tracción visible | [descubre.vc, Reganvi](https://www.descubre.vc/reganvi) |
| 19 | **Sinba** (Perú, Lima y Arequipa) | Operador de gestión de residuos: tarifas mensuales (60 %), venta de materiales recuperados (30 %), consultoría (10 %) | Ingresos 2025: S/ 5,9 M (+14 %) | 85 empleados; ~100 t/mes de cartón | No es plataforma: es un operador físico. Su propio relato confirma los obstáculos del mercado: demanda volátil, compradores concentrados en Lima, circuitos informales que bajan el precio | [Forbes Perú](https://forbes.pe/sostenibilidad/2026-08-25/asi-cambio-el-modelo-de-negocio-la-empresa-de-economia-circular-sinba-para-poder-crecer-y-estos-son-sus-planes/) |

### 1.2 Los "competidores reales" que usa la gente

| Alternativa | Qué evidencia abrí | Qué resuelve / qué deja sin resolver |
|---|---|---|
| **Facebook Marketplace** | Nota de Andina (enero de 2018): se sube foto, descripción y precio; comprador y vendedor hablan por Messenger; **Facebook no gestiona pago ni envío** ([Andina](https://andina.pe/ingles/noticia-marketplace-facebook-estara-disponible-el-peru-696271.aspx)) | Alcance y costo cero **[costo NO VERIFICADO en lo que abrí]**. No tiene ficha técnica de residuo, precio de referencia, trazabilidad ni acuerdo registrado |
| **Grupos de WhatsApp** | **[NO ENCONTRADO]** fuente que describa grupos de acopio de residuos en el norte del Perú. Lo dicen las entrevistas del equipo (confirmado por 3 fuentes en campo, según el equipo) | Informal y rápido; sin registro de acuerdos ni trazabilidad |
| **Recicladores informales y acopiadores** | Estudio de Ciudad Saludable/MINAM en 13 ciudades: el 67 % de los recicladores recupera en lugares no regulados y el 33 % en la fuente (domicilios, comercios, industrias) ([MINAM, PDF](https://sinia.minam.gob.pe/sites/default/files/sial-sialtrujillo/archivos/public/docs/993.pdf); año no visible). Sinba describe circuitos informales que bajan precios ([Forbes Perú](https://forbes.pe/sostenibilidad/2026-08-25/asi-cambio-el-modelo-de-negocio-la-empresa-de-economia-circular-sinba-para-poder-crecer-y-estos-son-sus-planes/)) | Retiran rápido, pagan en efectivo; precio opaco y sin certificado. Son también los **clientes naturales** de la herramienta de intermediario |

Contexto de mercado: en 2022 el Perú valorizó 148 559 t de 8 455 715 t generadas, cerca de 1,8 % ([Corresponsables](https://www.corresponsables.com/per/actualidad/ods-13-accion-por-el-clima/el-minam-impulsa-estrategias-para-volver-a-valorizar-los-residuos-solidos-y-electronicos)). La cifra es de un medio que cita al MINAM; conviene contrastarla con el MINAM antes de usarla en una diapositiva.

**Perú:** no encontré una bolsa de residuos pública y operativa (un oficio del MINAM de 2024 la menciona como acción, pero no pude abrirlo: **[NO VERIFICADO]**). Esto coincide con la nota de `investigacion-y-mejoras.md`.

**Buscado y no abierto (no los cito como evidencia):** Cirplus, Revalora (Jalisco), Ecocluster/Newen (Chile), B2Blue y recircular (no cargaron o no dieron contenido).

### 1.3 Matriz comparativa

Leyenda: ✔ = lo vi en la fuente abierta; ◐ = parcial o con reserva; ✖ = vi evidencia de que no lo hace; **[NV]** = no verificado. La columna Swapit refleja el diseño y prototipo propios (README del repositorio), no un producto en producción.

| Criterio | Swapit (prototipo) | EME | Recykal | Byproductplace | Recylink | VG Resíduos | Conexión Reciclado | Reganvi | Facebook Marketplace |
|---|---|---|---|---|---|---|---|---|---|
| Fotos y ficha del material | ✔ | ◐ (inventario, condición, ubicación; fotos [NV]) | ◐ (categoría y cantidad) | [NV] | [NV] | ◐ (tipo y cantidad) | [NV] | [NV] | ✔ (foto, descripción, precio) |
| Oferta de precio dentro de la plataforma | ✔ | [NV] | [NV] | [NV] | [NV] | ✔ (ofertas de tratadores, mejor oferta automática) | [NV] | [NV] | [NV] |
| Contacto directo solo tras el acuerdo | ✔ | [NV] | [NV] | [NV] | [NV] | [NV] | [NV] | [NV] | ✖ (hablan por Messenger) |
| Información de usos del residuo | ✔ (12 cadenas, 52 flujos; evidencia "por validar" en parte) | ◐ (IA recomienda la opción más rentable) | [NV] | [NV] | ◐ (educación; no es ficha de usos) | [NV] | [NV] | [NV] | ✖ |
| Precio de referencia por subtipo | ◐ (en la demo son datos sintéticos rotulados) | [NV] | ◐ (pronóstico de precios, 95 % según la empresa) | [NV] | [NV] | [NV] | ✔ (lista de precios de referencia, 2014) | ◐ ("precios en tiempo real") | ✖ |
| Trazabilidad / certificado | ✔ (QR + hash en el prototipo) | ✔ (pasaporte y QR/chip) | ◐ (QR en piloto de Goa) | ◐ (declarada) | ✔ (trazabilidad y reportes) | [NV] | [NV] | ◐ (declarada) | [NV] |
| Foco regional y en español | ✔ (norte del Perú) | ✖ (sin foco en Perú) | ✖ (India) | ◐ (español; Andalucía) | ◐ (español; Chile) | ✖ (Brasil, portugués) | ◐ (español; Argentina) | ✔ (Perú; reciclables) | ◐ (disponible en Perú; sin foco sectorial) |
| Costo de entrada | **[PLACEHOLDER]** | 5 500 EUR (Starter) | [NV] | Gratis (freemium) | Evaluación inicial gratis; resto [NV] | R$ 690/mes por punto (2018) | Gratis (2014) | [NV] | [NV] |

Lectura honesta de la matriz: **ninguna combinación completa de "ficha + oferta + contacto tras acuerdo + usos + precio por subtipo + certificado" aparece en lo que pude abrir**, pero eso es ausencia de evidencia en páginas públicas, no prueba de que nadie lo ofrezca. Casi todos los [NV] se deben a que las páginas no describen esos detalles.

---

## 2. Factor diferenciador

### 2.1 Diferenciadores defendibles

1. **Información libre de "vidas" del residuo** (qué se puede hacer con él, de mayor a menor valor, quién lo compra). Es el dolor que más piden las entrevistas: "no saber qué se puede hacer con un residuo ni a quién dárselo". En lo que abrí, EME solo menciona una recomendación por IA y Recylink educación; ninguno muestra una base abierta por residuo. Es un activo de contenido que se acumula, pero **las vidas "reportadas" y "por validar" necesitan contraste con compradores y técnicos de la región**.
2. **Categorización técnica por subtipo + precio de referencia regional.** El precio de referencia no es nuevo (Conexión Reciclado en 2014; Recykal con pronóstico), pero para subproductos agro y pesca del norte no encontré nada equivalente. Es defendible solo cuando existan datos reales; hoy son sintéticos.
3. **Contacto solo tras el acuerdo, con oferta de precio dentro de la plataforma.** Diferencia clara con Facebook Marketplace, donde se habla directo por Messenger. No es único (VG Resíduos subasta ofertas), y el contacto liberado tras el acuerdo no impide que la segunda compra salga de la plataforma.
4. **Capa para el intermediario:** red de proveedores, precio de referencia, acuerdos de temporada y certificados con QR. El intermediario es hoy el verdadero conector (según las conversaciones del equipo, su matching es "100 % cara a cara"). En Washington, el informe recoge la necesidad de servicios de agregación para pequeños proveedores; Simbiosis Industrial EC depende de una persona que conecta. La herramienta convierte ese trabajo manual en producto.
5. **Foco regional y sectorial:** agroexportación, pesca y textil del norte, en español y con la lógica de campaña (descarte cerrado antes de la campaña con precio y fecha de recojo, según la entrevista de mango). No encontré una plataforma que lo haga, pero mi búsqueda fue limitada.

**No es diferenciador:** el impacto medido (toneladas, CO₂eq). Lo ofrecen EME, Recylink, Wazte, Plastic Bank y Rheaply. Es requisito, no ventaja.

### 2.2 Frase de posicionamiento (≤ 15 palabras), tres alternativas

| Alternativa | Frase | Palabras |
|---|---|---|
| A | "Sabe qué hacer con tu residuo y a quién venderlo, con precio y trazabilidad." | 14 |
| B | "Intercambio B2B de residuos del norte peruano: ficha técnica, oferta de precio y certificado." | 14 |
| C | "Tu residuo es insumo de otra empresa: aquí sabes cuánto vale y quién lo compra." | 15 |

Recomendación: **A** para el pitch hablado (resuelve el dolor más pedido), **B** para la diapositiva de contexto (describe el producto).

Frente a Facebook/WhatsApp: "Marketplace no tiene ficha técnica, precio de referencia ni acuerdo registrado; Swapit sí". Frente a plataformas de residuos (Recylink, Wazte): "ellas gestionan el residuo; Swapit ayuda a **vender** el subproducto y a saber cuánto vale".

### 2.3 Qué NO podemos afirmar todavía

- "Primera", "única" o "mejor" plataforma: mi búsqueda fue limitada y no abarcó todo Perú.
- Toneladas intercambiadas o CO₂eq evitado reales: **no hay transacciones**; los factores de CO₂eq y los precios son placeholders (README, `investigacion-y-mejoras.md`).
- Precios de mercado: los de la demo son datos de ejemplo.
- Que el contacto tras acuerdo "evita la desintermediación": es una mitigación, no una garantía (sección 5.4).
- Que el asistente de IA local funciona de punta a punta: Gemini Nano real no se ha verificado (`validacion-y-mejoras.md`).
- Que las "vidas" están validadas técnica o sanitariamente: son una selección de fuentes abiertas.
- Que existe disposición a pagar: no hay un precio probado con ningún cliente.
- Que "Swapit" es un nombre libre: ya existe una app con ese nombre en Google Play (confirmado por dos encuestados).

---

## 3. Propuesta de valor (lienzo)

Evidencia (E) usada: **E1** = 7 empresas validadas [según el equipo; sin detalle en el repo]; **E2** = 4 conversaciones (incluyen un generador de plástico y un intermediario real, según ADR 0001); **E3** = entrevista a una agroexportadora de mango (cierra el descarte antes de la campaña con precio y fecha de recojo, no tiene stock y usa su ERP); **E4** = hallazgos de campo del equipo (desintermediación confirmada por 3 fuentes, categorización técnica como cuello de botella, información de uso lo más pedido, liquidez inicial crítica); **E5** = documentos del repositorio citados arriba; **E6** = fuentes externas abiertas.

### 3.1 Ofertante (empresa que tiene excedente o subproducto)

| Bloque | Contenido | Evidencia |
|---|---|---|
| Trabajos del cliente | Dar salida al subproducto sin parar la operación; cumplir con la norma de residuos; cerrar el descarte antes de que empiece la campaña; no revelar a la competencia qué descarta | E3; E5 (`validacion-y-mejoras.md`) |
| Dolores | (1) No sabe qué se puede hacer con el residuo ni a quién dárselo. (2) No sabe si el precio que le ofrecen es justo (no hay referencia por subtipo). (3) Sin trazabilidad formal para sus clientes o auditorías. (4) Negociación dispersa por llamadas y chats sin registro. (5) Temor a exponer qué y cuánto descarta | (1) E4; E5. (2) E2 (generador de plástico, ADR 0001). (3) E2. (4) E3 (acuerdo por precio y fecha, hoy fuera de herramientas). (5) E5 (`investigacion-y-mejoras.md`; en Washington también aparecen las preocupaciones de confidencialidad: [informe](https://www.ezview.wa.gov/Portals/_1962/Documents/rdcab/Washington%20Materials%20Marketplace_%20Lessons%20Learned%20and%20Strategic%20Framework%20for%20Future%20Development.pdf)) |
| Alivios | Ficha con fotos y detalle; "vidas" ordenadas por valor; ofertas dentro de la plataforma; precio de referencia por subtipo; certificado con QR | Diseño de Swapit |
| Ganancias | Ingreso por algo que hoy es costo; fecha de recojo acordada antes de la campaña; menos tiempo del equipo en negociar; constancia para clientes | E3; E4 |

**Una frase:** "Publica tu subproducto con ficha y fotos, descubre a quién le sirve y a qué precio, y cierra el acuerdo con constancia."

**Tres beneficios medibles:** (1) tiempo desde publicar hasta acuerdo (días); (2) precio obtenido frente al precio de referencia del subtipo (% sobre o bajo); (3) toneladas con destino y certificado frente a las descartadas sin registro. Ninguno tiene línea base real hoy; hay que medirlos en el piloto.

### 3.2 Demandante (empresa que usa el material como insumo)

| Bloque | Contenido | Evidencia |
|---|---|---|
| Trabajos del cliente | Conseguir insumo barato y constante; asegurar calidad y origen; planificar volúmenes por campaña | E4; E3 |
| Dolores | (1) Casi nadie intercambia residuo "en crudo": hay transformación de por medio y no sabe qué calidad recibirá. (2) No encuentra material por su nombre técnico: el ofertante lo llama "merma". (3) Sin garantía de volumen ni fecha. (4) En Washington, los compradores pedían fichas, certificaciones y trazabilidad del origen | (1) E5; (2) E4 (categorización); (3) E3; (4) E6: [informe Washington](https://www.ezview.wa.gov/Portals/_1962/Documents/rdcab/Washington%20Materials%20Marketplace_%20Lessons%20Learned%20and%20Strategic%20Framework%20for%20Future%20Development.pdf) |
| Alivios | Categorías por subtipo y presentación; búsqueda por uso ("necesito cáscara para…"); ofertas con precio; certificado de origen | Diseño de Swapit; base usos→insumos |
| Ganancias | Insumo a menor costo; abastecimiento previsible; historial verificable del proveedor | E4 |

**Una frase:** "Encuentra el subproducto que necesitas por su uso, con ficha técnica y origen verificable, y haz tu oferta de precio."

**Tres beneficios medibles:** (1) costo por tonelada frente al insumo convencional o la referencia; (2) porcentaje de ofertas cerradas con entrega cumplida; (3) tiempo de búsqueda y negociación. Sin línea base hoy.

### 3.3 Intermediario (acopiador o agregador)

| Bloque | Contenido | Evidencia |
|---|---|---|
| Trabajos del cliente | Captar material de muchos proveedores pequeños; saber a cuánto comprar; vender a clientes industriales con garantía de origen | E2 (intermediario real); ADR 0001 |
| Dolores | (1) Su matching es 100 % cara a cara y no escala. (2) No tiene referencia de precio por subtipo. (3) Lleva su red y acuerdos en cuadernos, Excel o su ERP. (4) Los clientes le piden trazabilidad y no tiene formato. (5) Informalidad: proveedores sin RUC | (1) y (4) E2; (2) E2 y E5; (3) E3, E5; (5) E5 (`investigacion-y-mejoras.md` cita 86,8 % de MYPE sin registro SUNAT según ComexPerú vía prensa, no revisado) |
| Alivios | Red de proveedores con portal por enlace; precio de referencia; acuerdos de temporada; certificados con QR; exportar a Excel | Diseño de Swapit; E3 (usa su ERP) |
| Ganancias | Más volumen por la misma gente; mejor margen al comprar con referencia; certificados que fidelizan a sus clientes | Hipótesis a validar |

**Una frase:** "Gestiona tu red de proveedores, compra con precio de referencia y entrega certificados de trazabilidad a tus clientes."

**Tres beneficios medibles:** (1) proveedores activos por intermediario; (2) margen por tonelada frente a su línea base; (3) certificados emitidos y clientes que los usan. Sin línea base hoy.

Nota de alcance: el mercado de intermediarios identificado es de ~15 a 20 actores (ADR 0001). Un solo cliente grande tiene mucho poder de negociación.

---

## 4. Modelo de negocio

### 4.1 Modelos de ingreso observados en la competencia

| Modelo | Quién lo usa | Dato y fuente |
|---|---|---|
| Suscripción por proyecto | EME | 5 500 EUR y 14 000 EUR por paquete ([excess.company](https://excess.company/)) |
| Suscripción de red + comisión | Rheaply | 62 000 USD el primer año, 12 000 USD anuales, 15 % por venta o 5 USD en ítems de 35 USD o menos ([NCTCOG](https://www.nctcog.org/getmedia/613c1afb-1639-401c-af2d-c252d73fdae9/2023-02-14_Rheaply-Presentation.pdf?ext=.pdf)) |
| Suscripción del generador por punto de recolección | VG Resíduos | R$ 690/mes por punto; tratadores gratis ([Gazeta do Povo](https://www.gazetadopovo.com.br/economia/comercio-virtual-de-lixo-rende-milhoes-de-reais-a-startup-mineira-40n6zzpkzh9b01kxs1mtoycz8/)) |
| Cuota fija por operación + cuota anual | Too Good To Go (B2C) | 1,79 USD por pedido y 89 USD por año en EE. UU. ([ProductMint](https://productmint.com/too-good-to-go-business-model/)) |
| Comisión + posicionamiento pago + certificación | WasteMart | ([MIT Solve](https://solve.mit.edu/solutions/16434)) |
| Freemium + datos + comisión por transacción | Byproductplace | ([Premios Bauhaus](https://prizes.new-european-bauhaus.europa.eu/past-applications/byproductplace)) |
| Base gratis + suscripción + ecoetiqueta + datos | Ciclos | ([MIT Solve](https://solve.mit.edu/solutions/15875)) |
| Servicio mensual + venta de material + consultoría | Sinba | 60/30/10 % ([Forbes Perú](https://forbes.pe/sostenibilidad/2026-08-25/asi-cambio-el-modelo-de-negocio-la-empresa-de-economia-circular-sinba-para-poder-crecer-y-estos-son-sus-planes/)) |
| Gratis, financiado por gremio o Estado | SIBR, Conexión Reciclado, BORSI | ([FIEMG](https://www.fiemg.com.br/regional-rio-doce/?p=1253); [Buenos Aires](https://buenosaires.gob.ar/gcaba_historico/noticias/presentaron-una-plataforma-web-de-oferta-y-demanda-de-subproductos); [BORSI](https://idea.manizales.unal.edu.co/publicaciones/eventos/CongresoInternacionalAmbiental/dia4/Biblioteca/1.pdf)) |
| Ingresos por servicios y eventos, no por cuota de plataforma | Washington Materials Marketplace (plan futuro) | ([Informe](https://www.ezview.wa.gov/Portals/_1962/Documents/rdcab/Washington%20Materials%20Marketplace_%20Lessons%20Learned%20and%20Strategic%20Framework%20for%20Future%20Development.pdf)) |

Lectura: las bolsas gratuitas existen desde hace décadas pero no encontré cifras de uso. Las pocas con ingresos públicos cobran **suscripción** (VG) o **suscripción + comisión** (Rheaply). No tengo evidencia de que una comisión sola sostenga una plataforma de residuos.

### 4.2 Propuesta para Swapit: 3 fuentes de ingreso

Los precios son **[PLACEHOLDER]**: no hay ningún precio probado con clientes. Tres escenarios para discutir en entrevistas (¿qué monto le parecería justo y cuándo lo pagaría?).

| Fuente | Quién paga | Escenario bajo | Escenario base | Escenario alto |
|---|---|---|---|---|
| A. Suscripción mensual del intermediario [PLACEHOLDER] | Intermediario | S/ 150 | S/ 300 | S/ 700 |
| B. Fee por certificado de trazabilidad [PLACEHOLDER] | Intermediario (o su cliente) | S/ 5 | S/ 10 | S/ 20 |
| C. Comisión por operación cerrada con oferta en la plataforma [PLACEHOLDER] | Ofertante (o repartida) | 2 % | 3 % | 5 % (con tope por operación) |

Ofertar, publicar y consultar el contenido de "vidas" serían gratis para las empresas: es el gancho de liquidez y de contenido. Referencia para el rango: la comisión de Rheaply es 15 % pero en un mercado distinto (mobiliario y construcción en EE. UU.); no la tomo como ancla.

**Decisión pendiente del equipo:** el ADR 0001 dice "sin comisión de transacción". Si se cobra comisión, hay que actualizar esa decisión y comunicarla a los intermediarios. Una alternativa es cobrar solo A y B, y ofrecer C como opción en la fase 2.

### 4.3 Riesgo de desintermediación y mitigaciones

Evidencia abierta: un estudio con datos de geolocalización de una plataforma de reparto encontró que **introducir comisiones aumentó la fuga fuera de la plataforma casi 4 puntos porcentuales** (duplicó las transacciones detectadas) y que permitir a las partes negociar precios **amplifica la fuga solo cuando ambas ya tenían experiencia en saltarse al intermediario** ([PKU PHBS, resumen del artículo](https://english.phbs.pku.edu.cn/info/3882/48882.htm)). Son datos de reparto de carga, no de residuos; sirven como advertencia de diseño, no como medida de Swapit. En el campo, el equipo reportó el riesgo con 3 fuentes.

| Riesgo | Mitigación | Estado |
|---|---|---|
| Dos empresas se conocen y siguen por WhatsApp | Contacto solo tras el acuerdo (la comisión ya está comprometida); valor posterior que solo existe dentro: certificado con QR, historial verificable, precio de referencia | Diseñado; sin probar |
| Segunda y tercera compra fuera de la plataforma | **Acuerdos de temporada dentro de la plataforma** (precio y fecha de recojo): es lo que cierra la agroexportadora de mango antes de la campaña; comisión baja o decreciente en recompra | Pendiente de construir (`validacion-y-mejoras.md`) |
| El intermediario ve a Swapit como competencia | Venderle la herramienta primero; comisión solo en operaciones nuevas que Swapit origina; co-marca en certificados | Alineado con ADR 0001 |
| Comisión alta incentiva la fuga | Comisión baja con tope; fee fijo por certificado independiente del precio (el estudio sugiere que descuentos alineados reducen fuga) | Por validar |
| Liquidez inicial baja | Sembrar con los intermediarios y sus redes; una cadena productiva a la vez (por ejemplo, mango en Piura); "vidas" y precios como valor aun sin transacciones | Estrategia, sin datos |
| Concentración: pocos intermediarios | Mantener también ofertante/demandante directo; evitar depender de un solo cliente | Riesgo abierto (ADR 0001) |

### 4.4 Unit economics ilustrativos [SUPUESTO]

Todo lo siguiente es ilustrativo y no está validado. Se calcula por intermediario.

| Concepto | Bajo | Base |
|---|---|---|
| Suscripción mensual | S/ 150 | S/ 300 |
| Certificados al mes × fee | 1 × S/ 5 = S/ 5 | 2 × S/ 10 = S/ 20 |
| Volumen mensual cerrado en la plataforma | S/ 5 000 | S/ 10 000 |
| Comisión | 2 % = S/ 100 | 3 % = S/ 300 |
| **Ingreso mensual por intermediario (ARPA)** | **S/ 255** | **S/ 620** |
| Margen bruto [SUPUESTO] | 70 % → S/ 178 | 75 % → S/ 465 |
| Rotación mensual [SUPUESTO] | 6 % (vida ≈ 17 meses) | 4 % (vida ≈ 25 meses) |
| **LTV** (margen × vida) | **≈ S/ 2 975** | **≈ S/ 11 625** |
| **CAC** (visitas, demo, alta de ~6 proveedores) | S/ 1 500 | S/ 1 200 |
| LTV / CAC | ≈ 2,0 | ≈ 9,7 |
| Recuperación del CAC | ≈ 8,4 meses | ≈ 2,6 meses |

Techo de ingresos con 15 a 20 intermediarios: **S/ 45 900 a 61 200 al año** (bajo) o **S/ 111 600 a 148 800 al año** (base). Esto muestra que solo con intermediarios el negocio es pequeño: la escala depende de que cada intermediario traiga muchos ofertantes y demandantes, y de añadir ingresos de ofertante/demandante directo. Es una conclusión que conviene decir en voz alta ante un jurado.

Referencia externa para contrastar: Sinba factura S/ 5,9 M con operación física propia (Forbes Perú); no es comparable con un SaaS.

---

## 5. Tracción y KPIs para un pitch temprano

### 5.1 Qué mostrar (solo lo que se puede sustentar)

| KPI | Cómo presentarlo | Condición |
|---|---|---|
| Empresas validadas | "7 empresas validadas [según el equipo]" con el detalle: sector, tipo de actor, qué se validó (dolor, no pago) | Tener la lista interna con fechas y notas |
| Conversaciones y entrevistas | 4 conversaciones + 1 entrevista a agroexportadora de mango; hallazgos concretos | Resumir sin nombres si hay confidencialidad |
| Intención de uso | Número de empresas que aceptaron una prueba piloto o firmaron una **carta de intención**; dato distinto de "les pareció interesante" | Solo si existen cartas o confirmaciones por escrito |
| Toneladas potenciales | "Toneladas declaradas por las empresas validadas por temporada", etiquetadas "potencial declarado, no transacciones" | Con fuente (quién, cuándo, qué material) |
| Ofertas publicadas | Fichas cargadas en el piloto, con material real y no de demostración | Distinguir demo de real |
| Cobertura de contenido | 12 cadenas, 52 flujos de "vidas", con el nivel de evidencia de cada uno (práctica común / reportado / por validar) | Es dato del repositorio |
| Disposición a pagar | Rangos que dijeron los intermediarios para suscripción y certificado | Solo si se preguntó |
| Aprendizajes | Lo que cambió el producto por las entrevistas (pivote B2B2B, flujo de oferta) | Es tracción de aprendizaje |

### 5.2 Qué evitar inventar o mostrar como real

- Toneladas intercambiadas y CO₂eq evitado: **cero transacciones reales**; los factores son placeholders.
- Precios de referencia de la demo: son datos sintéticos.
- "Usuarios", "descargas" o "crecimiento": no hay uso real.
- Ingresos, LTV o CAC como si fueran medidos: son supuestos.
- Resultados de la encuesta a personas como validación del producto actual: muestra sesgada (82,6 % de 18 a 24 años, 23 personas) y el segmento personas quedó fuera.
- Porcentajes de mejora ("25 % más ingreso por residuo" es una afirmación de VG Resíduos, no nuestra).
- Cualquier métrica de la IA local (Gemini Nano sin verificar).

### 5.3 Qué medir desde el primer piloto

Tiempo de publicación a acuerdo; porcentaje de ofertas con respuesta; relación publicaciones/acuerdos (Recylink valorizó 8,5 % de lo gestionado y en Washington la mayoría de las publicaciones tuvo pocas respuestas, así que el jurado preguntará esta conversión); recompras dentro de la plataforma; certificados emitidos y verificados por terceros (escaneos del QR).

---

## 6. Ocho preguntas difíciles y respuesta honesta

1. **¿Por qué no sigo usando WhatsApp o Facebook Marketplace?**
   Hoy no tienes ficha técnica, precio de referencia ni registro del acuerdo; Marketplace ni siquiera gestiona pago o envío. Si tu volumen es pequeño y tu comprador es fijo, WhatsApp seguirá siendo suficiente: apuntamos a quien negocia con varios compradores por campaña y necesita constancia.

2. **¿Qué impide que se salten la plataforma una vez que se conocen?**
   Nada lo impide por completo: la investigación muestra que las comisiones aumentan la fuga. Reducimos el incentivo con comisión baja y tope, y retenemos valor con certificados, historial y acuerdos de temporada dentro de la plataforma; aún no lo hemos medido con transacciones reales.

3. **¿Cuántas transacciones tienen?**
   Ninguna todavía: tenemos un prototipo, 7 empresas validadas [según el equipo] y entrevistas. Lo que mostramos es el aprendizaje y un piloto propuesto, no tracción comercial.

4. **¿Por qué pagaría alguien si ya existen bolsas gratuitas?**
   Las bolsas gratuitas existen desde hace años (Buenos Aires, Medellín, Brasil) y no encontré cifras de uso ni de impacto de ninguna. Pagan quienes tienen un trabajo que hoy hacen a mano, como el intermediario; todavía no hemos probado un precio con ninguno.

5. **¿Cómo resuelven la liquidez, el problema de huevo y gallina?**
   Empezamos por intermediarios, que ya tienen proveedores y compradores, y por una cadena a la vez en Piura y Lambayeque. La información de "vidas" y el precio de referencia aportan valor aun sin transacciones, pero la liquidez sigue siendo el riesgo más grande.

6. **El mercado de intermediarios es de unos 15 a 20 actores. ¿Es un negocio?**
   Con los supuestos ilustrativos, solo suscripciones daría entre S/ 46 000 y S/ 149 000 al año, que es pequeño. Por eso el plan depende de la comisión sobre operaciones y de ampliar a ofertantes y demandantes directos, algo que debemos validar.

7. **¿Cómo saben que lo que dicen sobre el uso de cada residuo es correcto?**
   No lo sabemos del todo: las "vidas" son una selección de fuentes abiertas, con nivel de evidencia visible, y no una validación técnica ni sanitaria. Antes de escalar, las contrastaremos con compradores y técnicos de la región.

8. **¿Qué diferencia a Swapit de Recylink, Byproductplace o Reganvi?**
   Recylink se centra en gestión y cumplimiento; Byproductplace está en Andalucía y Reganvi se enfoca en reciclables, y en lo que pude ver ninguno muestra fichas de uso por residuo ni acuerdos de temporada. Mi revisión se basó en páginas públicas y no abarcó todo, por lo que no afirmamos ser únicos.

---

## 7. Qué falta verificar antes del pitch

- Confirmar el conteo y el detalle de las 7 empresas validadas, y alinear el ADR 0001 (sin comisión) con el flujo actual.
- Abrir el sitio de Byproductplace, las páginas de negocios de Too Good To Go, Cirplus, Revalora, Ecocluster y B2Blue (no cargaron o no se abrieron).
- Verificar si el MINAM tiene operativa una "Bolsa de Residuos".
- Buscar datos del norte del Perú sobre volúmenes de residuo de mango y precios de cáscara y bagazo: una tesis de La Molina que lo menciona no cargó, así que **[NO VERIFICADO]** cualquier cifra de toneladas.
- Probar precios con 3 a 5 intermediarios (los rangos de la sección 4.2 son placeholders).
- Revisar el riesgo de nombre ("Swapit" ya existe en Google Play).
