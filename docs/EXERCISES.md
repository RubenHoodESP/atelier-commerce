# Ejercicios sin IA (M5)

El plan exige que cada hito incluya un cambio hecho por ti, sin IA. Elige uno, impleméntalo, ejecuta las comprobaciones y prepárate para explicar qué decidiste y qué tests lo protegen. Aquí no hay soluciones a propósito: solo el objetivo, los criterios y pistas en forma de preguntas.

Antes de empezar, en la rama nueva: `npm ci`, `npm run build` y que pasen `npm test` y `npm run test:e2e`. Al terminar, deben pasar `npm run check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` y `npm run test:e2e`. Anota el resultado y lo que aprendiste en `docs/STATUS.md`.

## Calentamiento (15 minutos)

Cambia el precio de `watch-001` en las fixtures del proveedor de 125000 a 125099 céntimos. Antes de ejecutar nada, predice qué se verá en la ficha y qué tests fallarán. Ejecuta los tests, compara con tu predicción y restaura el valor.

- ¿Dónde está la fixture y quién convierte `cents` en `amountMinor`?
- ¿Qué tests dependen de ese precio y por qué es bueno que fallen?

## Opción A — Elegir la cantidad al añadir a la bolsa

Hoy "Add to bag" añade siempre una unidad. Permite elegir entre 1 y 5 unidades (o menos si el stock disponible es menor) antes de añadir.

Criterios de aceptación:

- Funciona sin JavaScript (formulario nativo) y con JavaScript.
- El control tiene una etiqueta accesible y el mensaje de error se anuncia como ahora.
- El servidor valida la cantidad aunque el navegador envíe otro valor; comercio sigue rechazando más unidades que el stock.
- axe sigue sin infracciones en ambos temas.
- Al menos un test nuevo: un E2E que añade 2 unidades y comprueba el subtotal, y otro que envía una cantidad manipulada y espera el rechazo.

Pistas:

- ¿Qué archivo contiene la Server Action de añadir y qué valida hoy de `formData`?
- ¿Qué guard de `@atelier/contracts` ya comprueba una cantidad válida?
- ¿Por qué no basta con limitar las opciones del `<select>`?

## Opción B — Limitar el campo de cantidad de la bolsa al stock

Hoy el campo de cantidad de la bolsa acepta hasta 20 y es comercio quien rechaza las subidas por encima del stock. Haz que el campo indique el máximo disponible (atributo `max` y un texto visible como "3 available"), sin dejar de validar en el servidor.

Criterios de aceptación:

- El stock lo proporciona comercio a través del contrato del carrito; el navegador nunca lo inventa.
- El DTO público, su validador, el adaptador del BFF y `bff-openapi.json` quedan alineados.
- Bajar la cantidad sigue permitido aunque el stock haya caído por debajo de lo que hay en la bolsa.
- Si el usuario fuerza un valor mayor (por ejemplo, editando el HTML), el servidor responde como hoy.
- Tests actualizados: el validador de contratos, la integración HTTP del carrito y un E2E.

Pistas:

- ¿Qué campo del carrito del proveedor tendrías que añadir y dónde se normaliza?
- ¿Qué tests de contrato fallarán cuando el DTO cambie y por qué está bien que fallen?
- ¿Qué pasa con el `max` si el stock baja mientras la página está abierta?

## Cómo explicarlo después

Prepara en inglés, en dos minutos: la necesidad, la frontera que tocaste (UI, Server Action, BFF o comercio), por qué el servidor sigue siendo la autoridad, qué tests añadiste y qué limitación queda.
