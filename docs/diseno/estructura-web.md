# Estructura de la página web (marketplace)

> Documento de trabajo. Se va actualizando a medida que se definen más pantallas.
> **Implementado** en el modo `MARKETPLACE` (`pnpm demo`): ver «Dónde está en el código» al final.

---

## 1. Idea general

Un marketplace con dos modos de uso: **comprador** y **vendedor**. Al entrar, la persona elige su modo. Después ve las ofertas (imágenes + precios) y navega con un menú en forma de bolita desplegable.

---

## 2. Pantalla de inicio

- Una **frase** principal (por definir el texto).
- **Dos botones**:
  - Ingresar como **Comprador**
  - Ingresar como **Vendedor**

---

## 3. Reglas de cuentas y modos

- Los modos se manejan **por separado**: cada modo tiene su propio registro y su propia entrada.
- Un **mismo correo puede tener los dos modos**, pero el modo extra solo se activa si la persona se registra en él.
- Desde el **Perfil**:
  - Comprador → opción **"Registrarme como vendedor"** (completa solo los datos extra de tienda y cobro).
  - Vendedor → opción **"Registrarme como comprador"**.
- No se crean usuarios duplicados ni se repite el registro completo.

---

## 4. Marketplace (pantalla principal de ambos modos)

### Distribución

```
┌─────────────────────────────────────────────┐
│ Logo      [ 🔍 Buscar productos... ]    (🏪) │  ← bolita
├─────────────────────────────────────────────┤
│ Vista: [ Lista ]  [ Mapa ]                   │
├─────────────────────────────────────────────┤
│ ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐  │
│ │ foto  │  │ foto  │  │ foto  │  │ foto  │  │
│ │Título │  │Título │  │Título │  │Título │  │
│ │S/ 50  │  │S/ 80  │  │S/ 25  │  │S/ 120 │  │
│ │Tienda │  │Tienda │  │Tienda │  │Tienda │  │
│ └───────┘  └───────┘  └───────┘  └───────┘  │
│   (más tarjetas hacia abajo)                 │
└─────────────────────────────────────────────┘
```

### Tarjeta de oferta

- Imagen del producto
- Título corto
- Precio (bien visible)
- Nombre de la tienda o vendedor
- Ubicación (zona o distrito)
- Corazón de favoritos (solo modo comprador)

### Detalle del producto (al hacer clic en una tarjeta)

- Varias fotos
- Descripción y precio
- Datos del vendedor
- **Mapa pequeño** con la ubicación del producto o tienda
- Botón **"Chatear con el vendedor"** (o "Comprar", según cómo se maneje el pago)

### Barra superior

- Buscador de productos.
- Botón **"Publicar"** (solo modo vendedor), junto al buscador.

### Categorías

- **Pendiente de decidir.** Por ahora no son parte fija de la estructura.
- Alternativa más simple: dejar solo el buscador y el filtro por ubicación/mapa.

---

## 5. Menú: la bolita desplegable

Una bolita con icono de **tiendita** al costado de la pantalla. Al presionarla se despliegan hacia abajo más bolitas con iconos.

| Icono | Comprador | Vendedor |
|---|---|---|
| 👤 Usuario | Perfil | Perfil |
| 📄 Documento | Mis compras y pagos | **Finanzas**: ventas, ingresos y cobros |
| 💬 Chats | Chats | Chats |
| ❤️ Favoritos | Sí | — |
| 📦 Mis productos | — | Editar, pausar y borrar publicaciones |

Cada icono lleva **etiqueta o texto al pasar el cursor** para que se entienda qué hace.

---

## 6. Mapa de ubicación

El mapa se usaría en tres lugares:

1. **Al publicar (vendedor):** en el formulario de "Publicar", el vendedor **escoge la ubicación en un mapa** moviendo un pin. También puede escribir la dirección y que el mapa se ubique solo.
2. **En el marketplace (comprador y vendedor):** un interruptor **Lista / Mapa**.
   - Vista Lista: las tarjetas normales.
   - Vista Mapa: cada oferta aparece como un pin con su precio; al tocarlo se ve la mini tarjeta.
   - Opción **"Cerca de mí"** para ordenar por distancia.
