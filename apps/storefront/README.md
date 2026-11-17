# Storefront

Next Server Components render the editorial home, `/products` catalog and `/products/[id]` detail. Configuration is server-only. The catalog loads commerce and editorial content concurrently, retaining real products with a local editorial fallback if content fails.

Collection/sort state lives in the URL. A small Client Component progressively enhances a native GET form with automatic navigation, transition announcements and disabled controls while pending. Reload, history and the detail return link preserve selection. Unknown, repeated or invalid page query parameters are canonicalized.

Tailwind 4/PostCSS tokens maintain the warm Atelier palette, editorial type, keyboard focus and responsive grids. Local SVG illustrations have product-specific labels. Out-of-stock watches remain viewable; no purchase controls exist yet.

Commerce errors expose retry; transport/protocol failures reach the error boundary. Unknown products produce 404. Catalog loading, empty, failure and editorial fallback are covered by tests. Cart/orders remain M3 and full audits M4.
