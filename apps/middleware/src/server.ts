import express, { type ErrorRequestHandler } from 'express';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { ERROR_STATUS, type CartResult, type ProductResult } from '@atelier/contracts';
import { getProduct, type ProviderSettings } from './product.js';
import { getProducts, getBrandContent } from './catalog.js';
import { addCartItem, createCart, getCart } from './cart.js';

export function createMiddlewareServer(settings: ProviderSettings) {
  const provider = new URL(settings.providerUrl);
  if (!['http:', 'https:'].includes(provider.protocol) || provider.username || provider.password) throw new Error('Invalid provider URL configuration.');
  if (!Number.isInteger(settings.timeoutMs) || settings.timeoutMs < 1 || settings.timeoutMs > 30000) throw new Error('Invalid provider timeout configuration.');
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.locals.requestId = randomUUID();
    res.setHeader('X-Request-ID', res.locals.requestId);
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.get('/healthz', (_req, res) => { res.json({ status: 'ok' }); });
  app.get('/api/products', async (req, res, next) => {
    try {
      const result = await getProducts(settings, req.query, res.locals.requestId);
      res.status(result.ok ? 200 : ERROR_STATUS[result.error.code]).json(result);
    } catch (error) { next(error); }
  });
  app.get('/api/content/brand', async (req, res, next) => {
    try {
      if (Object.keys(req.query).length) {
        res.status(400).json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid request.', requestId: res.locals.requestId } });
        return;
      }
      const result = await getBrandContent(settings, res.locals.requestId);
      res.status(result.ok ? 200 : ERROR_STATUS[result.error.code]).json(result);
    } catch (error) { next(error); }
  });
  app.get('/api/products/:id', async (req, res, next) => {
    try {
      // Reject unexpected query fields instead of accepting provider URLs/prices.
      const query = Object.keys(req.query).length === 0 ? { id: req.params.id } : null;
      const result = await getProduct(settings, query, res.locals.requestId);
      res.status(result.ok ? 200 : ERROR_STATUS[result.error.code]).json(result);
    } catch (error) { next(error); }
  });
  // Cart routes are called by the Next server only; the browser never reaches the BFF.
  const invalid = (res: express.Response) => res.status(400).json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid cart request.', requestId: res.locals.requestId } });
  const send = (res: express.Response, result: CartResult, successStatus = 200) => {
    res.status(result.ok ? successStatus : ERROR_STATUS[result.error.code]).json(result);
  };
  app.post('/api/carts', async (req, res, next) => {
    try {
      if (Object.keys(req.query).length || req.headers['content-length'] && req.headers['content-length'] !== '0') { invalid(res); return; }
      send(res, await createCart(settings, res.locals.requestId), 201);
    } catch (error) { next(error); }
  });
  app.get('/api/carts/:id', async (req, res, next) => {
    try {
      if (Object.keys(req.query).length) { invalid(res); return; }
      send(res, await getCart(settings, req.params.id, res.locals.requestId));
    } catch (error) { next(error); }
  });
  app.post('/api/carts/:id/items', express.json({ limit: '1kb', strict: true }), async (req, res, next) => {
    try {
      if (Object.keys(req.query).length) { invalid(res); return; }
      send(res, await addCartItem(settings, req.params.id, req.body, res.locals.requestId));
    } catch (error) { next(error); }
  });
  app.use((_req, res) => {
    const result: ProductResult = { ok: false, error: {
      code: 'PRODUCT_NOT_FOUND', message: 'Resource not found.', requestId: res.locals.requestId,
    } };
    res.status(404).json(result);
  });
  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    // URIError: malformed path encoding; body-parser errors carry a `type` (bad JSON, too large).
    const bodyError = error instanceof Error && typeof (error as { type?: unknown }).type === 'string';
    const code = error instanceof URIError || bodyError ? 'INVALID_INPUT' : 'INTERNAL_ERROR';
    const result: ProductResult = { ok: false, error: {
      code, message: code === 'INVALID_INPUT' ? 'Invalid request.' : 'The product service is unavailable.',
      requestId: res.locals.requestId,
    } };
    res.status(ERROR_STATUS[code]).json(result);
  };
  app.use(handleError);
  return createServer(app);
}
