# Demo contracts

`src/index.ts` exports normalized domain types, runtime guards and the typed Alokai `CommerceEndpoints` / `ProductResult` boundary. It has no React or Express dependency. Provider-specific field names live in the integration adapter.

[openapi.json](openapi.json) documents the local mock provider: vendor-shaped product retrieval is implemented in M1; order creation is explicitly planned for M3. It also records normalized domain schemas. It does not describe Alokai's generated RPC transport. Runtime integration tests exercise normalization and safe failures; Swagger Parser validates the full OpenAPI 3.1 document.

Order examples and invariants remain design inputs until their implementation. See [examples](examples.json) and [the architecture](../../docs/ARCHITECTURE.md).
