import { afterEach, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import express from 'express';
import { isCart, type Cart } from '@atelier/contracts';
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
async function setup(provider: express.Express = createProviderApp(), timeoutMs = 500) {
  const apiUrl = `${await listen(createMiddlewareServer({ providerUrl: await listen(createServer(provider)), timeoutMs }))}/api`;
  return { apiUrl, client: createCommerceClient({ baseUrl: apiUrl }) };
}
async function newCart(client: Awaited<ReturnType<typeof setup>>['client']): Promise<Cart> {
  const result = await client.createCart();
  if (!result.ok) throw new Error(`Expected a cart, got ${result.error.code}`);
  return result.cart;
}
afterEach(async () => {
  await Promise.all(servers.splice(0).reverse().map(server => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); })));
});

describe('guest cart: typed client -> Express BFF -> HTTP provider', () => {
  it('creates a cart, adds items and returns commerce-calculated totals', async () => {
    const { client } = await setup();
    const cart = await newCart(client);
    expect(cart).toMatchObject({ lines: [], itemCount: 0, subtotal: { amountMinor: 0, currency: 'EUR' } });
    await client.addCartItem({ cartId: cart.id }, { productId: 'watch-001', quantity: 1 });
    const result = await client.addCartItem({ cartId: cart.id }, { productId: 'watch-001', quantity: 1 });
    expect(result).toEqual({ ok: true, cart: { id: cart.id, itemCount: 2, subtotal: { amountMinor: 250000, currency: 'EUR' }, lines: [
      { productId: 'watch-001', name: 'Atelier Horizon', quantity: 2,
        unitPrice: { amountMinor: 125000, currency: 'EUR' }, lineTotal: { amountMinor: 250000, currency: 'EUR' } },
    ] } });
    expect(await client.getCart({ cartId: cart.id })).toEqual(result);
    expect(JSON.stringify(result)).not.toMatch(/display_name|cents|qty/);
  });

  it.each([0, 21, 1.5, '2', -1, null])('rejects quantity %j before calling the provider', async quantity => {
    const { apiUrl, client } = await setup();
    const cart = await newCart(client);
    const response = await fetch(`${apiUrl}/carts/${cart.id}/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: 'watch-001', quantity }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(await client.getCart({ cartId: cart.id })).toMatchObject({ ok: true, cart: { lines: [] } });
  });

  it('rejects browser-supplied price or total fields instead of ignoring them', async () => {
    const { apiUrl, client } = await setup();
    const cart = await newCart(client);
    for (const extra of [{ price: { amountMinor: 1, currency: 'EUR' } }, { unitPrice: 1 }, { total: 1 }]) {
      const response = await fetch(`${apiUrl}/carts/${cart.id}/items`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: 'watch-001', quantity: 1, ...extra }),
      });
      expect(response.status).toBe(400);
    }
    expect(await client.getCart({ cartId: cart.id })).toMatchObject({ ok: true, cart: { lines: [] } });
  });

  it('rejects malformed JSON, oversized bodies and unexpected query parameters with 400', async () => {
    const { apiUrl, client } = await setup();
    const cart = await newCart(client);
    const post = (body: string, query = '') => fetch(`${apiUrl}/carts/${cart.id}/items${query}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    expect((await post('{"productId":')).status).toBe(400);
    expect((await post(JSON.stringify({ productId: 'watch-001', quantity: 1, pad: 'x'.repeat(2000) }))).status).toBe(400);
    expect((await post(JSON.stringify({ productId: 'watch-001', quantity: 1 }), '?providerUrl=http://example.com')).status).toBe(400);
    expect((await fetch(`${apiUrl}/carts/${cart.id}?debug=1`)).status).toBe(400);
  });

  it('maps out-of-stock, over-stock and cart limits to 409 without changing the cart', async () => {
    const { client } = await setup();
    const cart = await newCart(client);
    expect(await client.addCartItem({ cartId: cart.id }, { productId: 'watch-003', quantity: 1 })).toMatchObject({ ok: false, error: { code: 'OUT_OF_STOCK' } });
    expect(await client.addCartItem({ cartId: cart.id }, { productId: 'watch-001', quantity: 4 })).toMatchObject({ ok: false, error: { code: 'OUT_OF_STOCK' } });
    expect(await client.addCartItem({ cartId: cart.id }, { productId: 'watch-001', quantity: 3 })).toMatchObject({ ok: true });
    expect(await client.addCartItem({ cartId: cart.id }, { productId: 'watch-001', quantity: 1 })).toMatchObject({ ok: false, error: { code: 'OUT_OF_STOCK' } });
    expect(await client.getCart({ cartId: cart.id })).toMatchObject({ ok: true, cart: { itemCount: 3 } });

    const plenty = createProviderApp({ products: [{ sku: 'watch-001', display_name: 'Atelier Horizon', collection_name: 'Horizon', unit_price: { cents: 100, currency_code: 'EUR' }, available_units: 100 }] });
    const limited = await setup(plenty);
    const big = await newCart(limited.client);
    await limited.client.addCartItem({ cartId: big.id }, { productId: 'watch-001', quantity: 20 });
    expect(await limited.client.addCartItem({ cartId: big.id }, { productId: 'watch-001', quantity: 1 })).toMatchObject({ ok: false, error: { code: 'CART_LIMIT_EXCEEDED' } });
  });

  it('distinguishes unknown products, unknown carts and malformed cart identifiers', async () => {
    const { client } = await setup();
    const cart = await newCart(client);
    expect(await client.addCartItem({ cartId: cart.id }, { productId: 'watch-999', quantity: 1 })).toMatchObject({ ok: false, error: { code: 'PRODUCT_NOT_FOUND' } });
    const unknown = '00000000-0000-4000-8000-000000000000';
    expect(await client.getCart({ cartId: unknown })).toMatchObject({ ok: false, error: { code: 'CART_NOT_FOUND' } });
    expect(await client.addCartItem({ cartId: unknown }, { productId: 'watch-001', quantity: 1 })).toMatchObject({ ok: false, error: { code: 'CART_NOT_FOUND' } });
    expect(await client.getCart({ cartId: '../products' })).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
  });

  it('isolates carts: one cart identifier never reads another cart', async () => {
    const { client } = await setup();
    const first = await newCart(client);
    const second = await newCart(client);
    await client.addCartItem({ cartId: first.id }, { productId: 'watch-001', quantity: 1 });
    expect(await client.getCart({ cartId: second.id })).toMatchObject({ ok: true, cart: { id: second.id, lines: [] } });
  });

  it('evicts the oldest cart beyond the configured bound', async () => {
    const { client } = await setup(createProviderApp({ maxCarts: 2 }));
    const oldest = await newCart(client);
    await newCart(client);
    await newCart(client);
    expect(await client.getCart({ cartId: oldest.id })).toMatchObject({ ok: false, error: { code: 'CART_NOT_FOUND' } });
  });

  it('rejects provider carts whose totals disagree with their lines', async () => {
    const provider = express();
    const cartId = '11111111-1111-4111-8111-111111111111';
    provider.get('/carts/:id', (_req, res) => { res.json({ cart_id: cartId, total_units: 1, subtotal: { cents: 1, currency_code: 'EUR' }, entries: [
      { sku: 'watch-001', display_name: 'Atelier Horizon', qty: 1, unit_price: { cents: 125000, currency_code: 'EUR' }, line_total: { cents: 125000, currency_code: 'EUR' } },
    ] }); });
    const { client } = await setup(provider);
    expect(await client.getCart({ cartId })).toMatchObject({ ok: false, error: { code: 'UPSTREAM_INVALID_RESPONSE' } });
  });

  it('reports a slow provider write as a timeout and does not retry it', async () => {
    const provider = express();
    let calls = 0;
    provider.post('/carts', (_req, res) => { calls += 1; setTimeout(() => { if (!res.writableEnded) res.status(201).json({}); }, 300); });
    const { client } = await setup(provider, 50);
    expect(await client.createCart()).toMatchObject({ ok: false, error: { code: 'UPSTREAM_TIMEOUT' } });
    expect(calls).toBe(1);
  });
});

describe('guest cart: set line quantity and remove', () => {
  async function bagWith(productId: string, quantity: number) {
    const ctx = await setup();
    const cart = await newCart(ctx.client);
    expect(await ctx.client.addCartItem({ cartId: cart.id }, { productId, quantity })).toMatchObject({ ok: true });
    return { ...ctx, cartId: cart.id };
  }
  const put = (apiUrl: string, cartId: string, productId: string, body: unknown, query = '') =>
    fetch(`${apiUrl}/carts/${cartId}/items/${productId}${query}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  it('sets the quantity, recalculates totals and is repeatable', async () => {
    const { client, cartId } = await bagWith('watch-002', 1);
    const first = await client.setCartItemQuantity({ cartId }, { productId: 'watch-002', quantity: 3 });
    expect(first).toMatchObject({ ok: true, cart: { itemCount: 3, subtotal: { amountMinor: 285000 }, lines: [{ productId: 'watch-002', quantity: 3, lineTotal: { amountMinor: 285000 } }] } });
    expect(await client.setCartItemQuantity({ cartId }, { productId: 'watch-002', quantity: 3 })).toEqual(first);
  });

  it('removes a line with quantity 0 and keeps the others', async () => {
    const { client, cartId } = await bagWith('watch-002', 2);
    await client.addCartItem({ cartId }, { productId: 'watch-001', quantity: 1 });
    const result = await client.setCartItemQuantity({ cartId }, { productId: 'watch-002', quantity: 0 });
    expect(result).toMatchObject({ ok: true, cart: { itemCount: 1, lines: [{ productId: 'watch-001' }] } });
  });

  it('rejects increases above current stock but always allows decreases', async () => {
    const { client, cartId } = await bagWith('watch-004', 2);
    expect(await client.setCartItemQuantity({ cartId }, { productId: 'watch-004', quantity: 3 })).toMatchObject({ ok: false, error: { code: 'OUT_OF_STOCK' } });
    expect(await client.getCart({ cartId })).toMatchObject({ ok: true, cart: { itemCount: 2 } });
    expect(await client.setCartItemQuantity({ cartId }, { productId: 'watch-004', quantity: 1 })).toMatchObject({ ok: true, cart: { itemCount: 1 } });
  });

  it('distinguishes a missing line, a missing cart and an unknown product', async () => {
    const { client, cartId } = await bagWith('watch-001', 1);
    expect(await client.setCartItemQuantity({ cartId }, { productId: 'watch-002', quantity: 1 })).toMatchObject({ ok: false, error: { code: 'CART_LINE_NOT_FOUND' } });
    expect(await client.setCartItemQuantity({ cartId }, { productId: 'watch-999', quantity: 0 })).toMatchObject({ ok: false, error: { code: 'CART_LINE_NOT_FOUND' } });
    expect(await client.setCartItemQuantity({ cartId: '00000000-0000-4000-8000-000000000000' }, { productId: 'watch-001', quantity: 1 })).toMatchObject({ ok: false, error: { code: 'CART_NOT_FOUND' } });
  });

  it.each([21, -1, 1.5, '1', null])('rejects quantity %j without changing the line', async quantity => {
    const { apiUrl, client, cartId } = await bagWith('watch-001', 1);
    expect((await put(apiUrl, cartId, 'watch-001', { quantity })).status).toBe(400);
    expect(await client.getCart({ cartId })).toMatchObject({ ok: true, cart: { itemCount: 1 } });
  });

  it('rejects extra fields, malformed product IDs and query parameters', async () => {
    const { apiUrl, client, cartId } = await bagWith('watch-001', 1);
    expect((await put(apiUrl, cartId, 'watch-001', { quantity: 2, price: 1 })).status).toBe(400);
    expect((await put(apiUrl, cartId, 'watch-001', { quantity: 2, productId: 'watch-002' })).status).toBe(400);
    expect((await put(apiUrl, cartId, '..%2Fproducts', { quantity: 2 })).status).toBe(400);
    expect((await put(apiUrl, cartId, 'watch-001', { quantity: 2 }, '?debug=1')).status).toBe(400);
    expect(await client.getCart({ cartId })).toMatchObject({ ok: true, cart: { itemCount: 1 } });
  });
});

describe('cart contract guard', () => {
  const line = { productId: 'watch-001', name: 'Atelier Horizon', quantity: 1, unitPrice: { amountMinor: 100, currency: 'EUR' }, lineTotal: { amountMinor: 100, currency: 'EUR' } };
  const cart = { id: '11111111-1111-4111-8111-111111111111', lines: [line], itemCount: 1, subtotal: { amountMinor: 100, currency: 'EUR' } };
  it('accepts a consistent cart and rejects duplicates, wrong totals and extra money fields', () => {
    expect(isCart(cart)).toBe(true);
    expect(isCart({ ...cart, lines: [line, line], itemCount: 2, subtotal: { amountMinor: 200, currency: 'EUR' } })).toBe(false);
    expect(isCart({ ...cart, itemCount: 2 })).toBe(false);
    expect(isCart({ ...cart, lines: [{ ...line, lineTotal: { amountMinor: 99, currency: 'EUR' } }] })).toBe(false);
    expect(isCart({ ...cart, subtotal: { amountMinor: 100, currency: 'EUR', discount: 1 } })).toBe(false);
  });
});
