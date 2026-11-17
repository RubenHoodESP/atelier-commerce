# Verification and operational quality

## Current checks

`npm run check` checks repository consistency, local documentation links, JSON, skill metadata/budgets, recorded lockfile versions and contract examples. These structural checks are separate from `npm run typecheck`, `npm test`, `npm run build` and `npm run test:e2e`.

M1 has 8 Vitest checks: full OpenAPI 3.1 validation, runtime guards and 6 tests through the real public Alokai SDK/middleware over HTTP. They cover normalization, unknown ID, rejected input, upstream 503/redaction, malformed data and timeout. Two Chromium tests run against production Next/middleware/provider processes: initial HTML/navigation/price/stock and an actual HTTP 404. They are not evidence of cart/order correctness. See [STATUS](STATUS.md).

## Implementation test strategy

| Risk | Verification | Expected evidence |
| --- | --- | --- |
| Client manipulates price | Provider integration test sends an extra price/total; reject it and verify server-priced valid order | Exact charged cents from server fixture |
| Last unit sold twice | Two order submissions against isolated fixture | One succeeds, one 409, stock never negative |
| Confirmation repeated | Same idempotency key/body twice, then different body | Same order returned; different body 409 |
| Bad quantity/product | Boundary cases and unknown ID | 400/404, no inventory mutation |
| Provider times out/fails | Controlled local provider fixture; implemented in M1 | Typed RPC failure, request ID, no raw body; REST 504/502 mapping is future work |
| UI/URL drifts | Component + integration tests | Filters survive navigation; cart updates are announced |
| User cannot buy via keyboard | Playwright keyboard journey + manual focus check | Catalog -> detail -> cart -> confirmation |
| Server rendering breaks | Next production build + E2E | Product HTML present, hydration clean |

Use Vitest for domain functions and adapters; add React Testing Library when meaningful Client Component behavior exists; use Playwright for full journeys and async Server Components. Avoid internal hook assertions and broad snapshots. Use deterministic fixtures and reset them between tests. Swagger Parser now validates the entire OpenAPI document; structural checks alone do not replace it.

## CI progression

M0 retains its dependency-free foundation check. M1 runs pinned Node -> npm ci -> structural checks -> typecheck -> Vitest -> production build -> Chromium installation -> Playwright against production servers. Integration and browser steps have explicit time limits. Lint and scanners remain pending; M4 expands quality coverage and audits. Playwright captures traces on failure; keep future uploaded artifacts bounded with a short retention period.

Configure SonarQube and Snyk only with approved account/project access. Read secrets from GitHub Actions secrets; never write tokens into YAML or publish scanner reports containing credentials. A skipped scan is a skipped scan. Add dependency review after an actual lockfile exists. No arbitrary coverage percentage as a proxy for quality.

## Security, accessibility and performance

- Runtime-validate untrusted bodies and provider responses. TypeScript does not validate JSON at runtime.
- Keep secrets server-only; avoid broad CORS. Verify mutation origin, guest ownership, HttpOnly cookies and bounded inputs.
- Request only IDs/quantities for orders. Calculate money in integer cents server-side and atomically accept orders.
- Use semantic landmarks, labelled controls, visible focus, image alternatives and an announced cart status.
- Measure baseline production LCP/CLS/INP or lab proxies with conditions recorded before claiming improvements. Do not benchmark dev mode or invent a score.
- Explicitly cache public catalog data, never private carts/orders. Bound provider timeouts and log correlation IDs.

## Demo limitations

In-memory state is single-process and resets at restart. There are no real payments, tax/shipping engine or production identity controls. Fixtures emulate separate commercial services. Deployment-grade distributed consistency is out of scope; explain its required changes in the interview.
