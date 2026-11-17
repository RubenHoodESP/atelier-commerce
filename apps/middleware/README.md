# Express integration boundary

Express 4.22.3 implements GET /api/products/:id and /healthz. server.ts owns HTTP routing, validation of server configuration, safe status mapping and request IDs. product.ts calls the provider with a bounded timeout and normalizes its vendor-shaped response. The app is native ESM; no integration loader or CommonJS bridge is needed.

The public response is ProductResult: HTTP 200 on success; 400 for invalid input; 404 for missing product; 502 for failed/invalid provider responses; 504 for provider timeout; 500 for unexpected internal errors. Every response has no-store and a server-generated X-Request-ID. Raw error bodies/stacks are not exposed. CORS is not enabled because the storefront server calls this API directly.

Run npm run dev from the repository root. Default port 4000, loopback only. See [public contract](../../packages/contracts/bff-openapi.json) and [architecture](../../docs/ARCHITECTURE.md).