3. **En el detalle del producto:** un mapa pequeño con la ubicación aproximada.

### Consideración de privacidad

Mostrar una **zona aproximada** (barrio o distrito) en lugar de la dirección exacta, y compartir la dirección precisa solo cuando comprador y vendedor ya hablaron por chat.

### Opciones técnicas (por decidir)

- **Leaflet + OpenStreetMap**: gratis y fácil de integrar.
- **Google Maps**: más completo, pero requiere clave de API y puede tener costo.

---

## 7. Estructura completa

```
Inicio (frase + 2 botones)
 ├─ Comprador
 │    ├─ Registro / Ingreso
 │    ├─ Marketplace (Lista / Mapa + buscador)
 │    │     └─ Detalle del producto (+ mini mapa + chat)
 │    └─ Bolita: Perfil · Mis compras · Favoritos · Chats
 │          └─ En Perfil: "Registrarme como vendedor"
 │
 └─ Vendedor
      ├─ Registro / Ingreso (con datos de tienda y cobro)
      ├─ Marketplace (Lista / Mapa + buscador) + botón "Publicar"
      │     └─ Publicar: fotos, título, precio, descripción, ubicación en mapa
      └─ Bolita: Perfil · Mis productos · Finanzas · Chats
            └─ En Perfil: "Registrarme como comprador"
```

---

## 8. Pendientes por definir

- [ ] Texto de la frase de inicio. *(Hoy: se mantiene el hero día/noche de la portada; sus dos botones son «Ingresar como Comprador» y «Ingresar como Vendedor» — `components/vis/HeroDiaNoche.tsx`.)*
- [ ] Tipo de productos que se van a vender.
- [ ] Si habrá categorías o solo buscador + mapa. *(Hoy: buscador + mapa en el marketplace; la categoría solo se pide al publicar porque la API la necesita.)*
- [ ] Cómo se maneja el pago: ¿botón "Comprar" o solo contacto por chat? *(Hoy: «Chatear con el vendedor»; el pago en garantía simulado sigue dentro del chat.)*
- [x] Opción de mapa: se usa **MapLibre + OpenStreetMap (OpenFreeMap)**, que ya estaba en el proyecto: gratis y sin clave, equivalente a Leaflet + OSM.
- [ ] Detalle de cada pantalla: Perfil, Mis compras, Finanzas, Mis productos, Chats, formulario de Publicar. *(Hay una primera versión de cada una.)*

---

## Dónde está en el código

| Pieza | Archivo (`apps/web/src`) |
|---|---|
| Inicio (hero + 2 botones) | `components/LandingB2B.tsx`, `components/vis/HeroDiaNoche.tsx` |
| Ingreso y registro por modo (`?modo=comprador\|vendedor`) | `app/login/page.tsx`, `app/registro/page.tsx` |
| Modo activo y modos de la cuenta | `lib/modoUso.ts`, `lib/session.tsx` |
| Barra superior + bolita | `components/ShellMarket.tsx`, `components/MenuBolita.tsx` |
| Marketplace (Lista / Mapa, Cerca de mí) | `app/(app)/lotes/page.tsx`, `components/TarjetaOferta.tsx`, `components/MapaMarket.tsx` |
| Detalle del producto | `app/(app)/lotes/[id]/page.tsx` |
| Publicar | `app/(app)/publicar/page.tsx` |
| Perfil y «Registrarme como…» | `components/ModosCuenta.tsx` |
| Mis compras · Finanzas · Chats · Favoritos · Mis productos | `app/(app)/compras`, `finanzas`, `chats`, `favoritos`, `mis-productos` |

Reglas en la API: comprador = rol `RECEPTOR`, vendedor = `OFERTANTE`, los dos = `AMBOS`. `POST /empresas/mi/activar-modo` suma el otro modo a la misma cuenta. Una publicación pausada tiene estado `PAUSADO` (migración `0013`, que la API también aplica sola al arrancar si falta). El marketplace es el modo por defecto; la herramienta para acopiadores queda con `SWAPIT_ACOPIADORES=1` (`SWAPIT_MODO` ya no se lee). Los favoritos se guardan por ahora en el navegador.
