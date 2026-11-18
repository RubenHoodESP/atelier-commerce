# Preguntas de entrevista: decisiones y por qué

Guía de estudio para defender el proyecto. Cada pregunta trae:

- **Di:** una respuesta corta en inglés para la entrevista.
- **Por qué:** la explicación en español, para entenderlo y decirlo con tus palabras.
- **Alternativas:** qué se descartó y a qué coste; suele ser la pregunta siguiente.
- **Dónde:** archivos o pruebas que lo demuestran.

Regla de oro: **necesidad → restricciones → alternativas → elección → verificación → límites.** Si no sabes algo, di qué medirías o comprobarías. No exageres: es un ejercicio de aprendizaje con proveedores ficticios, no experiencia profesional con plataformas comerciales.

Complementa a [INTERVIEW](INTERVIEW.md) (historias de decisión) y [DEMO](DEMO.md) (guion de cinco minutos).

---

## 1. Visión general

### ¿Qué es el proyecto y qué problema resuelve?
- **Di:** "A small fictional watch store built to practise senior frontend and integration decisions end to end: server-rendered catalog with URL filters, a guest bag, and simulated orders that are idempotent and safe under concurrency, behind a typed Express BFF."
- **Por qué:** el objetivo no es la tienda, sino tener un caso concreto donde aparecen los problemas reales de un frontend de comercio: integración con un proveedor externo, autoridad de precios, concurrencia, accesibilidad, rendimiento y calidad.
- **Dónde:** [PLAN](PLAN.md), [ARCHITECTURE](ARCHITECTURE.md).

### Resume la arquitectura en una frase.
- **Di:** "Next.js renders on the server and calls a typed REST client; an Express BFF validates, bounds and normalizes calls to a vendor-shaped commerce provider, which owns prices, stock and order acceptance."
- **Por qué:** cuatro piezas con responsabilidades separadas: `apps/storefront` (HTML, interacción, accesibilidad), `apps/middleware` (frontera de integración), `apps/mock-services` (proveedor ficticio), `packages/contracts` (DTO, validadores y cliente compartidos, sin React ni Express).
- **Alternativas:** una sola app Next (más simple, pero no ejercita la responsabilidad de middleware que pedía el rol, ADR 0001); microservicios por capacidad (coste operativo desproporcionado).
- **Dónde:** [ADR 0001](adr/0001-boundaries-and-scope.md).

---

## 2. Next.js y React

### ¿Por qué Next.js y no solo React (por ejemplo, Vite + React)?
- **Di:** "Because the problems here are server problems: the catalog must be in the initial HTML, work without JavaScript, return real 404s, keep provider addresses on the server and run cart writes with origin checks. Next's App Router gives me Server Components, Server Actions, routing, metadata and cookies in one framework; with plain React I would rebuild a server for all of that."
- **Por qué, problema a problema:**
  - **HTML inicial con contenido** (SEO, primer pintado, sin JS): Server Components renderizan catálogo y ficha en el servidor. Con una SPA, el usuario descarga JS, luego pide datos y luego pinta.
  - **Secretos y direcciones fuera del navegador:** `lib/commerce.ts` usa `server-only`; la URL del BFF nunca llega al bundle del cliente. En una SPA el navegador tendría que llamar al BFF directamente (CORS, exposición).
  - **404 reales:** `notFound()` devuelve HTTP 404 a una ficha inexistente; una SPA devuelve 200 y pinta "no encontrado".
  - **Mutaciones con mejora progresiva:** Server Actions con `<form action>` funcionan sin JavaScript y Next rechaza peticiones de otro origen (lo comprueba un E2E).
  - **Cookies en el servidor:** sesión del carrito y tema leídos al renderizar: el contador y el tema correctos desde el primer byte, sin parpadeo.
  - **Metadatos y fuentes:** títulos por página (`generateMetadata`) y `next/font` con precarga y respaldo ajustado (CLS 0).
