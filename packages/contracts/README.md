# Demo contracts

src/index.ts exports normalized domain types, runtime guards, HTTP error mapping and CommerceClient. src/client.ts implements the typed fetch transport and validates both response JSON and HTTP status. It has no React, Express or private SDK dependency. The storefront wrapper keeps configuration server-only.

- [bff-openapi.json](bff-openapi.json): implemented public Express GET /api/products/{id}, normalized results and HTTP errors.
- [openapi.json](openapi.json): implemented vendor-shaped provider product GET; planned M3 order POST and domain models.
- [examples.json](examples.json): product/order design examples; orders are not implemented yet.

Swagger Parser validates both OpenAPI 3.1 documents. Integration tests exercise the actual typed client, Express BFF and HTTP provider. Client tests cover invalid responses, status mismatch, redaction and timeout. See [architecture](../../docs/ARCHITECTURE.md).
