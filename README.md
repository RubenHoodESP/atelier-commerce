# Atelier Commerce

A small composable watch storefront for learning modern frontend engineering and explaining end-to-end technical decisions in interviews. Fictional brand; no affiliation with a luxury group.

**Status:** planning and repository foundation. The storefront, middleware and commerce API are not implemented yet. Runtime dependencies have not been installed or integration-tested.

## Start here

- [Development plan, in Spanish](docs/PLAN.md)
- [Architecture and boundaries](docs/ARCHITECTURE.md)
- [Stack research and compatibility gates](docs/STACK.md)
- [Current task and handoff](docs/STATUS.md)
- [Quality and security strategy](docs/QUALITY.md)
- [Interview evidence](docs/INTERVIEW.md)
- [Agent instructions](AGENTS.md)

## Intended first journey

Browse watches, open a product, add a quantity to a cart and confirm a simulated order. The commerce service owns prices and stock. The browser never supplies an authoritative price. No real payments or personal customer data.

## Foundation commands

The foundation uses only built-in Node.js APIs. No installation is needed for these commands:

```sh
node scripts/check-foundation.mjs
node scripts/context.mjs integration
node scripts/context.mjs frontend
node scripts/context.mjs quality
node scripts/context.mjs planning
```

Use Node **22.23.5** for the future application. These dependency-free maintenance scripts also run on Node 24. There is deliberately no `dev` or application `test` command yet. The first development milestone adds real commands and a generated npm lockfile after resolving package access and compatibility.

## Repository areas

| Area | Responsibility |
| --- | --- |
| `apps/storefront` | Next.js App Router, React, TypeScript and Tailwind |
| `apps/middleware` | Alokai SDK-facing integration boundary, Node and Express |
| `apps/mock-services` | Deterministic local commerce and content provider APIs |
| `packages/contracts` | Public schemas, examples and API contract |
| `docs/adr` | Decisions and consequences |
| `.agents/skills` | Small project workflows loaded only when relevant |

## Next milestone

Complete **M1: compatibility spike** before implementing the store. Prove one product can travel from a local provider through real Alokai middleware to Next.js. An Express-only fallback must be labelled as such; it does not count as Alokai experience.

## Repository

[RubenHoodESP/atelier-commerce](https://github.com/RubenHoodESP/atelier-commerce) is private. Its default branch is `master`. Do not upload the job PDF, CV, credentials or personal notes. See [the publication runbook](docs/PUBLISH.md).
