# Selected stack

Checked 2026-11-17. The integration uses public npm packages and an owned REST client; no private registry or integration account is required. npm generates package-lock.json; exact direct versions are retained.

| Technology | Version | Role |
| --- | --- | --- |
| Node / npm CI | 22.23.5 / 10.9.9 | Reproducible baseline |
| Next | 16.4.6 | App Router and product SSR |
| React / React DOM | 19.3.1 | UI |
| TypeScript | 7.0.2 | Strict typing |
| Express | 4.22.3 | REST BFF and vendor mock |
| Vitest / Vite | 5.1.0 / 8.3.8 | Contract, client and real HTTP tests |
| Playwright | 1.65.1 | Chromium E2E |
| Swagger Parser | 12.1.0 | OpenAPI 3.1 validation |

Express major is deliberately unchanged during migration. body-parser remains an Express transitive dependency, not a direct BFF dependency. The shared client uses native fetch and a fresh AbortSignal.timeout per request. Tailwind/PostCSS candidates 4.3.5 remain deferred to M2; RTL is deferred until meaningful client interaction exists.

Local Node 24.22.1/npm 11.19.1 is inside the declared engines range; check [STATUS](STATUS.md) for migration validation versus previous results. CI continues on the pinned baseline. No force or legacy-peer-deps overrides are used.

Primary evidence: [Express package](https://registry.npmjs.org/express/4.22.3), [MIT license](https://github.com/expressjs/express/blob/master/LICENSE), [Next server data access](https://nextjs.org/docs/app/guides/backend-for-frontend), and exact npm resolution. [Machine-readable record](stack-research.json).
