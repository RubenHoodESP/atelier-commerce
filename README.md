# Atelier Commerce

A small composable watch storefront for learning frontend engineering and explaining end-to-end decisions in interviews. Fictional brand; demonstration only.

**M1 implemented:** Next.js -> official public Alokai SDK -> public Alokai middleware -> local HTTP product provider. A server-rendered product, runtime validation, normalization, bounded upstream calls and safe failures are working. Connect 2.5 still requires unavailable credentials; see [ADR 0003](docs/adr/0003-public-alokai-integration.md). The public SDK/middleware APIs are explicitly older.

## Run locally

Use Node **22.23.5** and npm **10.9.9**. From this repository:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000/products/watch-001. The command builds the TypeScript services, starts the mock provider (4100), Alokai middleware (4000) and Next development server (3000). It stops them together with Ctrl+C. Service source changes require restarting this command; Next UI changes use its development reload.

Defaults work without configuration. To override them, copy [.env.example](.env.example) to .env in the repository root. Values stay on the server. Services bind to loopback. To run a production build: npm run build, then npm start. The product route is rendered on demand, so providers need not run during the build.

## Verify

```sh
npm run check
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

CI uses npm ci on Node 22.23.5, validates OpenAPI 3.1, runs 8 Vitest checks and 2 Chromium E2E checks against production servers. The E2E checks assert initial product HTML, navigation, price/stock and an HTTP 404 for unknown products. See [current evidence](docs/STATUS.md). Security scanners, lint and measured performance/accessibility audits are still pending; passing these tests does not imply they ran.

## Start here

- [Development plan, in Spanish](docs/PLAN.md)
- [Architecture and boundaries](docs/ARCHITECTURE.md)
- [Stack and exact versions](docs/STACK.md)
- [Current state and next task](docs/STATUS.md)
- [Quality strategy](docs/QUALITY.md)
- [Interview practice](docs/INTERVIEW.md)
- [Agent instructions](AGENTS.md)

Use node scripts/context.mjs integration (or frontend, quality, planning) to locate relevant context without loading all documentation.

## Repository areas

| Area | Responsibility |
| --- | --- |
| apps/storefront | Next App Router, React, server-only SDK and initial CSS |
| apps/middleware | Actual public Alokai integration, provider normalization and timeouts |
| apps/mock-services | Deterministic fictional HTTP product provider |
| packages/contracts | Domain types/guards, provider OpenAPI and planned order examples |
| docs/adr | Decisions and limitations |
| .agents/skills | Three versioned project workflows loaded selectively |

Next: **M2**, catalog, URL filters, brand content and Tailwind. Cart and order acceptance belong to M3. No real enterprise provider, account or payment is connected.

[RubenHoodESP/atelier-commerce](https://github.com/RubenHoodESP/atelier-commerce) is private; default branch master. Do not upload the job PDF, CV, credentials or personal notes. See [publication](docs/PUBLISH.md).
