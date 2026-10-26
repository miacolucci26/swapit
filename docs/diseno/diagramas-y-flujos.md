# Swapit — Diagramas y flujos (menos texto, más gráfico)

Guía de diseño de información. No modifica código: es la especificación para implementar.
Alcance: web 390 px primero (acopiadores del norte del Perú, poca alfabetización digital). Next.js 16 + Tailwind 4 + React 19.
Antes de escribir código lee `apps/web/AGENTS.md` (esta versión de Next tiene cambios incompatibles; consulta `node_modules/next/dist/docs/`).

---

## 0. Diagnóstico y decisiones

### 0.1 Cuánto texto hay hoy (palabras visibles, ≈ ±10 %, contadas con script sobre JSX y datos reales)

| Pantalla | Hoy | De dónde sale | Meta (al cargar) |
|---|---|---|---|
| Portada `LandingB2B` | ≈ 420 | 100 % fijo: hero 40, 3 pilares de ≈ 35, bloque "información libre" 51 | ≤ 150 |
| `/aprovechamiento` | ≈ 690 | 235 fijo + 12 tarjetas de cadena ≈ 345 + escalera ≈ 62 + evidencias ≈ 44 | ≤ 150 |
| `/aprovechamiento/cadena/mango` | ≈ 400 | 27 + diagnóstico 28 + 5 tarjetas de residuo ≈ 310 | ≤ 90 |
| `/aprovechamiento/residuo/mango-descarte` | ≈ 650 | 5 usos × ≈ 51 = 254, compradores 65, preguntas 65, fijo ≈ 180 | ≤ 140 |
| `/panel` (intermediario) | ≈ 170 fijas + ≈ 60 datos | | ≤ 80 |
| `/material/[id]` | ≈ 330 fijas (todas las variantes de estado) | | ≤ 130 |

**Hallazgo clave:** los datos NO son largos (en `cadenas-datos.ts`: `uso` promedia 4,3 palabras; `negocio` 10,7; `requisitos` 6,2; solo 15 de 139 usos pasan de 6 palabras y 1 `negocio` pasa de 30). El texto sobra por **repetición**: cada uso repite 7 rótulos (nivel, valor, evidencia, escala, "Cómo se gana", "Qué hay que cumplir", "Lo recibe"). Se arregla con símbolos + leyenda única + divulgación progresiva, no editando 139 registros.

Base: 12 cadenas, 52 residuos, 139 usos (vidas). Primera opción de valor ALTO en 13 de 52 residuos. Nivel: MATERIAL 88, PREVENIR 18, REUSO 15, ENERGIA 14, DISPOSICION 4. Evidencia: PRACTICA_COMUN 77, REPORTADO 54, POR_VALIDAR 8. Máx. 3 etapas por cadena; máx. 7 residuos por etapa (plásticos).

### 0.2 Principios (con respaldo)

1. **Un dato repetido = un símbolo + una leyenda.** Medhi et al. (2007) con usuarios que no leen: gráficos semi-abstractos y números sí funcionan; con la versión solo-texto 0 de 6 sesiones completaron la tarea 1, con la versión sin texto y con ayuda 3 de 4 individuos y 2 de 2 grupos (muestra mínima; los autores lo aclaran).
2. **Posición y longitud para lo cuantitativo; el color solo refuerza** (NN/g, *dashboards*: longitud y posición se juzgan mejor; evitar medidores radiales y tartas; no usar color para magnitud).
3. **Nunca solo color** (WCAG 1.4.1): cada estado = forma + palabra corta + color.
4. **Dos niveles, no tres** (NN/g, divulgación progresiva): nivel 1 visible, nivel 2 al tocar. El rótulo del control debe anticipar qué hay ("Ver base legal", no "Más").
5. **Una columna, sin animación, frases cortas** (NN/g, usuarios de baja alfabetización leen palabra por palabra, no escanean; evitar animaciones; punto principal arriba). NN/g (*How users read*): 79 % escanea; concisión + escaneabilidad + lenguaje objetivo juntos mejoraron 124 % la usabilidad.
6. **Ícono siempre con palabra** hasta probar en campo: Medhi et al. documentan íconos malinterpretados (una casa leída como choza; flechas de tiempo leídas al revés por cultura). Probar con 5 personas en Piura antes de quitar palabras.
7. **Honestidad visual:** evidencia, "datos de ejemplo" y confianza se codifican, no se esconden. La escala de comida desperdiciada de la EPA aclara que su ranking no considera factores económicos ni sociales: por eso la escalera muestra `nivel` (prioridad) y `valor` (dinero) como dos cosas distintas.
8. **Móvil:** objetivos táctiles ≥ 44 px (mínimo WCAG 2.5.8: 24 px), sin información crítica en *hover*. INEI (Informe Técnico N.º 03, abr-jun 2024): 95,5 % de hogares tiene celular; 88,2 % en el área rural; 88,4 % en hogares con jefe de primaria o menos (es tenencia de celular, no de internet).
9. **Sin librería de gráficos.** Todo es SVG/CSS propio (< 100 líneas cada pieza). Único mapa: `maplibre-gl`, ya instalado.

### 0.3 Canales de codificación (usar siempre estos)

| Dato | Canal principal | Refuerzo | Nunca |
|---|---|---|---|
| `Nivel` (jerarquía) | sangría/posición del peldaño + número 1-5 | ícono de nivel | solo color |
| `Valor` | monedas: ALTO ●●● · MEDIO ●●○ · BAJO ●○○ · COSTO "−" con triángulo | texto en detalle (`VALORES[v]`) | semáforo rojo/verde |
| `Evidencia` | borde: sólido (PRACTICA_COMUN), guiones (REPORTADO), puntos (POR_VALIDAR) + ícono ✓ / ojo / ? | palabra (`EVIDENCIAS[e].nombre`) | solo color |
| `Escala` | ícono persona (MYPE) / fábrica (INDUSTRIAL); AMBAS no se muestra | palabra | |
| Sector | token de color + ícono de cadena | nombre | |
| Estado del lote | posición en la tubería + forma ○ ◐ ● ✓ ✕ | color | |
| Precio vs rango | posición sobre banda + ▼ ● ▲ + 2 palabras | color ámbar/verde | |
| Frescura de proveedor | relleno lleno/medio/vacío + "hace N días" | color | |

**Tokens** (los define otro agente): `--color-marca`, `--color-agro`, `--color-pesca`, `--color-textil`, `--color-plastico`, `--color-ok`, `--color-alerta`. Se solicita además `--color-peligro` (rechazado, error, gestor). Neutros: `stone-*` como hoy. En Tailwind 4 las clases deben escribirse literales (`fill-agro`, no `fill-${x}`): usar `Record<..., string>` con clases completas.

