# Public demo contract

[openapi.json](openapi.json) specifies the intended **mock commerce provider API**, not Alokai's generated endpoints. It is a design input, not an implemented API. Alokai SDK transport mapping is verified in M1.

The initial contract defines product retrieval and order creation. Extend it with catalog, content and cart operations when their slices are implemented. Schema examples are checked by the foundation script for key invariants; add a full OpenAPI/JSON Schema validator in M1.
