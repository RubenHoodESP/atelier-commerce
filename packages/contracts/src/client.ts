import { ERROR_STATUS, catalogSearch, isCartResult, isOrderResult, isCatalogResult, isContentResult, isProductResult,
  type CommerceClient, type ContentClient, type Failure } from './index.js';

export class CommerceTransportError extends Error {
  constructor() { super('The collection service could not be reached or returned an invalid response.'); }
}
type ClientSettings = { baseUrl: string; timeoutMs?: number };
type RequestOptions = { body?: unknown; method?: 'GET' | 'POST' | 'PUT'; successStatus?: 200 | 201 | readonly (200 | 201)[]; headers?: Record<string, string> };

function transport({ baseUrl, timeoutMs = 2500 }: ClientSettings) {
  const base = new URL(baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw new Error('Invalid commerce API URL configuration.');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) throw new Error('Invalid commerce API timeout.');
  // Writes are sent once: no automatic retry without idempotency guarantees.
  return async <T extends { ok: true } | Failure>(path: string, validate: (value: unknown) => value is T,
    { body, method = body === undefined ? 'GET' : 'POST', successStatus = 200, headers = {} }: RequestOptions = {}): Promise<T> => {
    try {
      const response = await fetch(new URL(path, base), {
        method, cache: 'no-store', signal: AbortSignal.timeout(timeoutMs),
        headers: body === undefined ? { ...headers, Accept: 'application/json' } : { ...headers, Accept: 'application/json', 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const result: unknown = await response.json();
      if (!validate(result)) throw new CommerceTransportError();
      const envelope: { ok: true } | Failure = result;
      const expected: readonly number[] = envelope.ok ? (Array.isArray(successStatus) ? successStatus : [successStatus]) : [ERROR_STATUS[envelope.error.code]];
      if (!expected.includes(response.status)) throw new CommerceTransportError();
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
    createCart: () => request('carts', isCartResult, { method: 'POST', successStatus: 201 }),
    getCart: ({ cartId }) => request(`carts/${encodeURIComponent(cartId)}`, isCartResult),
    addCartItem: ({ cartId }, { productId, quantity }) =>
      request(`carts/${encodeURIComponent(cartId)}/items`, isCartResult, { body: { productId, quantity } }),
    setCartItemQuantity: ({ cartId }, { productId, quantity }) =>
      request(`carts/${encodeURIComponent(cartId)}/items/${encodeURIComponent(productId)}`, isCartResult, { method: 'PUT', body: { quantity } }),
    // 201 creates the order; 200 is an idempotent replay of the same key and body.
    placeOrder: ({ cartId }, idempotencyKey) =>
      request('orders', isOrderResult, { body: { cartId }, successStatus: [200, 201], headers: { 'Idempotency-Key': idempotencyKey } }),
    getOrder: ({ orderId }) => request(`orders/${encodeURIComponent(orderId)}`, isOrderResult),
  };
}
export function createContentClient(settings: ClientSettings): ContentClient {
  const request = transport(settings);
  return { getBrandContent: () => request('content/brand', isContentResult) };
}