- **Alternativas y coste:** Vite + React + Express propio da control total pero obliga a montar SSR, enrutado, hidratación y protección CSRF a mano. Remix/React Router v7 resolvería problemas parecidos con formularios nativos. Coste de Next: complejidad del modelo servidor/cliente, semántica de caché que hay que entender (aquí `force-dynamic` y `no-store` explícitos) y trampas como el streaming de `loading.tsx` (ver sección 9).
- **Dónde:** `apps/storefront/app/products/[id]/page.tsx`, `lib/commerce.ts`, `app/cart/actions.ts`, `tests/e2e/cart.spec.ts` (otro origen rechazado).

### ¿Qué aporta exactamente el App Router frente al Pages Router?
- **Di:** "Server Components by default, so data fetching and server-only code live in the component tree without shipping that code to the browser; nested layouts; Server Actions for writes; and per-route metadata."
- **Por qué:** en Pages Router los datos llegan por `getServerSideProps` y todo el componente se hidrata. Aquí solo son cliente los componentes que interactúan (filtros, editor de bolsa, selector de tema).
- **Dónde:** busca `'use client'`: solo `components/*` interactivos.

### ¿Qué se ejecuta en el servidor y qué en el cliente?
- **Di:** "Pages, data fetching, cookies and Server Actions run on the server. Client components are small leaves: catalog filters, the bag editor, the add-to-bag and order forms, the theme switch and Motion animations."
- **Por qué:** cuanto menos JavaScript de cliente, menos hidratación (TBT medido 75–94 ms) y menos superficie para errores. Cada componente de cliente tiene una razón: estado de transición, foco, animación.

### ¿Por qué React 19?
- **Di:** "Mainly for form actions and `useActionState`: the same Server Action powers a native form without JavaScript and an enhanced one with pending state and returned messages."
- **Por qué:** permite mostrar el error de stock en la ficha o "Bag updated." en la bolsa tanto con JS como sin él, sin duplicar lógica.
- **Dónde:** `components/add-to-bag.tsx`, `components/bag-editor.tsx`.

### ¿Por qué Server Actions y no Route Handlers (API routes) para el carrito?
- **Di:** "Server Actions give progressive enhancement and Next's built-in same-origin check. A route handler would need its own origin validation and a client fetch."
- **Alternativas:** Route Handler con comprobación manual de `Origin` (más explícito, más código propio, ADR 0005).
- **Límite:** Next aborta acciones de otro origen comparando `Origin` con el host; no lo damos por supuesto, lo prueba `a cross-origin form post is rejected and sets no cart cookie`.

### ¿Cómo gestionáis la caché de Next?
- **Di:** "Explicitly: pages that read the bag or live stock are dynamic, the client uses `no-store`, and bag-changing actions revalidate the layout. Private pages are never share-cached; an E2E checks the bag's Cache-Control."
- **Por qué:** en comercio un precio o stock cacheado es un bug de negocio. Para 12 productos la caché no aporta lo suficiente frente al riesgo; con más tráfico se cachearía el catálogo público con invalidación, nunca la bolsa.

---

## 3. Integración: Express BFF y contratos

### ¿Por qué un BFF en Express y no que Next llame al proveedor directamente?
- **Di:** "The BFF owns the integration boundary: it validates input, bounds every call with a timeout, maps vendor shapes to our DTOs, correlates requests with an ID and hides upstream errors. Pages depend on our contract, not the vendor's, so changing provider only touches the adapter."
- **Por qué:** el proveedor usa nombres de proveedor (`sku`, `display_name`, `cents`); el BFF los normaliza (`normalizeProduct`, `normalizeCart`, `normalizeOrder`). Si mañana cambia el proveedor, cambian el adaptador y su contrato, no las páginas.
- **Historia honesta:** el proyecto empezó con un SDK de integración externo; tú pediste explícitamente sustituirlo por una frontera Express propia y pública (ADR 0003). No lo presentes como experiencia con ese SDK.
- **Alternativas:** Route Handlers de Next como BFF (menos procesos, pero mezcla responsabilidades y no ejercita el rol de middleware); GraphQL (útil con muchos clientes y consultas variables; aquí hay un cliente y pocas operaciones); tRPC (acopla cliente y servidor TypeScript, sin contrato HTTP público).
- **Dónde:** `apps/middleware/src/*.ts`, [ADR 0003](adr/0003-express-bff.md).

