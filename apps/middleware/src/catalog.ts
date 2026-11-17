import { randomUUID } from 'node:crypto';
import { catalogSearch, isBrandContent, isCatalogQuery, isCatalogResult, isRecord,
  type CatalogResult, type ContentResult, type ErrorCode, type Failure } from '@atelier/contracts';
import { normalizeProduct, type ProviderSettings } from './product.js';

function failure(code: ErrorCode, requestId: string): Failure {
  const message = code === 'INVALID_INPUT' ? 'Invalid catalog query.'
    : code === 'UPSTREAM_TIMEOUT' ? 'The service took too long.'
    : code === 'UPSTREAM_INVALID_RESPONSE' ? 'Invalid service response.' : 'The service is unavailable.';
  return { ok: false, error: { code, message, requestId } };
}
async function readProvider(settings: ProviderSettings, path: string, requestId: string): Promise<unknown> {
  const response = await fetch(new URL(path, settings.providerUrl), {
    cache: 'no-store', signal: AbortSignal.timeout(settings.timeoutMs), headers: { 'X-Request-ID': requestId },
  });
  if (!response.ok) throw new Error('UPSTREAM_UNAVAILABLE');
  return response.json();
}
function failedRead(error: unknown, requestId: string): Failure {
  const code = error instanceof SyntaxError ? 'UPSTREAM_INVALID_RESPONSE'
    : error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name) ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE';
  return failure(code, requestId);
}
export async function getProducts(settings: ProviderSettings, query: unknown, requestId = randomUUID()): Promise<CatalogResult> {
  if (!isCatalogQuery(query)) return failure('INVALID_INPUT', requestId);
  try {
    const data = await readProvider(settings, `/products${catalogSearch(query)}`, requestId);
    if (!isRecord(data) || !Array.isArray(data.items)) return failure('UPSTREAM_INVALID_RESPONSE', requestId);
    const result = { ok: true, products: data.items.map(normalizeProduct), total: data.count };
    if (!isCatalogResult(result)) return failure('UPSTREAM_INVALID_RESPONSE', requestId);
    return result;
  } catch (error) { return failedRead(error, requestId); }
}
export async function getBrandContent(settings: ProviderSettings, requestId = randomUUID()): Promise<ContentResult> {
  try {
    const data = await readProvider(settings, '/content/brand', requestId);
    if (!isRecord(data)) return failure('UPSTREAM_INVALID_RESPONSE', requestId);
    const content = { headline: data.hero_title, intro: data.hero_text, story: data.brand_story };
    return isBrandContent(content) ? { ok: true, content } : failure('UPSTREAM_INVALID_RESPONSE', requestId);
  } catch (error) { return failedRead(error, requestId); }
}
