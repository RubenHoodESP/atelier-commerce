import express from 'express';
import { isCatalogQuery } from '@atelier/contracts';

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
export function createProviderApp({ products = productFixtures, content = brandFixture }: {
  products?: typeof productFixtures; content?: typeof brandFixture;
} = {}) {
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
  return app;
}
