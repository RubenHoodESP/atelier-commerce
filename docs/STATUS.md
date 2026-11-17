# Current state

- **M0–M2 implemented; M3 in progress (slices 1–3 of 4: guest bag, editing and simulated orders).** The storefront now has 12 fictional watches across Horizon, Meridian and Nocturne, an editorial home, SSR catalog and detail pages, out-of-stock display and a real unknown-product 404. The M1 watch-001 fixture is unchanged.
- `/products` uses collection/sort URL state. Automatic filter navigation, canonical URLs, reload/history and detail return preserve selection. Native GET works without JavaScript. Pending transitions announce activity, disable controls and restore keyboard focus. There is deliberately no shared route loading boundary: streaming it caused 200 responses for missing details and hidden content without JavaScript; regression tests now protect both behaviors.
- Express adds GET /api/products and GET /api/content/brand. One provider list call handles filtering/sorting with deterministic ID ties. Runtime validation rejects malformed lists, duplicate IDs and count disagreement. All public JSON is normalized; provider-specific fields remain behind the BFF. Existing safe errors, no-store, correlation IDs, per-request timeouts and no automatic retries remain.
- Editorial content is a separate HTTP module inside the existing fictional provider process. Next loads independent catalog/content reads concurrently; editorial failure logs a safe warning and uses local text while retaining real products. Commerce failure shows error/retry, never fabricated products. This is a local simulation, not a CMS integration or operational service isolation.
- Tailwind 4.3.5, @tailwindcss/postcss 4.3.5 and PostCSS 8.5.33 are pinned with an npm-generated lockfile. Shared theme tokens and SVG illustrations preserve the Atelier visual direction. No new state library, database, remote account or secret is needed.

## Polish slice: motion (between M3 slices 3 and 4)

- CSS motion (works without JavaScript): staggered entrance on home, catalog, detail and confirmation; a 60 s seconds-hand sweep on the watch illustration (detail always, catalog cards on hover/focus only); illustration lift on card hover/focus. Shared tokens `--ease-atelier`, `--duration-reveal`, `--duration-hover`.
- Motion 14.9.0 (MIT, pinned in `@atelier/storefront`, clean `npm install`, no peer warnings; React 19.3.1 deduped) only in `CatalogGrid` (cards glide on filter/sort) and `BagEditor` (removed lines fold away, subtotal crossfades), through `MotionScope` (`LazyMotion` lazy features + `strict`, `MotionConfig reducedMotion="user"`). `AnimatePresence initial={false}` keeps server HTML visible. Rules and alternatives: [ADR 0007](adr/0007-motion.md).
- `prefers-reduced-motion` disables entrance, sweep and lift; Playwright defaults to `reducedMotion: 'reduce'`; `tests/e2e/motion.spec.ts` (5 tests) opts in to verify sweep/hover/entrance, filtering during animation, no `opacity: 0` in server HTML and visible no-JS entrance.
- Checks (2026-11-17): `npm run check`, `npm run lint`, `npm run typecheck`, `npm run build` passed; `npm test` 85 passed; E2E **27 passed** with reduced motion and **27 passed** with motion enabled (ignored local config) using preinstalled Chromium 153.0.8010.12.
- Measured gzip JS referenced by each route's HTML (production): `/` 174.3 → 174.3 KB, `/products/watch-001` 174.7 → 174.7 KB, `/products` 175.1 → 193.6 KB (+18.5), `/cart` 175.5 → 193.1 KB (+17.6). No runtime performance or Core Web Vitals measurement was made.

## M3 slice 3: simulated order acceptance with idempotency

