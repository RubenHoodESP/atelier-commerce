# Relevo para Claude — Atelier Commerce

Fecha de referencia: 17 de noviembre de 2026. Este documento permite continuar desde un clon del repositorio, sin la conversación de Codex. Debe mantenerse como relevo actual, no como diario acumulativo.

## 1. Objetivo, acuerdos y fuentes de verdad

Proyecto privado: [RubenHoodESP/atelier-commerce](https://github.com/RubenHoodESP/atelier-commerce), rama principal `master`.

El objetivo es practicar y poder explicar decisiones de frontend senior mediante una pequeña tienda ficticia de relojes. La generación de código no sustituye comprenderlo: cada hito incluye explicación, pruebas y una modificación sin IA.

Leer en este orden:

1. [Acuerdo de trabajo](../AGENTS.md): instrucciones comunes a cualquier agente.
2. [Estado y evidencia](STATUS.md): comportamiento implementado, comprobaciones y pendientes.
3. [Plan total y aceptación](PLAN.md): alcance y criterios de M0–M5.
4. [Arquitectura](ARCHITECTURE.md) y [decisiones de M2](adr/0004-catalog-url-and-content.md).
5. Solo el contexto necesario para la tarea: `node scripts/context.mjs frontend`, `integration`, `quality` o `planning`.

Preferencias acordadas: explicar decisiones y compromisos en español; interfaz en inglés; estética Atelier cálida/editorial, premium y minimalista, con titulares en Cormorant Garamond, movimiento sereno y SVG locales; un avance pequeño y verificable cada vez. Cargar las skills versionadas que correspondan en `.agents/skills`: `atelier-efficient-workflow`, `atelier-integration-review` y `atelier-frontend-review`. No instalarlas globalmente ni lanzar subagentes salvo petición del usuario o instrucción aplicable.

El MVP abarca catálogo de 8–12 relojes, filtros URL, ficha, carrito invitado y confirmación simulada. Quedan fuera pagos reales, cuentas, datos personales, envíos, descuentos, multimoneda y despliegue empresarial. No añadir base de datos, Redis, bus de eventos, plataforma de autenticación o biblioteca de estado sin una necesidad demostrada.

## 2. Estado recibido

**M0–M3 están implementados; M4 está en curso (cortes 1–3: temas, auditoría de accesibilidad y lint con tipos).**

- M0: estructura, contratos, arquitectura y flujos de trabajo versionados.
- M1: ficha SSR y recorrido real por HTTP Next → cliente REST → Express → proveedor ficticio; validación en ejecución, normalización, errores seguros y 404 real.
- M2: 12 productos en Horizon/Meridian/Nocturne, catálogo SSR, filtros/ordenación URL, historial y regreso desde detalle, agotados consultables, contenido editorial por HTTP con respaldo local, Tailwind y navegación adaptable/accesible básica.
- Antes de M3 se añadió lint sintáctico (oxlint), su paso de CI y `.claude/settings.json` con hook de lint al editar; ver [QUALITY](QUALITY.md#lint-decisions).
- M3 cortes 1–3 implementados: bolsa invitada con edición ([ADR 0005](adr/0005-guest-cart-session.md)) y pedido simulado con sección crítica síncrona e idempotencia ([ADR 0006](adr/0006-order-acceptance-idempotency.md)). Corte 4: contador de la bolsa en la cabecera, `aria-current`, títulos descriptivos, contraste de controles corregido y cierre de M3 con cada criterio del plan ligado a su prueba (ver [STATUS](STATUS.md#m3-acceptance-against-plan)).
- Corte de pulido: movimiento con CSS y Motion 14.9.0 limitado a catálogo y bolsa, sin ocultar contenido sin JavaScript y con `prefers-reduced-motion` ([ADR 0007](adr/0007-motion.md)). Playwright usa movimiento reducido por defecto. Titulares en Cormorant Garamond autoalojada con `next/font/local` ([ADR 0008](adr/0008-display-typography.md)).
- M4 corte 1: tema claro/oscuro con selector Auto/Light/Dark, cookie HttpOnly y `data-theme` desde el servidor; contraste de ambas paletas comprobado por test ([ADR 0009](adr/0009-colour-themes.md)). La CI ya se puede leer con las herramientas de GitHub y pasó en las PR #5–#7.
- M4 corte 2: axe en todo el recorrido y ambos temas, 0 infracciones tras corregir `label-content-name-mismatch` con tarjetas de enlace extendido y el nombre visible de la bolsa; guion manual de lector de pantalla en [A11Y_MANUAL_CHECK](A11Y_MANUAL_CHECK.md), pendiente de ejecutar.
- M4 corte 3: lint con tipos (`oxlint-tsgolint` 7.0.2005, compatible con TypeScript 7.0.2) en `npm run lint`, CI y hook; 59 hallazgos corregidos sin cambiar comportamiento, sustituyendo aserciones por guards que estrechan el tipo.
- M4 pendiente: política de auditoría de dependencias, rendimiento medido con Lighthouse, revisión manual con lector de pantalla (del alumno) y SonarQube/Snyk (requieren cuentas); no describirlas como aprobadas.
- M5 pendiente: demo de cinco minutos, explicación en inglés y modificación sin IA. Hay material en [INTERVIEW](INTERVIEW.md).

La migración histórica a Express fue una decisión explícita del usuario: eliminar el SDK externo, los paquetes privados y el puente CommonJS. No reintroducirlos. No atribuir a este ejercicio experiencia profesional con proveedores comerciales.

## 3. Arquitectura y límites de confianza

| Área | Responsabilidad |
| --- | --- |
| `apps/storefront` | Next App Router/React: HTML, interacción, accesibilidad y configuración server-only |
| `apps/middleware` | Express BFF: rutas, adaptación, validación, tiempos de espera y errores |
| `apps/mock-services` | Un proceso Express con módulos ficticios de comercio y contenido |
| `packages/contracts` | DTO públicos, validadores, clientes tipados y OpenAPI; sin React ni Express |

La página llama al cliente tipado desde el servidor; Express consulta al proveedor y adapta sus campos. El cliente también valida el JSON público y su coherencia con el estado HTTP. TypeScript no valida respuestas de red por sí solo.

Comercio es la autoridad sobre precios, stock y futura aceptación del pedido. El navegador nunca suministrará un precio autoritativo. El BFF no mantiene una segunda copia del inventario. EUR se representa como enteros seguros en céntimos.

Direcciones y secretos quedan en servidor; las entradas del usuario no eligen URLs de proveedores. Los servicios locales escuchan en loopback. Las escrituras (carrito y pedidos simulados) viven en memoria del proveedor ficticio; no hay pagos, cuentas, pedidos persistentes ni proveedores reales.

Contratos públicos: [bff-openapi.json](../packages/contracts/bff-openapi.json). Contrato del proveedor: [openapi.json](../packages/contracts/openapi.json). El diseño de pedidos de M0 está implementado desde el corte 3 de M3.

## 4. M2: decisiones que deben preservarse

- `/` es la portada; `/products` el catálogo; `/products/[id]` la ficha. `watch-001` conserva nombre Atelier Horizon, precio 125000 céntimos y stock 3 de M1.
- La URL es la fuente de filtros: `collection=horizon|meridian|nocturne`; ausencia significa todas. `sort=featured|price-asc|price-desc|name-asc`; featured se omite de la URL canónica. Featured ordena por ID; todos los empates se resuelven por ID.
- El proveedor filtra y ordena en una sola llamada de listado. Listado y ficha usan las mismas fixtures/adaptación; no hay llamadas por tarjeta, paginación ni búsqueda textual.
- Next normaliza parámetros de página inválidos/repetidos/desconocidos mediante redirección y conserva los válidos. La API los rechaza con 400. Nunca aceptar una URL arbitraria de retorno.
- El formulario GET funciona sin JavaScript; un Client Component añade navegación automática, historial, anuncio de espera, bloqueo temporal y restauración de foco. No duplicar los filtros en un estado React sincronizado con efectos.
- No añadir un `loading.tsx` compartido en `/products` sin resolver primero las regresiones observadas: respuestas 200 para fichas inexistentes y contenido oculto sin JavaScript. La carga se indica en la transición de filtros; ambos comportamientos están cubiertos por E2E.
- Contenido editorial y catálogo se leen en paralelo. Un fallo editorial usa texto local y registra aviso seguro; un fallo comercial muestra error/reintento, sin inventar productos. Ambos módulos comparten proceso: no hay aislamiento operativo real.
- Conservar `no-store`, tiempos de espera nuevos por petición (proveedor 1500 ms, cliente 2500 ms), ausencia de reintentos automáticos y correlación mediante `X-Request-ID`. Errores del BFF: 400/404/500/502/504, sin cuerpos privados ni stacks.
- El listado público valida productos, total igual a la longitud e IDs únicos; una respuesta inválida no se convierte silenciosamente en resultados parciales.
- Tailwind y su plugin PostCSS están fijados en 4.3.5; PostCSS 8.5.33; Motion en 14.9.0. Los tokens y SVG mantienen el aspecto actual. No actualizar dependencias como parte accidental de otra tarea.

## 5. Instalación portable, ejecución y pruebas

Toolchain fijado: **Node 22.23.5 / npm 10.9.9**. Respetar `.node-version`, `.nvmrc`, manifests y lockfile. Instalar con `npm ci`, nunca `--force` o `--legacy-peer-deps` para ocultar conflictos.

Desde la raíz del clon:

```sh
npm ci
npm run dev
```

En PowerShell, usar `npm.cmd`/`npx.cmd` si la política de scripts bloquea `npm`. El arranque construye los servicios y levanta proveedor 4100, BFF 4000 y Next 3000. Abrir la ruta `/products`. Ctrl+C detiene el stack. Los cambios en servicios requieren reiniciar; Next recarga la UI. Para producción: `npm run build`, luego `npm start`. No hacen falta proveedores durante la compilación.

No se necesitan secretos, cuenta externa ni `.env` para los valores predeterminados. [`.env.example`](../.env.example) documenta las variables server-only: puertos, direcciones y timeouts. No copiar credenciales a documentación ni imprimir su contenido.

Comprobaciones desde la raíz:

```sh
npm run check
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

E2E necesita puertos 3000/4000/4100/4199 libres. Usa Next de producción y el BFF real con un proveedor controlable solo en `tests/support`. No mover sus controles de fallos a las rutas de la aplicación. Un único worker serializa los escenarios con estado compartido.

Endpoints: BFF `/healthz`, `/api/products`, `/api/products/:id`, `/api/content/brand`, `POST /api/carts`, `GET /api/carts/:id`, `POST /api/carts/:id/items`, `PUT /api/carts/:id/items/:productId`, `POST /api/orders`, `GET /api/orders/:id`; proveedor `/health`, `/products`, `/products/:id`, `/content/brand`, `POST /carts`, `GET /carts/:id`, `POST /carts/:id/lines`, `PUT /carts/:id/lines/:sku`, `POST /orders`, `GET /orders/:id`.

### Particularidades de la máquina de Codex

Estas rutas no son requisitos de un clon local: Node fijado está en `/workspace/.toolchains/node22/node-v22.23.5-linux-x64/bin`; la caché escribible de npm se configuró en `/workspace/.cache/npm`. Las dependencias y procesos de esa máquina no se transfieren al clonar GitHub.

La descarga del navegador administrado por Playwright fue bloqueada por la política de red. Se validó con `/usr/bin/chromium` y una configuración ignorada en `.local/playwright.cloud.config.ts`. En un clon normal, instalar Chromium con el comando anterior. Si hay que reproducir la alternativa del sistema, crear una configuración local que extienda la del repositorio y establezca `use.launchOptions.executablePath` a la ruta verificada del navegador; no asumir que el archivo ignorado existe.

Next puede generar cambios en `apps/storefront/next-env.d.ts` y un `AGENTS.md` dentro del storefront. Preservar modificaciones previas del usuario y retirar solo las adiciones generadas por la propia ejecución; no usar limpieza/reset global.

## 6. Evidencia y publicación

M2 se validó en esta máquina con instalación limpia, chequeo estructural, tipos, compilación, **47 pruebas en cinco archivos y nueve E2E**, estos últimos con Chromium del sistema 156.0.8078.79. Se inspeccionaron capturas de catálogo y móvil a 360 px. No es una auditoría completa ni una medición de rendimiento.

M1 tiene un [resultado CI histórico](https://github.com/RubenHoodESP/atelier-commerce/actions/runs/44077314459): 19 pruebas y dos E2E. No presentarlo como CI de M2. Consultar [STATUS](STATUS.md) para evidencia más reciente.

M2 y este relevo se publicaron en `master` con el commit [2b0eddd9be97abc4e950d326c378adfea7ed229c](https://github.com/RubenHoodESP/atelier-commerce/commit/2b0eddd9be97abc4e950d326c378adfea7ed229c), comprobado con el SHA remoto. Un commit posterior solo registra esta evidencia. El acceso a la API de Actions devuelve `Forbidden`: CI remota de M2 no verificada.

Para identificar la revisión disponible, usar `git log -1 --oneline` y `git status --short`. Antes de afirmar que está publicada, comparar el commit local con `git ls-remote origin refs/heads/master`. La base de M1 era `70687b0c1aa9b4e45816e2fd46cc6a2abf8baa13`; M2 y este relevo se publicaron preservando ese historial. No hacer force-push.

El usuario autorizó publicar M2 y este relevo en `master`, solo en GitHub. Esa autorización no es una instrucción permanente de publicar futuros cambios de Claude. El entorno en la nube se publicó anteriormente; su snapshot no debe suponerse actualizado con M2 y no se modifica como parte de esta publicación. El acceso por Git funciona; la API de GitHub devolvió `Forbidden`. No asumir CI aprobada ni permisos de API a partir de una operación Git exitosa.

## 7. M3 (completado) y cómo continuar

Los cortes 1–2 (bolsa invitada con edición) están hechos: sesión opaca HttpOnly, Server Actions same-origin con rechazo de otro origen probado, carrito propiedad de comercio y edición idempotente (fijar cantidad, 0 elimina). El corte 3 añadió la confirmación de pedido con idempotencia y el corte 4 cerró M3. Siguiente: M4 (herramientas de calidad reales y medidas) y M5. No introducir autenticación de cuentas.

Implementado y probado en el corte 3: cantidades enteras acotadas, IDs únicos, rechazo de campos de precio/total manipulados, recálculo de precios y validación de stock por comercio. La operación simulada debe aceptar todo o rechazar todo.

Para el proveedor de un único proceso, comprobación/decremento de stock, creación del pedido y registro de idempotencia deben compartir una sección crítica síncrona. Dos confirmaciones simultáneas no pueden vender la última unidad dos veces. La misma clave/carga devuelve el mismo pedido; otra carga con la misma clave se rechaza. No reintentar escrituras sin estas garantías. El estado en memoria reinicia al reiniciar; producción necesitaría transacciones duraderas, fuera del alcance actual.

Ampliar pruebas con cada avance, sin esperar a M4. Mantener documentación y contratos alineados y separar claramente lo implementado de lo planificado.

## 8. Mensaje para iniciar una sesión de Claude

> Continúa Atelier Commerce desde este repositorio. Lee CLAUDE.md, AGENTS.md, docs/CLAUDE_HANDOFF.md y docs/STATUS.md. Comprueba el estado Git y las versiones antes de actuar; no dependas del chat de Codex ni de sus archivos ignorados. M0–M2 están implementados y M4 está en curso (cortes 1–3 hechos). Explica en español y conserva la interfaz en inglés. Revisa el alcance y propón primero una parte pequeña y verificable del carrito invitado, respetando la autoridad de comercio sobre precios/stock y la futura idempotencia. Carga solo las skills y el contexto relevantes. No publiques ni cambies el entorno en la nube sin una nueva instrucción.
