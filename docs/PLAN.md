# Plan de desarrollo

## Objetivo y alcance

Preparar una entrevista de front-end orientada a Next/React, middleware de APIs, Alokai y e-commerce. Construir una demo peque�a y defendible: comprender el flujo, justificar decisiones, probar fallos y modificarlo sin depender de generaci�n autom�tica.

El MVP incluye 8-12 relojes ficticios, cat�logo con filtros en la URL, ficha, carrito invitado y confirmaci�n simulada. Moneda �nica EUR, importes enteros en c�ntimos. Cat�logo/contenidos simulados localmente y claramente identificados. El carrito enviado contiene identificadores y cantidades; el proveedor calcula importes y valida stock al confirmar.

El MVP deja fuera cuentas, pagos reales, datos personales, env�os, descuentos, administraci�n, multimoneda y despliegue empresarial. Vue es una alternativa de ecosistema; implementamos React. Jira/Confluence se practican mediante historias y documentaci�n exportables, sin depender de cuentas externas.

## Orden y criterios de cierre

Las horas son estimaciones de trabajo concentrado, no fechas comprometidas. Ajustar seg�n la entrevista. No empezar por la apariencia antes de demostrar la integraci�n principal.

| Hito | Trabajo | Evidencia para cerrarlo | Esfuerzo orientativo |
| --- | --- | --- | --- |
| M0 | Investigaci�n, arquitectura, plan, contratos propuestos y flujos de trabajo | Documentos coherentes, validaci�n de base y commit local | Preparado en este commit |
| M1 | Verificar acceso a Alokai; instalar versiones estables compatibles; configurar workspaces; devolver un producto por el SDK | Node fijado, lockfile generado, typecheck/build y una prueba real Next -> Alokai -> proveedor | 3-5 h, condicionado por acceso |
| M2 | Cat�logo y ficha; adaptaci�n de datos; contenido de marca; dise�o responsive | Datos reales del proveedor simulado, estados de carga/error/vac�o; navegaci�n por teclado | 4-6 h |
| M3 | Carrito y pedido simulado; validaci�n y rec�lculo en servidor | A�adir/cambiar cantidades, rechazo de producto agotado y precio manipulado | 4-6 h |
| M4 | Pruebas de riesgos; CI; seguridad, rendimiento y accesibilidad | Checks reproducibles, prueba de fallo de proveedor y recorrido E2E sobre build de producci�n | 3-5 h |
| M5 | Ensayo de entrevista y documentaci�n de l�mites | Demo de 5 min y explicaci�n en ingl�s de arquitectura, pruebas y una decisi�n alternativa | 1-2 h |

## M1: tareas exactas para empezar

1. Instalar/seleccionar Node 22.23.5 sin sustituir globalmente otros entornos.
2. Comprobar la disponibilidad y licencia de `@alokai/connect@2.5.2`. Confirmar sus exports `/sdk`, `/middleware` y `/integration-kit`, engines, dependencias y peer dependencies.
3. Comprobar TypeScript 7.0.2 con Next 16.4.6 y las herramientas de pruebas. Revisar compatibilidad con su API de compilador; usar una versi�n estable anterior solo si se demuestra un conflicto y registrar la decisi�n.
4. Instalar las dependencias de la primera conexi�n y generar un lockfile real; no fabricar el lockfile ni ocultar conflictos de peers.
5. Crear el proveedor local de cat�logo y un producto fixture con un formato distinto al contrato p�blico.
6. Crear una integraci�n de Alokai que consulte el proveedor y normalice su respuesta. Configurar URL del proveedor desde variables de entorno del servidor.
7. Inicializar el SDK de Alokai en una capa de acceso a datos de Next. Mostrar el producto en un Server Component.
8. Ejecutar build/typecheck y una comprobaci�n de integraci�n. Guardar comandos, versiones resueltas y resultado en `docs/STATUS.md`.

Si el paquete actual de Alokai exige acceso no disponible, detener esa parte y documentar el bloqueo. Se puede avanzar con el adaptador Express bajo una etiqueta expl�cita; no marcar M1-Alokai como completado ni cambiar silenciosamente a paquetes legacy.

## Historias y criterios de aceptaci�n

### P1: consultar cat�logo

- Como visitante, filtrar por colecci�n y ordenar por precio.
- La URL conserva filtros al recargar y usar atr�s/adelante.
- Los errores ofrecen reintento; la lista vac�a explica c�mo retirar filtros.
- El contrato expone datos normalizados, sin URLs internas o credenciales.

### P2: consultar producto

- Una URL desconocida muestra una p�gina 404.
- La ficha muestra nombre, precio formateado, caracter�sticas y disponibilidad.
- El contenido principal es accesible sin esperar a JavaScript del cliente.

### P3: confirmar carrito

- Las cantidades son enteras dentro del l�mite definido en el contrato.
- El servidor consulta sus precios y stock al confirmar, sin aceptar totales del cliente.
- Un art�culo agotado devuelve un error de negocio y no crea un pedido parcial.
- Dos confirmaciones competidoras no venden la misma �ltima unidad.
- Repetir una confirmaci�n con la misma clave de idempotencia devuelve el mismo pedido; otra carga con la misma clave se rechaza.

### P4: fallos y calidad

- Un proveedor lento alcanza un l�mite de tiempo y devuelve un error normalizado.
- No se reintenta una escritura sin una garant�a de idempotencia.
- Hay una prueba para precio manipulado, agotado, idempotencia y fallo de proveedor.
- CI distingue comprobaciones ejecutadas de esc�neres pendientes de credenciales.

## Forma de aprendizaje

En cada hito: explicar el recorrido; proponer una soluci�n; implementar un cambio peque�o; revisar errores y alternativas; ensayar una pregunta de entrevista. Reservar pr�ctica sin IA para leer, depurar y modificar la funcionalidad. La velocidad de generaci�n no es el criterio de cierre.
