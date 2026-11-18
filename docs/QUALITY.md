# Verification and operational quality

## Current coverage

- npm run check: JSON, local links, skills, recorded versions and contract invariants.
- npm run lint: oxlint 1.91.0 with `.oxlintrc.json`; correctness rules are errors, suspicious rules are warnings and warnings fail the command. Covers React hooks (rules-of-hooks, exhaustive-deps, set-state-in-effect), Next, jsx-a11y, import, promise and Vitest rules. Since M4 slice 3 it also runs type-aware rules through `oxlint-tsgolint` 7.0.2005 (typescript-go, compatible with the pinned TypeScript 7.0.2), e.g. `no-floating-promises`, `await-thenable`, `no-unsafe-type-assertion`, `restrict-template-expressions`; the edit hook uses the same flags. A probe file with five such defects produced 0 findings with syntactic lint and 5 with type-aware lint.
- npm run typecheck and npm run build: shared package, services and Next compilation.
- npm test: both OpenAPI 3.1 documents, domain guards, typed-client invalid JSON/status/redaction/timeout tests and real client -> Express -> HTTP provider tests.
- npm run test:e2e: Chromium against production servers, initial HTML/navigation/price/stock and HTTP 404. M2 also covers URL/history/detail return, mobile keyboard navigation, native GET without JavaScript, pending feedback/focus, empty results, commercial retry and editorial fallback. M3 adds the bag journey with and without JavaScript, stock-limit messages, the HttpOnly cookie, cross-origin Server Action rejection, a non-cacheable bag page, and quantity change/removal with and without JavaScript, including stock rejection and focus after removal. M3 order E2E covers bag → confirmation with stock decrement and an emptied bag, rejection when another guest took the last unit, real 404 for unknown orders, native submission and a double submission with one idempotency key creating one order.

HTTP order tests cover commerce re-pricing, stock decrement visible in catalog, same key/body replay, key conflict, all-or-nothing rejection, two concurrent orders for the last unit, concurrent same-key requests, missing/invalid keys, empty or unknown carts, injected price/item fields, provider-side input validation, per-instance inventory and a non-retried timeout. A mutation check (an injected await between stock check and decrement) makes both concurrency tests fail. HTTP cart tests cover commerce-calculated totals, quantity bounds, rejected price/total fields, malformed and oversized bodies, out-of-stock and limit conflicts, unknown carts/products, cart isolation, bounded eviction, inconsistent provider totals, a non-retried write timeout, and set-quantity semantics (repeatable, 0 removes, increase-only stock check, missing line/cart, invalid quantities and extra fields). HTTP tests also exercise normalization, missing/invalid identifiers, upstream failures, malformed responses, timeout, unexpected queries, request-ID propagation and malformed URL encoding. Test-only fixtures control failures. Do not replace these tests with mocks merely because an execution environment blocks loopback networking. See [STATUS](STATUS.md) for actual results.

E2E uses production Next and a real BFF with an isolated controllable HTTP provider; fault controls are test-only. One worker serializes shared fixture scenarios. The catalog avoids a shared loading boundary so initial HTML works without JavaScript and unknown detail retains HTTP 404.

Motion: Playwright defaults to `reducedMotion: 'reduce'` for deterministic journeys; `motion.spec.ts` re-enables motion to check the seconds sweep, hover-only card sweep, entrance, filtering during animation, absence of `opacity: 0` in server HTML and a visible no-JS entrance. See [ADR 0007](adr/0007-motion.md).

## Accessibility review (M3 slice 4)

Manual review of catalog → detail → bag → order plus automated E2E checks. Fixed: form-control borders used the decorative `line` color (1.39:1); they now use `--color-control` #857f72 (3.59:1 on paper, 3.19:1 on panel, WCAG 1.4.11). Catalog and detail pages now have descriptive titles (WCAG 2.4.2; Next's route announcer reads them). Header links expose `aria-current="page"`; the bag link is named "Bag, N items" with the visible label first (WCAG 2.5.3). Verified by E2E: keyboard-only journey to a confirmed order, skip link as first stop moving focus into `main`, titles, control border colour, header count with and without JavaScript. Measured palette contrast: ink/paper 13.88, muted/paper 5.75, muted/panel 5.11, button 15.41, focus ring 4.58. Automated audit: since M4 slice 2, `tests/e2e/a11y.spec.ts` runs axe (WCAG 2.0/2.1/2.2 A/AA) on every journey page and state in both themes, on the settled page, and fails on any violation. Not done: Lighthouse and testing with real screen readers ([checklist](A11Y_MANUAL_CHECK.md)); neither may be reported as passed.

