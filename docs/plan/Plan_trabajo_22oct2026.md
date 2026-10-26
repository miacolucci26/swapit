# SWAPIT | Plan de mejoras del prototipo

Versión para validación interna y posterior implementación con Claude  ·  22 de octubre de 2026

Objetivo: entregar una demo empresarial simple, confiable y navegable para el pitch del 23/10, priorizando la publicación, descubrimiento y negociación de materiales. No reconstruir el sistema desde cero.

## 1. Base revisada y decisiones de alcance

- Repositorio: swap-it-main.zip. Next.js (web), NestJS (API), Prisma; existen modos MARKETPLACE y B2B2B. Para el pitch, trabajar solo la experiencia MARKETPLACE, sin borrar B2B2B.
- Mentoría Miguel (21/10): catálogo con fotos y detalle primero, mapa secundario, flujo de intercambio visible, oferta antes de WhatsApp, quitar asistente IA de WhatsApp, demo con publicaciones representativas.
- Mentora (22/10): reducir complejidad, fortalecer confianza y cartera de clientes, verificar MYPE, explorar socios logísticos y cuantificar impacto ambiental solo con método sustentado.
- Entrevistas: Limones Piuranos/Don Limón (aplicaciones y composición de subproductos); Mangos Peruanos (plásticos y potencial demanda); Frutas de Piura (canales existentes y necesidad de ahorrar tiempo).
Criterio rector: cuatro entradas de navegación — Explorar, Publicar, Mi actividad y Mi empresa — ya definidas en Shell.tsx para MARKETPLACE. No sumar módulos al menú principal.

## 2. Cambios por pantalla: qué queda y qué cambia

| ID / prioridad | Pantalla actual → pantalla objetivo | Modificación concreta y justificación |
| --- | --- | --- |
| 01 · P0 | Inicio / → Inicio orientado al intercambio | Conservar titular B2B. Hacer visible una secuencia de 3 pasos: Publicar → Encontrar → Negociar. CTA primario «Explorar materiales» y secundario «Publicar». Reducir adornos e ilustraciones infantiles; usar fotos de materiales. La propuesta debe entenderse en segundos. |
| 02 · P0 | /lotes → Explorar materiales | Conservar lista como vista predeterminada y mapa como alternancia secundaria (ya existe). Priorizar tarjetas con foto real, material, kg/ton, ciudad, precio o «a negociar», estado y «Ver detalle». Separar «Ofertas» de «Busco materiales»; comprobar si el modelo/API admite demandas antes de implementarlas. |
| 03 · P0 | /lotes/[id] → Ficha de material | Mostrar galería, volumen, unidad, disponibilidad, condición, procedencia, usos conocidos y condiciones de retiro. CTA «Proponer acuerdo»; WhatsApp después del interés/acuerdo, no como sustituto de la ficha. No inventar análisis químicos o biológicos. |
| 04 · P0 | /lotes/nuevo → Publicar en pocos pasos | Conservar carga de fotos y asistencia de clasificación. Reducir a: (1) fotos y tipo de material; (2) cantidad, ubicación, disponibilidad y modalidad; (3) revisar/publicar. Campos técnicos opcionales. No exigir información innecesaria para crear una oferta. |
| 05 · P0 | /transacciones y /transacciones/[id] → Mi actividad / Acuerdo | Conservar vistas ofertante/receptor e impacto ya presentes. Simplificar estados visibles a Propuesta → Aceptada → Cerrada (mapear internamente sin romper estados existentes). Mostrar material, cantidad, precio y próxima acción; facilitar negociación y confirmación. |
| 06 · P1 | /perfil → Mi empresa / Confianza | Conservar razón social, RUC, ubicación y verificación. Mostrar estados «Pendiente / Verificada / No verificada» basados en verificación real. El validador SUNAT actual es simulado: prohibido etiquetarlo como comprobación oficial. Añadir contacto y cartera comercial solo si ya hay datos fiables. |
| 07 · P1 | /impacto y tarjeta en /transacciones → Impacto resumido | Priorizar kg/ton efectivamente intercambiados y número de acuerdos cerrados. CO₂e solo si se documentan factores, límites y referencia; si no, ocultar o marcar «estimación demostrativa». Evitar métricas ficticias como tracción real. |
| 08 · P1 | /mapa y funciones auxiliares → vistas secundarias | No eliminar código útil: acceder al mapa desde Explorar. Mantener créditos, matching, cumplimiento y otras rutas fuera del flujo principal del pitch; evitar enlaces que distraigan. Asistente WhatsApp IA fuera de la navegación y demo. |

