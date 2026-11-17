import express, { type ErrorRequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { CART_LIMITS, isCatalogQuery, isCartId, isIdempotencyKey, isOrderId, isProductQuery, isQuantity, isRecord } from '@atelier/contracts';

// Intentionally vendor-shaped: the integration must normalize it.
export const horizonFixture = {
  sku: 'watch-001', display_name: 'Atelier Horizon', collection_name: 'Horizon',
  unit_price: { cents: 125000, currency_code: 'EUR' }, available_units: 3,
};
export const productFixtures = [
  horizonFixture,
  ...[
    ['Horizon Sand', 'Horizon', 95000, 5], ['Horizon Dawn', 'Horizon', 125000, 0], ['Horizon Field', 'Horizon', 140000, 2],
    ['Meridian Classic', 'Meridian', 110000, 4], ['Meridian Silver', 'Meridian', 135000, 0],
    ['Meridian Slate', 'Meridian', 135000, 7], ['Meridian Coast', 'Meridian', 160000, 1],
    ['Nocturne Ink', 'Nocturne', 150000, 2], ['Nocturne Moon', 'Nocturne', 175000, 0],
    ['Nocturne Ember', 'Nocturne', 180000, 3], ['Nocturne Midnight', 'Nocturne', 210000, 1],
  ].map(([name, collection, price, stock], index) => ({
    sku: `watch-${String(index + 2).padStart(3, '0')}`, display_name: `Atelier ${name}`,
    collection_name: collection as string, unit_price: { cents: price as number, currency_code: 'EUR' }, available_units: stock as number,
  })),
];
export const brandFixture = {
  hero_title: 'A quieter kind of statement.',
  hero_text: 'Three collections. Twelve considered expressions of form, function and time.',
  brand_story: 'Atelier is a fictional independent watchmaker. Horizon, Meridian and Nocturne explore the changing light of a day through warm textures, clean lines and deliberate details.',
};

// Factory options support isolated tests; no public fault-injection endpoints.
// In-memory state (inventory, carts, orders, idempotency records) belongs to one app
// instance and resets on restart. Maps are bounded: the oldest entries are evicted.
type VendorOrder = { id: string; status: 'confirmed'; total: { amountMinor: number; currency: 'EUR' };
  items: { productId: string; name: string; quantity: number; unitPrice: { amountMinor: number; currency: 'EUR' }; lineTotal: { amountMinor: number; currency: 'EUR' } }[] };
function bounded<K, V>(map: Map<K, V>, max: number) { if (map.size >= max) map.delete(map.keys().next().value!); }

export function createProviderApp({ products = productFixtures, content = brandFixture, maxCarts = 1000, maxOrders = 1000 }: {
  products?: typeof productFixtures; content?: typeof brandFixture; maxCarts?: number; maxOrders?: number;
} = {}) {
  const stock = new Map(products.map(product => [product.sku, product.available_units]));
  const withStock = (product: typeof productFixtures[number]) => ({ ...product, available_units: stock.get(product.sku)! });
  const carts = new Map<string, Map<string, number>>();
  const orders = new Map<string, VendorOrder>();
  const idempotency = new Map<string, { fingerprint: string; orderId: string }>();
  const vendorCart = (cartId: string, lines: Map<string, number>) => {
    const entries = [...lines].map(([sku, qty]) => {
      const product = products.find(item => item.sku === sku)!;
      return { sku, display_name: product.display_name, qty, unit_price: product.unit_price,
        line_total: { cents: product.unit_price.cents * qty, currency_code: product.unit_price.currency_code } };
    });
    return { cart_id: cartId, entries, total_units: entries.reduce((sum, entry) => sum + entry.qty, 0),
      subtotal: { cents: entries.reduce((sum, entry) => sum + entry.line_total.cents, 0), currency_code: 'EUR' } };
  };
  const rejectCart = (res: express.Response, status: number, code: string) => { res.status(status).json({ error: code, code }); };
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  app.get('/health', (_req, res) => { res.json({ status: 'ok' }); });
  app.get('/products', (req, res) => {
    if (!isCatalogQuery(req.query)) { res.status(400).json({ error: 'Invalid catalog query' }); return; }
    const { collection, sort = 'featured' } = req.query;
    const productsToShow = products.filter(product => !collection || product.collection_name.toLowerCase() === collection);
    productsToShow.sort((a, b) => {
      const primary = sort === 'price-asc' ? a.unit_price.cents - b.unit_price.cents
        : sort === 'price-desc' ? b.unit_price.cents - a.unit_price.cents
        : sort === 'name-asc' ? a.display_name.localeCompare(b.display_name, 'en') : 0;
      return primary || a.sku.localeCompare(b.sku, 'en');
    });
    res.json({ items: productsToShow.map(withStock), count: productsToShow.length });
  });
  app.get('/products/:id', (req, res) => {
    const product = products.find(item => item.sku === req.params.id);
    if (!product) { res.status(404).json({ error: 'Unknown SKU' }); return; }
    res.json(withStock(product));
  });
  app.get('/content/brand', (_req, res) => { res.json(content); });
  app.post('/carts', (_req, res) => {
    bounded(carts, maxCarts);
    const cartId = randomUUID();
    carts.set(cartId, new Map());
    res.status(201).json(vendorCart(cartId, carts.get(cartId)!));
  });
  app.get('/carts/:id', (req, res) => {
    const lines = isCartId(req.params.id) ? carts.get(req.params.id) : undefined;
    if (!lines) { rejectCart(res, 404, 'cart_not_found'); return; }
    res.json(vendorCart(req.params.id, lines));
  });
  // Stock is checked but not reserved; order acceptance must check it again.
  app.post('/carts/:id/lines', express.json({ limit: '1kb' }), (req, res) => {
    const lines = isCartId(req.params.id) ? carts.get(req.params.id) : undefined;
    if (!lines) { rejectCart(res, 404, 'cart_not_found'); return; }
    const body: unknown = req.body;
    if (!isRecord(body) || typeof body.sku !== 'string' || !isQuantity(body.qty)) { rejectCart(res, 400, 'invalid_line'); return; }
    const product = products.find(item => item.sku === body.sku);
    if (!product) { rejectCart(res, 404, 'unknown_sku'); return; }
    const quantity = (lines.get(product.sku) ?? 0) + body.qty;
    if (!lines.has(product.sku) && lines.size >= CART_LIMITS.maxLines) { rejectCart(res, 409, 'line_limit'); return; }
    if (quantity > CART_LIMITS.maxQuantity) { rejectCart(res, 409, 'quantity_limit'); return; }
    if (quantity > stock.get(product.sku)!) { rejectCart(res, 409, 'insufficient_stock'); return; }
    lines.set(product.sku, quantity);
    res.json(vendorCart(req.params.id, lines));
  });
  // Sets an existing line; 0 removes it. Stock is checked only when the quantity increases,
  // so a guest can always reduce or remove a line even if stock has since dropped.
  app.put('/carts/:id/lines/:sku', express.json({ limit: '1kb' }), (req, res) => {
    const lines = isCartId(req.params.id) ? carts.get(req.params.id) : undefined;
    if (!lines) { rejectCart(res, 404, 'cart_not_found'); return; }
    const body: unknown = req.body;
    const qty = isRecord(body) ? body.qty : undefined;
    if (!Number.isInteger(qty) || (qty as number) < 0 || (qty as number) > CART_LIMITS.maxQuantity) { rejectCart(res, 400, 'invalid_line'); return; }
    const current = lines.get(req.params.sku);
    if (current === undefined) { rejectCart(res, 404, 'line_not_found'); return; }
    const product = products.find(item => item.sku === req.params.sku)!;
    if ((qty as number) > current && (qty as number) > stock.get(product.sku)!) { rejectCart(res, 409, 'insufficient_stock'); return; }
    if (qty === 0) lines.delete(req.params.sku); else lines.set(req.params.sku, qty as number);
    res.json(vendorCart(req.params.id, lines));
  });
  const orderError = (req: express.Request, res: express.Response, status: number, code: string, message: string) => {
    res.status(status).json({ code, message, requestId: req.get('X-Request-ID') ?? 'none' });
  };
  // Order acceptance. Everything after body parsing is synchronous: no await between the
  // idempotency lookup, re-pricing, the all-or-nothing stock check, the decrement, order creation
  // and the idempotency record. Node runs this to completion before any other request, so two
  // confirmations cannot both take the last unit. A multi-process deployment would need a
  // durable transaction instead.
  app.post('/orders', express.json({ limit: '2kb' }), (req, res) => {
    const key = req.get('Idempotency-Key');
    if (!isIdempotencyKey(key)) { orderError(req, res, 400, 'INVALID_INPUT', 'A valid Idempotency-Key header is required.'); return; }
    const body: unknown = req.body;
    const items = isRecord(body) && Object.keys(body).length === 1 && Array.isArray(body.items) ? body.items : null;
    const valid = items && items.length >= 1 && items.length <= CART_LIMITS.maxLines && items.every(item =>
      isRecord(item) && Object.keys(item).length === 2 && isProductQuery({ id: item.productId }) && isQuantity(item.quantity));
    const lines = valid ? (items as { productId: string; quantity: number }[]) : null;
    if (!lines || new Set(lines.map(line => line.productId)).size !== lines.length) {
      orderError(req, res, 400, 'INVALID_INPUT', 'Order items must be unique product IDs with integer quantities.'); return;
    }
    const fingerprint = JSON.stringify([...lines].sort((a, b) => a.productId.localeCompare(b.productId, 'en')).map(line => [line.productId, line.quantity]));
    const previous = idempotency.get(key);
    if (previous) {
      if (previous.fingerprint !== fingerprint) { orderError(req, res, 409, 'IDEMPOTENCY_CONFLICT', 'This key was already used for a different order.'); return; }
      const replay = orders.get(previous.orderId);
      // Never create a second order for a recorded key, even if the original was evicted.
      if (!replay) { orderError(req, res, 409, 'IDEMPOTENCY_CONFLICT', 'This key can no longer be replayed.'); return; }
      res.status(200).json(replay); return;
    }
    const priced = lines.map(line => ({ line, product: products.find(item => item.sku === line.productId) }));
    if (priced.some(entry => !entry.product)) { orderError(req, res, 404, 'PRODUCT_NOT_FOUND', 'A product in the order does not exist.'); return; }
    if (priced.some(({ line, product }) => line.quantity > stock.get(product!.sku)!)) {
      orderError(req, res, 409, 'OUT_OF_STOCK', 'A selected product is no longer available in that quantity.'); return;
    }
    for (const { line, product } of priced) stock.set(product!.sku, stock.get(product!.sku)! - line.quantity);
    const orderItems = priced.map(({ line, product }) => ({
      productId: product!.sku, name: product!.display_name, quantity: line.quantity,
      unitPrice: { amountMinor: product!.unit_price.cents, currency: 'EUR' as const },
      lineTotal: { amountMinor: product!.unit_price.cents * line.quantity, currency: 'EUR' as const },
    }));
    const order: VendorOrder = { id: randomUUID(), status: 'confirmed', items: orderItems,
      total: { amountMinor: orderItems.reduce((sum, item) => sum + item.lineTotal.amountMinor, 0), currency: 'EUR' } };
    bounded(orders, maxOrders);
    bounded(idempotency, maxOrders);
    orders.set(order.id, order);
    idempotency.set(key, { fingerprint, orderId: order.id });
    res.status(201).json(order);
  });
  app.get('/orders/:id', (req, res) => {
    const order = isOrderId(req.params.id) ? orders.get(req.params.id) : undefined;
    if (!order) { orderError(req, res, 404, 'ORDER_NOT_FOUND', 'Order not found.'); return; }
    res.json(order);
  });
  const invalidBody: ErrorRequestHandler = (_error, req, res, _next) => {
    if (req.path === '/orders') orderError(req, res, 400, 'INVALID_INPUT', 'Invalid order body.');
    else rejectCart(res, 400, 'invalid_line');
  };
  app.use(invalidBody);
  return app;
}