### ¿Por qué Express 4 y no Express 5 o Fastify?
- **Di:** "Express 4.22.3 was already tested with matching type definitions; changing the major was not part of the migration. The important thing is the contract, not the framework."
- **Consecuencia que conviene conocer:** Express 4 no captura promesas rechazadas, así que cada ruta asíncrona tiene `try/catch → next(error)`. Express 5 lo haría automáticamente; Fastify daría validación por esquema y más rendimiento, a cambio de migrar.

### ¿Por qué validáis el JSON en tiempo de ejecución si ya usáis TypeScript?
- **Di:** "TypeScript types disappear at runtime; network data is untrusted. Guards in `@atelier/contracts` validate shapes, integer cents, unique IDs and that totals match their lines, and the client checks that the HTTP status agrees with the body."
- **Alternativas:** Zod o Valibot (más expresivos, generan tipos); se usaron guards propios para no añadir dependencias en un contrato pequeño. En un proyecto mayor elegiría Zod por mantenibilidad.
- **Dónde:** `packages/contracts/src/index.ts` (`isProduct`, `isCart`, `isOrder`), `tests/commerce-client.test.ts`.

### ¿Por qué precios en céntimos enteros?
- **Di:** "Floating point cannot represent money exactly: 0.1 + 0.2 is not 0.3. Integers in minor units, formatted only at the edge, avoid rounding bugs."
- **Dónde:** `Money.amountMinor`, `formatPrice` en `lib/catalog.ts`.

### ¿Qué pasa si el proveedor es lento o falla?
- **Di:** "Each call has a fresh timeout (provider 1.5 s, client 2.5 s). Failures become safe statuses — 400, 404, 409, 502, 504 — with a request ID and no upstream bodies or stacks. Commerce failures show a retry; editorial failures fall back to local text."
- **Dónde:** `tests/product-integration.test.ts` (`bounds a stalled provider request`, `normalizes upstream 503 and hides the upstream body`).

### ¿Por qué no reintentáis automáticamente?
- **Di:** "A timed-out write may already have been applied; retrying blindly can duplicate it. Writes are sent once, and the order retry is made safe by the idempotency key."
- **Dónde:** `reports a slow order write as a timeout without retrying it` (una sola llamada al proveedor).

### ¿Por qué OpenAPI?
- **Di:** "Two documents: the public BFF contract and the vendor contract. They are validated in tests with a standards-aware parser, so the documented API cannot silently drift into invalid OpenAPI."
- **Dónde:** `packages/contracts/*openapi.json`, `tests/contract.test.ts`.

---

## 4. Estado y datos

### ¿Por qué los filtros están en la URL y no en estado de React, Redux o Zustand?
- **Di:** "Filters are shareable, reload-safe navigation state; the URL already is that state. Controls are derived from it, so there is a single source of truth, and the native GET form works without JavaScript."
- **Alternativas:** estado React sincronizado con efectos (dos fuentes de verdad, bugs de sincronización); una librería de estado (dependencia sin necesidad demostrada).

### ¿Por qué no hay librería de estado global?
- **Di:** "There is no shared client state to manage: server state lives on the server and is rendered, navigation state lives in the URL, and form state is local to each form."
- **Cuándo la añadiría:** estado de cliente complejo compartido entre partes lejanas (por ejemplo, un configurador). Para datos de servidor en cliente, antes TanStack Query que Redux.

### ¿Dónde vive el carrito y por qué?
- **Di:** "In the commerce provider. Next only stores the random cart ID in an HttpOnly, SameSite=Lax cookie. Commerce calculates totals; the browser never sends prices."
- **Alternativas:** carrito en `localStorage` (el servidor no lo ve, el precio puede manipularse, no hay HTML correcto en el servidor); carrito completo en una cookie firmada (sin estado en servidor, pero necesita secreto de firma y saca el carrito de comercio).
- **Límite:** en memoria, se pierde al reiniciar; poseer el ID es la propiedad del carrito. Con cuentas reales habría autenticación y persistencia.
- **Dónde:** [ADR 0005](adr/0005-guest-cart-session.md).

