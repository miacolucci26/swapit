# Brief de implementación del rediseño (para agentes implementadores)

Producto: Swapit, SaaS B2B2B para intermediarios (acopiadores) del norte del Perú. Web: `apps/web` (Next.js 16 con App Router, React 19, Tailwind 4). LEE `apps/web/AGENTS.md` (esta versión de Next es nueva: `PageProps<'/ruta'>`, `params` es una Promise, etc.).

Qué pidió el usuario: muchísimo menos texto («nadie lo leería»), más color, más gráficos, figuras y flujos operativos didácticos, imágenes/ilustraciones, un nuevo diseño. Cada pantalla debe poder entenderse en 5 segundos mirando: número grande + etiqueta, pictograma, flujo, semáforo; no párrafos.

## Ya hecho (úsalo, no lo reescribas)
- Tokens y tipografía: `apps/web/src/app/globals.css` (clases Tailwind: `bg-sol-500`, `text-marino-900`, `bg-agro-tint`, `text-agro-ink`, `border-line`, `bg-surface-2`, `bg-cream`, `shadow-card`, `font-display` (Lexend) y cuerpo Atkinson). Regla: sobre `sol-500` el texto es `text-ink-900`, nunca blanco; para texto/íconos naranja sobre blanco usa `sol-700`. El color nunca es la única señal (ícono + palabra). Cuerpo ≥ 16 px; zonas táctiles ≥ 44 px. Las clases antiguas `emerald-*` y `stone-*` ya están remapeadas a marino y neutros azulados (puedes dejarlas o cambiarlas por tokens nuevos).
- `components/Logo.tsx` (`Logo`, `Isotipo`), `components/Shell.tsx` (menú lateral marino + barra inferior móvil), `components/ui.tsx` (Card, Badge, Btn, LinkBtn, Stat, Field, PageHeader, Vacio, PasosMaterial, RangoPrecio, SemaforoPrecio, etc., ya con la identidad nueva).
- `components/vis/`: `Iconos.tsx` (`Icono nombre=…`), `Pictogramas.tsx` (`Pictograma id=…`, `pictogramaDeCadena`), `CadenaFlujo`, `EscaleraVidas` (+ `ValorMonedas`, `SelloEvidencia`, `ChipEscala`), `TuberiaMaterial`, `Kpi` (`KpiTile`, `Sparkline`, `BarraSegmentada`), `RecorridoIlustrado`. LEE sus firmas antes de usarlas.
- Datos: `@swapit/shared` (cadenas, residuos, vidas, sectores, tipos de actor/destino, presentaciones). API en `apps/api` (ya existen `/destinos`, `/acuerdos`, `/material/exportar`, filtros por sector/tipoActor/residuoRef, `/material/resumen` con `inicio`, `destinosActivos`, `acuerdosVigentes`).
- Documentos de diseño: `docs/diseno/referencias-visuales.md` (paleta, tipografía, reglas), `docs/diseno/diagramas-y-flujos.md` (§3 wireframes de las pantallas con qué texto se elimina y §4 reglas de microcopy con antes/después, §5 recorridos). SÍGUELOS.

## Reglas de microcopy
Título ≤ 6 palabras; bajada ≤ 15; texto de tarjeta ≤ 20; botones con verbo imperativo («Cotizar», «Registrar recojo»); números con unidad (S/ 1,80 por kg); sin párrafos de más de 2 líneas; detalles largos en `<details>` («ver más»). Usa «Swapit» (una palabra) para el nombre.

## Cómo trabajar
- Edita SOLO los archivos de tu lista (otros agentes trabajan en paralelo en los demás). No cambies `ui.tsx`, `Shell.tsx`, `globals.css` ni `components/vis/*` salvo un bug evidente que bloquee (y avísalo).
- Mantén toda la funcionalidad existente (formularios, llamadas a la API, rutas) y la accesibilidad (labels, aria, foco).
- La app corre en http://localhost:3000 (cuentas demo en /login: gerencia@acopiostallanes.pe / demo1234). Si tienes el navegador integrado (`mcp__Claude_Browser__*`), úsalo para ver tus pantallas a 390 px de ancho (`resize_window` preset mobile) y a escritorio, y corrige lo que se vea mal (desbordes horizontales, textos cortados, contraste). Si no, al menos compila.
- Verifica con `pnpm --filter @swapit/web typecheck` (desde D:\Seedtech\simbio) hasta que pase. NO hagas commit.
- Responde con un resumen de máximo 10 líneas: qué cambiaste por pantalla y qué quedó pendiente.
