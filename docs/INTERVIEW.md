# Interview evidence to build

M1 now provides a real public Alokai product slice. The broader table remains a checklist; cart, orders, current Connect APIs and audits are still pending.

## M1 rehearsal

1. Run `npm ci` and `npm run dev`; open `/products/watch-001`, then `/products/watch-999`.
2. Trace the request through the Server Component, server-only SDK, `integration.cts`, product adapter and vendor fixture. Explain why provider data differs from the domain contract.
3. Explain runtime validation versus TypeScript, integer cents, no-store reads, bounded provider calls and business versus infrastructure failures. Demonstrate a failure using the relevant integration test.
4. Explain the public SDK Proxy: returning its module directly from an async helper causes Promise resolution to call a generated `then` endpoint. The test helper returns a plain wrapper instead. Never suppress the resulting rejection.
5. Without AI, change the fixture's cents to 125099 and predict the displayed price. Run the focused integration/browser tests, update expected business evidence deliberately, then restore the fixture. Identify which assertions should catch the change.

English explanation: “The page renders on the server and calls a typed SDK boundary. A custom Alokai integration validates input, calls a vendor-shaped HTTP API and normalizes its result. Provider failures are bounded and safe. We use the official older public SDK and middleware; current Connect requires credentials, so I would not claim that migration is already tested.”

## Evidence to extend

| Topic | Evidence to prepare | Follow-up to rehearse |
| --- | --- | --- |
| Next/React | Server-rendered product + small interactive cart | Why this server/client boundary? What reaches the browser? |
| Alokai | Real SDK method -> custom integration -> provider | Which code belongs to Alokai, and which did you write? |
| Express | Validation/error handling and provider routes | What happens if middleware does not respond or call next? |
| Composable architecture | Independent commerce/content adapters | Cost of another boundary? How would a provider change affect UI? |
| Testing | Price, stock race, idempotency and provider failure tests | Which defects could these tests miss? |
| Performance | Measured before/after for one change | Cache invalidation? Private-data leaks? Measurement conditions? |
| Security | Server pricing, input boundaries and secret placement | Why does a hidden button not provide authorization? |
| Collaboration | Small commits and short ADRs | What did you simplify and what would need redesign for production? |

For each feature explain: need -> constraints -> alternatives -> choice -> implementation -> verification -> limitations. Practise a five-minute English demo and a small unassisted change (add a filter, debug a timeout, alter a stock rule). Identify where AI helped and how you checked its output. Never describe a mock or a planned milestone as a production integration.