### ¿Por qué "fijar cantidad" en la bolsa y "sumar" al añadir?
- **Di:** "Setting a quantity is idempotent, so double submissions are harmless and controls can stay enabled; adding from the detail page increments because that matches user intent."

---

## 5. Pedidos, concurrencia e idempotencia

### ¿Cómo evitáis vender dos veces la última unidad?
- **Di:** "In the provider, the stock check, decrement, order creation and idempotency record run synchronously with no `await` in between. Node runs that handler to completion, so two confirmations cannot interleave."
- **Cómo lo demuestras:** test de dos pedidos simultáneos por la última unidad; además una prueba de mutación (introducir un `await` entre comprobación y descuento) hizo fallar ambos tests de concurrencia.
- **Límite clave:** solo vale para un proceso. Con varias instancias: transacción en base de datos con decremento condicional (`UPDATE … WHERE stock >= qty`) y restricción única sobre la clave de idempotencia.

### ¿Qué es la idempotencia aquí y por qué importa?
- **Di:** "Same key and same body returns the same order; same key with another body is a 409 conflict. The bag renders a key and keeps it across failed attempts, so a retry after a timeout cannot create a second order."
- **Dónde:** [ADR 0006](adr/0006-order-acceptance-idempotency.md), `order-integration.test.ts`, E2E `a double submission with the same idempotency key creates one order`.

### ¿Por qué no hay base de datos?
- **Di:** "No demonstrated need for a learning demo with fixtures; in-memory state with bounded maps and documented resets keeps startup trivial. The trade-off is explicit: production needs durable transactions."

---

## 6. UI, estilos y experiencia

### ¿Por qué Tailwind?
- **Di:** "Design tokens as CSS variables — paper, ink, muted, control, accent — with utilities that compile to static CSS. It works with Server Components without a runtime, and themes are just token overrides."
- **Alternativas:** CSS-in-JS en tiempo de ejecución (problemas con Server Components y coste en cliente); CSS Modules (válido, pero sin sistema de tokens compartido tan directo).

### ¿Cómo funcionan los temas claro y oscuro sin parpadeo?
- **Di:** "Auto follows `prefers-color-scheme`. An explicit choice is an HttpOnly cookie read by the server, which renders `data-theme` on `<html>`, so the first paint is already correct and the switch works without JavaScript."
- **Alternativa descartada:** `localStorage` (el servidor no lo ve: script bloqueante en `<head>` o parpadeo).
- **Verificación:** un test unitario comprueba el contraste WCAG de cada par de colores en ambos temas.

### ¿Por qué Motion y no solo CSS? ¿Y por qué no GSAP?
- **Di:** "CSS handles everything that does not need JavaScript: entrances, the seconds hand, hover. Motion is only used where CSS falls short: animating exits and layout reordering. GSAP is powerful for timelines, but imperative and heavier for this."
- **Regla:** nada oculto esperando a JavaScript (`initial={false}`), y `prefers-reduced-motion` desactiva todo lo decorativo.
- **Lección:** cargar las funciones de Motion de forma diferida provocaba que las tarjetas salientes se quedaran en pantalla (1 de 120 ejecuciones); cargarlas síncronas lo resolvió (0 de 480). Coste medido, ver [PERFORMANCE](PERFORMANCE.md).

### ¿Por qué ilustraciones SVG y no fotos?
- **Di:** "Real watch photos carry brand logos, which would misrepresent a fictional brand, and mixed stock photos break visual consistency. Deterministic SVGs are brand-free, consistent across twelve models, theme-friendly and cheap after gzip."

### ¿Por qué una fuente autoalojada?
- **Di:** "Cormorant Garamond via `next/font/local`: no third-party request, preloaded, with a metric-adjusted fallback, so text does not shift (CLS 0)."

---

## 7. Accesibilidad

### ¿Cómo os habéis asegurado de que es accesible?
- **Di:** "Progressive enhancement first — every journey works without JavaScript. Then keyboard and focus management, announced status messages, contrast enforced by a unit test, and axe auditing every page and state in both themes in CI. A manual screen-reader pass is still pending, and I say so."
- **Ejemplos concretos:**
  - Los controles de la bolsa no se deshabilitan durante el envío: un E2E mostró que deshabilitar el botón enfocado manda el foco a `<body>`.
  - axe encontró `label-content-name-mismatch` (WCAG 2.5.3): se resolvió con tarjetas de "enlace extendido" y un nombre del enlace de la bolsa que incluye el número visible.
  - Bordes de controles con contraste 3:1 (WCAG 1.4.11) y botones de 24 px (2.5.8).