```ts
// apps/web/src/lib/vis.ts
import { CADENAS, RESIDUOS, NIVELES, type Nivel, type Residuo, type Sector, type TipoDestino, type Vida } from "@swapit/shared";

export const nombreCorto = (nombre: string) => nombre.split("(")[0].trim();           // 31 de 52 nombres pasan de 4 palabras antes del "(": clamp a 2 líneas
export const ORDEN_NIVELES = (Object.keys(NIVELES) as Nivel[]).sort((a, b) => NIVELES[a].orden - NIVELES[b].orden);
export const destinosDe = (r: Residuo, n = 4): TipoDestino[] => [...new Set(r.vidas.flatMap((v) => v.destinos))].slice(0, n);
export const conteoNiveles = (vidas: Vida[]) => vidas.reduce((a, v) => ({ ...a, [v.nivel]: (a[v.nivel] ?? 0) + 1 }), {} as Partial<Record<Nivel, number>>);
export const estadisticasBase = () => ({ cadenas: CADENAS.length, residuos: RESIDUOS.length, usos: RESIDUOS.reduce((a, r) => a + r.residuo.vidas.length, 0) });

export const CLASE_SECTOR: Record<Sector, { texto: string; fondo: string; borde: string; relleno: string }> = {
  AGRO:          { texto: "text-agro",     fondo: "bg-agro/10",     borde: "border-agro",     relleno: "fill-agro" },
  AGROINDUSTRIA: { texto: "text-agro",     fondo: "bg-agro/10",     borde: "border-agro",     relleno: "fill-agro" },
  PESCA:         { texto: "text-pesca",    fondo: "bg-pesca/10",    borde: "border-pesca",    relleno: "fill-pesca" },
  TEXTIL:        { texto: "text-textil",   fondo: "bg-textil/10",   borde: "border-textil",   relleno: "fill-textil" },
  MANUFACTURA:   { texto: "text-plastico", fondo: "bg-plastico/10", borde: "border-plastico", relleno: "fill-plastico" },
  SERVICIOS:     { texto: "text-marca",    fondo: "bg-marca/10",    borde: "border-marca",    relleno: "fill-marca" },
  OTRO:          { texto: "text-plastico", fondo: "bg-plastico/10", borde: "border-plastico", relleno: "fill-plastico" }, // cadena 'empaques-y-apoyo'
};
```

**Imágenes (3 niveles):** (v1) pictogramas SVG propios, ≈ 50, trazo 2 px, semi-abstractos, siempre con palabra; (v2) fotos reales por residuo (52) y cadena (12), WebP ≈ 4:3 de 320 px (peso por medir); (v3) 1 ilustración de portada. Mientras tanto, para residuos reutilizar `CATEGORIA[r.categoria].emoji` de `lib/format.ts`.
Pictogramas (`IconoId`, copiar SVG de una fuente de licencia abierta —p. ej. Lucide, ISC; no verifiqué sus nombres en esta investigación, comprobar contra la versión instalada—): nivel (5): producto, reúso, material, energía, gestor · destino (11, uno por `TipoDestino`) · estado (6): reportado=burbuja, cotizado=balanza, acopiado=saco, despachado=camión, certificado=sello QR, rechazado=✕ · etapa (14 ids reales: campo, seleccion, proceso, empaque, poscosecha, molino, ingenio, desembarque, planta, desmotado, confeccion, plasticos, carton-madera, aceites-equipos) · UI: flecha, check, alerta, ojo, ?, persona, fábrica, moneda, ubicación, reloj, escuchar.

---

## 1. Patrones recomendados

| Necesidad | Patrón elegido | Referencia abierta | Por qué / decisión |
|---|---|---|---|
| (a) Cadena con ramas de residuo | Flujo de proceso: línea de etapas (nodos numerados con ícono) y, bajo cada etapa, ramas a residuos con sus destinos en pictogramas. Horizontal en escritorio, vertical con línea a la izquierda en 390 px | Carbon *Progress indicator* (≥ 3 pasos lineales, vertical preferido, etiquetas de 1-2 palabras); la revisión de Bodie et al. (2019, *Front. Sustain. Food Syst.*) sobre subproductos del molino de arroz describe el proceso exactamente así: grano → cáscara, salvado, arroz partido | No hallé un patrón publicado de "cadena con ramas"; es síntesis de flujo + árbol. Validar con 5 usuarios |
| (b) Escalera/cascada de valor | Lista escalonada: la sangría = `nivel` (no el índice), así dos usos del mismo nivel quedan alineados; el primero lleva "Empieza aquí" | EPA *Wasted Food Scale* (prevenir/donar → alimentar animales → digestión anaerobia y compost → relleno/incineración; varias vías por escalón) · Ellen MacArthur, diagrama circular (ciclo técnico y biológico, objetivo "mayor valor posible") | Posición = canal más legible. Hoy `EscaleraDeValor` son 5 tarjetas de texto |
| (c) Balance de masa (Sankey) | **No para cadenas.** Solo para los flujos propios del intermediario (proveedor → material → cliente), cuando haya ≥ 5 despachos | data-to-viz (Sankey: tabla de enlaces origen/destino/valor; demasiados nodos lo vuelven ilegible) · NN/g (el ancho se juzga peor que la longitud: imprimir siempre la cifra) · bundlephobia: `d3-sankey` 8,4 kB (2,8 kB gzip, 2 dependencias) | `Cadena/Residuo/Vida` no tienen masa (los valores son cualitativos a propósito). Un Sankey de cadenas inventaría proporciones. La literatura sí las da (p. ej. cáscara ≈ 20 %, salvado 8-10 %, partidos 10-15 % en molinos de arroz) pero no están en nuestros datos. Alternativa honesta: `EscaleraNiveles` en modo micro (nº de usos por nivel) |
| (d) Ciclo del material | Tubería con conteos en el panel; stepper en la ficha; pestañas actuales en la lista | Carbon (estados completado/actual/pendiente; vertical preferido) · kanban (Businessmap: columnas = etapas, cuello de botella visible cuando una columna acumula) | La tubería es un kanban colapsado a números: cabe en 390 px y señala dónde se acumula. Kanban completo solo en escritorio, después |
| (e) KPI | Número grande + unidad + micrográfico (sparkline o barra segmentada) | Tufte (sparkline: contexto junto al número, punto final resaltado, banda gris de rango normal) · NN/g (preferir barras/bullet a medidores) | 4 KPIs máx. por fila |
| (f) Red de proveedores | Lista primero en móvil, mapa secundario; marcadores por estado; agrupación | MapLibre *clusters* (`cluster:true`, `clusterRadius`, `point_count`) — `MapView.tsx` ya los usa · Medhi et al. (los usuarios se orientan por puntos de referencia, no por coordenadas) | Hoy `/red` pinta todos igual (`modalidad:"VENTA"`) |
| (g) Precio vs rango | *Bullet graph* horizontal: banda p25-p75 + marca de precio | Few, *Bullet Graph Design Specification* (2-5 rangos cualitativos, idealmente 3; intensidades de un solo tono por daltonismo; marcador comparativo) · Tufte (banda gris) · WCAG 1.4.1 | `RangoPrecio` ya es casi un bullet; falta nombrar las 3 zonas, usar patrón y no solo color, y dar la frase de veredicto |

Accesibilidad de gráficos: W3C WAI *Complex images* (descripción corta + larga; `aria-describedby` pierde tablas/encabezados → usar `<figure>`/`<details>` con la descripción) y Smashing (2021): para SVG inline el patrón mejor valorado es `role="img"` + `<title>` + `<desc>` + `aria-labelledby` con ambos ids.

---

## 2. Especificaciones de componentes

Convención: archivos en `apps/web/src/components/vis/`. Son *Server Components* salvo los marcados `"use client"`. Todos aceptan `className`. Importan tipos reales de `@swapit/shared`.

### 2.0 Primitivas