- `/cart` has a Place order form carrying a hidden `randomUUID` idempotency key. The `placeOrder` Server Action sends `{cartId}` and `Idempotency-Key` to BFF `POST /api/orders`; the BFF reads the commerce cart and sends only IDs/quantities to provider `POST /orders`. 201 creates, 200 replays the same key and body. On failure the action returns the same key and does not revalidate, so a retry after a timeout replays instead of duplicating; editing the bag remounts the form with a new key. Success clears the cart cookie and redirects to server-rendered `/orders/[id]` (real 404 for unknown IDs).
- The provider runs idempotency lookup, re-pricing, the all-or-nothing stock check, decrement, order creation and key recording synchronously (no await). Inventory is now per provider instance and visible in catalog/detail after orders. Same key with a different body → 409 IDEMPOTENCY_CONFLICT; a recorded key whose order was evicted is also a conflict. New public errors: ORDER_NOT_FOUND 404, CART_EMPTY 409, IDEMPOTENCY_CONFLICT 409. See [ADR 0006](adr/0006-order-acceptance-idempotency.md).
- The E2E harness (`tests/support` only) now creates a fresh provider instance on every `/state` call so inventory never leaks between tests.
- Checks on Node 22.23.5 / npm 10.9.9 (2026-11-17): `npm run check`, `npm run lint`, `npm run typecheck`, `npm run build` passed; `npm test` **85 passed in 7 files** (73 + 12 order); E2E **22 passed** (17 + 5 order) with preinstalled Chromium 153.0.8010.12 via ignored local config. Mutation check: injecting an `await` between stock check and decrement made both concurrency tests fail (two sales of the last unit; three orders for one key); restored code passes. Order confirmation screenshot inspected.
- Limits: single-process guarantee only; state resets on restart; the order URL ID is the only access control (fictional, no personal data); no warning when prices change between viewing the bag and ordering.

## M3 slice 2: change quantity and remove lines

