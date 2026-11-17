# ADR 0005: Carrito invitado en comercio y sesión opaca

Estado: aceptado para los cortes 1 (añadir y ver la bolsa) y 2 (cambiar cantidad y eliminar líneas) de M3. Pedidos, idempotencia de pedidos y stock concurrente quedan para cortes posteriores.

## Decisión

El carrito vive en el proveedor de comercio, no en el navegador, en Next ni en el BFF. El proveedor ficticio guarda carritos en memoria (`Map`), genera el identificador con `randomUUID` y calcula precios, totales de línea, unidades y subtotal en cada lectura a partir de sus fixtures actuales. El BFF valida, traduce y normaliza; no almacena carritos ni inventario.

Next guarda solo el identificador en la cookie `atelier_cart`: `HttpOnly`, `SameSite=Lax`, `Path=/`, siete días y `Secure` en producción. Ese identificador aleatorio es la sesión opaca: poseerlo equivale a ser propietario del carrito. No aparece en URLs ni en registros, y el navegador nunca llama al BFF.

Las escrituras usan una Server Action enviada por `<form action>`. Funciona sin JavaScript (el servidor devuelve el mensaje de error o redirige a `/cart` con 303); con JavaScript, el botón se deshabilita y el estado se anuncia mientras está pendiente. Next 16.4.6 compara `Origin` con el host y aborta las acciones de otro origen; una prueba E2E lo comprueba en lugar de suponerlo. La acción solo acepta un `productId` válido; la cantidad la fija el servidor (1) y ningún precio viaja desde el formulario.

## Reglas

- Entrada pública: `{productId, quantity}` exactamente. Cantidad entera 1–20; un campo extra (`price`, `total`…) produce 400. Cuerpo JSON de 1 KB como máximo; JSON inválido o demasiado grande produce 400.
- Añadir incrementa la línea. Comercio rechaza producto agotado o cantidad superior al stock actual (409 `OUT_OF_STOCK`), más de 20 unidades por línea o más de 10 líneas (409 `CART_LIMIT_EXCEEDED`). El stock se comprueba pero no se reserva: el pedido deberá comprobarlo de nuevo dentro de su sección crítica.
- `CART_NOT_FOUND` (404) significa carrito desconocido, expulsado (máximo 1000 en memoria) o perdido al reiniciar. La página `/cart` lo muestra como bolsa vacía; la acción crea un carrito nuevo y añade el producto. Esa recuperación es segura porque la operación rechazada no aplicó nada.
- El BFF rechaza respuestas del proveedor con totales incoherentes, IDs de línea repetidos o un identificador distinto del pedido (502).
- Las escrituras se envían una vez. Un timeout puede ocultar una escritura aplicada; no se reintenta y el usuario puede consultar su bolsa.

## Corte 2: editar y eliminar líneas

- `PUT /api/carts/:id/items/:productId` con `{quantity}` exactamente, entero de 0 a 20. Fija la cantidad de una línea existente; 0 la elimina. Es idempotente: repetir la misma petición produce el mismo carrito, así que un doble envío no añade unidades.
- Comercio solo comprueba el stock cuando la cantidad sube (409 `OUT_OF_STOCK`). Reducir o eliminar siempre se permite, aunque el stock haya bajado por debajo de lo que hay en la bolsa.
- Modificar una línea inexistente devuelve 404 `CART_LINE_NOT_FOUND`; añadir sigue siendo la operación del corte 1.
- En `/cart`, cada línea tiene un formulario con dos botones de envío (`intent=update` y `intent=remove`); "Remove" usa `formNoValidate` para que un número inválido no impida eliminar. Funciona sin JavaScript. Con JavaScript, la Server Action devuelve un mensaje y revalida `/cart`, sin recargar la página.
- Una única región de estado permanece montada y anuncia el resultado. Al eliminar una línea (también la última), el foco pasa a esa región. Los controles no se deshabilitan durante el envío: una prueba E2E mostró que deshabilitar el botón enfocado mueve el foco a `<body>`, y la idempotencia hace inofensivo un envío repetido.

## Alternativas descartadas

- **Carrito completo en una cookie firmada.** No necesita estado en servidor y sobrevive a reinicios, pero requiere un secreto de firma, saca el carrito de comercio y obliga a recalcular todo desde datos controlados por el cliente.
- **Route Handler con comprobación manual de `Origin`.** Más explícito, pero duplica una protección que Next ya aplica a las Server Actions y añade código propio que mantener.
- **Añadir con semántica idempotente (fijar cantidad).** Evita duplicados por doble clic, pero sorprende al usuario que añade dos veces el mismo reloj. Se mitiga deshabilitando el botón durante el envío; la idempotencia se reserva para confirmar pedidos, donde hay dinero y stock en juego.

## Límites conocidos

El estado en memoria se pierde al reiniciar y no es compartido entre procesos; producción necesitaría almacenamiento duradero. La cookie `Secure` sobre `http://127.0.0.1` se verificó en Chromium; otros navegadores pueden tratar de forma distinta los orígenes locales sin TLS. No hay contador en la cabecera todavía.
