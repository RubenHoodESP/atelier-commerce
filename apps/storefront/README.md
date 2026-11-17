# Storefront boundary

Next.js App Router / React with a server-rendered `/products/watch-001` page. `lib/commerce.ts` is server-only and configures the official public Alokai SDK 3.4.2. The page displays normalized provider data; unknown products use Next's 404 page and failures have retry UI. No browser request goes directly to a provider.

Run `npm ci` then `npm run dev` from the repository root; open `http://127.0.0.1:3000`. The initial watch illustration is inline SVG. This M1 scaffold uses CSS; Tailwind, the catalog, filters and further responsive/accessibility work belong to M2. Cart and order rules belong to M3.

See [the plan](../../docs/PLAN.md) and [the public Alokai decision](../../docs/adr/0003-public-alokai-integration.md).
