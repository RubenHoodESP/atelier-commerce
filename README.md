# Atelier Commerce

A fictional composable watch storefront for learning frontend engineering and explaining end-to-end decisions. Demonstration only.

**M2:** 12 watches across Horizon, Meridian and Nocturne; server-rendered catalog and detail pages; collection and sorting in the URL; editorial HTTP integration with local fallback; Tailwind styling and local SVG illustrations. Cart and simulated orders remain M3.

## Run locally

Baseline: Node **22.23.5**, npm **10.9.9**. From the repository root:

```sh
npm ci
npm run dev
```

In PowerShell use `npm.cmd` if script execution policy blocks `npm`. Visit the application's `/products` route. The command builds and starts provider (4100), Express BFF (4000) and Next (3000), on loopback. Ctrl+C stops the stack. Service source changes require restarting; Next UI reloads in development.

Defaults need no configuration or secrets. Optional overrides are in [.env.example](.env.example). All provider addresses stay on the server. Production: `npm run build`, then `npm start`. Providers are not needed during compilation.

## Verify

```sh
npm run check
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

E2E starts production Next, the real BFF and an isolated test provider; ports 3000, 4000, 4100 and test-control port 4199 must be free. Fault controls exist only in the test harness. Cloud validation can use the ignored `.local/playwright.cloud.config.ts` with the image's Chromium when browser downloads are restricted. See [current evidence](docs/STATUS.md).

## Architecture and behavior

Next Server Component -> typed REST client -> Express BFF -> fictional HTTP commerce/editorial modules. The BFF validates and normalizes untrusted JSON. Commerce owns prices and stock; the UI never supplies authoritative prices. Money uses integer cents in EUR. Calls have fresh timeouts, safe errors, no automatic retries and `no-store` responses.

- `GET /api/products`: optional collection and sort parameters, normalized list and total.
- `GET /api/products/:id`: normalized detail; missing products return 404.
- `GET /api/content/brand`: normalized editorial content. Next uses local fallback on editorial failure.
- BFF health `/healthz`; provider health `/health`.

Catalog example: `/products?collection=horizon&sort=price-asc`. Filters update automatically, work with native GET without JavaScript, and survive reload/back/detail navigation. Invalid page parameters are canonicalized; invalid API parameters return 400.

## Continue with Claude

Start with [CLAUDE.md](CLAUDE.md) and the [complete handoff](docs/CLAUDE_HANDOFF.md), including setup, architectural decisions, evidence, limitations and the next task.

## Project documents

- [Plan](docs/PLAN.md), [architecture](docs/ARCHITECTURE.md), [quality](docs/QUALITY.md)
- [Current state](docs/STATUS.md), [stack](docs/STACK.md), [performance](docs/PERFORMANCE.md)
- [Express decision](docs/adr/0003-express-bff.md), [catalog/content decision](docs/adr/0004-catalog-url-and-content.md)
- [Agent agreement](AGENTS.md), [publication](docs/PUBLISH.md)

Use `node scripts/context.mjs frontend` (or integration, quality, planning) for focused context. Project workflows remain versioned in `.agents/skills`.

No real payments, user accounts, persistent orders or enterprise providers are connected. M3 adds guest cart and simulated orders; M4 adds lint/scanners and measured audits. The repository is private. Do not upload personal documents or credentials.
