# Demo contracts

`src/index.ts` exports normalized products, catalog queries/results, editorial content, runtime guards and HTTP error mapping. `src/client.ts` implements separate commerce/content clients over a small shared fetch transport, validating JSON and HTTP status. There are no React, Express or private SDK dependencies; Next keeps configuration server-only.

- [bff-openapi.json](bff-openapi.json): implemented public product detail, catalog and brand content reads.
- [openapi.json](openapi.json): implemented vendor-shaped commerce/editorial reads; planned M3 order POST and domain models.
- [examples.json](examples.json): product/order design examples; orders are not implemented.

Catalog success is `{ok:true,products,total}` with the total equal to the complete returned list length. IDs must be unique. Content success is `{ok:true,content:{headline,intro,story}}`. Failures retain the safe M1 envelope and HTTP mapping. `catalogSearch()` serializes URL state without default values.

Swagger Parser validates both OpenAPI 3.1 documents. Real HTTP tests exercise client -> BFF -> provider, and client tests reject malformed data, contradictory statuses and duplicate IDs. See [architecture](../../docs/ARCHITECTURE.md).