- **Dónde:** `tests/e2e/a11y.spec.ts`, `journey.spec.ts`, [A11Y_MANUAL_CHECK](A11Y_MANUAL_CHECK.md).

### ¿Por qué esperar a que termine la animación antes de auditar con axe?
- **Di:** "Mid-animation opacity made axe report false low contrast. WCAG contrast applies to stable content, so the audit waits for finite animations and the title."

---

## 8. Calidad, pruebas y herramientas

### ¿Cuál es tu estrategia de pruebas?
- **Di:** "Unit tests for pure logic and guards; integration tests that start real HTTP servers — typed client to Express to provider — instead of mocking fetch; and Playwright E2E against the production build for full journeys, no-JavaScript paths, accessibility and motion."
- **Por qué no mocks en integración:** los fallos de integración (estados HTTP, cuerpos, timeouts) solo aparecen con HTTP real. El proveedor controlable para fallos solo existe en `tests/support`, nunca en la app.
- **Cómo sé que los tests valen:** pruebas de mutación puntuales (carrera de stock, contraste, política de auditoría) y pruebas de estrés para detectar tests inestables.

### ¿Por qué Vitest y Playwright?
- **Di:** "Vitest is fast, ESM-native and TypeScript-friendly for unit and integration tests. Playwright drives real browsers with network control, JavaScript-disabled contexts, reduced-motion emulation and axe integration."

### ¿Por qué oxlint y no ESLint?
- **Di:** "`eslint-config-next` pulls typescript-eslint, whose peer range excluded the pinned TypeScript 7; npm would only install it by overriding the peer, which hides a real incompatibility. oxlint parses TypeScript natively, and `oxlint-tsgolint` adds type-aware rules on typescript-go."
- **Lección:** el lint con tipos falló en CI porque CI lintaba antes de compilar los contratos compartidos; se reprodujo desde un clon limpio y se arregló compilándolos primero.

### ¿Por qué TypeScript estricto y guards en lugar de `as`?
- **Di:** "Casts tell the compiler to trust you; guards make it check. Type-aware lint flagged 59 places; they were replaced by narrowing guards like `isIntegerInRange`, with no behaviour change."

### ¿Cómo gestionáis dependencias y seguridad de la cadena de suministro?
- **Di:** "Exact versions, a committed lockfile and `npm ci`; no `--force`. CI runs an audit gate: any high or critical production advisory fails; a dev-only one needs a dated accepted-risk entry; if npm audit cannot run, the gate fails rather than passing."
- **Ejemplo:** picomatch (ReDoS) solo en herramientas de test, sin versión corregida publicada; aceptado con fecha de revisión.
- **Dónde:** `scripts/audit-policy.mjs`, `docs/security/accepted-risks.json`.

### ¿Por qué un monorepo con npm workspaces?
- **Di:** "Four packages share one contract; workspaces give one lockfile and local linking without extra tooling. Turborepo or pnpm would add caching and stricter isolation, but the build is small enough not to need them yet."

### ¿Qué hace el CI?
- **Di:** "Structural checks, the dependency audit, type-aware lint, typecheck, unit and integration tests, a production build and Playwright E2E with the managed Chromium."

---

## 9. Rendimiento

### ¿Cómo has medido el rendimiento?
- **Di:** "Lighthouse 13.6 on the production build, mobile preset with simulated throttling, median of five runs: scores 99–100, LCP 0.62–0.76 s, CLS 0. But that is lab data on loopback, not field data."
- **Matiz que impresiona si lo cuentas tú:** el LCP es optimista en tres rutas porque los titulares aparecen con una animación desde opacidad 0 y Chrome no cuenta elementos invisibles; el LCP medido es el logotipo de la cabecera.
- **Dónde:** [PERFORMANCE](PERFORMANCE.md).

