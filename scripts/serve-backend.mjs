// Production entry for the deployed backend: the fictional provider and the Express BFF in ONE
// Node process. One process is what keeps the provider's synchronous stock/order critical section
// valid (ADR 0006), so the service must run as a single instance.
// The provider listens on loopback only; the BFF listens on HOST:PORT (PORT is set by the host).
// Requires a prior `npm run build:services`.
import { createProviderApp } from '../apps/mock-services/dist/app.js';
import { createMiddlewareServer } from '../apps/middleware/dist/server.js';

const production = process.env.NODE_ENV === 'production';
const apiToken = process.env.BFF_API_TOKEN || undefined;
if (production && !apiToken) {
  console.error('BFF_API_TOKEN is required in production: the BFF is reachable over the network.');
  process.exit(1);
}
const providerPort = Number(process.env.PROVIDER_PORT ?? 4100);
const port = Number(process.env.PORT ?? process.env.MIDDLEWARE_PORT ?? 4000);
const host = process.env.HOST ?? (production ? '0.0.0.0' : '127.0.0.1');

const provider = createProviderApp().listen(providerPort, '127.0.0.1');
const bff = createMiddlewareServer({
  providerUrl: `http://127.0.0.1:${providerPort}`,
  timeoutMs: Number(process.env.PROVIDER_TIMEOUT_MS ?? 1500),
  apiToken,
});
bff.listen(port, host, () => console.log(`Backend ready: BFF on ${host}:${port}, provider on 127.0.0.1:${providerPort}, auth ${apiToken ? 'on' : 'off'}`));

function stop() {
  bff.close();
  provider.close();
}
process.once('SIGTERM', stop);
process.once('SIGINT', stop);
