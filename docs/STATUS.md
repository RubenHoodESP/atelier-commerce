# Current state

- **M0–M2 implemented; M3 is next.** The storefront now has 12 fictional watches across Horizon, Meridian and Nocturne, an editorial home, SSR catalog and detail pages, out-of-stock display and a real unknown-product 404. The M1 watch-001 fixture is unchanged.
- `/products` uses collection/sort URL state. Automatic filter navigation, canonical URLs, reload/history and detail return preserve selection. Native GET works without JavaScript. Pending transitions announce activity, disable controls and restore keyboard focus. There is deliberately no shared route loading boundary: streaming it caused 200 responses for missing details and hidden content without JavaScript; regression tests now protect both behaviors.
- Express adds GET /api/products and GET /api/content/brand. One provider list call handles filtering/sorting with deterministic ID ties. Runtime validation rejects malformed lists, duplicate IDs and count disagreement. All public JSON is normalized; provider-specific fields remain behind the BFF. Existing safe errors, no-store, correlation IDs, per-request timeouts and no automatic retries remain.
- Editorial content is a separate HTTP module inside the existing fictional provider process. Next loads independent catalog/content reads concurrently; editorial failure logs a safe warning and uses local text while retaining real products. Commerce failure shows error/retry, never fabricated products. This is a local simulation, not a CMS integration or operational service isolation.
- Tailwind 4.3.5, @tailwindcss/postcss 4.3.5 and PostCSS 8.5.33 are pinned with an npm-generated lockfile. Shared theme tokens and SVG illustrations preserve the Atelier visual direction. No new state library, database, remote account or secret is needed.

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

Cart, orders, stock writes, sessions and idempotency remain **M3**. Basic syntactic lint exists; SonarQube, Snyk, type-aware lint and measured accessibility/performance audits remain **M4**. There are no real payments, accounts, persistent orders or enterprise providers. Project-local skills remain versioned in Git.

## Publication and handoff

M2 and the Claude handoff were published to GitHub `master` in [2b0eddd9be97abc4e950d326c378adfea7ed229c](https://github.com/RubenHoodESP/atelier-commerce/commit/2b0eddd9be97abc4e950d326c378adfea7ed229c). The push succeeded and `git ls-remote origin refs/heads/master` matched that exact commit on 2026-11-17. A following documentation-only commit records this evidence. GitHub Actions API access returned `Forbidden`; M2 remote CI status is unverified, not passed. The cloud environment was not modified or published. Claude starts at [CLAUDE.md](../CLAUDE.md) and the [handoff](CLAUDE_HANDOFF.md).

## Next action

Read the Claude handoff and review the M2 [decisions](adr/0004-catalog-url-and-content.md), rehearse catalog navigation and failure cases, then implement the guest cart and simulated order acceptance. Preserve commerce ownership of prices/stock, server-side session ownership and idempotency guarantees.
