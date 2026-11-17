import { ERROR_STATUS, isProductResult, type CommerceClient } from './index.js';

export class CommerceTransportError extends Error {
  constructor() { super('The collection service could not be reached or returned an invalid response.'); }
}

// Shared transport; the Next wrapper keeps its configuration server-only.
export function createCommerceClient({ baseUrl, timeoutMs = 2500 }: {
  baseUrl: string; timeoutMs?: number;
}): CommerceClient {
  const base = new URL(baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw new Error('Invalid commerce API URL configuration.');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) throw new Error('Invalid commerce API timeout.');
  return {
    async getProduct(query) {
      try {
        const response = await fetch(new URL(`products/${encodeURIComponent(query.id)}`, base), {
          cache: 'no-store', signal: AbortSignal.timeout(timeoutMs), headers: { Accept: 'application/json' },
        });
        const result: unknown = await response.json();
        if (!isProductResult(result) || response.status !== (result.ok ? 200 : ERROR_STATUS[result.error.code])) {
          throw new CommerceTransportError();
        }
        return result;
      } catch { throw new CommerceTransportError(); }
    },
  };
}
