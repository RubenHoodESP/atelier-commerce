import { afterEach, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import express from 'express';
import { createCommerceClient } from '@atelier/contracts/client';
import { createProviderApp } from '../apps/mock-services/dist/app.js';
import { createMiddlewareServer } from '../apps/middleware/dist/server.js';

const servers: Server[] = [];
async function listen(server: Server) {
  servers.push(server);
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP listener.');
  return `http://127.0.0.1:${address.port}`;
}
async function commerce(providerUrl: string, timeoutMs = 500) {
  const apiUrl = `${await listen(createMiddlewareServer({ providerUrl, timeoutMs }))}/api`;
  return { client: createCommerceClient({ baseUrl: apiUrl }) };
}
afterEach(async () => {
  await Promise.all(servers.splice(0).reverse().map(server => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); })));
});
describe('typed REST client -> Express BFF -> HTTP provider', () => {
  it('normalizes a vendor-shaped product without exposing vendor fields', async () => {
    const { client } = await commerce(await listen(createServer(createProviderApp())));
    const result = await client.getProduct({ id: 'watch-001' });
    expect(result).toEqual({ ok: true, product: { id: 'watch-001', name: 'Atelier Horizon', collection: 'Horizon', price: { amountMinor: 125000, currency: 'EUR' }, stock: 3 } });
    expect(JSON.stringify(result)).not.toContain('display_name');
  });
  it('preserves an unknown product as a typed business failure', async () => {
    const { client } = await commerce(await listen(createServer(createProviderApp())));
    expect(await client.getProduct({ id: 'watch-999' })).toMatchObject({ ok: false, error: { code: 'PRODUCT_NOT_FOUND' } });
  });
  it('validates identifier input before attempting the provider', async () => {
    const app = express();
    let called = false;
    app.use((_req, res) => { called = true; res.status(500).end(); });
    const { client } = await commerce(await listen(createServer(app)));
    expect(await client.getProduct({ id: '../../secrets' })).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(called).toBe(false);
  });
  it('normalizes upstream 503 and hides the upstream body', async () => {
    const app = express();
    app.get('/products/:id', (_req, res) => res.status(503).send('PRIVATE UPSTREAM DETAILS'));
    const { client } = await commerce(await listen(createServer(app)));
    const result = await client.getProduct({ id: 'watch-001' });
    expect(result).toMatchObject({ ok: false, error: { code: 'UPSTREAM_UNAVAILABLE', requestId: expect.any(String) } });
    expect(JSON.stringify(result)).not.toContain('PRIVATE');
  });
  it('rejects invalid upstream product data at runtime', async () => {
    const app = express();
    app.get('/products/:id', (_req, res) => res.json({ sku: 'watch-001', unit_price: { cents: -100, currency_code: 'EUR' } }));
    const { client } = await commerce(await listen(createServer(app)));
    expect(await client.getProduct({ id: 'watch-001' })).toMatchObject({ ok: false, error: { code: 'UPSTREAM_INVALID_RESPONSE' } });
  });
  it('bounds a stalled provider request', async () => {
    const app = express();
    app.get('/products/:id', () => { /* Deliberately leave the response open. */ });
    const { client } = await commerce(await listen(createServer(app)), 50);
    expect(await client.getProduct({ id: 'watch-001' })).toMatchObject({ ok: false, error: { code: 'UPSTREAM_TIMEOUT' } });
  });
  it.each(['providerUrl=http://example.com', 'id=watch-999'])('rejects unexpected query %s without calling the provider', async query => {
    const app = express();
    let called = false;
    app.use((_req, res) => { called = true; res.end(); });
    const providerUrl = await listen(createServer(app));
    const apiUrl = await listen(createMiddlewareServer({ providerUrl, timeoutMs: 100 }));
    const response = await fetch(`${apiUrl}/api/products/watch-001?${query}`);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(called).toBe(false);
  });
  it('correlates safe provider failures with public and upstream request IDs', async () => {
    const app = express();
    let upstreamRequestId: string | undefined;
    app.get('/products/:id', (req, res) => { upstreamRequestId = req.get('X-Request-ID'); res.status(503).end(); });
    const providerUrl = await listen(createServer(app));
    const apiUrl = await listen(createMiddlewareServer({ providerUrl, timeoutMs: 100 }));
    const response = await fetch(`${apiUrl}/api/products/watch-001`);
    expect(response.status).toBe(502);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-powered-by')).toBeNull();
    const result = await response.json();
    expect(result.error.requestId).toBe(upstreamRequestId);
    expect(result.error.requestId).toBe(response.headers.get('x-request-id'));
  });
  it('returns a safe JSON 400 for malformed URL encoding', async () => {
    const apiUrl = await listen(createMiddlewareServer({ providerUrl: 'http://127.0.0.1:1', timeoutMs: 100 }));
    const response = await fetch(`${apiUrl}/api/products/%E0%A4%A`);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid request.' } });
  });
});
