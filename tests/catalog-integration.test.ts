import { afterEach, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import express from 'express';
import { createCommerceClient, createContentClient } from '@atelier/contracts/client';
import { createProviderApp } from '../apps/mock-services/dist/app.js';
import { createMiddlewareServer } from '../apps/middleware/dist/server.js';
const servers: Server[] = [];
async function listen(server: Server) {
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing address');
  return `http://127.0.0.1:${address.port}`;
}
async function setup(app = createProviderApp(), timeoutMs = 500) {
  const providerUrl = await listen(createServer(app));
  const baseUrl = `${await listen(createMiddlewareServer({ providerUrl, timeoutMs }))}/api`;
  return { client: createCommerceClient({ baseUrl }), content: createContentClient({ baseUrl }), baseUrl };
}
afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => {
    server.closeAllConnections(); server.close(() => resolve());
  })));
});
describe('catalog HTTP boundary', () => {
  it('returns twelve normalized products, with detail and listing in agreement', async () => {
    const { client } = await setup();
    const result = await client.getProducts();
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected catalog');
    expect(result.total).toBe(12);
    expect(new Set(result.products.map(item => item.id)).size).toBe(12);
    expect(JSON.stringify(result)).not.toContain('unit_price');
    for (const product of result.products) expect(await client.getProduct({ id: product.id })).toEqual({ ok: true, product });
    expect(result.products.some(item => item.stock === 0)).toBe(true);
  });
  it.each(['horizon', 'meridian', 'nocturne'] as const)('filters %s in the provider', async collection => {
    const { client } = await setup();
    const result = await client.getProducts({ collection });
    expect(result).toMatchObject({ ok: true, total: 4 });
    if (result.ok) expect(result.products.every(item => item.collection.toLowerCase() === collection)).toBe(true);
  });
  it.each([
    ['featured', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]],
    ['price-asc', [2, 5, 1, 3, 6, 7, 4, 9, 8, 10, 11, 12]],
    ['price-desc', [12, 11, 10, 8, 9, 4, 6, 7, 1, 3, 5, 2]],
    ['name-asc', [1, 3, 4, 2, 5, 8, 6, 7, 11, 9, 12, 10]],
  ] as const)('sorts %s with deterministic ties', async (sort, ids) => {
    const { client } = await setup();
    const result = await client.getProducts({ sort });
    if (!result.ok) throw new Error('Expected catalog');
    expect(result.products.map(item => item.id)).toEqual(ids.map(id => `watch-${String(id).padStart(3, '0')}`));
  });
  it('accepts a genuinely empty catalog', async () => {
    const { client } = await setup(createProviderApp({ products: [] }));
    expect(await client.getProducts()).toEqual({ ok: true, products: [], total: 0 });
  });
  it.each(['collection=unknown', 'sort=invalid', 'collection=horizon&collection=nocturne', 'sort=price-asc&sort=price-desc', 'providerUrl=http://example.com'])('rejects %s before calling upstream', async query => {
    const app = express(); let called = false;
    app.use((_req, res) => { called = true; res.status(500).end(); });
    const { baseUrl } = await setup(app);
    const response = await fetch(`${baseUrl}/products?${query}`);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(called).toBe(false);
  });
  it.each([
    { items: [{}], count: 1 }, { items: [], count: 1 },
    { items: [{ sku: 'watch-001' }], count: 1 },
  ])('rejects malformed lists without partial data', async payload => {
    const app = express(); app.get('/products', (_req, res) => res.json(payload));
    const { client } = await setup(app);
    expect(await client.getProducts()).toMatchObject({ ok: false, error: { code: 'UPSTREAM_INVALID_RESPONSE' } });
  });
  it('rejects duplicate IDs even when all products are individually valid', async () => {
    const app = createProviderApp();
    const good = await (await fetch(`${await listen(createServer(app))}/products/watch-001`)).json();
    const bad = express(); bad.get('/products', (_req, res) => res.json({ items: [good, good], count: 2 }));
    const { client } = await setup(bad);
    expect(await client.getProducts()).toMatchObject({ ok: false, error: { code: 'UPSTREAM_INVALID_RESPONSE' } });
  });
  it('maps timeout and HTTP failure safely with correlation and no-store', async () => {
    const app = express(); let requestId = '';
    app.get('/products', (req, res) => { requestId = req.get('X-Request-ID')!; res.status(503).send('PRIVATE'); });
    const { baseUrl } = await setup(app);
    const response = await fetch(`${baseUrl}/products`);
    expect(response.status).toBe(502);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = await response.json();
    expect(body.error.requestId).toBe(requestId);
    expect(response.headers.get('x-request-id')).toBe(requestId);
    expect(JSON.stringify(body)).not.toContain('PRIVATE');
    const slow = express(); slow.get('/products', () => {});
    const { client } = await setup(slow, 20);
    expect(await client.getProducts()).toMatchObject({ ok: false, error: { code: 'UPSTREAM_TIMEOUT' } });
  });
});
describe('editorial HTTP boundary', () => {
  it('normalizes content separately from commerce', async () => {
    const { content } = await setup();
    expect(await content.getBrandContent()).toMatchObject({ ok: true, content: { headline: 'A quieter kind of statement.' } });
    expect(JSON.stringify(await content.getBrandContent())).not.toContain('hero_title');
  });
  it('rejects invalid editorial content', async () => {
    const app = express(); app.get('/content/brand', (_req, res) => res.json({ hero_title: '' }));
    const { content } = await setup(app);
    expect(await content.getBrandContent()).toMatchObject({ ok: false, error: { code: 'UPSTREAM_INVALID_RESPONSE' } });
  });
  it('keeps commerce usable when editorial content fails', async () => {
    const app = express(); app.get('/content/brand', (_req, res) => res.status(503).end()); app.use(createProviderApp());
    const { content, client } = await setup(app);
    expect(await content.getBrandContent()).toMatchObject({ ok: false, error: { code: 'UPSTREAM_UNAVAILABLE' } });
    expect(await client.getProducts()).toMatchObject({ ok: true, total: 12 });
  });
});