```tsx
export type IconoId = string; // unión literal con los ~50 ids de §0.3
export function Icono({ id, tam = 24, titulo, className }: { id: IconoId; tam?: 16 | 20 | 24 | 32 | 40; titulo?: string; className?: string }): React.JSX.Element;
// con `titulo` → role="img" + aria-label; sin él → aria-hidden="true". currentColor, trazo 2.

export function ValorMonedas({ valor, conTexto = false }: { valor: Valor; conTexto?: boolean }): React.JSX.Element;
// 3 círculos r=5: ALTO 3 llenos, MEDIO 2, BAJO 1; COSTO = "−" + triángulo (token alerta). role="img" aria-label={VALORES[valor]}.

export function SelloEvidencia({ evidencia, conTexto = false }: { evidencia: Evidencia; conTexto?: boolean }): React.JSX.Element;
// borde sólido/guiones/puntos + ícono; aria-label={EVIDENCIAS[evidencia].nombre}. La `ayuda` va en la leyenda, no en tooltip (táctil).

export function ChipEscala({ escala }: { escala: Escala }): React.JSX.Element | null; // null si 'AMBAS'

export function Divulgar({ resumen, children, abierto = false }: { resumen: string; children: React.ReactNode; abierto?: boolean }): React.JSX.Element;
// <details><summary class="min-h-11">; resumen ≤ 4 palabras que anticipe el contenido. Máx. 1 nivel de anidamiento.

export function LeyendaVidas(): React.JSX.Element; // 1 línea: monedas · 3 sellos · persona/fábrica; "Ver qué significa" → <Divulgar> con EVIDENCIAS[*].ayuda
```

### 2.1 `CadenaFlujo` — cadena como diagrama (patrón a)

```tsx
import type { Cadena, Residuo } from "@swapit/shared";
export interface CadenaFlujoProps {
  cadena: Cadena;
  marcadas?: readonly string[];                 // ids de Etapa en que trabaja la persona
  onAlternarEtapa?: (etapaId: string) => void;  // si existe, requiere "use client" en el contenedor
  resaltarId?: string;                          // Residuo.id
  hrefResiduo?: (r: Residuo) => string;         // por defecto `/aprovechamiento/residuo/${r.id}`
  variante?: "completo" | "mini";               // mini: solo nodos de etapa con conteo (tarjetas)
  maxRamas?: number;                            // 5; el resto tras "Ver N más" (aria-expanded)
}
```
**Estructura (HTML con conectores SVG/CSS decorativos `aria-hidden`):**
`<figure aria-labelledby>` → `<figcaption class="sr-only">Cadena del Mango: 3 etapas y 5 residuos</figcaption>` → `<ol>` de etapas (`grid` con `--n = etapas.length`) → cada `<li>`: nodo de etapa (número + `Icono` de `etapa.id` + nombre; es `<button aria-pressed>` si hay `onAlternarEtapa`) y `<ul>` de ramas. Cada rama = `<Link>`: ícono de residuo, `nombreCorto(r.nombre)` (clamp 2 líneas, nombre completo en `aria-label`), `ValorMonedas` de `r.vidas[0].valor`, "N usos", y hasta 4 `Icono` de `destinosDe(r)` (flecha →).
**Responsive:** ≥ `md` (768 px): columnas en fila con flecha entre nodos y ramas colgando con codo. < `md`: una columna; línea vertical a la izquierda con círculos numerados; ramas sangradas 24 px. Con 1 etapa (`pesca-crustaceos`) queda una columna.
**Color:** línea, nodo y borde con `CLASE_SECTOR[cadena.sector]`; etapa marcada = relleno `bg-marca text-white` + ✓ (no solo color).
**A11y:** el orden del DOM es el orden de lectura; los conectores no se leen; foco visible; ramas ≥ 44 px de alto.
**Datos faltantes:** ninguno. Opcional: `Residuo.corto?: string` para los 10 nombres de > 6 palabras.

```
 ①━ Campo y cosecha  ━━▶  ②━ Selección y empaque  ━━▶  ③━ Proceso
  ┃                         ┃                            ┃
  ┣ ▣ Poda y ramas          ┗ ▣ Descarte de mango        ┣ ▣ Cáscara
  ┃  ●●○ 2 usos  →▣ ▣         ●●● 5 usos →▣ ▣ ▣ ▣       ┣ ▣ Pepa
  ┃                                                        ┗ ▣ Bagazo
```
Acompaña `ResumenDiagnostico({ d }: { d: Diagnostico })`: tres números grandes (`d.residuos.length` residuos · `d.conValor` con valor · `d.soloGestor` solo gestor) en lugar de la frase de 29 palabras actual; reemplaza las casillas de `DiagnosticoProceso` por el toque en las etapas (usa `diagnosticar(cadena.id, marcadas)`).

### 2.2 `EscaleraVidas` y `EscaleraNiveles` — patrón b

```tsx
"use client";
import type { Nivel, Residuo } from "@swapit/shared";
export interface EscaleraVidasProps {
  residuo: Residuo;
  modoMype?: boolean;          // atenúa (no oculta) vidas con escala 'INDUSTRIAL' y rotula "Requiere planta"
  abiertaInicial?: number | null; // índice abierto; por defecto 0
}
export interface EscaleraNivelesProps {
  conteo?: Partial<Record<Nivel, number>>; // de conteoNiveles(residuo.vidas)
  variante?: "didactica" | "micro";        // didáctica: 5 peldaños con ícono y nombre; micro: 5 barras de 6 px
}
```
**Estructura:** `<ol aria-label="Usos de {nombreCorto}, del mejor al último">`. Cada `<li>` lleva `style={{"--s": NIVELES[v.nivel].orden - 1}}` y clase `ml-[calc(var(--s)*6px)] md:ml-[calc(var(--s)*14px)]` (máx. 24 px en 390 px). Dentro, un `<button aria-expanded aria-controls>` (acordeón, uno abierto a la vez) con: número, `Icono` de `ICONO_DESTINO[v.destinos[0]]`, título (`v.uso`), `ValorMonedas`, `SelloEvidencia` (borde del peldaño), `ChipEscala`. El primero muestra la bandera "Empieza aquí". Panel de nivel 2: "Cómo se gana" (`v.negocio`), "Qué cumplir" (`v.requisitos`), "Lo recibe" (`v.destinos` → `Icono` + `nombreTipoDestino(d, true)`).
**Responsive:** una columna; ≥ `lg`: escalera a la izquierda y "A quién entregarlo" (`compradoresDe(residuo)` como íconos + palabra) fijo a la derecha.
**Color:** una sola tonalidad `marca` en intensidad decreciente por nivel (más arriba, más fuerte); DISPOSICION gris con ícono de constancia; `--color-alerta` solo para COSTO.
**Caso solo-gestor** (`vidas.every(v => v.nivel === "DISPOSICION")`: hoy `envases-agroquimicos`, `aceite-lubricante`): un único peldaño con banner "Solo gestor autorizado".
**A11y:** el `nivel` se dice por texto en `sr-only` ("Nivel 2, Reúso directo"); el borde guiones/puntos se duplica con el sello.

```
 Empieza aquí
 ┌───────────────────────────────────────┐
 │①▣ Seguir siendo alimento   ●●●  ✓     │
 └───────────────────────────────────────┘
   ┌─────────────────────────────────────┐
   │②▣ Mercado local   ●●○  ┄ [MYPE]     │
   └─────────────────────────────────────┘
        ┌──────────────────────────────┐
        │③▣ Alimento animal ●○○ ┄       │ ▾ toca para abrir
        └──────────────────────────────┘
             ┌────────────────────────┐
             │④▣ Biogás  ●○○  ⋯ [Planta]│ (atenuado en modo MYPE)
             └────────────────────────┘
```

### 2.3 `TuberiaMaterial` y `PasosLote` — patrón d

