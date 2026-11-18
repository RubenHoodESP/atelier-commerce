# Current state

- **M0–M4 implemented** with documented exceptions (SonarQube/Snyk not run; the learner's screen-reader pass pending). M5 (interview rehearsal) is next. M3 delivered the guest bag, editing, simulated orders with idempotency and the slice-4 header count and accessibility review. M4 (quality and risk tooling) and M5 (interview rehearsal) are next. The storefront now has 12 fictional watches across Horizon, Meridian and Nocturne, an editorial home, SSR catalog and detail pages, out-of-stock display and a real unknown-product 404. The M1 watch-001 fixture is unchanged.
- `/products` uses collection/sort URL state. Automatic filter navigation, canonical URLs, reload/history and detail return preserve selection. Native GET works without JavaScript. Pending transitions announce activity, disable controls and restore keyboard focus. There is deliberately no shared route loading boundary: streaming it caused 200 responses for missing details and hidden content without JavaScript; regression tests now protect both behaviors.
- Express adds GET /api/products and GET /api/content/brand. One provider list call handles filtering/sorting with deterministic ID ties. Runtime validation rejects malformed lists, duplicate IDs and count disagreement. All public JSON is normalized; provider-specific fields remain behind the BFF. Existing safe errors, no-store, correlation IDs, per-request timeouts and no automatic retries remain.
- Editorial content is a separate HTTP module inside the existing fictional provider process. Next loads independent catalog/content reads concurrently; editorial failure logs a safe warning and uses local text while retaining real products. Commerce failure shows error/retry, never fabricated products. This is a local simulation, not a CMS integration or operational service isolation.
- Tailwind 4.3.5, @tailwindcss/postcss 4.3.5 and PostCSS 8.5.33 are pinned with an npm-generated lockfile. Shared theme tokens and SVG illustrations preserve the Atelier visual direction. No new state library, database, remote account or secret is needed.

## M4 slice 5: measured performance and M4 closure

- `npm run perf` (`scripts/measure-performance.mjs`) runs pinned `lighthouse@13.6.0` through `npx` (not a repository dependency) on the production build and prints medians. Results, conditions and limits: [PERFORMANCE](PERFORMANCE.md). On 2026-11-18, median of 5 mobile runs with simulated throttling on loopback: score 99–100, LCP 0.62–0.76 s, TBT 75–94 ms, CLS 0 on `/`, `/products`, `/products/watch-001`, `/cart`.
- Correction found while verifying: on three routes the LCP element is the header wordmark, because entrance-animated headings start at opacity 0 and are not LCP candidates; their LCP is therefore optimistic (documented). Lab data only; no field data.
- CI verified for #11: both workflows succeeded on the PR (run 44289810544) and the merge (run 44290164195), including the first CI `npm run audit`.

### M4 acceptance against PLAN

| Item | Status | Evidence |
| --- | --- | --- |
| Complete CI | Executed | `m1.yml`: check, dependency audit, type-aware lint, typecheck, tests, build, Playwright E2E (managed Chromium); green on #5–#11 and their merges |
| Lint | Executed | oxlint syntactic + type-aware (`oxlint-tsgolint`), warnings fail; edit hook |
| Accessibility audit | Executed (automated) | axe WCAG 2.0/2.1/2.2 A/AA on every journey page/state in both themes, 0 violations; theme contrast unit test |
| Accessibility, manual | **Not run** | Screen-reader pass for the learner: [A11Y_MANUAL_CHECK](A11Y_MANUAL_CHECK.md) |
| Dependency scan | Executed | `npm audit` gate: production 0 vulnerabilities; one dev advisory accepted until 2026-12-18 |
| Performance | Executed (lab) | Lighthouse medians in [PERFORMANCE](PERFORMANCE.md); no field data |
| SonarQube | **Not run** | Requires an account/token; not provided |
| Snyk | **Not run** | Requires an account/token; not provided |
| Slow provider → timeout, safe correlated errors, no write retries | Executed | Unit/integration tests from M1–M3 (see M3 table) |

## M4 slice 4: dependency audit policy

- `npm run audit` gates CI: production high/critical advisories always fail; dev-only high/critical advisories need a dated entry in [accepted-risks.json](security/accepted-risks.json) and fail once `reviewBy` passes; moderate/low and stale entries are notes. No report (no registry) = failure. Policy logic in `scripts/audit-policy.mjs` with 6 unit tests.
- Results on 2026-11-18: `npm audit --omit=dev` **0 vulnerabilities**. Full audit: one advisory, GHSA-fc5q-39xc-vjpf (picomatch ReDoS, high), reached only through vite 8.3.8 / vitest 5.1.0 (also tinyglobby, fdir). The latest picomatch (4.0.7) is affected and vite/vitest require `^4.0.7`, so no fixed release exists; npm's suggested fix is a major downgrade of vitest/vite. Accepted for dev tooling until 2026-12-18 with that reasoning.
- Slice 3 follow-up merged in #10: `npm run lint` builds `@atelier/contracts` first because CI lints before typecheck/build and missing declarations produced 9 false type-aware findings; verified from a clean clone.
- Checks (2026-11-18): `npm run check`, `audit`, `lint`, `typecheck`, `build` passed; `npm test` **110 passed in 9 files**; offline simulation of the audit fails as intended.

## M4 slice 3: type-aware lint

- `oxlint-tsgolint` 7.0.2005 (dev, pinned; the only version satisfying oxlint 1.91.0's `>=7.0.2005` peer that is over two weeks old) adds type-aware rules to `npm run lint` (`oxlint --type-aware --deny-warnings`, about 1 s for the monorepo), CI and the Claude edit hook. It works with the pinned TypeScript 7.0.2.
- First run: 59 findings, none a live bug. In code: unsafe `as` casts after validation in contract guards, provider and BFF (`Number.isSafeInteger` does not narrow `unknown`), redundant `=== false`, `await` on the synchronous `createMiddlewareServer`, Server Actions ending in `redirect()` without `return`. In tests: redundant assertions, `sort()` without comparator, `String()` on a URL. Fixed without behaviour change: new narrowing guards `isIntegerInRange`, `isCollection`, `isSort` in contracts replace every cast; a `satisfies` tuple types the fixtures; the provider order body uses a type-predicate `every`. Now 0 findings.
- A probe file with five defects (floating promise, unsafe cast, template with an object, base `toString`, boolean literal compare) gave 0 findings with syntactic lint and 5 with type-aware lint.
- Checks (2026-11-17): `npm run check`, `lint`, `typecheck`, `build` passed; `npm test` 104 passed; E2E 44 passed with reduced motion and 44 with motion.

## M4 slice 2: automated accessibility audit

- `@axe-core/playwright` 4.14.0 (dev, pinned; axe-core 4.14.1) runs WCAG 2.0/2.1/2.2 A and AA rules in `tests/e2e/a11y.spec.ts` on home, catalog (filtered, empty, error), detail (available, out of stock, unknown), empty bag, bag with a line and with an error message, and order confirmation, in light and dark themes. The audit waits for the settled page (finite animations finished, title written): auditing mid-entrance reported false low contrast.
- First run found one rule, `label-content-name-mismatch` (serious, WCAG 2.5.3): catalog cards were named "View <watch>" while showing more text, and the bag link "Bag, N items" while showing "Bag N" (introduced in M3 slice 4). Fixed with stretched-link cards (the link wraps the name with a visually hidden "View", its `::after` covers the card; the focus ring outlines the whole card) and a bag link whose name includes the visible number ("Bag 2 items"). Now 0 violations on every audited page in both themes.
- Manual screen-reader pass is **not done**: checklist for the learner in [A11Y_MANUAL_CHECK](A11Y_MANUAL_CHECK.md).
- Checks (2026-11-17): `npm run check`, `lint`, `typecheck`, `build` passed; `npm test` 104 passed; E2E **44 passed** with reduced motion and **44** with motion; axe spec ×5 with motion 30/30.

## Watch illustration redesign (with M4)

- `WatchIllustration` redrawn as a brand-free, gradient-only SVG (no filters): metallic case, bezel and lugs, fluted crown, sunburst dial, 60-tick minute track, dauphine hands in the 10:10 product pose, glass reflection, soft contact shadow, stitched straps. Collection sets the palette (Horizon gold/cream, Meridian steel/silver, Nocturne gunmetal/navy); the model number deterministically varies markers (batons, Roman numerals, dots), date window (which replaces the 3 o'clock marker) and strap colour. The seconds hand keeps its sweep and now rests near 8 o'clock so it hides neither hands nor wordmarks. Free stock photography was considered and rejected: brand logos on real watches would misrepresent the fictional Atelier brand and mixed photo sets break visual consistency.
- Cost: `/products` HTML 4.4 → 8.0 KB gzip (12 inline watches), `/products/watch-001` 3.9 → 5.9 KB gzip; JavaScript unchanged.
- Checks (2026-11-17): `npm run check`, `lint`, `typecheck`, `build` passed; `npm test` 104 passed; E2E 37 passed with reduced motion and 37 with motion. Catalog and detail screenshots inspected in both themes.

## M4 slice 1: light and dark themes

- Auto follows `prefers-color-scheme`; a header switch (Auto/Light/Dark) stores an explicit choice in the HttpOnly `atelier_theme` cookie and the server renders `data-theme` on `<html>` (no flash, works without JavaScript; with JavaScript the theme previews instantly). Warm dark palette on the same tokens; hard-coded white and gold replaced by `paper` and `--color-accent`; `color-scheme` for native controls. See [ADR 0009](adr/0009-colour-themes.md).
- `tests/theme-contrast.test.ts` (19) enforces WCAG contrast for both palettes from `globals.css` and that both dark blocks match; a mutation made it fail. Dark palette: ink/paper 14.70, muted/paper 7.13, muted/panel 6.35, button 14.70, focus 7.79, control 4.54/4.04.
- `tests/e2e/theme.spec.ts` (4): Auto vs system, persistence and precedence, server-rendered `data-theme`, HttpOnly cookie, no-JS switch, 24×24 px targets.
- CI is now readable through the GitHub tools: both workflows (Foundation, Commerce integration with lint, tests, build and E2E on the Playwright-managed Chromium) succeeded for PRs #5–#7 and their merges (latest: run 44193120457 on `ada84a1`).
- Checks (2026-11-17): `npm run check`, `lint`, `typecheck`, `build` passed; `npm test` **104 passed in 8 files**; E2E **37 passed** with reduced motion and **37** with motion; theme spec stress 100/100. Dark and 360 px screenshots inspected (no horizontal scroll).

## M3 slice 4: header bag count, accessibility review and closure

- Header is a client `SiteHeader` with `next/link` (the layout lint exception was removed), `aria-current="page"` and a bag count read in the server layout from the commerce cart (only when the cookie exists; failures show "Bag" without a number). The link is named "Bag, N items" with the visible label first. Bag-changing Server Actions revalidate the layout. The count animates with CSS (keyed remount), not Motion.
- Accessibility fixes: control borders now use `--color-control` #857f72 (3.59:1 / 3.19:1) instead of the decorative 1.39:1 line colour; descriptive titles for catalog and detail (`generateMetadata` with React `cache()` so detail reads the product once). Review details and remaining gaps: [QUALITY](QUALITY.md#accessibility-review-m3-slice-4).
- Bug found and fixed: lazily loaded Motion features let a filter-triggered exit never complete, leaving stale cards (1/120 stress runs with motion). Motion features now load synchronously (0/480). Corrected bundle measurement (all JS downloaded per route, fresh context, gzip): `/` 135.6 KB, `/products/watch-001` 136.3 KB, `/products` 182.3 KB, `/cart` 181.8 KB; the earlier +18.5 KB figure omitted the lazy chunk. See [ADR 0007](adr/0007-motion.md).
- New E2E `journey.spec.ts` (6): keyboard-only journey to a confirmed order, skip link, header count and `aria-current` (with and without JavaScript), titles, control border colour.
- Checks on Node 22.23.5 / npm 10.9.9 (2026-11-17): `npm run check`, `npm run lint`, `npm run typecheck`, `npm run build` passed; `npm test` **85 passed in 7 files**; E2E **33 passed** with reduced motion and **33 passed** with motion enabled; stress runs 480/480 (catalog + motion specs ×20, both modes) and 110/110 (journey + motion ×10, motion). Preinstalled Chromium 153.0.8010.12 via ignored local configs.

### M3 acceptance against PLAN

| Criterion | Evidence |
| --- | --- |
| Integer, bounded quantities | Cart: `rejects quantity %j before calling the provider`, `rejects quantity %j without changing the line`; order provider rejects 0 and non-integers (`validates provider order input independently of the BFF`) |
| Unique IDs | Cart guard rejects duplicate lines; provider rejects duplicate order items; list/cart responses with duplicates are invalid |
| Prices and stock checked by the provider | `creates a confirmed order with commerce prices and decrements stock`; cart totals calculated by commerce; stock checked on add/increase |
| Manipulated fields rejected | `rejects browser-supplied price or total fields instead of ignoring them`; order requests with `price`/`total`/`items` rejected with 400 |
| Partial order rejected | `accepts all lines or none when one line lacks stock`; E2E `a bag that exceeds stock at order time is rejected without creating an order` |
| Last unit never sold twice | `two concurrent orders cannot sell the last unit twice` (fails under an injected race, see slice 3) |
| Same key and body → same order; other body → rejected | `returns the same order for the same key and body without decrementing again`, `concurrent requests with the same key create one order`, `rejects the same key with a different body as a conflict`; E2E double submission |
| Slow provider → timeout, safe correlated error | `maps timeout and HTTP failure safely with correlation and no-store`, `correlates safe provider failures with public and upstream request IDs`, cart/order timeout tests |
| Writes not retried automatically | `reports a slow provider write as a timeout and does not retry it`, `reports a slow order write as a timeout without retrying it` (exactly one upstream call) |
| Executed checks distinguished from pending scanners | This file lists exact commands; SonarQube, Snyk, axe/Lighthouse, type-aware lint and real screen-reader testing are **not run** (M4) |

Not yet done for the milestone ritual: the learner's modification without AI and the English explanation (M5).

## Polish slice: motion and display typography (between M3 slices 3 and 4)

- CSS motion (works without JavaScript): staggered entrance on home, catalog, detail and confirmation; a 60 s seconds-hand sweep on the watch illustration (detail always, catalog cards on hover/focus only); illustration lift on card hover/focus. Shared tokens `--ease-atelier`, `--duration-reveal`, `--duration-hover`.
- Motion 14.9.0 (MIT, pinned in `@atelier/storefront`, clean `npm install`, no peer warnings; React 19.3.1 deduped) only in `CatalogGrid` (cards glide on filter/sort) and `BagEditor` (removed lines fold away, subtotal crossfades), through `MotionScope` (`LazyMotion` lazy features + `strict`, `MotionConfig reducedMotion="user"`). `AnimatePresence initial={false}` keeps server HTML visible. Rules and alternatives: [ADR 0007](adr/0007-motion.md).
- `prefers-reduced-motion` disables entrance, sweep and lift; Playwright defaults to `reducedMotion: 'reduce'`; `tests/e2e/motion.spec.ts` (5 tests) opts in to verify sweep/hover/entrance, filtering during animation, no `opacity: 0` in server HTML and visible no-JS entrance.
- Checks (2026-11-17): `npm run check`, `npm run lint`, `npm run typecheck`, `npm run build` passed; `npm test` 85 passed; E2E **27 passed** with reduced motion and **27 passed** with motion enabled (ignored local config) using preinstalled Chromium 153.0.8010.12.
- Measured gzip JS referenced by each route's HTML (production): `/` 174.3 → 174.3 KB, `/products/watch-001` 174.7 → 174.7 KB, `/products` 175.1 → 193.6 KB (+18.5), `/cart` 175.5 → 193.1 KB (+17.6). No runtime performance or Core Web Vitals measurement was made.
- Display typography: headings use Cormorant Garamond 500 with 400 italic for occasional emphasis, self-hosted through `next/font/local` (metric-adjusted fallback, immutable caching, preloaded via the HTTP `Link` header). Two woff2 files (23.3 + 23.7 KB) copied unchanged from `@fontsource/cormorant-garamond@5.3.0` with OFL license and SHA-256 provenance in `apps/storefront/app/fonts/README.md`; JS size unchanged. The seconds hand now starts at 7 o'clock so the static reduced-motion hand never hides the other hands. See [ADR 0008](adr/0008-display-typography.md).
- Final checks after typography: `npm run check`, `lint`, `typecheck`, `build` passed; `npm test` 85 passed; E2E 27 passed with reduced motion and 27 with motion enabled. Desktop and 360 px screenshots of home, catalog and detail inspected (no horizontal scroll).

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

M3 is implemented (slices 1–4). Basic syntactic lint exists; SonarQube, Snyk, type-aware lint and measured accessibility/performance audits remain **M4**. There are no real payments, accounts, persistent orders or enterprise providers. Project-local skills remain versioned in Git.

## Publication and handoff

M2 and the Claude handoff were published to GitHub `master` in [2b0eddd9be97abc4e950d326c378adfea7ed229c](https://github.com/RubenHoodESP/atelier-commerce/commit/2b0eddd9be97abc4e950d326c378adfea7ed229c). The push succeeded and `git ls-remote origin refs/heads/master` matched that exact commit on 2026-11-17. A following documentation-only commit records this evidence. GitHub Actions API access returned `Forbidden`; M2 remote CI status is unverified, not passed. The cloud environment was not modified or published. Claude starts at [CLAUDE.md](../CLAUDE.md) and the [handoff](CLAUDE_HANDOFF.md).

## Next action

M5: five-minute demo script, English explanation of the key decisions (update [INTERVIEW](INTERVIEW.md) with M3/M4), and the learner's change made without AI. Still open from M4: the learner's screen-reader pass and the picomatch acceptance review by 2026-12-18; SonarQube/Snyk only if accounts are provided.
