# Verification and operational quality

## Current coverage

- npm run check: JSON, local links, skills, recorded versions and contract invariants.
- npm run typecheck and npm run build: shared package, services and Next compilation.
- npm test: both OpenAPI 3.1 documents, domain guards, typed-client invalid JSON/status/redaction/timeout tests and real client -> Express -> HTTP provider tests.
- npm run test:e2e: Chromium against production servers, initial HTML/navigation/price/stock and HTTP 404. No E2E cart/order coverage exists yet.

HTTP tests exercise normalization, missing/invalid identifiers, upstream failures, malformed responses, timeout, unexpected queries, request-ID propagation and malformed URL encoding. Test-only fixtures control failures. Do not replace these tests with mocks merely because an execution environment blocks loopback networking. See [STATUS](STATUS.md) for actual results.

## CI

Pinned Node -> npm ci -> structural checks -> typecheck -> Vitest -> production build -> Chromium install -> E2E. Foundation checks also run separately. Tests have bounded time limits. Lint, SonarQube, Snyk and measured accessibility/performance audits remain pending. Future scanner credentials belong in CI secrets, not files. A skipped scan has not passed.

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