### ¿Qué decisiones ayudan al rendimiento?
- **Di:** "Server rendering, small client components, a self-hosted preloaded font with an adjusted fallback, CSS-first motion, and loading Motion only on the two pages that need it."

### ¿Por qué no hay un `loading.tsx`?
- **Di:** "A shared loading boundary made Next stream the response early: unknown products returned 200 instead of 404, and content was hidden without JavaScript. Pending feedback lives in the filter transition instead, and both behaviours are protected by E2E tests."

---

## 10. Seguridad

### ¿Qué medidas de seguridad hay?
- **Di:** "Server-only configuration; user input never chooses upstream URLs; strict input validation with bounded bodies; prices never come from the browser; HttpOnly SameSite cookies; Server Actions reject cross-origin posts; services listen on loopback; safe error envelopes without stacks."

### ¿Ocultar un botón protege una operación?
- **Di:** "No. Every input is re-validated on the server and commerce re-checks stock and prices; the UI only improves the experience."

---

## 11. Producción y escalado

### ¿Qué cambiarías para llevarlo a producción?
- **Di:** "Durable storage with transactions and a unique idempotency key; sessions and accounts; a real payment provider with webhooks; caching of the public catalog with invalidation; observability — structured logs, traces and metrics — on top of the request IDs; rate limiting; and field performance monitoring."

### ¿Cómo escalaría con varias instancias?
- **Di:** "The in-memory critical section stops being valid. Stock and orders move to a database transaction, carts to a shared store, and the BFF stays stateless, so it scales horizontally."

---

## 12. Problemas difíciles que resolviste (formato STAR)

Prepara dos o tres en este formato: **situación → tarea → acción → resultado → lección**.

1. **Tarjetas fantasma tras filtrar:** un test de estrés falló 1 de 120 veces; la causa era la carga diferida de las funciones de Motion; se cargaron de forma síncrona; 0 de 480. Lección: los tests intermitentes son bugs hasta que se demuestre lo contrario.
2. **404 convertidos en 200:** un `loading.tsx` adelantaba la respuesta. Se retiró y se movió el indicador a la transición de filtros, con E2E que protege ambos comportamientos.
3. **Foco perdido al deshabilitar botones:** lo detectó un E2E; la idempotencia permitió no deshabilitar.
4. **Lint que pasaba en local y fallaba en CI:** diferencias de estado (`dist/` local); se reprodujo desde un clon limpio. Lección: verificar la cadena de herramientas desde cero.
5. **Medidas corregidas:** el coste de Motion y el LCP se midieron mal al principio; se corrigieron y se documentaron. Lección: medir dos veces antes de afirmar.

---

## 13. Uso de IA

### ¿Cómo has usado la IA?
- **Di:** "As a pair programmer for drafts and refactors. I accepted changes only when tests, mutation checks, axe and a clean-clone CI run confirmed them, and I corrected claims that measurement disproved. I also made changes myself without AI to make sure I understand the code."
- **Por qué:** es una pregunta cada vez más habitual; la respuesta honesta y con método es mejor que negarla. Ten preparado el ejercicio que hayas hecho de [EXERCISES](EXERCISES.md).

---

## Preguntas trampa frecuentes

| Pregunta | Idea clave |
| --- | --- |
| "Next es excesivo para 12 productos, ¿no?" | Sí lo sería si solo hubiera que pintar. Aquí hay que resolver SSR, 404 reales, secretos en servidor, mutaciones seguras sin JS y temas sin parpadeo: es lo que Next resuelve. |
| "¿Por qué no GraphQL?" | Un cliente, pocas operaciones y un contrato HTTP público; GraphQL compensa con muchos clientes y consultas variables. |
| "¿Tus tests prueban la carrera de verdad?" | Sí: la prueba de mutación lo demuestra. Pero solo para un proceso; con varios necesitarías una transacción. |
| "¿Por qué no Zod?" | Para no añadir dependencias en un contrato pequeño; en un equipo grande lo elegiría por mantenibilidad. |
| "¿Qué no está probado?" | Lector de pantalla real, dispositivos reales, rendimiento de campo, concurrencia entre procesos, SonarQube y Snyk. |
