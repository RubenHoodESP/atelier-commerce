import { randomUUID } from 'node:crypto';
import { isRecord, isProduct, isProductQuery, type ProductResult, type ErrorCode } from '@atelier/contracts';

export type ProviderSettings = { providerUrl: string; timeoutMs: number };
export async function getProduct(settings: ProviderSettings, query: unknown, requestId = randomUUID()): Promise<ProductResult> {
  const failure = (code: ErrorCode, message: string): ProductResult => ({ ok: false, error: { code, message, requestId } });
  if (!isProductQuery(query)) return failure('INVALID_INPUT', 'A valid product identifier is required.');
  try {
    const response = await fetch(new URL(`/products/${encodeURIComponent(query.id)}`, settings.providerUrl), {
      signal: AbortSignal.timeout(settings.timeoutMs), headers: { 'X-Request-ID': requestId }, cache: 'no-store',
    });
    if (response.status === 404) return failure('PRODUCT_NOT_FOUND', 'Product not found.');
    if (!response.ok) return failure('UPSTREAM_UNAVAILABLE', 'The product service is unavailable.');
    const data: unknown = await response.json();
    if (!isRecord(data) || !isRecord(data.unit_price)) return failure('UPSTREAM_INVALID_RESPONSE', 'Invalid product service response.');
    const product = {
      id: data.sku, name: data.display_name, collection: data.collection_name,
      price: { amountMinor: data.unit_price.cents, currency: data.unit_price.currency_code }, stock: data.available_units,
    };
    if (!isProduct(product) || product.id !== query.id) return failure('UPSTREAM_INVALID_RESPONSE', 'Invalid product service response.');
    return { ok: true, product };
  } catch (error) {
    if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) return failure('UPSTREAM_TIMEOUT', 'The product service took too long.');
    if (error instanceof SyntaxError) return failure('UPSTREAM_INVALID_RESPONSE', 'Invalid product service response.');
    return failure('UPSTREAM_UNAVAILABLE', 'The product service is unavailable.');
  }
}
