# Atelier Commerce

A small composable watch storefront for learning frontend engineering and explaining end-to-end decisions in interviews. Fictional brand; demonstration only.

**M1 uses Express:** Next.js -> typed REST client -> Express BFF -> local HTTP product provider. Product SSR, runtime validation, normalization, bounded calls and safe HTTP errors are implemented. All integration dependencies are available from public npm. No vendor account or private package registry is required.

## Run locally

CI baseline: Node **22.23.5**, npm **10.9.9**. The latest local build also passed on Node 24.22.1/npm 11.19.1. From the repository root, use these commands in PowerShell:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open http://127.0.0.1:3000/products/watch-001. The command builds TypeScript services and starts provider (4100), Express BFF (4000) and Next (3000), all on loopback. Ctrl+C stops the stack. Service source changes currently require restarting; Next UI reloads in development. Other shells can use npm without the .cmd suffix.

Defaults need no configuration. Copy [.env.example](.env.example) to .env for overrides; these settings stay on the server. COMMERCE_API_URL points to the BFF /api base, while PROVIDER_URL points to the vendor mock. For production: npm run build, then npm start. Providers are not required during the build.

## Verify

```powershell
npm.cmd run check
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

CI uses npm ci and runs structural checks, typecheck, contract/client/HTTP tests, production build and Chromium E2E. See [exact evidence and restrictions](docs/STATUS.md). Public REST: GET http://127.0.0.1:4000/api/products/watch-001. Failure responses have an explicit 400/404/500/502/504 status and safe typed JSON. BFF health: /healthz; provider health: /health.

## Start here

- [Development plan, in Spanish](docs/PLAN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Stack](docs/STACK.md)
- [Current state](docs/STATUS.md)
- [Quality](docs/QUALITY.md)
- [Interview practice](docs/INTERVIEW.md)
- [Express decision](docs/adr/0003-express-bff.md)
- [Agent instructions](AGENTS.md)

Run node scripts/context.mjs integration (or frontend, quality, planning) to locate relevant context selectively.

## Repository areas

| Area | Responsibility |
| --- | --- |
| apps/storefront | Next App Router, React, server-only API configuration, initial CSS |
| apps/middleware | Express REST BFF, normalization, correlation and timeouts |
| apps/mock-services | Fictional vendor-shaped product provider |
| packages/contracts | Domain types/guards, typed fetch client, provider and BFF OpenAPI |
| docs/adr | Decisions and limitations |
| .agents/skills | Three versioned project workflows |

Next: M2 catalog, URL filters, brand content and Tailwind. M3 adds cart/orders. No real enterprise provider, identity or payment is connected. Lint, scanners and measured accessibility/performance audits remain future work.

[Repository](https://github.com/RubenHoodESP/atelier-commerce) is private; default branch master. Do not upload job PDFs, CVs, credentials or personal notes. See [publication](docs/PUBLISH.md).