## 3. Requisitos transversales de confianza y logística

- Confianza: perfil empresarial con RUC, nombre comercial, ubicación aproximada, responsable y estado verificable. No exhibir datos personales sensibles ni usar insignias de verificación simulada.
- Cartera de clientes: permitir identificar empresas que publican y guardar o volver a contactar proveedores, solo si la función ya existe o cabe sin comprometer P0. No presentar «clientes» de demostración como alianzas cerradas.
- Logística: en la ficha/aguerdo, añadir como máximo «Requiere transporte: sí/no» y condiciones de retiro. Patrocinios y alianzas logísticas son hipótesis comerciales, no una integración que deba programarse para mañana.
- Publicaciones: meta visual de 20–50 ofertas representativas, pero etiquetar las simuladas como «Demo». Publicaciones reales solo con autorización de la empresa y datos comprobados.
## 4. Orden de ejecución y criterios de aceptación

| Orden | Trabajo de Claude / equipo | Criterio verificable |
| --- | --- | --- |
| A · Auditoría (P0) | Revisar rutas, modelos Prisma, endpoints y modos; detectar componentes existentes antes de editar. Registrar archivos tocados. | Matriz conservar / modificar / posponer; sin pérdida de funcionalidad. |
| B · UX (P0) | Inicio, Explorar, Ficha y Publicar. Aplicar diseño empresarial coherente y responsive. | Una empresa puede ver una oferta y sus datos sin WhatsApp; publicar en flujo corto. |
| C · Negociación (P0) | Mi actividad, propuesta y confirmación; adaptar al modelo de estados existente. | Dos cuentas demo pueden proponer y aceptar un intercambio, sin errores. |
| D · Integridad (P0) | Verificar login, API, Prisma, carga de imágenes, persistencia y acceso público. Revisar configuración del despliegue. | Enlace público accesible; datos permanecen tras recargar; ninguna credencial expuesta. |
| E · Confianza/impacto (P1) | Corregir etiquetas de SUNAT simulado, métricas CO₂ provisionales y datos demo. | Ninguna verificación o cifra de impacto no sustentada se presenta como real. |
| F · Ensayo (P0) | Prueba con dos empresas, laptop y móvil; recorrido de 60–90 segundos para pitch. | Demostrar publicar → explorar → ver detalle → proponer → cerrar. |

## 5. Instrucciones de ejecución para Claude

Primero entregar un inventario de componentes y una propuesta de cambios por archivo, con estimación de riesgo; pedir aprobación antes de cambios destructivos. Implementar P0 antes de P1. Conservar migraciones, endpoints, credenciales y datos existentes. No rehacer el sistema, no borrar B2B2B, no habilitar el asistente IA de WhatsApp. Si una función (p. ej. demandas) exige cambios de modelo, explicitarlo y proponer un alcance mínimo o dejarla para después del pitch.

Entregables para revisión: (1) listado de archivos modificados y por qué; (2) capturas antes/después de Inicio, Explorar, Ficha, Publicar, Mi actividad y Mi empresa; (3) resultados de pruebas funcionales; (4) URL pública y pasos de demo; (5) pendientes pospitch.

## 6. Decisiones que el equipo debe aprobar antes de programar

- ¿Mostrar solicitudes «Busco» en el pitch o concentrarse en ofertas y negociación? La primera opción podría requerir ampliar el modelo de datos.
- ¿Qué empresas autorizan usar nombre, fotografías y materiales reales? Separar expresamente contenido demo de datos validados.
- ¿Se ocultará CO₂e hasta validar factores? Recomendación: sí; conservar toneladas recuperadas como indicador primario.
Alcance de esta revisión: rutas y lógica inspeccionadas en el ZIP; no equivale a pruebas de extremo a extremo en un servidor funcionando. Las recomendaciones de nuevas pantallas son propuestas, no funcionalidades verificadas.
