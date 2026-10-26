# 0001 — Pivote de marketplace de dos lados a SaaS B2B2B para intermediarios (15 oct. 2026)

**Estado:** aceptada por el equipo (David Blas, Josué Farfán). **El producto sigue llamándose Swapit** (decisión expresa: no se renombra).

## Contexto
- **Ganoza (generador de plástico)** ya mueve su material por canales informales. Su dolor validado no es «dónde publicar»: es no saber si el precio que le ofrecen es justo (no hay referencia por subtipo de plástico) y no tener trazabilidad formal.
- **Tallán Space (intermediario real)** dice que su matching es «100 % cara a cara»: su dolor es digitalizar su propia operación, no que le falte un marketplace que compita con su relación comercial.
- Las plataformas de matching directo entre empresas (Byproductplace, Recylink, Kyklos, EME) tienen un patrón repetido: la transacción se sale de la plataforma en cuanto dos empresas se encuentran. Un marketplace de dos lados hereda ese riesgo estructural y además el problema de liquidez de dos lados.

## Decisión
No competir con el intermediario: **venderle la herramienta**. Swapit pasa a ser un SaaS para acopiadores/agregadores regionales:
1. **Red de proveedores digital:** portal de captación por enlace y bot de WhatsApp para que el proveedor reporte material.
2. **Benchmark de precios por subtipo de material**, con clasificación asistida por IA.
3. **Certificados de trazabilidad verificables (QR + hash)** emitidos por el intermediario a sus clientes, co-marcados.

Ingresos: suscripción mensual por intermediario + fee por certificado emitido. Sin comisión de transacción, sin intentar desintermediar a nadie.

## Qué cambia en el modelo
- `Empresa.rol = INTERMEDIARIO`: la cuenta que se suscribe y paga. `GENERADOR`: proveedor de su red, creado y gestionado por él (`Empresa.intermediarioId`), sin usuario propio.
- `Lote` es el material reportado por un proveedor; su ciclo es `REPORTADO → COTIZADO → ACOPIADO → DESPACHADO` (o `RECHAZADO`).
- Aislamiento por intermediario: nadie ve proveedores ni lotes de otro intermediario.

## Qué queda detrás de un interruptor (`SWAPIT_MODO`)
`SWAPIT_MODO=B2B2B` (por defecto) o `MARKETPLACE`. En B2B2B responden 404: transacciones con chat y pago en garantía, créditos circulares, personas, búsqueda y alertas de contraparte, cumplimiento REP y el mercado abierto de lotes (`/lotes`). Las suites de pruebas de ese modo viven en `apps/api/test/marketplace/` y fijan el modo.

**Criterio para borrar ese código:** cuando el equipo confirme que no volverá al marketplace (o tras el Entregable 2), se eliminan los módulos `transacciones`, `creditos`, `matching` (alertas), `lotes` (mercado), `common/payments` y `common/confidencial.ts` junto con `test/marketplace/`.

## Consecuencias y riesgos
- Sin datos reales de precios, el benchmark de la demo es ilustrativo y la interfaz lo dice.
- Precios de suscripción y del fee por certificado son placeholders (decisión comercial pendiente).
- El mercado objetivo es acotado (~15-20 intermediarios identificados): el riesgo pasa de «liquidez» a «concentración y poder de negociación del cliente».
