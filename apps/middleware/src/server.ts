import { createServer } from '@vue-storefront/middleware';
import { fileURLToPath } from 'node:url';
import type { ProviderSettings } from './product.js';

export async function createMiddlewareServer(settings: ProviderSettings) {
  const provider = new URL(settings.providerUrl);
  if (!['http:', 'https:'].includes(provider.protocol) || provider.username || provider.password) throw new Error('Invalid provider URL configuration.');
  if (!Number.isInteger(settings.timeoutMs) || settings.timeoutMs < 1 || settings.timeoutMs > 30000) throw new Error('Invalid provider timeout configuration.');
  return createServer({
    integrations: {
      commerce: { location: fileURLToPath(new URL('./integration.cjs', import.meta.url)), configuration: settings },
    },
  });
}
