---
name: atelier-frontend-review
description: Build or review Atelier Commerce React and Next.js UI changes with accessible interaction, server-client boundaries and focused tests. Use for pages, components and frontend data access.
---

# Frontend work

Read the changed feature and its acceptance criteria. Keep product data loading server-side when appropriate; add Client Components for necessary interaction. Prevent server-only API configuration and credentials from entering client bundles.

Represent shareable catalog filters in the URL. Derive values rather than duplicating state in effects. Avoid shared mutable cart state on the server. Define cache behavior explicitly; never share-cache guest-specific data.

Parallelize independent reads and avoid unnecessary browser JavaScript. Measure production behavior before adding memoization, caching layers or performance claims. Use semantic controls, visible keyboard focus and announced async/cart status.

Exercise loading, empty, failure, unknown-product and out-of-stock states. Choose component tests for meaningful interaction and E2E tests for full journeys/async Server Components. Prefer behavior assertions over hook internals.

Explain one boundary or trade-off in terms the learner can defend. Consult official React/Next documentation for version-specific uncertainty instead of loading a broad framework manual.
