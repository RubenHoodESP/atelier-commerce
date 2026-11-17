# Revisión manual con lector de pantalla

La auditoría automática (axe, `tests/e2e/a11y.spec.ts`) solo detecta una parte de los problemas. Esta pasada la hace una persona con un lector de pantalla real y no se puede dar por aprobada hasta registrar su resultado en [STATUS](STATUS.md).

## Preparación

- macOS: VoiceOver (`Cmd+F5`) con Safari. Windows: NVDA (gratuito) con Firefox o Chrome.
- Arrancar la tienda en producción (`npm run build` y `npm start`) y abrir `http://127.0.0.1:3000`.
- Probar una vez con el tema claro y otra con el oscuro (selector Auto/Light/Dark de la cabecera).
- Navegar solo con el teclado y los atajos del lector: encabezados, puntos de referencia y formularios.

## Recorrido y qué comprobar

| Paso | Qué debe anunciarse o ocurrir |
| --- | --- |
| Cargar la portada | Título "Atelier \| Independent watchmaking"; el primer Tab llega a "Skip to content" y lo activa |
| Puntos de referencia | Banner, navegación "Main navigation", main y contentinfo; el enlace actual con "current page" |
| Selector de tema | "Colour theme", tres botones "Auto/Light/Dark theme" con estado pulsado/no pulsado |
| Catálogo | Título "The collection \| Atelier"; al cambiar colección se anuncia "Updating collection…" y luego el número de relojes |
| Tarjeta | Cada tarjeta se anuncia como enlace "View Atelier …"; el precio y la disponibilidad se leen como texto |
| Ficha | Título con el nombre del reloj; la ilustración como imagen "Illustration of …"; disponibilidad como estado |
| Añadir a la bolsa | Tras activar "Add to bag" se llega a "Your bag \| Atelier" y la cabecera dice "Bag 1 item" |
| Cambiar cantidad | El campo se anuncia como "Quantity for …"; tras "Update" se anuncia "Bag updated." sin perder el foco |
| Eliminar | Tras "Remove …" se anuncia "Watch removed from your bag." y el foco queda en ese mensaje |
| Error de stock | Al pedir más unidades de las disponibles se anuncia "That quantity is not available." |
| Pedido | "Place order" lleva a "Order confirmed \| Atelier"; la lista de líneas y el total se leen en orden |

## Registro

Anotar en `docs/STATUS.md`: fecha, sistema, navegador, lector y versión, tema, cada paso como correcto o con el problema observado, y los problemas abiertos. No marcar la revisión como aprobada si algún paso falla.
