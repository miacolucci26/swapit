# 0002 — Qué pasa con `common/confidencial.ts` en el modelo B2B2B

**Estado:** aceptada (15 oct. 2026). Complementa [0001](0001-pivote-b2b2b.md).

## Pregunta
La lógica de revelación gradual de identidad (`Empresa.confidencial`, `Transaccion.identidadRevelada`, «Empresa confidencial · sector», ubicación a ~5 km, `PASO_UBICACION_OCULTA`) se hizo para que dos desconocidos negocien sin exponerse. En el modelo B2B2B el intermediario **ya conoce a sus proveedores**. ¿Sigue haciendo falta?

## Decisión
1. **Se retira del flujo principal** la revelación gradual entre contrapartes: ya no hay dos desconocidos negociando. Sus campos y su código quedan **solo en modo MARKETPLACE** (tras `SWAPIT_MODO`), con sus pruebas en `test/marketplace/`.
2. **Uso residual que se conserva en B2B2B:**
   - `aproximar()` (rejilla de ~5 km) para toda ubicación de proveedor en **agregados públicos** (`/impacto/publico`, mapa de calor): un tercero no debe poder ubicar la planta de un proveedor por un mapa público.
   - El **aislamiento entre intermediarios** (un competidor no debe ver la red de otro) ya no es una máscara de nombre: es un **filtro de pertenencia** (`WHERE e."intermediarioId" = <quien consulta>`) en `empresas.service`, `material.service` y el resto de consultas de la red. Un intermediario que pide un proveedor ajeno recibe 404, no un nombre oculto.
3. **No se borra el archivo todavía**: lo usan los módulos del marketplace que siguen vivos detrás del interruptor. Se eliminará junto con ellos (ver criterio en 0001).

## Alternativas descartadas
- *Mantener «Empresa confidencial» también en B2B2B:* añadiría complejidad sin proteger a nadie (el intermediario necesita el nombre y la ubicación exacta del proveedor para acopiar).
- *Borrar ya `confidencial.ts`:* rompería el modo MARKETPLACE y sus pruebas, que se conservan hasta decidir su retiro.
