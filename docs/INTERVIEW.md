# Interview preparation

M1 provides a real Express BFF product slice; cart/orders, catalog and audits remain future work.

## Rehearse M1

1. Run npm.cmd ci and npm.cmd run dev; open /products/watch-001 and /products/watch-999.
2. Trace the Server Component -> server-only configuration -> typed fetch client -> Express route -> product adapter -> vendor fixture. Explain each trust boundary.
3. Explain runtime JSON validation versus TypeScript, integer cents, no-store, fresh per-request timeouts, HTTP status mapping and business versus infrastructure failures.
4. Show a provider 503 or timeout integration test. Explain why raw bodies/stacks are hidden and how X-Request-ID correlates requests.
5. Without AI, change the fixture price to 125099 cents, predict the display, inspect the affected assertions, then restore it. Explain which checks should catch the change.

English demo: “The page renders on the server and calls a typed REST boundary. Our Express BFF validates input, calls a vendor-shaped HTTP API and normalizes its result. The provider owns prices and stock. Calls are bounded, failures have safe HTTP statuses and request IDs, and the client validates JSON at runtime. External services are simulated locally.”

## Extend the evidence

| Topic | Evidence | Follow-up |
| --- | --- | --- |
| Next/React | Product SSR, future interactive cart | What runs on the server/client? |
| Express/APIs | REST statuses, validation, provider adapter | What happens if a handler never responds? |
| Architecture | Independent provider contract and domain DTO | What changes when the provider changes? |
| Testing | Real HTTP boundary, contract and client checks | Which defects can these tests miss? |
| Business | Future price, stock race and idempotency tests | Who owns the transaction? |
| Performance | Future measured production comparison | Cache invalidation and measurement conditions? |
| Security | Server configuration, runtime guards, future ownership | Why does hiding a UI control not authorize a write? |

Explain need -> constraints -> alternatives -> choice -> verification -> limitations. Identify how AI helped and how its output was checked. Describe this as an Express integration exercise with fictional providers.
