import express, { type ErrorRequestHandler } from 'express';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { ERROR_STATUS, type ProductResult } from '@atelier/contracts';
import { getProduct, type ProviderSettings } from './product.js';

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
  app.get('/api/products/:id', async (req, res, next) => {
    try {
      // Reject unexpected query fields instead of accepting provider URLs/prices.
      const query = Object.keys(req.query).length === 0 ? { id: req.params.id } : null;
      const result = await getProduct(settings, query, res.locals.requestId);
      res.status(result.ok ? 200 : ERROR_STATUS[result.error.code]).json(result);
    } catch (error) { next(error); }
  });
  app.use((_req, res) => {
    const result: ProductResult = { ok: false, error: {
      code: 'PRODUCT_NOT_FOUND', message: 'Resource not found.', requestId: res.locals.requestId,
    } };
    res.status(404).json(result);
  });
  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    const code = error instanceof URIError ? 'INVALID_INPUT' : 'INTERNAL_ERROR';
    const result: ProductResult = { ok: false, error: {
      code, message: code === 'INVALID_INPUT' ? 'Invalid request.' : 'The product service is unavailable.',
      requestId: res.locals.requestId,
    } };
    res.status(ERROR_STATUS[code]).json(result);
  };
  app.use(handleError);
  return createServer(app);
}