```tsx
import type { EstadoMaterial } from "@/lib/types";
export type EtapaTuberia = "REPORTADO" | "COTIZADO" | "ACOPIADO" | "DESPACHADO";
export interface TuberiaMaterialProps {
  porEstado: Record<EstadoMaterial, number>;        // ResumenIntermediario["porEstado"]
  porCertificar?: number;                           // NUEVO en la API: despachados sin certificado
  hrefEstado?: (e: EstadoMaterial) => string;       // por defecto `/material?estado=${e}`
}
export interface PasosLoteProps {
  estado: EstadoMaterial;
  fechas?: Partial<Record<EtapaTuberia, string | null>>; // { REPORTADO: m.createdAt, ACOPIADO: m.acopiadoAt, DESPACHADO: m.despachadoAt }
  certificado?: boolean | null;                     // null = no mostrar el 5.º paso
  orientacion?: "auto" | "horizontal" | "vertical";
}
```
```ts
const ETAPAS = [
  { estado: "REPORTADO",  accion: "Cotizar",    icono: "est-reportado" },
  { estado: "COTIZADO",   accion: "Recoger",    icono: "est-cotizado" },
  { estado: "ACOPIADO",   accion: "Despachar",  icono: "est-acopiado" },
  { estado: "DESPACHADO", accion: "Certificar", icono: "est-despachado" },
] as const satisfies readonly { estado: EtapaTuberia; accion: string; icono: IconoId }[];
// Salida a RECHAZADO: derivarla del modelo, no a mano
const puedeRechazar = (e: EtapaTuberia) => TRANSICIONES_LOTE[e]?.includes("RECHAZADO") ?? false; // true para REPORTADO y COTIZADO
// COTIZADO→COTIZADO (re-cotizar): flecha circular pequeña en el nodo.  Etiqueta: ETIQUETA_ESTADO_LOTE[e] ?? e
```
**Estructura `TuberiaMaterial`:** 4 nodos-tanque (`<Link>` con ícono, **número grande** y nombre de 1 palabra) unidos por tramos de tubo con chevrones; bajo REPORTADO-COTIZADO una derivación a un nodo gris "✕ N rechazados". El nodo con conteo > 0 entre los 3 primeros se rotula con su verbo ("Cotizar") y borde `alerta` (cuello de botella); DESPACHADO usa `ok`. Si `porCertificar > 0`, el nodo final dice "N por certificar".
**Responsive:** a 390 px las 4 columnas de ≈ 84 px caben (ícono + número + nombre 12 px; tramos reducidos a "›"); alto táctil 72 px. Escritorio: tubos largos.
**A11y:** `<nav aria-label="Ciclo del material"><ol>`; cada `<a>` con `aria-label="3 reportados: cotizar"`; forma además de color (○ ◐ ● ✓).
**`PasosLote`** (reemplaza `PasosMaterial`): lista con estados hecho ✓ / actual (anillo, `aria-current="step"`, "Siguiente: Cotizar") / pendiente ○; RECHAZADO corta la línea con ✕ en `peligro`. Vertical con fecha (`fecha()`) en 390 px (Carbon prefiere vertical); horizontal desde `md`. Etiquetas de 1 palabra.
**Cambio asociado en `/material`:** leer `?estado=` en el `useEffect` (como ya se hace con `?nuevo=`) y llamar `setTab(e)` si coincide con `TABS`.

```
 Reportado ─▶ Cotizado ─▶ Acopiado ─▶ Despachado
 ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
 │  ▣     │  │  ▣  ↻  │  │  ▣     │  │  ▣     │
 │   3    │  │   2    │  │   1    │  │  14    │
 │Cotizar!│  │Recoger │  │Despach.│  │2 sin cert│
 └───┬────┘  └───┬────┘  └────────┘  └────────┘
     └─────┬─────┘
       ✕ 2 rechazados
```

### 2.4 `KpiTile`, `Sparkline`, `BarraSegmentada`, `AccionesAhora` — patrón e

```tsx
export interface KpiTileProps {
  etiqueta: string;                 // ≤ 3 palabras
  valor: string | number;           // ya formateado: formatoMasa(...), soles(...)
  unidad?: string;
  nota?: string;                    // ≤ 6 palabras
  tono?: "neutro" | "ok" | "alerta";
  icono?: IconoId;
  href?: string;
  delta?: { valor: number; unidad: "%" | "t" | "pts"; mejoraSiSube?: boolean }; // ▲/▼ con signo y palabra, no solo color
  micro?: React.ReactNode;          // <Sparkline/> | <BarraSegmentada/>
}
export interface SparklineProps {
  serie: { etiqueta: string; valor: number }[];  // 6 meses; etiqueta 'YYYY-MM' (usar MES())
  formato: (n: number) => string;
  resumen: string;                  // aria-label: "Últimos 6 meses: de 4 t a 12 t"
}
export interface BarraSegmentadaProps {
  segmentos: { clave: string; etiqueta: string; valor: number; tono: "ok" | "alerta" | "neutro" | "peligro"; patron?: "liso" | "rayas" | "puntos" }[];
  resumen: string;
}
export interface AccionAhora { clave: string; verbo: string; objeto: string; cuenta?: number; href: string; icono: IconoId; urgencia: 1 | 2 | 3 | 4 | 5 }
export function accionesAhora(r: ResumenIntermediario & { porCertificar?: number }, max = 3): AccionAhora[];
```
`Sparkline` (esqueleto): `<svg role="img" aria-label={resumen} viewBox="0 0 96 28">`; `<path>` gris `stone-400` 1,5 px; círculo r=3 `fill-marca` en el último punto con su valor al lado (Tufte). `KpiTile` sustituye a `Stat` (mismas props + extras; `Stat` pasa a alias).
**Los 4 KPIs del panel y su dato** (`ResumenIntermediario`):

| KPI | valor | micrográfico | ¿Falta en la API? |
|---|---|---|---|
| Proveedores | `proveedoresActivos` | punto ámbar "N por cotizar" (`pendientes`) | no |
| Acopiado del mes | `formatoMasa(acopiadoMesTon)` | `Sparkline` 6 meses | sí: `acopiadoPorMes: {mes:string; toneladas:number}[]` (usar `aToneladas`) |
| Por despachar | `porEstado.ACOPIADO` "lotes" | mini-barra de `porEstado` | no |
| Certificados | `certificadosMes` | barra "N de M despachos" | sí: `porCertificar` |
| Precio justo | `pctPrecioJusto` % | `BarraSegmentada` de `semaforo` (DENTRO `liso` ok, DEBAJO `rayas`, ENCIMA `puntos`, ambos alerta) | no |

Reglas de `accionesAhora` (más temprano en el ciclo = más urgente, el proveedor espera): 1 sin proveedores → "Agregar tu primer proveedor"; 2 `pendientes` → "Cotizar N reportes" (`/material?estado=REPORTADO`); 3 `porEstado.COTIZADO` → "Registrar acopio de N lotes"; 4 `porEstado.ACOPIADO` → "Despachar N lotes"; 5 `porCertificar` → "Emitir N certificados" (si `!suscripcionActiva` → "Activar suscripción" primero). Devuelve ≤ 3, botones de 56 px con verbo en infinitivo.

```
 ┌─────────────┐ ┌─────────────┐
 │▣ Acopiado   │ │▣ Precio justo│
 │ 12 t        │ │ 78 %        │
 │ ▁▂▃▅▆●      │ │ ████▒▒░░    │
 │ ▲ 2 t vs mes│ │ ● 7 ▼ 1 ▲ 1 │
 └─────────────┘ └─────────────┘
```

### 2.5 `RangoPrecio` v2 y `SemaforoPrecio` — patrón g (compatible con la firma actual de `ui.tsx`)

