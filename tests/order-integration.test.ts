import { afterEach, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import express from 'express';
import { isOrder, isRecord } from '@atelier/contracts';
import { createCommerceClient } from '@atelier/contracts/client';
import { createProviderApp, productFixtures } from '../apps/mock-services/dist/app.js';
import { createMiddlewareServer } from '../apps/middleware/dist/server.js';

const servers: Server[] = [];
async function listen(server: Server) {
  servers.push(server);
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP listener.');
  return `http://127.0.0.1:${address.port}`;
}
async function setup(provider: express.Express = createProviderApp(), timeoutMs = 500) {
  const providerUrl = await listen(createServer(provider));
  const apiUrl = `${await listen(createMiddlewareServer({ providerUrl, timeoutMs }))}/api`;
  return { providerUrl, apiUrl, client: createCommerceClient({ baseUrl: apiUrl }) };
}
type Client = Awaited<ReturnType<typeof setup>>['client'];
async function bag(client: Client, items: [string, number][]) {
  const created = await client.createCart();
  if (!created.ok) throw new Error('cart');
  for (const [productId, quantity] of items) {
    const added = await client.addCartItem({ cartId: created.cart.id }, { productId, quantity });
    if (!added.ok) throw new Error(`add ${productId}: ${added.error.code}`);
  }
  return created.cart.id;
}
async function stockOf(client: Client, id: string) {
  const result = await client.getProduct({ id });
  if (!result.ok) throw new Error('product');
  return result.product.stock;
}
const providerOrder = (providerUrl: string, key: string, items: unknown) => fetch(`${providerUrl}/orders`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify({ items }),
});
afterEach(async () => {
  await Promise.all(servers.splice(0).reverse().map(server => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); })));
});

