import express from 'express';

// Intentionally vendor-shaped: the integration must normalize it.
export const horizonFixture = {
  sku: 'watch-001', display_name: 'Atelier Horizon', collection_name: 'Horizon',
  unit_price: { cents: 125000, currency_code: 'EUR' }, available_units: 3,
};

export function createProviderApp() {
  const app = express();
  app.disable('x-powered-by');
  app.get('/health', (_req, res) => { res.json({ status: 'ok' }); });
  app.get('/products/:id', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.params.id !== horizonFixture.sku) {
      res.status(404).json({ error: 'Unknown SKU' });
      return;
    }
    res.json(horizonFixture);
  });
  return app;
}
