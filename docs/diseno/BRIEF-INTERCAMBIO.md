# Brief: experiencia de INTERCAMBIO (feedback de la mentoría #6, 21-oct-2026)

Léelo junto con `docs/diseno/BRIEF-IMPLEMENTACION.md` (identidad visual, componentes `components/vis`, reglas de microcopy). Este brief cambia el foco: la demo por defecto (`pnpm demo`, modo `SWAPIT_MODO=MARKETPLACE`) es ahora la experiencia de **intercambio** entre empresas; el modo B2B2B (acopiadores) sigue existiendo con `pnpm demo:b2b`.

## Qué dijo la mentoría
- El **flujo de intercambio es el core** y hoy está poco representado visualmente. Dar más peso a **fotos y descripción del material**; el **mapa pasa a vista secundaria**.
- Referencia: ficha tipo **NeoAutos** (foto grande + precio + «ver detalle») ANTES de habilitar el contacto. Diferenciarse de Facebook Marketplace.
- Contacto por WhatsApp genera fricción si no hay fotos ni detalle previo. **Se puede ofertar precio dentro de la plataforma; el contacto directo (teléfono/WhatsApp) solo se habilita al llegar a un acuerdo.**
- **Quitar el asistente de IA y el botón de WhatsApp del prototipo** por ahora (no borres el código, solo no lo expongas: sin ítem de menú, sin ruta enlazada, sin botones).
- **Reducir el menú a 3 o 4 opciones muy potentes.**
- La sección de historial/acuerdos se reformula como **vista de impacto** («Llevas 15 toneladas intercambiadas = X t de CO₂eq evitadas»).
- **Vista dual ofertante / demandante** en el panel.
- Meta visual del pitch: **20 a 50 ofertantes con fotos** y detalle del material.
- Dos perfiles: ofertantes con excedentes y demandantes buscando materia prima. Foco en productos con ciclo de vida extenso y cadena de valor amplia (p. ej. plásticos de agroexportadoras).

## Reglas para esta fase
- Solo empresas en la experiencia (sin llamar «personas» ni «familias» en la interfaz; el código de personas queda sin exponer en menús/landing).
- Cada tarjeta de oferta: foto grande (o ilustración si no hay foto), título corto, cantidad con unidad, precio o «Donación/Intercambio», ubicación aproximada (distrito/ciudad, nunca dirección exacta), empresa (respetando el modo confidencial que ya existe), insignias y botón «Ver detalle». Textos mínimos.
- Menú final (modo MARKETPLACE): **Explorar** (/lotes: catálogo con foto; conmutador Lista | Mapa), **Publicar** (/lotes/nuevo), **Mi actividad** (/transacciones: vista dual + impacto), **Mi empresa** (/perfil). Mantén accesibles por enlace desde dentro de estas pantallas lo que ya no esté en el menú (matching/alertas, créditos, cumplimiento REP) pero NO en el menú.
- Todo con la identidad nueva (tokens sol/marino, Lexend/Atkinson, `Icono`, `Pictograma`, etc.).
- Conserva toda la funcionalidad existente (publicar, solicitar, negociar, pago en garantía, calificación, certificados, impacto) y las pruebas.