```tsx
export interface RangoPrecioProps {
  rango: { p25: number; p50: number; p75: number } | null;
  marcadores?: { etiqueta: string; valor: number | null | undefined; color: string; forma?: "triangulo" | "circulo" | "aro" }[]; // NUEVO forma
  formato: (n: number) => string;
  esSemilla?: boolean;
  orientativo?: boolean;
  confianza?: "ALTA" | "MEDIA" | "BAJA" | "NINGUNA";   // NUEVO: ●●● / ●●○ / ●○○
  n?: number;                                           // NUEVO: nº de comparables
  veredicto?: string;                                   // NUEVO: ver veredictoPrecio()
}
export function veredictoPrecio(valor: number, r: { p25: number; p75: number }, formato: (n: number) => string, sujeto: "Tu oferta" | "Pide"): { pos: PosicionPrecio; texto: string } {
  const pos = posicionPrecio(valor, r) as PosicionPrecio;            // de @swapit/shared; r no es null
  const dif = pos === "DEBAJO" ? r.p25 - valor : pos === "ENCIMA" ? valor - r.p75 : 0;
  return { pos, texto: pos === "DENTRO" ? `${sujeto}: precio justo` : `${sujeto}: ${formato(dif)} ${pos === "DEBAJO" ? "bajo" : "sobre"} el rango` };
}
```
**Cambios sobre el componente actual (siguen en HTML con posición absoluta):**
1. Tres zonas rotuladas sobre la pista: "Bajo" | "Justo" | "Alto". Fuera de la banda: rayado gris (`repeating-linear-gradient`); dentro: `ok` liso. Una sola tonalidad por daltonismo (Few).
2. `esSemilla`: la banda pasa a **puntos** y lleva la etiqueta "Ejemplo" en la propia pista (hoy solo cambia a ámbar); `orientativo`: etiqueta "~" y borde guiones (hoy solo `opacity-60`).
3. Marcadores con forma distinta: "Pide" ▼ sobre la pista, "Ofreces" ● con aro blanco, borrador ○. Las etiquetas "S/ 320" bajo la banda se alinean al borde de la banda (hoy `justify-between` las separa de ella), con la mediana rotulada "precio típico".
4. Frase de veredicto bajo la barra (≤ 8 palabras) con ▼ ● ▲.
5. Confianza en 3 puntos + "N precios parecidos" en vez de la insignia larga.
6. `compacto` (alto 16 px, sin etiquetas) para filas de lista.
7. Opcional: pista como `role="slider"` para ajustar la oferta con el dedo.
**Responsive:** ancho 100 %; texto ≥ 12 px; dos filas de etiquetas máximo (lógica de niveles que ya existe).
**A11y:** `role="img"` con `aria-label` "Rango de S/ x a S/ y, precio típico S/ z; tu oferta está dentro".
`SemaforoPrecio`: textos "Precio justo ●" / "Precio bajo ▼" / "Precio alto ▲" (hoy "Debajo/Encima" no dicen de qué); ▼ y ▲ comparten ámbar pero son formas distintas.
```
        Pide ▼         Ofreces ●
 ┌╌╌╌╌╌╌╌╌╌╌┬▓▓▓▓▓▓▓▓▓│▓▓▓▓▓▓┬╌╌╌╌╌╌╌╌╌╌┐
 └ Bajo ╌╌╌╌┴── Justo ─┼──────┴╌╌╌ Alto ╌┘
          S/ 300    S/ 340 típico  S/ 380
 ▼ Tu oferta: S/ 20/t bajo el rango      ●●○ 9 precios parecidos
```

### 2.6 `MapaRed` (patrón f, resumen)
Extender `Punto` de `MapView.tsx` con `estado?: "pendiente" | "activo" | "quieto" | "inactivo"` y `badge?: number`; el `match` de `circle-color` pasa de `modalidad` a `estado`: pendiente = relleno `alerta` + número (capa `symbol`), activo = `ok`, quieto (sin reportar ≥ 30 días) = gris pequeño, inactivo = anillo hueco. Leyenda de 4 ítems siempre visible. En < 640 px, control "Lista | Mapa" con **Lista** por defecto; tarjeta de proveedor con `frescura()` ("hace 3 días", punto lleno/medio/vacío) y `pendientes`. Mantener clusters actuales (`clusterRadius: 42`).
```ts
export const frescura = (ultimo: string | null, ahora = new Date()): "reciente" | "regular" | "quieto" | "nunca" => { /* ≤7 d, ≤30 d, >30 d, null */ };
```

### 2.7 `RecorridoIlustrado` (portada, ver §5)
```tsx
export interface PasoRecorrido { icono: IconoId; dato: string; frase: string; ejemplo?: boolean }
export interface RecorridoIlustradoProps { titulo: string; pasos: PasoRecorrido[]; /* 4-5 */ sector?: Sector }
```
Vertical: círculo numerado + ícono 40 px + `dato` en 24 px negrita + `frase` 16 px; línea continua a la izquierda. Escritorio: fila horizontal. Selector de recorrido con `<fieldset>` + radios nativos con estilo de segmentos (teclado gratis). Sin animación. `<ol>`; íconos `aria-hidden`.

### 2.8 `FlujoMasa` (Sankey, diferido)
```ts
export interface FlujoMasaProps { nodos: { id: string; etiqueta: string; columna: 0 | 1 | 2 }[]; enlaces: { de: string; a: string; toneladas: number }[]; maxPorColumna?: number /* 6, resto → "Otros" */ }
```
3 columnas fijas (proveedor → material → cliente) con diseño propio (alturas ∝ toneladas, curvas Bézier, cifra impresa en cada nodo); no hace falta `d3-sankey`. En 390 px se sustituye por dos listas de barras. Requiere endpoint nuevo (toneladas por proveedor/material/`clienteDestino`, con `aToneladas`). Tabla equivalente dentro de `<details>`. Mostrar solo con ≥ 5 despachos.

---

## 3. Pantallas rediseñadas (390 px; `▣` = ícono)

### 3.1 Portada
```
┌─────────────────────────────────────┐
│ ▣ Swapit            Ingresar [Crear]│
├─────────────────────────────────────┤
│ (Piura y Lambayeque)                │
│ Acopia con precio justo.            │
│ Tus proveedores reportan por        │
│ WhatsApp. Tú cotizas con precio de  │
│ referencia y certificas.            │
│ [Crear cuenta]  [Ver demo]          │
│ ▣celular ▶ ▣balanza ▶ ▣camión ▶ ▣sello│
├─────────────────────────────────────┤
│ Elige un recorrido                  │
│ (●Mango) ( Proveedor ) ( MYPE )     │
│ ① ▣ 5 usos    El descarte tiene 5...│
│ ② ▣ Horas, no días ...              │
├─────────────────────────────────────┤
│ ▣ Reportes por WhatsApp             │
│ ▣ Precio de referencia              │
│ ▣ Certificado con tu logo           │
├─────────────────────────────────────┤
│ Cada residuo tiene varias vidas     │
│ ▣mango ▣limón ▣arroz ▣pesca ▣textil │
│ [Explorar cadenas]                  │
├─────────────────────────────────────┤
│ ✓ Tus clientes son solo tuyos       │
│ ✓ Sin comisión por operación        │
│ ✓ Tus precios no se comparten       │
│ Prototipo · datos de ejemplo [Ver aviso]│
└─────────────────────────────────────┘
```
| Texto actual | Hoy → después | Reemplazo |
|---|---|---|
| Bajada del hero ("Swapit es la herramienta…") | 40 → 13 | línea de 4 íconos del ciclo |
| 3 pilares (≈ 35 palabras c/u) | ≈ 105 → ≈ 20 | 3 filas ícono + título; detalle en `Divulgar` |
| Bloque "Información libre" | 51 → 11 | 5 íconos de cadena |
| "Cómo funciona" (4 pasos) | ≈ 66 → un recorrido visible de 5 pasos | `RecorridoIlustrado` |
| "Lo que Swapit no hace" + "Cómo se paga" | ≈ 72 → ≈ 25 | 3 filas con ✓ |
| Pie (26) | 26 → 4 + "Ver aviso" | `Divulgar` |
Total: ≈ 420 → ≈ 150.

