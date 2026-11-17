---
name: atelier-integration-review
description: Build or review Atelier Commerce Alokai integrations, Express APIs and provider contracts. Use for SDK, middleware, order, stock or upstream error changes.
---

# Integration work

Read `docs/ARCHITECTURE.md` and the relevant contract before editing. Resolve Alokai package access, exports and Express compatibility from the dated stack record; verify uncertain behavior against the selected version's official docs.

Keep SDK transport separate from the provider REST contract. Normalize provider DTOs at the adapter boundary. Keep pricing, inventory and idempotent order acceptance in commerce, not in React or duplicate middleware state.

Validate JSON at runtime. Reject browser-supplied authoritative prices and arbitrary proxy URLs. Scope guest-cart ownership server-side. Use bounded upstream calls, safe error envelopes and correlation IDs without logging secrets.

Test a successful boundary crossing and the relevant failure: invalid input, upstream timeout, stock race or duplicate confirmation. Never automatically retry a mutation without idempotency semantics. Inspect actual resolved dependencies before marking a security issue fixed.

For each change explain the request path, trust boundary, verification and demo limitation. Mark mocked services honestly. A plain Express facade does not complete the real Alokai milestone.
