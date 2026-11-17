# Local provider boundaries

Express 4.22.3 serves one deterministic fictional product at `GET /products/watch-001` and a `/health` endpoint. Its vendor-shaped fixture uses `sku`, `unit_price.cents` and `available_units`; the Alokai adapter converts these to the domain contract.

Run from the repository root using `npm run dev`; default address: `http://127.0.0.1:4100`. Runtime configuration is server-only in `.env.example`. Failure injection belongs only to isolated tests.

Catalog listing/content modules are planned for M2. Cart, stock mutation, atomic order acceptance and in-memory idempotency are planned for M3; none is implemented yet. See [quality](../../docs/QUALITY.md).