### 3.2 `/aprovechamiento`
```
│ Un residuo, varias vidas.           │
│ Elige tu rubro y mira a quién entregarlo│
│ [🔍 ¿Qué tienes? Ej. cáscara de mango]│
│   12        52         139          │
│ cadenas  residuos     usos          │
│ Agro                                │
│ [▣Mango 5][▣Limón 3][▣Uva 3]        │
│ [▣Palta 4][▣Banano 3][▣Cacao 4]     │
│ Agroindustria  [▣Arroz 4][▣Caña 4]  │
│ Pesca     [▣Concha 2][▣Langostino 4]│
│ Textil y apoyo [▣Algodón 3][▣Empaques 13]│
│ Arriba, más valor. Abajo, menos.    │
│ ▣1 Sigue siendo producto            │
│    ▣2 Reúso directo                 │
│       ▣3 Valorización material      │
│          ▣4 Energía                 │
│             ▣5 Gestión autorizada   │
│ Ver base legal                      │
│ [Soy MYPE →]  [Acopio residuos →]   │
│ ✓ ┄ ⋯ Evidencia  [Ver qué significa]│
```
(los números en los mosaicos son `residuos` por cadena y suman 52; `CifrasBase` sale de `estadisticasBase()`.)
| Texto actual | Hoy → después | Reemplazo |
|---|---|---|
| Bajada del hero | 37 → 10 | 3 cifras grandes |
| 12 tarjetas con `resumen` (≈ 18 c/u) | ≈ 345 → ≈ 40 | mosaicos ícono + nombre + nº; resumen en la página de la cadena |
| Párrafo de la escalera (DL 1278) | 59 → 5 + `Divulgar` | `EscaleraNiveles` didáctica (las 5 `ayuda` pasan a nivel 2) |
| Dos bloques CTA | ≈ 60 → ≈ 12 | 2 botones con ícono |
| "Cómo leer esta información" + 3 ayudas | ≈ 85 → 8 + `Divulgar` | `LeyendaVidas` |
Total ≈ 690 → ≈ 150.

### 3.3 `/aprovechamiento/cadena/[id]` (protagonista: `CadenaFlujo`)
```
│ ← Aprovechamiento                   │
│ ▣ Cadena del mango                  │
│ Piura · Lambayeque  ·  3 etapas · 5 residuos│
│ Toca las etapas donde trabajas      │
│ ①━ Campo y cosecha            [ ]   │
│ ┃  ┗ ▣ Poda y ramas  ●●○ 2 →▣▣      │
│ ②━ Selección y empaque        [✓]   │
│ ┃  ┗ ▣ Descarte de mango ●●● 5 →▣▣▣▣│
│ ③━ Proceso                    [✓]   │
│    ┣ ▣ Cáscara ●●● 4 →▣▣▣           │
│    ┣ ▣ Pepa ●●● 3 →▣▣               │
│    ┗ ▣ Bagazo ●●○ 3 →▣▣             │
│ ┌──────────┬──────────┬──────────┐  │
│ │ 4 residuos│ 4 con valor│ 0 solo gestor│
│ Otras cadenas: (Limón)(Uva)(Palta)→  │
```
| Texto actual | Hoy → después | Reemplazo |
|---|---|---|
| `resumen` (28) | 28 → 2 líneas + "Ver más" | `Divulgar` |
| Diagnóstico: título + párrafo (24) | 28 → 5 ("Toca las etapas donde trabajas.") | etapas tocables en el diagrama |
| Frase de resultado (29) | 29 → 0 | `ResumenDiagnostico` (3 números) |
| 5 `TarjetaResiduo` con descripción de 2 líneas y 2 "Primero intenta" | ≈ 310 → ≈ 30 | ramas con monedas + íconos de destino |
Total ≈ 400 → ≈ 90.

### 3.4 `/aprovechamiento/residuo/[id]` (escalera con íconos y semáforos)
```
│ Aprovechamiento › Mango             │
│ ▣ Descarte de mango      [5 usos]   │
│ Selección y empaque                 │
│ ┌ Prepárala: separa lo sano, sombra, entrega en horas ┐│
│ ▣1 ▣ Seguir siendo alimento  ●●● ✓  │ ← Empieza aquí (abierto: gana, cumple, recibe)
│   ▣2 ▣ Mercado local  ●●○ ✓ [MYPE]  │
│     ▣3 ▣ Alimento animal ●○○ ┄ [MYPE]│
│       ▣4 ▣ Compost ●○○ ✓            │
│          ▣5 ▣ Biogás ●○○ ⋯ [Planta] │
│ ● valor  ✓ común ┄ reportado ⋯ validar│
│ A quién entregarlo                  │
│ [▣Planta][▣Mercado][▣Animal][▣Compost][▣Energía]│
│ Antes de cerrar trato  ☐ ☐ ☐   Ver todas (9)│
│ [Crear cuenta]  [Preguntar al asistente]│
│ Orientativo. Valida con tu comprador. [Ver aviso]│
```
| Texto actual | Hoy → después | Reemplazo |
|---|---|---|
| 5 `VidaItem` (≈ 51 palabras c/u: 3 insignias + 2 rótulos + destinos) | 254 → ≈ 35 al cargar (+ ≈ 20 del uso abierto) | `EscaleraVidas`: monedas, sello, ícono; "Cómo se gana/Qué cumplir/Lo recibe" en nivel 2 |
| Bajada "Empieza por la primera…" | 24 → 9 | bandera "Empieza aquí" |
| `ListaCompradores` (5 tarjetas + usos) | 65 → ≈ 10 | fila de íconos de destino |
| `PreguntasClave` (6 preguntas) | 65 → ≈ 20 | 3 casillas + "Ver todas" |
| Bloque MYPE + bloque CTA + aviso (≈ 85) | ≈ 85 → ≈ 25 | `modoMype` en la escalera; 2 botones; `Divulgar` |
Total ≈ 650 → ≈ 140.

### 3.5 `/panel`
```
│ Hola, Ana                [+Proveedor][+Material]│
│ ⚠ Suscripción inactiva: no puedes emitir certificados. [Activar]│
│ Reportado ▶ Cotizado ▶ Acopiado ▶ Despachado│
│  [3]        [2]       [1]        [14]   │
│  Cotizar!   Recoger   Despachar  2 sin cert.│
│ Haz esto ahora                      │
│ [▣ Cotizar 3 reportes          →]   │
│ [▣ Registrar acopio de 2 lotes →]   │
│ [Proveedores 8][Acopiado 12 t ▁▃▅▆●]│
│ [Por despachar 1][Certificados 6]   │
│ Precio justo   78 %                 │
│ ████████▒▒░░  ● 7  ▼ 1  ▲ 1         │
│ Bajo: pueden rechazarte. Alto: pagas de más.│
│ Acopio por material  (barras)       │
│ Por atender  ● Bidones PEAD — Ricardo│
```
| Texto actual | Hoy → después | Reemplazo |
|---|---|---|
| Subtítulo (15) | 15 → 0 | razón social pequeña |
| Banner de suscripción (16) | 16 → 8 | ícono + botón |
| "Material por atender" como único flujo | lista → tubería + "Haz esto ahora" | `TuberiaMaterial`, `AccionesAhora` |
| Pista de precios (21 + 14 + 17) | 52 → 7 | `BarraSegmentada` + leyenda |
| 4 `Stat` con notas de 3-4 palabras | igual cifra | `KpiTile` con micrográfico |
Total ≈ 170 → ≈ 80.

