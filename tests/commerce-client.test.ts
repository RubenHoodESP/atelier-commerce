import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCommerceClient, CommerceTransportError } from '@atelier/contracts/client';

const product = { id: 'watch-001', name: 'Horizon', collection: 'Horizon', price: { amountMinor: 125099, currency: 'EUR' }, stock: 3 };
const client = () => createCommerceClient({ baseUrl: 'http://127.0.0.1:4000/api' });
afterEach(() => vi.unstubAllGlobals());

describe('typed REST response boundary', () => {
  it('reads a validated successful response including cents', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ok: true, product })));
    expect(await client().getProduct({ id: 'watch-001' })).toEqual({ ok: true, product });
  });
  it('preserves a validated business error with its HTTP status', async () => {
    const result = { ok: false, error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found.', requestId: 'test-id' } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(result, { status: 404 })));
    expect(await client().getProduct({ id: 'watch-999' })).toEqual(result);
  });
  it('rejects an invalid successful payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ok: true, product: { ...product, price: { amountMinor: -1, currency: 'EUR' } } })));
    await expect(client().getProduct({ id: 'watch-001' })).rejects.toBeInstanceOf(CommerceTransportError);
  });
  it('rejects a status that contradicts its error envelope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ok: false, error: { code: 'PRODUCT_NOT_FOUND', message: 'Missing.', requestId: 'test-id' } })));
    await expect(client().getProduct({ id: 'watch-001' })).rejects.toBeInstanceOf(CommerceTransportError);
  });
  it('hides invalid JSON and private transport details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('PRIVATE BACKEND HTML', { status: 502 })));
    await expect(client().getProduct({ id: 'watch-001' })).rejects.toThrow('The collection service could not be reached or returned an invalid response.');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('PRIVATE CONNECTION DETAILS')));
    await expect(client().getProduct({ id: 'watch-001' })).rejects.toThrow('The collection service could not be reached or returned an invalid response.');
  });
  it('bounds a request that never resolves', async () => {
    vi.stubGlobal('fetch', vi.fn((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
    })));
    const bounded = createCommerceClient({ baseUrl: 'http://127.0.0.1:4000/api', timeoutMs: 20 });
    await expect(bounded.getProduct({ id: 'watch-001' })).rejects.toBeInstanceOf(CommerceTransportError);
  });
});
