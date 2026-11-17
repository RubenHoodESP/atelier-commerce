# Verification and operational quality

## Current foundation

`node scripts/check-foundation.mjs` checks repository consistency, local documentation links, JSON, skill metadata/budgets and contract examples. It does not validate framework compilation or implement an OpenAPI/JSON Schema validator. No application tests exist yet.

## Implementation test strategy

| Risk | Verification | Expected evidence |
| --- | --- | --- |
| Client manipulates price | Provider integration test sends an extra price/total; reject it and verify server-priced valid order | Exact charged cents from server fixture |
| Last unit sold twice | Two order submissions against isolated fixture | One succeeds, one 409, stock never negative |
| Confirmation repeated | Same idempotency key/body twice, then different body | Same order returned; different body 409 |
| Bad quantity/product | Boundary cases and unknown ID | 400/404, no inventory mutation |
| Provider times out/fails | Controlled local provider fixture | Stable 504/502, request ID, no stack leak |
| UI/URL drifts | Component + integration tests | Filters survive navigation; cart updates are announced |
| User cannot buy via keyboard | Playwright keyboard journey + manual focus check | Catalog -> detail -> cart -> confirmation |
| Server rendering breaks | Next production build + E2E | Product HTML present, hydration clean |

Use Vitest for pure domain functions and adapters; React Testing Library for meaningful Client Component behavior; Playwright for full journeys and async Server Components. Avoid assertions on internal hook calls and broad snapshots. Use deterministic fixtures and reset them between tests. Add a standards-aware OpenAPI validator in M1; the foundation structural checks do not replace it.

## CI progression

M0: checkout -> Node -> dependency-free foundation check. M1+: setup pinned Node/npm -> `npm ci` -> typecheck -> lint -> focused unit/integration tests -> build. M4: add Chromium Playwright against production servers; expand browser coverage if evidence warrants it. Keep logs and artifacts bounded; screenshots/traces on failure with a short retention period.

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
