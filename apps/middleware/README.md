# Middleware boundary

Actual public Alokai middleware 5.4.1, built on its supported Express 4 major. `src/server.ts` configures the custom `commerce` integration; `src/product.ts` validates input, calls the provider with a bounded timeout and normalizes its response. Provider credentials and shapes stay here.

`src/integration.cts` is the small CommonJS bridge required by this middleware's integration loader. The adapter and application remain ESM. The SDK calls `POST /commerce/getProduct` with its RPC argument array; it receives a typed `ProductResult`. Do not confuse a resolved RPC failure with a REST error status.

Run from the repository root using `npm run dev`. Local health check: `http://127.0.0.1:4000/healthz`. Connect 2.5 credentials are unavailable; these older public APIs are an explicit learning-project choice. See [ADR 0003](../../docs/adr/0003-public-alokai-integration.md) and [architecture](../../docs/ARCHITECTURE.md).
