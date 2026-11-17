import express, { type ErrorRequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { CART_LIMITS, isCatalogQuery, isCartId, isQuantity, isRecord } from '@atelier/contracts';

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
// In-memory guest carts: state belongs to one app instance and resets on restart.
// The oldest carts are evicted beyond maxCarts so memory stays bounded.
export function createProviderApp({ products = productFixtures, content = brandFixture, maxCarts = 1000 }: {
  products?: typeof productFixtures; content?: typeof brandFixture; maxCarts?: number;
} = {}) {
  const carts = new Map<string, Map<string, number>>();
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
    res.json({ items: productsToShow, count: productsToShow.length });
  });
  app.get('/products/:id', (req, res) => {
    const product = products.find(item => item.sku === req.params.id);
    if (!product) { res.status(404).json({ error: 'Unknown SKU' }); return; }
    res.json(product);
  });
  app.get('/content/brand', (_req, res) => { res.json(content); });
  app.post('/carts', (_req, res) => {
    if (carts.size >= maxCarts) carts.delete(carts.keys().next().value!);
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
    if (quantity > product.available_units) { rejectCart(res, 409, 'insufficient_stock'); return; }
    lines.set(product.sku, quantity);
    res.json(vendorCart(req.params.id, lines));
  });
  const invalidBody: ErrorRequestHandler = (_error, _req, res, _next) => { rejectCart(res, 400, 'invalid_line'); };
  app.use(invalidBody);
  return app;
}
