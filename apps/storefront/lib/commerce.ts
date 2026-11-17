import 'server-only';
import { initSDK, buildModule, middlewareModule } from '@vue-storefront/sdk';
import type { CommerceEndpoints } from '@atelier/contracts';

export function getCommerce() {
  const apiUrl = process.env.ALOKAI_MIDDLEWARE_URL ?? 'http://127.0.0.1:4000/commerce';
  return initSDK({ commerce: buildModule(middlewareModule<CommerceEndpoints>, {
    apiUrl, logger: false,
    defaultRequestConfig: { cache: 'no-store', signal: AbortSignal.timeout(2500) },
  }) }).commerce;
}
