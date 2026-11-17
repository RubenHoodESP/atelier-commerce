# Current state

- Milestone: **M1 product slice implemented and validated using public Alokai**. Current Connect 2.5-specific work remains blocked by registry authorization; this is an explicit scope adjustment, not a Connect completion claim. See ADR 0003.
- Runtime: Node 22.23.5 / npm 10.9.9 on GitHub Actions Ubuntu. Exact direct versions and npm-generated lockfile committed. npm ci succeeds without peer overrides.
- Flow: Next 16.4.6 / React 19.3.1 -> public SDK 3.4.2 -> public middleware 5.4.1 -> custom integration -> local Express provider. TypeScript 7.0.2 passes typecheck and production build. Actual Express/body-parser resolution: 4.22.3 / 1.20.9, one major each.
- Implemented: product SSR, safe 404/retry UI, input/response guards, vendor normalization, integer cents, no-store reads, 1500 ms provider timeout, typed failures and upstream request ID.
- Verification on Node 22.23.5: npm ci; npm run check; npm run typecheck; npm test (**8 passed**, including full OpenAPI 3.1 validation); npm run build; Chromium install; npm run test:e2e (**2 passed** against production Next and real public Alokai). Evidence: https://github.com/RubenHoodESP/atelier-commerce/actions/runs/44070965486. Final documentation/contract cleanup receives the same CI checks on the feature branch/PR.
- Tests cover successful normalization, unknown product, invalid input without upstream access, upstream 503/body redaction, malformed response and timeout; browser checks initial HTML, navigation, localized price, stock and HTTP 404.
- Not implemented: catalog/filtering/content provider, Tailwind, cart, order writes, persistence, auth or payments. Lint, SonarQube, Snyk and measured performance/accessibility audits have not run.
- Publication: feature branch feat/m1-product-integration in private RubenHoodESP/atelier-commerce; master/M0 history preserved. Three repository-local workflows remain versioned; no global installation claim.

## Environment and access

Terminal DNS prevents npm installation and Git remote operations in this session. Installation/build/browser checks ran on the actual CI runner, not this Windows host. The generated lockfile was recovered from CI with a SHA-256 check. No runtime success is claimed on the host.

Anonymous public Connect metadata returns 404; the official Alokai registry requires authentication (401). Official public SDK/middleware packages install successfully. Use their versioned APIs; migrating to Connect is a separate access-dependent task.

## Next action

Review the M1 pull request, then M2 in PLAN.md: expand deterministic catalog data, add listing and URL filters, and introduce Tailwind deliberately. Before expanding, rehearse the product path and change one fixture without AI. See INTERVIEW.md.
