# ADR 0004: Catálogo con estado URL y contenido independiente

Estado: aceptado para M2.

## Decisión y problemas resueltos

El catálogo se sirve en `/products`. Next carga los datos en Server Components y la URL contiene colección y ordenación. El formulario nativo GET funciona sin JavaScript; un Client Component añade navegación automática con historial e indicador de transición. Los controles se reconstruyen desde los parámetros al navegar. Esto evita desincronizar la URL, el historial y un segundo estado React.

El proveedor ofrece un único listado filtrado y ordenado; el BFF normaliza y valida la lista completa, total e IDs únicos. Las tarjetas y las fichas comparten fixtures y adaptación. Así se evitan peticiones por tarjeta y diferencias de precio/stock entre dos fuentes. Para doce productos no hay paginación, búsqueda ni caché: se conserva `no-store`. Las ordenaciones tienen desempate por ID.

El contenido editorial es un módulo HTTP separado dentro del mismo proveedor local. Tiene contrato público y adaptador propios. Next consulta contenido y catálogo en paralelo y compone la página. Un fallo editorial usa texto local de respaldo y un aviso seguro; un fallo comercial muestra error y reintento, sin inventar productos. Esto permite demostrar dos fronteras sin otro proceso, CMS ni cuenta externa. No existe aislamiento operativo entre los módulos del proceso simulado.

Tailwind 4.3.5 y su plugin PostCSS usan tokens para mantener la estética Atelier en catálogo, portada, ficha y errores. Las ilustraciones SVG son locales, reutilizables y etiquetadas por producto. No hay una biblioteca de componentes ni otra biblioteca de estado.

## Parámetros y compatibilidad

`collection`: horizon, meridian o nocturne; ausencia significa todas. `sort`: featured, price-asc, price-desc o name-asc; por defecto featured (ID ascendente). La URL canónica omite valores predeterminados. Next elimina parámetros desconocidos, repetidos o inválidos y conserva los válidos mediante redirección. Las APIs rechazan consultas inválidas o repetidas con 400.

El indicador de carga pertenece a la transición de filtros. No se añade un `loading.tsx` compartido en `/products`: el streaming adelantaría las cabeceras de las fichas (404 convertido en 200) y ocultaría contenido pendiente sin JavaScript. Se preserva HTML inicial completo y el 404 real.

Las fichas conservan esos parámetros únicamente para regresar al catálogo. Nunca se acepta una URL de retorno arbitraria. `watch-001` mantiene los datos de M1. Los agotados siguen disponibles para consulta.

## Verificación y límites

Pruebas de contratos, cliente, HTTP real y navegador cubren filtros, ordenación, normalización, vacío, errores y navegación. El arnés E2E inicia Next de producción y el BFF real con un proveedor controlable. Sus controles de fallos solo existen bajo `tests/support`; no forman parte de las rutas de la aplicación.

No se implementan carrito, pedidos, persistencia ni autenticación. La comprobación móvil y por teclado no sustituye las auditorías de M4. No hay afirmaciones de rendimiento sin mediciones ni despliegue empresarial.