### 3.6 `/material/[id]`
```
│ ← Material                          │
│ Bidones de PEAD azules   [Cotizado] │
│ ▣Ricardo · ▣PEAD · 800 kg · ▣WhatsApp · hace 2 d│
│ ✓Reportado ─ ◐Cotizado ─ ○Acopiado ─ ○Despachado│
│ Siguiente: Recoger y pesar          │
│ Precio de referencia   ●●○ 9 parecidos│
│ ┌╌╌╌╌┬▓▓▓▓▓│▓▓▓┬╌╌╌╌┐  Pide▼ Ofreces●│
│ ▼ Tu oferta: S/ 20/t bajo el rango  │
│ Tu oferta (S/ por tonelada) [ 300 ] │
│ [Cotizar]  [Usar precio típico S/ 340]│
│ A quién entregarlo (sugerido)       │
│ [▣Reciclaje]  Empieza por: ...  ●●○ ✓│
│ ▸ Lo que reportó el proveedor  [▣WhatsApp]│
│ ▸ 9 precios parecidos (tabla)       │
```
| Texto actual | Hoy → después | Reemplazo |
|---|---|---|
| Subtítulo de ficha (≈ 20) | 20 → chips (≈ 6) | íconos |
| Aviso "Datos de ejemplo…" (31) | 31 → 13 | patrón de puntos + "Ejemplo" en la pista |
| Aviso IA subtipo (29) | 29 → 8 | ícono ? en el título |
| Nota del benchmark + leyendas (≈ 25) | → frase de veredicto (≈ 7) | `RangoPrecio` v2 |
| Ayuda del certificado (24) | 24 → 11 | |
| (nuevo) "Destino sugerido" | +≈ 12 | `resolverResiduo(titulo + " " + descripcion)`: si `tipo === "claro"` mostrar `compradoresDe(hallado.residuo)` (íconos) y `vidas[0]`; si `ambiguo`, "¿Es alguno de estos?" con ≤ 3 opciones |
Total ≈ 330 → ≈ 130.

Validación de los conteos "después": se hicieron sobre el texto de estos wireframes y los rótulos de los componentes (≈ ±15 %). Medir de nuevo al implementar.

---

## 4. Microcopy

### 4.1 Reglas

| Elemento | Límite | Notas |
|---|---|---|
| Título de pantalla | ≤ 6 palabras | afirmación, no etiqueta ("Acopia con precio justo.") |
| Bajada | ≤ 15 palabras, 1 frase | |
| Tarjeta (título + cuerpo) | título ≤ 5, total ≤ 20 | |
| Botón | ≤ 3 palabras, verbo primero | infinitivo ("Cotizar", "Registrar acopio"), como ya usa el producto; en frases guía, imperativo de tú ("Elige tu rubro") |
| Chip / etiqueta | ≤ 2 palabras | |
| Paso de stepper | 1 palabra (Carbon: 1-2, verbo + sustantivo) | |
| KPI | etiqueta ≤ 3, nota ≤ 6 | |
| Hint de formulario | ≤ 12 | |
| Error | ≤ 12 + qué hacer | |
| Aviso / banner | ≤ 12 + 1 botón | |
| Vacío | título ≤ 5, texto ≤ 15 + acción | |
| Párrafo | ≤ 2 frases, ≤ 30 palabras | |
| Lista | 3-5 ítems de ≤ 8 palabras | lista antes que párrafo si hay ≥ 3 elementos paralelos |

- **Divulgación progresiva:** nivel 1 siempre visible; nivel 2 con `Divulgar` y rótulo que dice qué hay ("Ver base legal"). Nunca un tercer nivel.
- **Números con unidad y formato es-PE:** "12 t", "S/ 320/t", "hace 3 días" (≤ 30 días; luego fecha).
- **Lo legal y la evidencia no se borran:** se reducen a símbolo + "Ver aviso", pero siguen a un toque.
- **Palabra de sistema → palabra de la gente:** benchmark → precio de referencia · fee → costo · hash → código QR · subtipo → tipo · mediana → precio típico · comparables → precios parecidos · trazabilidad → "de dónde viene y a dónde va" · KYB → verificación de empresa · flujos de residuos → residuos. "Vidas" se conserva como lema ("Un residuo, varias vidas") y en la interfaz se cuenta en "usos"; probarlo con usuarios.

### 4.2 Antes / después (textos reales del código)

| Archivo | Antes | Después |
|---|---|---|
| `LandingB2B.tsx` hero (40) | "Swapit es la herramienta del intermediario: digitaliza cómo captas material, te dice si el precio que ofreces es justo y te deja certificar la trazabilidad a tus clientes. No competimos contigo…" | "Tus proveedores reportan por WhatsApp. Tú cotizas con precio de referencia y certificas." (13) |
| `aprovechamiento/page.tsx` escalera (59) | "Las vidas de cada residuo están ordenadas según la jerarquía de la Ley de Gestión Integral de Residuos Sólidos (Decreto Legislativo 1278)…" | "Arriba, más valor. Abajo, menos." (5) + `Divulgar` "Ver base legal" |
| `aprovechamiento/page.tsx` hero (37) | "Mira qué sale en cada etapa de tu proceso, qué se puede hacer con ello de mayor a menor valor, a quién entregarlo y qué preguntar antes de cerrar un trato…" | "Elige tu rubro. Mira qué sale y a quién entregarlo." (10) |
| `residuo/[id]/page.tsx` (24) | "Empieza por la primera: suele ser la que más vale. Las siguientes son tus alternativas si no hay comprador o la calidad no alcanza." | "Empieza por el 1. Si falla, baja al siguiente." (9) |
| `AprovechamientoIslas.tsx` diagnóstico (23) | "Marca las etapas en las que trabajas y te mostramos qué residuos salen de ellas y qué conviene intentar primero con cada uno." | "Toca las etapas donde trabajas." (5) |
| `ui.tsx` `AvisoEjemplo` (31) | "Datos de ejemplo. Este rango sale de precios ilustrativos…; no es un precio de mercado validado. Importa tus compras reales en «Benchmark»…" | "Rango de ejemplo, no de mercado. Carga tus compras para ver el tuyo." (13) |
| `material/[id]/page.tsx` IA (29) | "La IA no pudo distinguir el subtipo con seguridad (NN% de confianza). Revisa con el proveedor si es PET, PEAD, film u otro: el precio cambia mucho entre ellos." | "¿PET, PEAD o film? Confírmalo: cambia el precio." (8) |
| `material/[id]/page.tsx` certificado (24) | "Lleva tu nombre y logo, la cadena proveedor → tu empresa → cliente, y un hash verificable. Se cobra el fee por certificado (simulado)." | "Con tu logo y un QR verificable. Costo por certificado (simulado)." (11) |
| `PanelIntermediario.tsx` (21) | "Debajo: tu oferta es más baja que el mercado y el proveedor podría rechazarla. Encima: estás pagando más que el rango." | "Bajo: pueden rechazarte. Alto: pagas de más." (7) |
| `red/page.tsx` (20) | "Cada proveedor tiene un enlace propio para reportar material desde el celular, sin crear cuenta. Tú ves todo y cotizas." | "Cada proveedor reporta con su enlace." (6) |
| `cadenas-datos.ts` `mango-descarte` negocio (33; único > 30) | "El productor vende el descarte a una planta; quien junta varios productores gana por volumen, rapidez y logística. Se suele cerrar antes de la campaña con un precio y una fecha de recojo." | "Junta varios productores y vende por volumen a la planta. Cierra precio y fecha antes de la campaña." (18) — requiere campo opcional `Vida.resumen?` |

