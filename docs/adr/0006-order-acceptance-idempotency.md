# ADR 0006: Aceptación de pedidos simulados e idempotencia

Estado: aceptado para el corte 3 de M3.

## Decisión

El pedido se crea desde el carrito de comercio. El navegador envía solo el formulario con una clave de idempotencia; la Server Action `placeOrder` añade el ID del carrito leído de la cookie HttpOnly y llama a `POST /api/orders` con `{cartId}` y la cabecera `Idempotency-Key`. El BFF lee el carrito, construye `items` con IDs y cantidades (el contrato de proveedor diseñado en M0) y llama a `POST /orders`. Ningún precio, total ni artículo viaja desde el navegador.

## Sección crítica

En el proveedor, todo lo que ocurre después de analizar el cuerpo es síncrono: consulta del registro de idempotencia, recálculo de precios, comprobación de stock de todas las líneas, descuento, creación del pedido y registro de la clave. No hay ningún `await` entre esos pasos. Node ejecuta el manejador completo antes de atender otra petición, así que dos confirmaciones no pueden pasar ambas la comprobación de la última unidad. Es todo o nada: si una línea no tiene stock suficiente, se devuelve 409 `OUT_OF_STOCK` y no se descuenta nada.

Esta garantía depende de un único proceso. Con varias instancias haría falta una transacción duradera (por ejemplo, un decremento condicional en base de datos y una restricción única sobre la clave). Una prueba de mutación lo confirma: al introducir un `await` entre comprobación y descuento, las pruebas de concurrencia fallan (se vende dos veces la última unidad y la misma clave crea tres pedidos).

El inventario pasó a ser estado de cada instancia del proveedor: se copia de las fixtures a un `Map`, y catálogo, ficha, carrito y pedidos leen de él. Así las pruebas no se contaminan entre sí y el catálogo refleja el stock tras un pedido. Se reinicia con el proceso.

## Idempotencia

- Misma clave y mismo cuerpo: el pedido original, con 200 y sin volver a descontar stock.
- Misma clave con otro cuerpo: 409 `IDEMPOTENCY_CONFLICT`. La comparación usa las líneas ordenadas por producto.
- Solo se registran pedidos aceptados: un rechazo por stock no deja huella.
- Registros y pedidos están acotados (1000). Una clave registrada cuyo pedido ya no está en memoria se rechaza como conflicto; nunca crea un segundo pedido.

La clave se genera con `randomUUID` al renderizar `/cart` y se envía en un campo oculto. Si `placeOrder` falla, devuelve la misma clave en su estado y no revalida la página: un reintento tras un resultado incierto (timeout) recupera el pedido original en lugar de crear otro. Esto resuelve el caso que el BFF no puede resolver solo, porque no reintenta escrituras. El formulario se vuelve a montar cuando cambia el contenido de la bolsa (prop `key` con productos y cantidades), de modo que editar la bolsa descarta la clave anterior. El botón no se deshabilita durante el envío: un doble envío lleva la misma clave y devuelve el mismo pedido, y deshabilitar el botón enfocado movería el foco a `<body>`.

## Después del pedido

`placeOrder` borra la cookie del carrito y redirige a `/orders/<id>`. El carrito antiguo queda sin referencia y se expulsa con el límite de carritos. La confirmación se renderiza en servidor; un ID desconocido o inválido devuelve un 404 real.

El ID aleatorio del pedido en la URL es el único control de acceso. Se acepta porque el pedido es ficticio, de solo lectura y sin datos personales; un pedido real exigiría autenticar al propietario.

Los precios se recalculan al aceptar. Si cambiaron desde que se vio la bolsa, la confirmación muestra lo cobrado; avisar del cambio antes de confirmar queda fuera de alcance.

## Alternativas descartadas

- **Clave generada en la acción del servidor en cada envío.** Más simple, pero cada reintento sería un pedido nuevo: no protege frente a timeouts ni dobles envíos.
- **Clave derivada del carrito (hash de ID y contenido).** Estable sin estado en el formulario, pero impediría comprar dos veces el mismo contenido con el mismo carrito y mezcla identidad del carrito con intención de compra.
- **Página de confirmación ligada a una cookie del último pedido.** Evita el ID en la URL, pero complica recargar o compartir la confirmación de un pedido ficticio sin aportar privacidad real.
- **Reservar stock al añadir a la bolsa.** Evita sorpresas al confirmar, pero exige expiración de reservas y bloquea stock por carritos abandonados.