describe('simulated order: typed client -> Express BFF -> provider', () => {
  it('creates a confirmed order with commerce prices and decrements stock', async () => {
    const { client } = await setup();
    const cartId = await bag(client, [['watch-001', 2], ['watch-002', 1]]);
    const result = await client.placeOrder({ cartId }, randomUUID());
    expect(result).toMatchObject({ ok: true, order: { status: 'confirmed', itemCount: 3,
      total: { amountMinor: 345000, currency: 'EUR' },
      lines: [{ productId: 'watch-001', quantity: 2, unitPrice: { amountMinor: 125000 }, lineTotal: { amountMinor: 250000 } },
        { productId: 'watch-002', quantity: 1, lineTotal: { amountMinor: 95000 } }] } });
    expect(await stockOf(client, 'watch-001')).toBe(1);
    expect(await stockOf(client, 'watch-002')).toBe(4);
    if (!result.ok) throw new Error('order');
    expect(await client.getOrder({ orderId: result.order.id })).toEqual(result);
    const listed = await client.getProducts({ collection: 'horizon' });
    expect(listed.ok && listed.products.find(product => product.id === 'watch-001')?.stock).toBe(1);
  });

  it('returns the same order for the same key and body without decrementing again', async () => {
    const { apiUrl, client } = await setup();
    const cartId = await bag(client, [['watch-001', 1]]);
    const key = randomUUID();
    const post = () => fetch(`${apiUrl}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify({ cartId }) });
    const first = await post();
    const second = await post();
    expect([first.status, second.status]).toEqual([201, 200]);
    expect(await second.json()).toEqual(await first.json());
    expect(await stockOf(client, 'watch-001')).toBe(2);
  });

  it('rejects the same key with a different body as a conflict', async () => {
    const { client } = await setup();
    const cartId = await bag(client, [['watch-001', 1]]);
    const key = randomUUID();
    expect(await client.placeOrder({ cartId }, key)).toMatchObject({ ok: true });
    await client.setCartItemQuantity({ cartId }, { productId: 'watch-001', quantity: 2 });
    expect(await client.placeOrder({ cartId }, key)).toMatchObject({ ok: false, error: { code: 'IDEMPOTENCY_CONFLICT' } });
    expect(await stockOf(client, 'watch-001')).toBe(2);
  });

  it('accepts all lines or none when one line lacks stock', async () => {
    const { client } = await setup();
    const first = await bag(client, [['watch-004', 2]]);
    const second = await bag(client, [['watch-001', 1], ['watch-004', 1]]);
    expect(await client.placeOrder({ cartId: first }, randomUUID())).toMatchObject({ ok: true });
    expect(await client.placeOrder({ cartId: second }, randomUUID())).toMatchObject({ ok: false, error: { code: 'OUT_OF_STOCK' } });
    expect(await stockOf(client, 'watch-001')).toBe(3);
    expect(await stockOf(client, 'watch-004')).toBe(0);
  });

  it('two concurrent orders cannot sell the last unit twice', async () => {
    const { client } = await setup();
    const carts = await Promise.all([bag(client, [['watch-008', 1]]), bag(client, [['watch-008', 1]])]);
    const results = await Promise.all(carts.map(cartId => client.placeOrder({ cartId }, randomUUID())));
    expect(results.filter(result => result.ok)).toHaveLength(1);
    expect(results.filter(result => !result.ok && result.error.code === 'OUT_OF_STOCK')).toHaveLength(1);
    expect(await stockOf(client, 'watch-008')).toBe(0);
  });

  it('concurrent requests with the same key create one order', async () => {
    const { providerUrl, client } = await setup();
    const key = randomUUID();
    const responses = await Promise.all([1, 2, 3].map(() => providerOrder(providerUrl, key, [{ productId: 'watch-008', quantity: 1 }])));
    expect(responses.map(response => response.status).sort((a, b) => a - b)).toEqual([200, 200, 201]);
    const ids = new Set(await Promise.all(responses.map(async response => {
      const body: unknown = await response.json();
      return isRecord(body) ? body.id : undefined;
    })));
    expect(ids.size).toBe(1);
    expect(await stockOf(client, 'watch-008')).toBe(0);
  });

  it('rejects missing or invalid keys, empty bags and unexpected fields', async () => {
    const { apiUrl, client } = await setup();
    const cartId = await bag(client, [['watch-001', 1]]);
    const post = (body: unknown, key?: string) => fetch(`${apiUrl}/orders`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) }, body: JSON.stringify(body) });
    expect((await post({ cartId })).status).toBe(400);
    expect((await post({ cartId }, 'short')).status).toBe(400);
    expect((await post({ cartId, items: [{ productId: 'watch-001', quantity: 1, price: 1 }] }, randomUUID())).status).toBe(400);
    expect((await post({ cartId, total: 1 }, randomUUID())).status).toBe(400);
    const empty = await bag(client, []);
    expect(await client.placeOrder({ cartId: empty }, randomUUID())).toMatchObject({ ok: false, error: { code: 'CART_EMPTY' } });
    expect(await client.placeOrder({ cartId: '00000000-0000-4000-8000-000000000000' }, randomUUID())).toMatchObject({ ok: false, error: { code: 'CART_NOT_FOUND' } });
    expect(await stockOf(client, 'watch-001')).toBe(3);
  });

  it('validates provider order input independently of the BFF', async () => {
    const { providerUrl } = await setup();
    const key = () => randomUUID();
    expect((await providerOrder(providerUrl, key(), [])).status).toBe(400);
    expect((await providerOrder(providerUrl, key(), [{ productId: 'watch-001', quantity: 1 }, { productId: 'watch-001', quantity: 1 }])).status).toBe(400);
    expect((await providerOrder(providerUrl, key(), [{ productId: 'watch-001', quantity: 1, unitPrice: 1 }])).status).toBe(400);
    expect((await providerOrder(providerUrl, key(), [{ productId: 'watch-001', quantity: 0 }])).status).toBe(400);
    expect((await providerOrder(providerUrl, key(), [{ productId: 'watch-999', quantity: 1 }])).status).toBe(404);
  });

  it('keeps inventory per provider instance', async () => {
    const first = await setup();
    const cartId = await bag(first.client, [['watch-001', 3]]);
    await first.client.placeOrder({ cartId }, randomUUID());
    const second = await setup();
    expect(await stockOf(first.client, 'watch-001')).toBe(0);
    expect(await stockOf(second.client, 'watch-001')).toBe(3);
    expect(productFixtures[0].available_units).toBe(3);
  });

  it('reports a slow order write as a timeout without retrying it', async () => {
    const provider = express();
    const real = createProviderApp();
    let orderCalls = 0;
    provider.post('/orders', (_req, _res, next) => { orderCalls += 1; setTimeout(next, 300); });
    provider.use(real);
    const { client } = await setup(provider, 100);
    const cartId = await bag(client, [['watch-001', 1]]);
    expect(await client.placeOrder({ cartId }, randomUUID())).toMatchObject({ ok: false, error: { code: 'UPSTREAM_TIMEOUT' } });
    expect(orderCalls).toBe(1);
  });

  it('maps unknown and malformed order IDs', async () => {
    const { client } = await setup();
    expect(await client.getOrder({ orderId: '00000000-0000-4000-8000-000000000000' })).toMatchObject({ ok: false, error: { code: 'ORDER_NOT_FOUND' } });
    expect(await client.getOrder({ orderId: 'order-1' })).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
  });
});

describe('order contract guard', () => {
  const line = { productId: 'watch-001', name: 'Atelier Horizon', quantity: 2, unitPrice: { amountMinor: 100, currency: 'EUR' }, lineTotal: { amountMinor: 200, currency: 'EUR' } };
  const order = { id: '11111111-1111-4111-8111-111111111111', status: 'confirmed', lines: [line], itemCount: 2, total: { amountMinor: 200, currency: 'EUR' } };
  it('requires at least one consistent line and the confirmed status', () => {
    expect(isOrder(order)).toBe(true);
    expect(isOrder({ ...order, lines: [], itemCount: 0, total: { amountMinor: 0, currency: 'EUR' } })).toBe(false);
    expect(isOrder({ ...order, total: { amountMinor: 199, currency: 'EUR' } })).toBe(false);
    expect(isOrder({ ...order, status: 'pending' })).toBe(false);
  });
});
