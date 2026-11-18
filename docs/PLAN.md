# Plan de desarrollo

## Objetivo

Practicar y documentar decisiones de frontend senior con una pequeña tienda de relojes: arquitectura, integración de APIs, reglas de negocio, testing y calidad. La integración se implementa con Express y un cliente REST tipado propio. No requiere una cuenta de proveedor de integración.

El MVP tendrá 8–12 relojes ficticios, catálogo con filtros en la URL, ficha, carrito invitado y confirmación simulada. EUR e importes enteros en céntimos. El proveedor posee precios y stock; el navegador envía únicamente IDs y cantidades. Quedan fuera pagos reales, cuentas, datos personales, envíos, descuentos, multimoneda y despliegue empresarial.

Estado de implementación: M0–M4 completos (M4 con excepciones documentadas: SonarQube/Snyk no ejecutados y revisión manual con lector de pantalla pendiente). Evidencias en [STATUS](STATUS.md#m4-acceptance-against-plan). Resultados exactos en [STATUS](STATUS.md).

## Hitos y cierre

| Hito | Trabajo | Evidencia |
| --- | --- | --- |
| M0 | Arquitectura, contratos y flujos de trabajo | Documentos coherentes y checks estructurales |
| M1 | Next -> cliente REST -> Express -> proveedor | Lockfile generado, typecheck, build, contratos, pruebas HTTP y E2E |
| M2 | Catálogo, filtros/ordenación URL, contenido y Tailwind | Estados de carga/error/vacío, móvil y teclado; navegación conserva filtros |
| M3 | Carrito y pedido simulado | Cantidades válidas, precios recalculados, stock e idempotencia probados |
| M4 | Calidad y riesgos | CI completa, lint, auditorías y escáneres realmente ejecutados |

M1 mantiene la ficha SSR y sustituye el transporte externo por Express. El estado y los resultados exactos están en [STATUS](STATUS.md). La decisión está en [ADR 0003](adr/0003-express-bff.md). Las pruebas se amplían junto a M2/M3, sin esperar a M4.

## Criterios de aceptación

- Catálogo: colección y orden en la URL; recarga/atrás conservan selección; errores permiten reintentar; vacío permite retirar filtros.
- Producto: datos normalizados, contenido principal en HTML inicial, precio exacto con céntimos, disponibilidad y 404 real para IDs desconocidos.
- Pedido: cantidades enteras, IDs únicos, precios/stock comprobados por el proveedor; rechazo de campos manipulados y pedido parcial.
- Concurrencia: dos confirmaciones no venden la misma última unidad. Misma clave/carga devuelve el mismo pedido; otra carga con esa clave se rechaza.
- Calidad: proveedor lento alcanza timeout; error seguro y correlacionado; escrituras sin reintentos automáticos; distinguir checks ejecutados de escáneres pendientes.

En cada hito: recorrer la petición, explicar restricciones y alternativas, implementar y probar fallos. La generación rápida de código no sustituye comprenderlo.