- `/cart` lines have a quantity field (1–20) with Update and Remove submit buttons in one native form. Works without JavaScript; with JavaScript the Server Action returns a message and revalidates `/cart` without a full reload. One status region stays mounted; after a removal (including the last line) focus moves to it. Controls are not disabled while pending because an E2E test showed that disabling the focused button drops focus to `<body>`; set semantics make repeated submissions harmless.
- BFF `PUT /api/carts/:id/items/:productId` accepts exactly `{quantity}` (0–20, 0 removes). Idempotent set semantics. Commerce checks stock only when the quantity increases (409 OUT_OF_STOCK), always allows decreases/removal, and returns 404 CART_LINE_NOT_FOUND for a line not in the cart. Both OpenAPI files document the operation. See [ADR 0005](adr/0005-guest-cart-session.md#corte-2-editar-y-eliminar-líneas).
- Checks on Node 22.23.5 / npm 10.9.9 (2026-11-17): `npm run check`, `npm run lint`, `npm run typecheck`, `npm run build` passed; `npm test` **73 passed in 6 files** (63 + 10 set-quantity); E2E **17 passed** (15 + 2: edit/remove with focus and stock rejection; native no-JS edit/remove) with the same preinstalled Chromium 153.0.8010.12 via ignored local config. 360 px bag screenshot inspected (no horizontal scroll).

## M3 slice 1: guest bag (add to bag, view bag)

- Product detail has an Add to bag Server Action form (absent when out of stock). It works without JavaScript; with JavaScript the button is disabled and status announced while pending. Success redirects to `/cart` (303); stock/limit failures render a message on the detail page.
- Commerce owns the cart: the fictional provider keeps bounded in-memory carts (1000, oldest evicted), issues a random cart ID, checks current stock without reserving it and calculates line totals, units and subtotal. The BFF adds `POST /api/carts`, `GET /api/carts/:id` and `POST /api/carts/:id/items`, accepts exactly `{productId, quantity}` (1 KB JSON), rejects price/total fields, maps vendor errors to CART_NOT_FOUND 404, OUT_OF_STOCK 409 and CART_LIMIT_EXCEEDED 409, and rejects inconsistent provider totals (502). Writes are never retried.
- Next stores only the cart ID in the `atelier_cart` cookie (HttpOnly, SameSite=Lax, Secure in production). `/cart` is server-rendered per request, shows empty/error/lines states and is not share-cached. Decisions and rejected alternatives: [ADR 0005](adr/0005-guest-cart-session.md).
- Checks on Node 22.23.5 / npm 10.9.9 (2026-11-17): `npm run check`, `npm run lint`, `npm run typecheck`, `npm test` (**63 passed in 6 files**: 47 previous + 16 cart), `npm run build` passed. `npx playwright test --config=.local/playwright.cloud.config.ts --trace off`: **15 E2E passed** (9 previous + 6 cart) with preinstalled Chromium for Testing 153.0.8010.12 via an ignored local config; the Playwright-managed browser in CI was not exercised locally. Bag and 360 px detail screenshots were inspected (no horizontal scroll).
- Limits: carts reset on provider restart; the Secure cookie over `http://127.0.0.1` was verified only in Chromium. No header count, orders, order idempotency or concurrent stock yet (editing added in slice 2). The provider OpenAPI file was re-serialized with standard 2-space JSON formatting while adding cart operations.

## Pre-M3 quality slice: lint, CI step and Claude Code settings

- Added `npm run lint` (oxlint 1.91.0, `.oxlintrc.json`, warnings fail). ESLint + `eslint-config-next` was not adopted: its typescript-eslint 8.73.0 peer range excludes the pinned TypeScript 7.0.2 and npm would only install it by overriding the peer. Details and every disabled rule are in [QUALITY](QUALITY.md#lint-decisions).
- Behavior-preserving fixes found by lint: one conditional `expect`, one untyped `vi.fn`, two shadowed names in scripts and a documented false positive in `scripts/run-stack.mjs`. No application code changed.
- `.github/workflows/m1.yml` runs `npm run lint` after `npm run check`. Both workflows already ran on every `pull_request`; triggers were not changed.
- `.claude/settings.json` adds a PostToolUse lint-on-edit hook plus allow/deny permission rules ([QUALITY](QUALITY.md#claude-code-project-settings)).
- Checks on Node 22.23.5 / npm 10.9.9 (2026-11-17): `npm ci`, `npm run check`, `npm run lint`, `npm run typecheck`, `npm test` (**47 passed in 5 files**) and `npm run build` passed. A probe component confirmed lint reports rules-of-hooks, exhaustive-deps, set-state-in-effect and no-img-element. The hook was pipe-tested (clean file exit 0, violation exit 2, Markdown skipped) and fired on a real Write in a Claude session. `npm start` smoke: `/products` 200, `/products/watch-999` 404. **E2E was not run** for this slice (no application code changed); CI for this branch is unverified.
- Not added: type-aware lint, formatter, SonarQube/Snyk or audits; those remain M4.

## M2 validation in the cloud machine

Node **22.23.5**, npm **10.9.9**:

- `npm ci --no-audit --no-fund`: clean lockfile installation succeeded.
- `npm run check` and `npm run typecheck`: passed.
- `npm test`: **47 tests passed in 5 files**, including all 19 M1 tests and catalog, URL, content and client-response cases.
- `npm run build`: passed; the final storefront build also passed after the streaming/focus corrections. No provider is required during compilation.
- `npx --no-install playwright test --config=.local/playwright.cloud.config.ts`: **9 E2E tests passed**, using system Chromium **156.0.8078.79** against production Next, the real BFF and a controllable test-only HTTP provider. Covers SSR, filter/sort/history/return, 360 px layout and keyboard, empty/retry/editorial failure, pending feedback/focus, native GET without JavaScript and both M1 E2E cases.
- Catalog and mobile screenshots were inspected. These checks are not full accessibility, security or performance audits.

The ignored cloud browser config uses `/usr/bin/chromium`; the exact Playwright-managed Chromium was not tested in this M2 run. Standard CI still installs the managed browser. These are local M2 results; no new M2 CI success or environment publication is claimed. See the publication record below for verified GitHub state.

## Historical evidence and limits

M1 CI passed 19 Vitest and 2 Chromium E2E tests: https://github.com/RubenHoodESP/atelier-commerce/actions/runs/44077314459. This is historical M1 evidence, not a CI result for the current M2 changes.

Guest bag, editing and simulated orders with idempotency (slices 1–3) are implemented; slice 4 (header count and full-journey accessibility review) remains **M3**. Basic syntactic lint exists; SonarQube, Snyk, type-aware lint and measured accessibility/performance audits remain **M4**. There are no real payments, accounts, persistent orders or enterprise providers. Project-local skills remain versioned in Git.

## Publication and handoff

M2 and the Claude handoff were published to GitHub `master` in [2b0eddd9be97abc4e950d326c378adfea7ed229c](https://github.com/RubenHoodESP/atelier-commerce/commit/2b0eddd9be97abc4e950d326c378adfea7ed229c). The push succeeded and `git ls-remote origin refs/heads/master` matched that exact commit on 2026-11-17. A following documentation-only commit records this evidence. GitHub Actions API access returned `Forbidden`; M2 remote CI status is unverified, not passed. The cloud environment was not modified or published. Claude starts at [CLAUDE.md](../CLAUDE.md) and the [handoff](CLAUDE_HANDOFF.md).

## Next action

M3 slice 4: header bag count (without making static pages dynamic unnecessarily), keyboard and screen-reader review of the full catalog → detail → bag → order journey, and M3 closure evidence (PLAN acceptance criteria checked one by one). Then M4 (type-aware lint, dependency audit including the vite/vitest picomatch advisory, scanners and measured audits).
