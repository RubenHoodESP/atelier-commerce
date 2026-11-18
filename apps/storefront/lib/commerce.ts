import 'server-only';
import { cache } from 'react';
import { createCommerceClient } from '@atelier/contracts/client';

export function getCommerce() {
  return createCommerceClient({
    baseUrl: process.env.COMMERCE_API_URL ?? 'http://127.0.0.1:4000/api',
    timeoutMs: Number(process.env.COMMERCE_API_TIMEOUT_MS ?? 2500),
    // Server-only secret for the deployed BFF; never exposed to the browser (no NEXT_PUBLIC_ prefix).
    apiToken: process.env.BFF_API_TOKEN || undefined,
  });
}

// One provider read per request, shared by generateMetadata and the page.
export const getProductOnce = cache((id: string) => getCommerce().getProduct({ id }));