---

## 5. Tres recorridos ilustrados para la portada

Datos "reales" salen de `cadenas-datos.ts` o de la UI actual; los marcados (ej.) son ilustrativos y deben reemplazarse con datos del piloto. Frases ≤ 8 palabras.

**R1 — Del descarte de mango al comprador** (`sector: AGRO`)
| # | Ícono | Dato clave | Frase |
|---|---|---|---|
| 1 | fruta | 5 usos (`mango-descarte.vidas.length`) | El descarte tiene 5 usos, no 1. (7) |
| 2 | manos + check | Horas, no días (`preparacion`) | Separa la fruta sana. Entrégala rápido. (6) |
| 3 | planta industrial | Valor alto · práctica común (`vidas[0]`) | El mejor uso: seguir siendo alimento. (6) |
| 4 | balanza | Rango justo (p25-p75) | Ofrece un precio dentro del rango. (6) |
| 5 | camión | Despachado ✓ | Despacha y guarda a quién entregaste. (6) |

**R2 — Del reporte del proveedor al certificado** (`sector: MANUFACTURA`)
| # | Ícono | Dato clave | Frase |
|---|---|---|---|
| 1 | persona + | Con o sin RUC | Da de alta a tu proveedor. (5) |
| 2 | celular / WhatsApp | 0 cuentas que crear | Él reporta desde su celular. (5) |
| 3 | balanza | Precio vs rango ▼ ● ▲ | Cotiza con precio de referencia. (5) |
| 4 | saco → camión | 4 estados, 1 tubería | Recoge, pesa y despacha. (4) |
| 5 | sello QR | QR verificable | Tu cliente recibe su certificado. (5) |

**R3 — Del residuo a la ganancia de una MYPE** (cáscara de limón; `sector: AGRO`)
| # | Ícono | Dato clave | Frase |
|---|---|---|---|
| 1 | cítrico | 3 de 4 usos al alcance de una MYPE (`vidasParaMype`) | Tu cáscara tiene usos para ti. (6) |
| 2 | gomitas / frasco | Valor medio · reportado | Elige un uso a tu alcance. (6) |
| 3 | portapapeles | 1 requisito: registro sanitario | Revisa qué debes cumplir. (5) |
| 4 | calculadora | Margen = precio − costos (S/ por kilo) | Pon tus números: ¿sale a cuenta? (6) |
| 5 | monedas | Resultado del mes (ej.) | Vende y repite si te conviene. (6) |

---

## 6. Prioridades (impacto / esfuerzo, en orden de implementación)

| # | Cambio | Impacto | Esfuerzo | Nota |
|---|---|---|---|---|
| 1 | Recortar microcopy según §4.2 y mover avisos a `Divulgar` | 5 | S (≤ 1 d) | sin componentes nuevos; ataca la queja directa |
| 2 | `Icono` (~50 pictogramas) + mapas por `Nivel`, `TipoDestino`, etapa, estado + `lib/vis.ts` + tokens | 3 (habilita) | S (1 d) | requisito de todo lo demás |
| 3 | `ValorMonedas`, `SelloEvidencia`, `ChipEscala`, `LeyendaVidas` | 4 | S (1 d) | quita 7 rótulos repetidos por uso |
| 4 | `TuberiaMaterial` + `AccionesAhora` en `/panel` (+ `?estado=` en `/material`) | 5 | M (2 d) | corazón operativo |
| 5 | `KpiTile` + `Sparkline` + `BarraSegmentada` (+ API `acopiadoPorMes`, `porCertificar`) | 4 | M (2-2,5 d) | |
| 6 | `EscaleraVidas` en `/aprovechamiento/residuo/[id]` | 5 | M (2-3 d) | |
| 7 | `CadenaFlujo` + `ResumenDiagnostico` en `/aprovechamiento/cadena/[id]` | 5 | L (3-4 d) | |
| 8 | `PasosLote` + `RangoPrecio` v2 + `SemaforoPrecio` + "Destino sugerido" en `/material/[id]` | 4 | M (2-3 d) | |
| 9 | `RecorridoIlustrado` ×3 y portada recortada | 4 | M (2 d) | usar §5 |
| 10 | Inicio `/aprovechamiento`: cifras + mosaicos + `EscaleraNiveles` | 3 | S-M (1,5 d) | |
| 11 | `MapaRed` v2 (estados, lista/mapa, frescura) | 3 | M (2 d) | |
| 12 | Fotos reales por residuo/cadena + botón "Escuchar" (voz sintetizada del navegador; no probado en dispositivos del público) | 4 | L (continuo) | Medhi et al.: voz y gráficos reducen la barrera |

Fuera de la lista (no hacer ahora): `FlujoMasa`/Sankey (hasta tener ≥ 5 despachos y endpoint), kanban de escritorio, slider de oferta. No añadir librerías de gráficos.

**Validar antes de cerrar la fase:** 5 personas en Piura (acopiadores y 2 MYPE), 4 tareas: "¿cuántos reportes tienes por cotizar?", "¿cuál es el mejor uso de este descarte?", "¿tu oferta es justa?", "¿qué significa ┄?". Si > 1 persona falla con el ícono solo, mantener la palabra.

---

## 7. Fuentes abiertas durante esta investigación

- NN/g: [Lower-literacy users](https://www.nngroup.com/articles/writing-for-lower-literacy-users/) · [Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) · [How users read on the web](https://www.nngroup.com/articles/how-users-read-on-the-web/) · [Dashboards](https://www.nngroup.com/articles/dashboards-preattentive/)
- Medhi, Sagar, Toyama (2007), [Text-free user interfaces](https://ocw.mit.edu/courses/mas-965-nextlab-i-designing-mobile-technologies-for-the-next-billion-users-fall-2008/8ccecb3eacd514b7ea0255f5158de907_MITMAS_965F08_medhi2007.pdf)
- Few, [Bullet Graph Design Specification](https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf) · Tufte, [Sparkline theory and practice](https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/)
- W3C: [WCAG 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) · [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) · [Complex images](https://www.w3.org/WAI/tutorials/images/complex/) · Smashing, [Accessible SVG patterns](https://www.smashingmagazine.com/2021/05/accessible-svg-patterns-comparison/)
- [Carbon progress indicator](https://carbondesignsystem.com/components/progress-indicator/usage/) · [Kanban board (Businessmap)](https://businessmap.io/kanban-resources/getting-started/what-is-kanban-board)
- [EPA Wasted Food Scale](https://www.epa.gov/sustainable-management-food/food-recovery-hierarchy) · [Ellen MacArthur, diagrama de economía circular](https://www.ellenmacarthurfoundation.org/circular-economy-diagram)
- [data-to-viz: Sankey](https://www.data-to-viz.com/graph/sankey.html) · [bundlephobia d3-sankey](https://bundlephobia.com/api/size?package=d3-sankey@0.12.3) · [Bodie et al. 2019, subproductos del molino de arroz](https://www.frontiersin.org/articles/10.3389/fsufs.2019.00047/full)
- [MapLibre: clusters](https://maplibre.org/maplibre-gl-js/docs/examples/create-and-style-clusters/) · [INEI, Estadísticas de las TIC en los hogares, abr-jun 2024](https://www.inei.gob.pe/media/MenuRecursivo/boletines/boletin_tic_iit24.pdf)
