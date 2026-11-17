# Current state

- **M1 Express migration implemented and validated.** Flow: Next Server Component -> server-only client configuration -> typed REST client -> Express BFF -> fictional vendor HTTP provider.
- External integration SDK/middleware and CommonJS bridge removed. npm removed 20 packages; no retired SDK packages or private-registry URLs remain in manifests/lockfile or installed dependency packages. Project registry configuration and local .env keys were migrated where present. No vendor account is required.
- GET /api/products/:id returns ProductResult and actual HTTP 200/400/404/500/502/504 statuses. Runtime guards validate input, provider JSON, public response JSON and status agreement. Unexpected queries and malformed URL encoding return safe 400 responses. Errors hide raw bodies/stacks and correlate public/upstream request IDs.
- Preserved: product SSR, 404/retry UI, integer cents, no-store reads, normalization and bounded calls. COMMERCE_API_URL defaults to http://127.0.0.1:4000/api; client timeout is fresh per call (2500 ms default), provider 1500 ms. Configuration remains server-only.
- Express stays on tested 4.22.3; Next 16.4.6, React 19.3.1 and TypeScript 7.0.2 unchanged. npm regenerated the lockfile offline; it was not hand-edited. body-parser remains only as an Express transitive dependency.
- **Local validation:** structural checks, typecheck, production build and 9 client/contract tests passed on Node 24.22.1/npm 11.19.1. Restricted execution-host loopback previously returned EACCES; no local full HTTP/browser success is claimed.
- **Full CI validation:** clean npm ci, structural checks, typecheck, **19 Vitest tests passed** (3 contract/guards, 6 client, 10 real HTTP integration), production build and **2 Chromium E2E tests passed** on Node 22.23.5/npm 10.9.9. Evidence: https://github.com/RubenHoodESP/atelier-commerce/actions/runs/44077314459. The final evidence-only documentation update is checked again on the PR.
- Tests cover normalization, missing/invalid identifiers, 503 redaction, invalid provider data, provider timeout, unexpected query fields, correlation, malformed URL encoding, invalid public response/status, client timeout and safe transport errors. Browser checks initial HTML, navigation, price/stock and HTTP 404.
- Published through PR #1 on feat/m1-product-integration. Master history preserved. Three project-local workflows are versioned; no personal/global installation claim.
- Pending: catalog/Tailwind/content (M2), cart/orders (M3), lint/scanners and measured audits (M4). No persistence, auth, real payments or enterprise services are connected.

## Next action

Review the Express M1 PR, then resume M2 catalog and URL filters. Rehearse the request path and alter a fixture without AI before expanding the feature set. Use npm.cmd ci / npm.cmd run dev in PowerShell and open /products/watch-001. See PLAN.md and INTERVIEW.md.
