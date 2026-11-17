# Express integration BFF

The root `npm run dev` starts this service on loopback port 4000. `PROVIDER_URL` and `PROVIDER_TIMEOUT_MS` configure trusted server-side access; defaults are the local provider and 1500 ms. Health: `/healthz`.

- `GET /api/products`: validates optional collection/sort, calls one provider listing, normalizes all products and checks count/unique IDs. Empty lists return 200.
- `GET /api/products/:id`: validates ID and returns normalized detail from the same adapter.
- `GET /api/content/brand`: normalizes bounded plain-text editorial content. UI fallback belongs to Next, not this service.

Unexpected/repeated queries return 400. Upstream failure, invalid JSON/data and timeout map to safe 502/504 results. All responses carry no-store and a server-generated X-Request-ID propagated upstream. No raw bodies, exceptions or provider-specific fields reach the UI. There are no retries, write routes or duplicate commerce state.

Contracts: [public API](../../packages/contracts/bff-openapi.json), [provider](../../packages/contracts/openapi.json). The provider is fictional; cart and orders remain M3.
