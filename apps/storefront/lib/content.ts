import 'server-only';
import { createContentClient } from '@atelier/contracts/client';
import type { BrandContent } from '@atelier/contracts';
export const fallbackContent: BrandContent = {
  headline: 'A quieter kind of statement.',
  intro: 'Discover the Atelier collection of fictional watches.',
  story: 'Considered forms for everyday moments. Atelier is a fictional brand and this collection is a learning demonstration.',
};
export async function getBrandContent(): Promise<BrandContent> {
  try {
    const result = await createContentClient({
      baseUrl: process.env.COMMERCE_API_URL ?? 'http://127.0.0.1:4000/api',
      timeoutMs: Number(process.env.COMMERCE_API_TIMEOUT_MS ?? 2500),
      apiToken: process.env.BFF_API_TOKEN || undefined,
    }).getBrandContent();
    if (result.ok) return result.content;
    console.warn('Editorial fallback', { code: result.error.code, requestId: result.error.requestId });
  } catch { console.warn('Editorial fallback', { code: 'CONTENT_TRANSPORT_ERROR' }); }
  return fallbackContent;
}
