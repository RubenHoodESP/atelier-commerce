import { createMiddlewareServer } from './server.js';
const server = await createMiddlewareServer({
  providerUrl: process.env.PROVIDER_URL ?? 'http://127.0.0.1:4100',
  timeoutMs: Number(process.env.PROVIDER_TIMEOUT_MS ?? 1500),
});
const port = Number(process.env.MIDDLEWARE_PORT ?? 4000);
server.listen(port, '127.0.0.1', () => console.log(`Alokai middleware on ${port}`));
process.once('SIGTERM', () => server.close());
process.once('SIGINT', () => server.close());
