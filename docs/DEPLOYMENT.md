# Deployment

Production layout (decision and limits: [ADR 0010](adr/0010-deployment.md)):

```
Browser ──HTTPS──▶ Vercel (Next.js storefront, region fra1)
                      │  server-side only, Authorization: Bearer <BFF_API_TOKEN>
                      ▼
                   Render web service, ONE instance (region frankfurt)
                   └─ one Node process: Express BFF on 0.0.0.0:$PORT
                                        fictional provider on 127.0.0.1:4100 (not exposed)
```

The browser never calls the BFF. The token lives only in the two hosts' environment settings.

## 0. Prerequisites

- The deployment files are on `master`: `Dockerfile`, `.dockerignore`, `render.yaml`, `apps/storefront/vercel.json`, `scripts/serve-backend.mjs`.
- CI is green on `master` (Commerce integration, Foundation and Backend image).
- A Render account and a Vercel account connected to the GitHub repository.
- Generate one token (at least 32 characters) and keep it in a password manager:

  ```sh
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

## 1. Backend on Render

1. Optional: validate the Blueprint with the Render CLI (`render blueprints validate render.yaml`).
2. Render dashboard → **New → Blueprint** → select the repository and branch `master`. Render reads `render.yaml` and proposes the service `atelier-backend` (Docker, Frankfurt, plan Starter, 1 instance, health check `/healthz`).
3. When asked for `BFF_API_TOKEN`, paste the token. Create the Blueprint and wait for the first deploy.
4. Note the service URL, e.g. `https://atelier-backend.onrender.com`, and check:

   ```sh
   curl -s https://atelier-backend.onrender.com/healthz
   ```

   Expected: `{"status":"ok"}`. Then `curl -s -o /dev/null -w "%{http_code}\n" https://atelier-backend.onrender.com/api/products` must print `401`.

Keep the instance count at **1** and do not enable autoscaling. Avoid free plans that sleep: the first request after a sleep exceeds the 2.5 s client timeout.

## 2. Storefront on Vercel

1. Vercel → **Add New → Project** → import the repository.
2. **Root Directory:** `apps/storefront`. Keep "Include files outside the root directory" enabled (needed for the npm workspaces). Framework: Next.js. Install and build commands come from `apps/storefront/vercel.json`.
3. **Node.js version:** 22.x (Project Settings → Build and Deployment).
4. **Environment variables** (Production; also Preview if previews should work):

   | Name | Value |
   | --- | --- |
   | `COMMERCE_API_URL` | `https://atelier-backend.onrender.com/api` (your Render URL + `/api`) |
   | `BFF_API_TOKEN` | the same token as on Render |
   | `COMMERCE_API_TIMEOUT_MS` | `2500` |

   Never prefix these with `NEXT_PUBLIC_`: that would send them to the browser.
5. Deploy.

## 3. Verify the deployment

On the Vercel URL:

- `/products` lists 12 watches; filters change the URL; a detail page opens.
- `/products/watch-999` returns HTTP 404.
- Add to bag → the header shows the count → change a quantity → place an order → confirmation; the detail page shows one unit less.
- Theme switch: Dark persists after a reload.
- `/robots.txt` disallows everything and pages carry `noindex, nofollow`.
- The browser's network panel shows no request to the Render host (all BFF calls are server-side).

If pages show "Temporarily unavailable": check `COMMERCE_API_URL`, that the tokens match (the BFF answers 401 otherwise) and that the Render service is live.

## Operations and limits

- **State resets** on every Render deploy or restart: carts, orders and stock return to the fixtures. A guest's old cart cookie then simply shows an empty bag.
- **One instance only.** Scaling the Render service breaks the order critical section and splits in-memory state.
- **Rotating the token:** set a new value on Render and Vercel, then redeploy both (requests fail with 401 in between).
- **Pushes to `master` redeploy** both hosts automatically, which also resets backend state.
- This is a fictional demo: no payments, accounts or personal data, and no backups.
