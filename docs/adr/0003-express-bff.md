# ADR 0003: Own the integration boundary with Express

Status: accepted, 2026-11-17. User explicitly requested a fully public Express integration instead of an external integration SDK.

## Decision

Use Next Server Components -> a small typed fetch client -> Express REST BFF -> vendor-shaped HTTP provider. Preserve price/stock ownership in the provider. Keep normalization, request correlation and bounded upstream calls at the BFF. The client validates untrusted response JSON; TypeScript alone is insufficient.

GET /api/products/:id replaces the former RPC transport. Keep the ProductResult discriminated union and map failures to explicit HTTP statuses. Server Components render missing products with notFound and offer retry UI for infrastructure failures. Transport/protocol failures use a generic exception handled by Next's error boundary.

The BFF and provider use the already-tested Express 4.22.3. The BFF is native ESM; the retired CommonJS integration bridge and external SDK dependencies are removed. COMMERCE_API_URL replaces the old SDK-specific variable. The public client lives alongside contracts to avoid introducing a new workspace for a single endpoint.

## Consequences

No vendor account, private registry or paid integration package is required. We own adapters, transport validation, tests and future maintenance; commercial connectors are not provided automatically. Public schemas are separate from the provider contract. Catalog/cart/order work stays in its original milestones. Do not describe this project as experience using a vendor-specific SDK.

See [architecture](../ARCHITECTURE.md) and [validation status](../STATUS.md).
