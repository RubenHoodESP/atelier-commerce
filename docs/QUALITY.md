# Verification and operational quality

## Current coverage

- npm run check: JSON, local links, skills, recorded versions and contract invariants.
- npm run lint: oxlint 1.91.0 with `.oxlintrc.json`; correctness rules are errors, suspicious rules are warnings and warnings fail the command. Covers React hooks (rules-of-hooks, exhaustive-deps, set-state-in-effect), Next, jsx-a11y, import, promise and Vitest rules. It is syntactic only: no type-aware rules.
- npm run typecheck and npm run build: shared package, services and Next compilation.
- npm test: both OpenAPI 3.1 documents, domain guards, typed-client invalid JSON/status/redaction/timeout tests and real client -> Express -> HTTP provider tests.
- npm run test:e2e: Chromium against production servers, initial HTML/navigation/price/stock and HTTP 404. M2 also covers URL/history/detail return, mobile keyboard navigation, native GET without JavaScript, pending feedback/focus, empty results, commercial retry and editorial fallback. No cart/order coverage exists yet.

HTTP tests exercise normalization, missing/invalid identifiers, upstream failures, malformed responses, timeout, unexpected queries, request-ID propagation and malformed URL encoding. Test-only fixtures control failures. Do not replace these tests with mocks merely because an execution environment blocks loopback networking. See [STATUS](STATUS.md) for actual results.

E2E uses production Next and a real BFF with an isolated controllable HTTP provider; fault controls are test-only. One worker serializes shared fixture scenarios. The catalog avoids a shared loading boundary so initial HTML works without JavaScript and unknown detail retains HTTP 404.

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
- `nextjs/no-html-link-for-pages` is off only for `app/layout.tsx`, whose header uses plain links; switching to `next/link` changes navigation behavior and needs its own reviewed change.

### Claude Code project settings

`.claude/settings.json` runs `.claude/hooks/lint-edited-file.mjs` after Claude's Edit/Write calls. It lints only the edited JS/TS file and returns findings to Claude (exit 2); it does not replace `npm run lint` or CI. It also allows read-only git and the project check scripts without prompting, and denies force pushes, hard resets, `git clean`, `--force`/`--legacy-peer-deps` installs and reading local `.env` files. Deny rules are a guardrail for the agent, not a security boundary.

## Risks for later milestones

| Risk | Verification |
| --- | --- |
| Manipulated price | Reject price/total fields; valid order charged in exact server-owned cents |
| Overselling | Concurrent last-unit orders: one success, stock never negative |
| Duplicate confirmation | Same key/body returns same order; changed body conflicts |
| Invalid quantities | Boundary cases reject without inventory mutation |
| URL/UI drift | Filters survive reload and navigation |
| Inaccessible journey | Keyboard catalog -> detail -> cart -> confirmation; focus and announcements |
| Slow/failed provider | Stable 502/504, safe envelope and correlation ID |

Use meaningful behavior tests and deterministic fixtures; add component testing when interactive Client Components need it. Never share-cache private responses. Runtime-validate JSON, keep addresses/secrets server-only, and implement origin/session ownership for future mutations. Bound input size/counts and upstream calls.

Measure production performance with conditions recorded before claiming improvements. The demo has fictional providers, no payment/auth/persistent orders, and no deployment-grade distributed consistency.
