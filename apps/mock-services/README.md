# Local provider boundaries

Planned Express application with separate commerce/content modules. No runnable server exists yet.

Use deterministic fictional fixtures. Commerce owns prices, inventory, atomic order acceptance and idempotency. Content serves brand copy. Expose different provider and public DTOs so the middleware performs real adaptation.

In-memory data is single-process and resets on restart. Failure injection must be restricted to tests. See [quality](../../docs/QUALITY.md).
