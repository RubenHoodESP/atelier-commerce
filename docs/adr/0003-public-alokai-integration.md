# ADR 0003: Use the public Alokai integration for M1

Status: accepted for the learning project, 2026-11-17.

## Evidence

The CI runner can reach npm. `@alokai/connect@2.5.2` and its package root return 404 on the public registry. The Alokai registry at `https://npm.alokai.cloud` returns 401 for anonymous access. Current Connect credentials are unavailable; a terminal DNS failure alone was not used as evidence of package availability.

The official public packages `@vue-storefront/middleware@5.4.1` and `@vue-storefront/sdk@3.4.2` install without a peer override and declare BSD-3-Clause licenses. Their published declarations and implementation were inspected in CI. They expose `apiClientFactory` / `createServer` and `initSDK` / `buildModule` / `middlewareModule` respectively. These are older public APIs, not Connect 2.5 imports.

## Decision

Implement a real public Alokai SDK -> middleware -> custom integration -> HTTP provider slice. Use Express 4.22.3 throughout, avoiding an unnecessary second Express major. Build our own Next UI. Keep provider-shaped data inside the adapter and SDK initialization in a server-only module.

The public middleware loads integration locations with `require()` and returns a Node HTTP server from asynchronous `createServer()`. A narrow `.cts` bridge compiles to `.cjs`, then dynamically imports the ESM product adapter. Do not describe this server as an Express application returned by Connect.

The SDK calls the middleware's RPC endpoint with POST arguments. `ProductResult` explicitly distinguishes success from domain/infrastructure failures. These resolved results use HTTP 200 on this transport. Next maps unknown products to its 404 page and infrastructure failures to a retry UI. Do not claim that an RPC failure automatically has the REST status in the target architecture table.

## Consequences

M1 can validate the architecture with actual Alokai libraries without claiming current Connect experience. Connect-specific installation, types and migration remain an access-dependent follow-up. Revisit the adapter, SDK module and wire behavior if credentials become available; do not assume a drop-in upgrade. External commerce and content systems remain local fictional fixtures.

No custom Express facade replaces Alokai. Final compatibility evidence and exact versions belong in [STATUS](../STATUS.md), [STACK](../STACK.md) and the npm-generated lockfile.
