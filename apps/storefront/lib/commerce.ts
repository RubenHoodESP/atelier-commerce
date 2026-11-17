import 'server-only';
import { createCommerceClient } from '@atelier/contracts/client';

export function getCommerce() {
  return createCommerceClient({
    baseUrl: process.env.COMMERCE_API_URL ?? 'http://127.0.0.1:4000/api',
    timeoutMs: Number(process.env.COMMERCE_API_TIMEOUT_MS ?? 2500),
  });
}
