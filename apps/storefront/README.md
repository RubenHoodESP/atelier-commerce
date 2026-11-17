# Storefront boundary

Next App Router/React renders /products/watch-001 on the server. lib/commerce.ts imports server-only and supplies trusted COMMERCE_API_URL configuration to the typed fetch client from @atelier/contracts/client. The shared client validates response bodies and HTTP status agreement, with a fresh timeout per request. No provider URL reaches browser bundles.

Unknown products use Next's 404 page. Provider failures produce retry UI; transport/protocol errors reach the error boundary. The initial illustration is inline SVG; the scaffold uses CSS. Catalog, URL filters and Tailwind are planned for M2; cart and writes for M3.

Run npm ci then npm run dev from the root (npm.cmd in PowerShell). Open http://127.0.0.1:3000. See [plan](../../docs/PLAN.md) and [decision](../../docs/adr/0003-express-bff.md).
