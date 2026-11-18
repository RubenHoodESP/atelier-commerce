# Interview preparation

Atelier Commerce is a learning exercise: a fictional watch store with Next.js, an Express BFF and simulated providers. Describe it as such; it is not professional experience with commercial platforms. For each decision use the pattern **need → constraints → alternatives → choice → verification → limitations**, and be ready to say how AI helped and how its output was checked (tests, mutation checks, clean-clone CI reproduction).

The five-minute walkthrough is in [DEMO](DEMO.md). Evidence for every claim is in [STATUS](STATUS.md).

## One-minute summary

"The page renders on the server and calls a typed REST boundary. An Express BFF validates input, calls a vendor-shaped HTTP API and normalizes its result; the provider owns prices, stock and order acceptance. Calls are bounded and never retried automatically; failures map to safe HTTP statuses with request IDs; JSON is validated at runtime because TypeScript does not check network data. The guest cart lives in commerce behind an opaque HttpOnly cookie; orders are idempotent and the last unit cannot be sold twice. Quality is enforced in CI: type-aware lint, a dependency-audit gate, unit, integration and E2E tests including axe in both themes."

## Decision stories

### URL as the source of filter state (M2)
- **Need:** shareable, reload-safe catalog filters that work without JavaScript.
- **Choice:** collection and sort live only in the URL; a native GET form works without JavaScript; a small client component adds transitions and focus restoration. Invalid or unknown parameters redirect to the canonical URL; the API rejects them with 400.
- **Rejected:** React state synced with effects (two sources of truth); a shared `loading.tsx` (it streamed a 200 for unknown products and hid content without JavaScript).
- **Verification:** E2E for reload, back/forward, detail return, no-JS filtering.

### Guest cart owned by commerce (M3, ADR 0005)
- **Need:** a bag without accounts, with authoritative prices.
- **Choice:** the provider stores carts in memory and calculates totals; Next keeps only the random cart ID in an HttpOnly, SameSite=Lax cookie; writes go through Server Actions, which reject cross-origin requests. The BFF accepts exactly `{productId, quantity}` and rejects price fields.
- **Rejected:** a signed cookie with the whole cart (moves the cart out of commerce, needs a signing secret); a hand-written route handler with origin checks (duplicates framework protection).
- **Limitations:** state resets on restart; possession of the ID is ownership.

### Idempotent orders and a synchronous critical section (M3, ADR 0006)
- **Need:** never sell the last unit twice; a retried submission must not create a second order.
- **Choice:** a per-render idempotency key kept across failed attempts; same key and body replays the order (200), another body conflicts (409); the provider's idempotency lookup, re-pricing, all-or-nothing stock check, decrement and order creation run with no `await` in between.
- **Verification:** concurrent last-unit and same-key tests; a mutation check (an injected `await`) made both fail.
- **Limitations:** valid for a single Node process only; production needs a durable transaction and a unique key constraint.

### Accessibility as a tested property (M3–M4)
- Status regions stay mounted and receive focus after removals; controls stay enabled because disabling the focused button drops focus (an E2E test caught it).
- axe runs on every page and state in both themes; it found `label-content-name-mismatch` (WCAG 2.5.3) on cards and the bag link, fixed with stretched-link cards and a visible-count name. The audit waits for the settled page: auditing mid-animation produced false contrast findings.
- A unit test enforces WCAG contrast for both palettes read from the stylesheet.
- **Limit:** a manual screen-reader pass is still pending ([checklist](A11Y_MANUAL_CHECK.md)).

### Themes without flash (M4, ADR 0009)
- Auto follows the system; an explicit choice is an HttpOnly cookie read by the server, which renders `data-theme`, so the first paint is correct and the switch works without JavaScript. `localStorage` was rejected: the server cannot see it, which forces a blocking script.

### Motion that never hides content (ADR 0007)
- Entrances are CSS so server HTML is visible without JavaScript; Motion only animates later changes (`initial={false}`), respects reduced motion, and is limited to the catalog and bag.
- **Lesson:** a stress run (1 failure in 120) showed that lazily loaded Motion features left exiting cards on screen; loading them synchronously fixed it (0 in 480). The first bundle measurement also missed the lazy chunk; it was corrected.

### Quality gates that can fail honestly (M4)
- Type-aware lint replaced unsafe casts with narrowing guards. It first failed in CI because CI lints before building the shared contracts; reproduced from a clean clone and fixed by building them first.
- The dependency audit fails on production high/critical advisories and on expired or unlisted dev ones; it fails if no report can be produced.
- Lighthouse results are lab data with recorded conditions; the reported LCP is optimistic on routes whose headings fade in.

## Follow-up questions

| Question | Short answer |
| --- | --- |
| What runs on the server vs the client? | Pages, data fetching, cookies and Server Actions on the server; filters, bag edits, theme preview and Motion as small client components. |
| What if a handler never responds? | Per-request timeouts (provider 1.5 s, client 2.5 s) map to 504 with a request ID; writes are not retried. |
| Why not retry the order on timeout? | The write may have been applied; only the idempotency key makes a retry safe, and the user retries with the same key. |
| What changes when the provider changes? | Only the BFF adapter and the provider contract; public DTOs and pages stay. |
| Why does hiding a button not authorize a write? | The server re-validates every input; commerce checks stock and prices regardless of the UI. |
| Which defects can the tests miss? | Real network and multi-process races, real devices, screen-reader nuances, field performance. |
| How did you use AI? | For drafts and refactors; accepted only what tests, mutation checks, axe and clean-clone CI confirmed, and corrected claims that measurement disproved. |

## Rehearsal without AI

Before an interview, make one of the changes in [EXERCISES](EXERCISES.md) yourself and explain which tests protect it.
