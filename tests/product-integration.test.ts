import { afterEach, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import express from 'express';
import { initSDK, buildModule, middlewareModule } from '@vue-storefront/sdk';
import type { CommerceEndpoints } from '@atelier/contracts';
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
  const apiUrl = `${await listen(await createMiddlewareServer({ providerUrl, timeoutMs }))}/commerce`;
  // The SDK module is a Proxy: returning it directly from an async function
  // makes Promise resolution call its generated `then` endpoint.
  return { sdk: initSDK({ commerce: buildModule(middlewareModule<CommerceEndpoints>, { apiUrl, logger: false }) }).commerce };
}
afterEach(async () => {
  await Promise.all(servers.splice(0).reverse().map(server => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); })));
});
describe('real public Alokai SDK -> middleware -> HTTP provider', () => {
  it('normalizes a vendor-shaped product without exposing vendor fields', async () => {
    const { sdk } = await commerce(await listen(createServer(createProviderApp())));
    const result = await sdk.getProduct({ id: 'watch-001' });
    expect(result).toEqual({ ok: true, product: { id: 'watch-001', name: 'Atelier Horizon', collection: 'Horizon', price: { amountMinor: 125000, currency: 'EUR' }, stock: 3 } });
    expect(JSON.stringify(result)).not.toContain('display_name');
  });
  it('preserves an unknown product as a typed business failure', async () => {
    const { sdk } = await commerce(await listen(createServer(createProviderApp())));
    expect(await sdk.getProduct({ id: 'watch-999' })).toMatchObject({ ok: false, error: { code: 'PRODUCT_NOT_FOUND' } });
  });
  it('validates identifier input before attempting the provider', async () => {
    const app = express();
    let called = false;
    app.use((_req, res) => { called = true; res.status(500).end(); });
    const { sdk } = await commerce(await listen(createServer(app)));
    expect(await sdk.getProduct({ id: '../../secrets' })).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(called).toBe(false);
  });
  it('normalizes upstream 503 and hides the upstream body', async () => {
    const app = express();
    app.get('/products/:id', (_req, res) => res.status(503).send('PRIVATE UPSTREAM DETAILS'));
    const { sdk } = await commerce(await listen(createServer(app)));
    const result = await sdk.getProduct({ id: 'watch-001' });
    expect(result).toMatchObject({ ok: false, error: { code: 'UPSTREAM_UNAVAILABLE', requestId: expect.any(String) } });
    expect(JSON.stringify(result)).not.toContain('PRIVATE');
  });
  it('rejects invalid upstream product data at runtime', async () => {
    const app = express();
    app.get('/products/:id', (_req, res) => res.json({ sku: 'watch-001', unit_price: { cents: -100, currency_code: 'EUR' } }));
    const { sdk } = await commerce(await listen(createServer(app)));
    expect(await sdk.getProduct({ id: 'watch-001' })).toMatchObject({ ok: false, error: { code: 'UPSTREAM_INVALID_RESPONSE' } });
  });
  it('bounds a stalled provider request', async () => {
    const app = express();
    app.get('/products/:id', () => { /* Deliberately leave the response open. */ });
    const { sdk } = await commerce(await listen(createServer(app)), 50);
    expect(await sdk.getProduct({ id: 'watch-001' })).toMatchObject({ ok: false, error: { code: 'UPSTREAM_TIMEOUT' } });
  });
});
