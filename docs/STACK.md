# Stack research and selection

Research date: **2026-11-17**. All versions below are candidates until M1 passes. An exact version in this document is evidence of a release, not an installed dependency. The machine-readable record is [stack-research.json](stack-research.json).

## Selection

| Technology | Selected candidate | Evidence and compatibility decision |
| --- | --- | --- |
| Node.js | **22.23.5 LTS** | Supported baseline for Alokai, including current security fixes. Node 26 is newer LTS, but is not the initial integration baseline. |
| Next.js | **16.4.6** | npm stable release. App Router; engine >=20.9, React 19 accepted by peers. |
| React / React DOM | **19.3.1**, matching pair | React npm stable; check React DOM matching release during installation. |
| TypeScript | **7.0.2**, compatibility gate | npm stable. Confirm Next/Vitest/tooling compatibility before adopting; record a concrete downgrade reason if required. |
| Tailwind CSS | **4.3.5** | npm stable. Use the matching PostCSS adapter after verifying its release. |
| Alokai ecosystem | **2.5.5** | Official release label. This is NOT the version of each package. |
| Alokai Connect | **2.5.2** | SDK/middleware/integration-kit package identified by the 2.5 release notes; registry access and exported APIs remain unverified. |
| Express for Alokai middleware | **4.22.3** | Matches Alokai's documented patched middleware baseline. Do not force Express 5 into this dependency tree. |
| body-parser for that middleware | **1.20.9** | Documented baseline; verify actual resolved lockfile entries. |
| Express for independent mock providers | **5.3.0** | npm latest, separate workspace; use 4.22.3 throughout if dual-major overhead adds no learning value. |
| Vitest | **5.1.0** | npm stable, Node >=22.12 supported. Also resolve its required Vite peer. |
| Playwright | **1.65.1** | `@playwright/test` npm stable, Node >=20. |
| React Testing Library | Resolve stable in M1 | Confirm React 19 peers; exact version not verified in this research. |
| OpenAPI | **3.1.0** contract format | JSON Schema-compatible contract; add a standards validator when dependencies can be installed. |
| Package manager | npm workspaces | Use an npm version supported on selected Node; record it with lockfile generation. No extra monorepo runner initially. |
| SonarQube / Snyk | M4, access-dependent | Configure and run on actual source; do not mark scans passed without reports. |
| GitHub Actions | checkout **7.0.1**, setup-node **7.1.0** | Official latest release pages verified; workflow execution remains pending publication. |

## Compatibility gates

1. Prove registry access/license for Connect. Do not infer private/public availability from failed network calls; those calls failed in this environment.
2. Resolve exact peers and transitives; generate `package-lock.json` using the selected runtime, never manually.
3. Prove the real SDK -> middleware -> provider flow and error behavior before UI expansion.
4. Typecheck, test and build the combination, including TS 7 tooling interoperability. Latest stable versions are not automatically a tested combination.
5. Verify matching React DOM/Tailwind adapter/Vite/RTL releases and their engines during installation.
6. Inspect actual Express/body-parser resolution. If a newer compatible security fix is available, prefer it and update the evidence.

## License and access

Alokai describes public middleware/SDK components and enterprise-only storefront starters/integrations. Build our own Next.js UI and custom integration. Do not copy an enterprise starter or assume commercial integration access. If Connect cannot be installed, preserve its intended adapter and record the blocker; an Express mock is not an Alokai integration.

## Primary sources

- [Node selected security release](https://nodejs.org/en/blog/release/v22.23.5)
- [Node release lines](https://nodejs.org/en/about/previous-releases)
- [Next npm metadata](https://registry.npmjs.org/next/latest)
- [React npm metadata](https://registry.npmjs.org/react/latest)
- [TypeScript npm metadata](https://registry.npmjs.org/typescript/latest)
- [Tailwind npm metadata](https://registry.npmjs.org/tailwindcss/latest)
- [Express npm metadata](https://registry.npmjs.org/express/latest)
- [Vitest npm metadata](https://registry.npmjs.org/vitest/latest)
- [Playwright npm metadata](https://registry.npmjs.org/@playwright/test/latest)
- [Alokai 2.5 release and package versions](https://docs.alokai.com/alokai-versions/2.5)
- [Alokai middleware setup](https://docs.alokai.com/middleware/guides/getting-started)
- [Alokai custom integration](https://docs.alokai.com/integrations/custom/quick-start)
- [Alokai licensing](https://alokai.com/news/alokai-licensing-and-open-source-changes)
- [Next testing overview](https://nextjs.org/docs/app/guides/testing)
- [Checkout release](https://github.com/actions/checkout/releases/tag/v7.0.1)
- [Setup Node release](https://github.com/actions/setup-node/releases/tag/v7.1.0)

The release page is more recent than some setup examples. Do not combine legacy `@vue-storefront/*` tutorials with current Connect imports without checking the versioned API.
