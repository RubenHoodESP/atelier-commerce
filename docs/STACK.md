# Stack selection and compatibility evidence

Checked **2026-11-17**. M1 uses the versions below, installed with npm on the selected runtime and verified by typecheck, integration tests, Next production build and Chromium E2E. The npm-generated package-lock.json records all transitives. Machine-readable evidence: [stack-research.json](stack-research.json).

| Technology | Installed M1 version | Decision |
| --- | --- | --- |
| Node / npm | 22.23.5 / 10.9.9 | Pinned CI baseline; no global host replacement |
| Next | 16.4.6 | App Router; product Server Component rendered on demand |
| React / React DOM | 19.3.1 / 19.3.1 | Matching pair, peers installed without overrides |
| TypeScript | 7.0.2 | Actual typecheck and Next production build passed; no downgrade needed |
| Public Alokai middleware | 5.4.1 | Official @vue-storefront/middleware, BSD-3-Clause |
| Public Alokai SDK | 3.4.2 | Official @vue-storefront/sdk, BSD-3-Clause |
| Express / body-parser | 4.22.3 / 1.20.9 | Actual lockfile resolution; same Express major for the mock |
| Vitest / Vite | 5.1.0 / 8.3.8 | Required Vite peer installed; real HTTP integration tests |
| Playwright | 1.65.1 | Chromium E2E against production servers |
| Swagger Parser | 12.1.0 | Full OpenAPI 3.1 document validation |
| Type packages | Node 22.20.5; React/DOM 19.3.0; Express 4.17.25 | Exact direct pins from actual npm resolution |

## Access-dependent and deferred work

- **Connect 2.5.2 is not installed.** Public npm returns 404; npm.alokai.cloud requires authorization. Alokai ecosystem release 2.5.5 is a release label, not the installed package version. [ADR 0003](adr/0003-public-alokai-integration.md) records the public-package choice and different APIs. This is not a current Connect integration.
- Tailwind/PostCSS 4.3.5 were checked as candidates, not installed. M1 uses plain CSS; M2 adds the matching pair after checking peers.
- React Testing Library is deferred until a meaningful Client Component needs it. No extra state manager or monorepo runner is needed yet.
- SonarQube/Snyk require actual configured accounts and reports in M4. No scan has passed by implication.

## Reproducibility

The initial npm install ran on Node 22.23.5 with npm 10.9.9 in CI; support-tool ranges were replaced with their actual resolved versions and npm regenerated the lock. A subsequent clean checkout passed npm ci and the complete M1 pipeline. No hand-authored lock, --force or --legacy-peer-deps was used. CI workflows pin checkout/setup-node to verified commit SHAs.

First green complete run: https://github.com/RubenHoodESP/atelier-commerce/actions/runs/44070965486. The final PR reruns it after documentation/contract cleanup. These results demonstrate this slice, not an exhaustive ecosystem compatibility guarantee.

## Primary evidence

- [Node selected security release](https://nodejs.org/en/blog/release/v22.23.5)
- [Next metadata](https://registry.npmjs.org/next/16.4.6)
- [React metadata](https://registry.npmjs.org/react/19.3.1)
- [TypeScript metadata](https://registry.npmjs.org/typescript/7.0.2)
- [Public middleware metadata](https://registry.npmjs.org/@vue-storefront/middleware/5.4.1)
- [Public SDK metadata](https://registry.npmjs.org/@vue-storefront/sdk/3.4.2)
- [Alokai release/package distinction](https://docs.alokai.com/alokai-versions/2.5)
- [Alokai licensing](https://alokai.com/news/alokai-licensing-and-open-source-changes)
- [Next testing guidance](https://nextjs.org/docs/app/guides/testing)

Published package exports/types and actual HTTP behavior were probed in CI. Do not mix the older public APIs with Connect imports from newer documentation.