## Themes

`tests/theme-contrast.test.ts` reads both palettes from `globals.css` and enforces WCAG contrast (text 4.5:1; focus and control borders 3:1) plus identical dark blocks. `tests/e2e/theme.spec.ts` covers system/explicit precedence, persistence, server-rendered `data-theme`, the HttpOnly cookie, the no-JS switch and target size. See [ADR 0009](adr/0009-colour-themes.md).

## Dependency audit

`npm run audit` (`scripts/audit-dependencies.mjs`, run in CI after `npm run check`) evaluates `npm audit --omit=dev` and the full `npm audit` against [accepted-risks.json](security/accepted-risks.json): any high/critical production advisory fails; a high/critical dev-only advisory fails unless listed with a future `reviewBy`; an expired acceptance fails; moderate/low advisories and stale acceptances are reported only. If npm audit cannot produce a report (e.g. no registry access) the gate fails rather than passing. The policy logic is unit-tested in `tests/audit-policy.test.ts`. Accepted on 2026-11-18 until 2026-12-18: GHSA-fc5q-39xc-vjpf (picomatch ReDoS, dev tooling via vite/vitest; latest picomatch 4.0.7 is affected and no fixed release exists).

## Performance

Lab measurements with a pinned Lighthouse, reproduction steps and limits (including why LCP is optimistic on animated routes) are in [PERFORMANCE](PERFORMANCE.md). They are not field data.

## CI

Pinned Node -> npm ci -> structural checks -> lint -> typecheck -> Vitest -> production build -> Chromium install -> E2E. Foundation checks also run separately. Tests have bounded time limits. Lint runs after structural checks. SonarQube, Snyk and measured accessibility/performance audits remain pending. Future scanner credentials belong in CI secrets, not files. A skipped scan has not passed.

### Lint decisions

ESLint with `eslint-config-next` was rejected for now: it pulls typescript-eslint 8.73.0, whose peer range `typescript >=4.8.4 <6.1.0` excludes the pinned TypeScript 7.0.2, and npm only installs it by overriding that peer. oxlint parses TypeScript without depending on the compiler. Rules disabled in `.oxlintrc.json`, with reasons:

- `jsx-a11y/prefer-tag-over-role`: `<output>` is for calculation results; `role="status"` is the correct live region here.
- `import/no-unassigned-import`: `server-only` and CSS imports are intentional side effects.
- `oxc/no-async-endpoint-handlers`: Express 4 does not forward rejected promises, so every async route keeps an explicit `try/catch -> next(error)`. Reviews must enforce that convention for new M3 routes.
- `unicorn/no-array-reverse`, `unicorn/no-array-sort`: the TypeScript lib is ES2022, which lacks `toReversed`/`toSorted`.
- `unicorn/consistent-function-scoping`: style-only.
- `no-console` allows `warn`/`error` (safe editorial-fallback warning) and is off for scripts, test support and service entry points.

### Claude Code project settings

`.claude/settings.json` runs `.claude/hooks/lint-edited-file.mjs` after Claude's Edit/Write calls. It lints only the edited JS/TS file and returns findings to Claude (exit 2); it does not replace `npm run lint` or CI. It also allows read-only git and the project check scripts without prompting, and denies force pushes, hard resets, `git clean`, `--force`/`--legacy-peer-deps` installs and reading local `.env` files. Deny rules are a guardrail for the agent, not a security boundary.

## Risks and verification status

| Risk | Verification |
| --- | --- |
| Manipulated price | Implemented: price/total/item fields rejected; order priced by commerce in cents |
| Overselling | Implemented: concurrent last-unit orders give one success, stock never negative |
| Duplicate confirmation | Implemented: same key/body returns same order; changed body conflicts |
| Invalid quantities | Implemented: boundary cases rejected without cart or inventory mutation |
| URL/UI drift | Filters survive reload and navigation |
| Inaccessible journey | Keyboard catalog -> detail -> cart -> confirmation; focus and announcements |
| Slow/failed provider | Stable 502/504, safe envelope and correlation ID |

Use meaningful behavior tests and deterministic fixtures; add component testing when interactive Client Components need it. Never share-cache private responses. Runtime-validate JSON, keep addresses/secrets server-only, and implement origin/session ownership for future mutations. Bound input size/counts and upstream calls.

Measure production performance with conditions recorded before claiming improvements. The demo has fictional providers, no payment/auth/persistent orders, and no deployment-grade distributed consistency.
