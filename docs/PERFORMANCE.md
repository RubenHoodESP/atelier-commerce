# Performance (lab measurement)

Lab results from Lighthouse on the production build. They describe this build on this machine under simulated conditions; they are **not** field data (no real users, devices or networks) and must not be presented as real-world performance or as an improvement without a before/after measurement under the same conditions.

## How to reproduce

```sh
npm run build
npm start
```

In a second terminal (set `CHROME_PATH` if Chrome is not on the default path):

```sh
npm run perf -- 5
```

`scripts/measure-performance.mjs` runs `lighthouse@13.6.0` through `npx` (pinned; not a repository dependency, so it does not enter the lockfile or `npm audit`) against `/`, `/products`, `/products/watch-001` and `/cart`, performance category only, and prints the median of each metric. It is run on demand, not in CI.

## Results — 2026-11-18

Conditions: production build of `master` after #11 plus this slice; Next 16.4.6, BFF and fictional provider on loopback (no real network latency); empty bag; light theme (system default in headless Chrome); Lighthouse 13.6.0 mobile preset with **simulated** throttling (RTT 150 ms, 1638.4 kbps, CPU ×4); headless Chrome for Testing 153.0.0.0 on a 4-vCPU Linux cloud container, Lighthouse `benchmarkIndex` 2353.5; **median of 5 runs** per route.

| Route | Score | FCP | LCP | TBT | CLS | Speed Index |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | 99 | 0.64 s | 0.64 s | 94 ms | 0.000 | 0.66 s |
| `/products` | 100 | 0.62 s | 0.62 s | 89 ms | 0.000 | 0.62 s |
| `/products/watch-001` | 100 | 0.62 s | 0.62 s | 75 ms | 0.000 | 0.68 s |
| `/cart` | 100 | 0.76 s | 0.76 s | 89 ms | 0.000 | 0.76 s |

**Read LCP with care.** The LCP element reported by Lighthouse (`lcp-breakdown-insight`) is the header wordmark `a.brand` on `/`, `/products` and `/products/watch-001`, and the `h1` only on `/cart`. The headings of the first three routes use the CSS entrance (`.reveal`), which starts at opacity 0, and Chrome does not count invisible elements as LCP candidates. Their LCP figure therefore measures when the wordmark paints, not when the headline is fully visible: that happens about 0.8–0.9 s after it starts (700 ms entrance plus a 90 ms stagger on home and catalog, 180 ms on detail) with motion allowed, and immediately with `prefers-reduced-motion`. `/cart` has no entrance and its LCP is the heading itself (time to first byte 16 ms in that run).

FCP and LCP coincide because the first paint already contains the largest counted text and there is no hero image. CLS is 0 on every route, consistent with the metric-adjusted font fallback and entrance animations that only use opacity and transform. TBT (75–94 ms) is the main-thread cost of hydrating React/Next and, on catalog and bag, Motion.

## Limits

- Loopback serving removes real network latency even though Lighthouse simulates it; real deployments add TLS, CDN and distance.
- One machine, one Chrome version; `benchmarkIndex` is recorded because absolute numbers depend on the host CPU.
- The bag was measured empty; a full bag and the order flow (POST + redirect) are not measured.
- No field data (Core Web Vitals from real users) exists for this demo.
- Entrance animations make the reported LCP optimistic on three routes (see above). A fair comparison of the animation's cost would measure the same route with and without `prefers-reduced-motion`.
