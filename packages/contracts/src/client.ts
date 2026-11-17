import { ERROR_STATUS, catalogSearch, isCatalogResult, isContentResult, isProductResult,
  type CommerceClient, type ContentClient, type Failure } from './index.js';

export class CommerceTransportError extends Error {
  constructor() { super('The collection service could not be reached or returned an invalid response.'); }
}
type ClientSettings = { baseUrl: string; timeoutMs?: number };

function transport({ baseUrl, timeoutMs = 2500 }: ClientSettings) {
  const base = new URL(baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw new Error('Invalid commerce API URL configuration.');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) throw new Error('Invalid commerce API timeout.');
  return async <T extends { ok: true } | Failure>(path: string, validate: (value: unknown) => value is T): Promise<T> => {
    try {
      const response = await fetch(new URL(path, base), {
        cache: 'no-store', signal: AbortSignal.timeout(timeoutMs), headers: { Accept: 'application/json' },
      });
      const result: unknown = await response.json();
      if (!validate(result)) throw new CommerceTransportError();
      const envelope: { ok: true } | Failure = result;
      if (response.status !== (envelope.ok ? 200 : ERROR_STATUS[envelope.error.code])) throw new CommerceTransportError();
      return result;
    } catch { throw new CommerceTransportError(); }
  };
}

// Configuration is supplied by server-only wrappers; no framework dependency here.
export function createCommerceClient(settings: ClientSettings): CommerceClient {
  const request = transport(settings);
  return {
    getProduct: query => request(`products/${encodeURIComponent(query.id)}`, isProductResult),
    getProducts: (query = {}) => request(`products${catalogSearch(query)}`, isCatalogResult),
  };
}
export function createContentClient(settings: ClientSettings): ContentClient {
  const request = transport(settings);
  return { getBrandContent: () => request('content/brand', isContentResult) };
}
