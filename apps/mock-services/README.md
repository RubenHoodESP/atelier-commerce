# Local provider boundaries

Express serves fictional commerce and editorial modules in one process. Run from the root with `npm run dev`; default port 4100, loopback only. Health: `/health`.

- `GET /products`: 12 vendor-shaped fixtures; collection and sort query parameters, `{items,count}` response.
- `GET /products/:id`: same fixtures as listing, unknown IDs return 404.
- `GET /content/brand`: vendor-shaped editorial fields, independent of commercial prices/stock.

The BFF normalizes `sku`, `unit_price.cents`, `available_units` and editorial field names. Catalog sorting/filtering occurs here, with ID tie-breaking. Factory options support isolated empty datasets in tests. Delays/fault controls are provided only by the E2E harness, never by application endpoints.

Cart, stock mutation, atomic acceptance and idempotency remain M3. No database, CMS or external account is needed. See [quality](../../docs/QUALITY.md).
