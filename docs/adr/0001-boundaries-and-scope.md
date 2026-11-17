# ADR 0001: Small composable storefront

Status: accepted for planning; integration feasibility pending M1.

Use Next.js App Router, an Alokai/Express integration app, and one local provider app with commerce/content modules. Share only public contracts. Keep provider shape normalization at the integration boundary and pricing/stock/order acceptance at the commerce boundary.

This creates meaningful independent interfaces while keeping local startup manageable. A single Next-only application would be simpler, but would not exercise the middleware responsibility in the role. Independent deployable microservices for every capability would add operational work disproportionate to the learning objective.

Use explicit server/client boundaries, integer cents and a same-origin transport for cart mutations. In-memory fixtures are acceptable for a single-process learning demo with documented resets. Production orders would need durable transactions, idempotency persistence, authorization, auditability and recovery.

Do not add full Clean Architecture scaffolding, a generic UI package, database, Redis or event bus until a concrete requirement warrants it. Explain trade-offs rather than counting patterns.
