// Public Alokai 5.x loads integration locations through require(). Keep this
// narrow CommonJS bridge; the app and the product adapter remain native ESM.
import { apiClientFactory } from '@vue-storefront/middleware';
import type { ProductContext, ProviderSettings } from './product.js';
const { createApiClient } = apiClientFactory({
  onCreate: (settings: ProviderSettings) => ({ config: settings, client: {} }),
  api: {
    getProduct: async (context: ProductContext, query: unknown) => {
      const { getProduct } = await import('./product.js');
      return getProduct(context, query);
    },
  },
});
export { createApiClient };
