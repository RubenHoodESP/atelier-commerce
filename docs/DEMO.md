# Five-minute demo

A rehearsal script for presenting Atelier Commerce in an interview. Speak to decisions and evidence, not to features alone. Everything shown is local and fictional; say so up front.

## Before the demo (once)

Terminal 1, production build:

```sh
npm ci
npm run build
npm start
```

Open `http://127.0.0.1:3000` in Chrome with DevTools docked. Keep terminal 2 at the repository root for the live test (it runs on free ports, so it works while the stack is up). Do not run the E2E suite during the demo: it needs ports 3000/4000/4100.

Reset state between rehearsals by restarting `npm start` (carts, orders and stock live in memory).

## Script

### 0:00–0:30 — Context

"Atelier is a small fictional watch store I built to practise senior frontend decisions end to end. Next.js App Router renders on the server and calls a typed REST client; an Express BFF validates input, calls a vendor-shaped provider and normalizes its responses. Commerce owns prices, stock and order acceptance; the browser only ever sends IDs and quantities. Everything external is simulated locally."

### 0:30–1:30 — Catalog: URL state and progressive enhancement

1. Open `/products`, choose **Meridian**, then **Price: high to low**. Point at the URL: `?collection=meridian&sort=price-desc`.
2. Reload, open a watch, click **Back to collection**, then the browser Back button: the selection survives. "The URL is the single source of truth; the controls are derived from it, not synced through React state."
3. DevTools → Command menu → *Disable JavaScript*, reload and filter again: the native GET form still works. Re-enable JavaScript.
4. Optional: `/products?sort=bad&unexpected=1` redirects to the canonical URL; the BFF would answer 400 for the same query.

### 1:30–2:30 — Bag: commerce-owned cart and accessible edits

1. Open a watch, **Add to bag**. Header shows **Bag 1**.
2. In the bag, set quantity to 2 and **Update**; the subtotal is recalculated by commerce. Ask for more than the stock: "That quantity is not available."
3. **Remove** a line: the status message is announced and receives focus. "Controls are not disabled while pending: disabling the focused button drops keyboard focus, and set-quantity is idempotent, so a repeated submission is harmless."
4. Mention: the cart lives in the provider; the browser only holds an opaque HttpOnly cookie with its random ID; Server Actions reject cross-origin posts (covered by an E2E test).

### 2:30–3:45 — Order: idempotency and the critical section

1. Add a watch, **Place order** → confirmation with commerce prices; the header count resets and the detail page shows less stock.
2. Explain: "The bag renders a random idempotency key. If a submission times out, the retry carries the same key, so the provider returns the original order instead of creating a second one."
3. In terminal 2:

   ```sh
   npx vitest run tests/order-integration.test.ts -t "last unit|same key create"
   ```

   "Two concurrent orders compete for the last unit; exactly one wins. Three concurrent requests with one key create one order. In the provider, the stock check, decrement, order creation and key record run synchronously with no `await` in between. I verified the test is meaningful by injecting an `await` there: both tests failed. With several processes this would need a database transaction."

### 3:45–4:20 — Themes and accessibility

1. Switch **Dark** in the header, then view source: `<html … data-theme="dark">`. "The choice is a cookie read on the server, so there is no flash and it works without JavaScript."
2. "Both palettes are checked for WCAG contrast by a unit test, and axe audits every page and state in both themes in CI. axe found one real issue — names that did not contain the visible text — which I fixed with stretched-link cards."

### 4:20–5:00 — Evidence and limits

"CI runs structural checks, a dependency-audit gate with a dated accepted risk, type-aware lint, unit and integration tests, a production build and Playwright E2E. Lighthouse lab runs score 99–100 with CLS 0, but that is loopback, simulated throttling and an optimistic LCP on routes with an entrance animation — not field data. State is in memory and single-process; there are no payments or accounts; SonarQube and Snyk were not run."

## If something goes wrong

- Port in use: stop other servers or set the ports documented in `.env.example`.
- Empty bag after a restart: expected, the provider is in memory.
- Theme looks wrong: the switch may be on **Auto** following the OS setting.

## Follow-up questions to expect

See [INTERVIEW](INTERVIEW.md) for prepared answers.
