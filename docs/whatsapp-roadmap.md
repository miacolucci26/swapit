# Bot de WhatsApp — qué hay hoy y qué falta para producción

## Qué hay hoy (simulador funcional)
- **Webhook con el formato de la API de WhatsApp Business (Cloud API)** en `apps/api/src/whatsapp/`: `GET /api/whatsapp/webhook` (verificación del reto con `WHATSAPP_VERIFY_TOKEN`, por defecto `swapit-demo`) y `POST /api/whatsapp/webhook` (mensajes entrantes).
- **Conversación guiada y determinista** (no usa IA generativa para responder): saludo → material → cantidad → precio → confirmación. Reutiliza el clasificador (subtipo de plástico), el benchmark (rango de referencia y semáforo del precio) y `MaterialService.reportar`, así que crea el mismo lote `REPORTADO` (`reportadoVia = WHATSAPP`) que el portal de captación. Comandos: «estado», «cancelar», «ayuda».
- **Identificación del proveedor** por su celular (`Empresa.telefono`, formato E.164) dentro de la red del intermediario; un número desconocido recibe un mensaje y no se guarda ninguna conversación. La identificación del intermediario sale de `Empresa.whatsappPhoneId` (el `phone_number_id` que envía Meta).
- **Firma del webhook:** si existe `WHATSAPP_APP_SECRET`, se exige `X-Hub-Signature-256` calculada sobre el cuerpo original (la app se arranca con `rawBody`). Sin esa variable no se valida (solo para demo).
- **`WhatsappProvider`**: interfaz de envío. La implementación actual (`MockWhatsappProvider`) **no envía nada**: guarda el mensaje saliente, que es lo que muestra la pantalla «WhatsApp (simulador)».
- Límite de tasa por número (120 mensajes/hora) y errores aislados por mensaje (el webhook siempre responde 200 para evitar reintentos en cascada).

## Qué falta para usarlo con proveedores reales
> Estos puntos están escritos de memoria sobre cómo funciona la plataforma de Meta y **deben contrastarse con su documentación oficial antes de implementarlos**; no se afirma nada sobre costos ni plazos.

1. **Cuenta de WhatsApp Business verificada** y un número por intermediario (el bot responde desde el número de cada acopiador). Configurar el webhook de la app de Meta hacia `/api/whatsapp/webhook`, con `WHATSAPP_VERIFY_TOKEN` y `WHATSAPP_APP_SECRET` definidos.
2. **`WhatsappProvider` real**: enviar con la API de mensajes de la Cloud API (token de acceso por intermediario, guardado cifrado) y registrar los estados de entrega.
3. **Plantillas aprobadas** para escribir primero: WhatsApp restringe los mensajes iniciados por la empresa fuera de la ventana de atención que abre un mensaje del usuario. Casos: avisar «tu acopiador te cotizó», pedir recordatorios de reporte recurrente.
4. **Consentimiento y datos personales:** el proveedor debe aceptar que el acopiador le escriba por WhatsApp (opt-in); revisar la Ley de Protección de Datos Personales del Perú para el tratamiento de teléfonos y conversaciones.
5. **Fotos y audios:** hoy solo se entiende texto (otros tipos reciben la ayuda). Pendiente: descargar imágenes del mensaje y adjuntarlas al lote, y transcribir audios.
6. **Más de un proveedor con el mismo número** en redes distintas ya funciona (se resuelve por el número de WhatsApp Business del intermediario); en una misma red el celular debe ser único (la API lo valida).
7. **Observabilidad:** panel de conversaciones atascadas, métricas de abandono por paso y cola de reintentos.
8. **Evaluar** si conviene reemplazar la conversación guiada por el asistente con Gemini Nano/Claude para texto libre («tengo 800 kilos de bidones azules a 1.70»); hoy se prefirió el flujo guiado porque es predecible y barato.
