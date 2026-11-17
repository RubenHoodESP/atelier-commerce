import { randomUUID } from 'node:crypto';
import { isCart, isCartId, isCartItemInput, isRecord,
  type Cart, type CartResult, type ErrorCode, type Failure } from '@atelier/contracts';
import type { ProviderSettings } from './product.js';

const MESSAGES: Partial<Record<ErrorCode, string>> = {
  INVALID_INPUT: 'Invalid cart request.',
  PRODUCT_NOT_FOUND: 'Product not found.',
  CART_NOT_FOUND: 'Cart not found.',
  OUT_OF_STOCK: 'The requested quantity is not available.',
  CART_LIMIT_EXCEEDED: 'The bag has reached its limit for this item.',
  UPSTREAM_TIMEOUT: 'The cart service took too long.',
  UPSTREAM_INVALID_RESPONSE: 'Invalid cart service response.',
};
function failure(code: ErrorCode, requestId: string): Failure {
  return { ok: false, error: { code, message: MESSAGES[code] ?? 'The cart service is unavailable.', requestId } };
}

// Vendor cart -> public Cart. Any disagreement in totals invalidates the response.
export function normalizeCart(data: unknown): Cart | null {
  if (!isRecord(data) || !Array.isArray(data.entries) || !isRecord(data.subtotal)) return null;
  const lines = data.entries.map(entry => isRecord(entry) && isRecord(entry.unit_price) && isRecord(entry.line_total) ? {
    productId: entry.sku, name: entry.display_name, quantity: entry.qty,
    unitPrice: { amountMinor: entry.unit_price.cents, currency: entry.unit_price.currency_code },
    lineTotal: { amountMinor: entry.line_total.cents, currency: entry.line_total.currency_code },
  } : null);
  const cart = { id: data.cart_id, lines, itemCount: data.total_units,
    subtotal: { amountMinor: data.subtotal.cents, currency: data.subtotal.currency_code } };
  return isCart(cart) ? cart : null;
}

// Vendor error codes are mapped explicitly; anything unexpected is an upstream failure.
const VENDOR_ERRORS: Record<string, ErrorCode> = {
  cart_not_found: 'CART_NOT_FOUND', unknown_sku: 'PRODUCT_NOT_FOUND', insufficient_stock: 'OUT_OF_STOCK',
  line_limit: 'CART_LIMIT_EXCEEDED', quantity_limit: 'CART_LIMIT_EXCEEDED',
};
async function callProvider(settings: ProviderSettings, path: string, requestId: string,
  { method = 'GET', body, expectedStatus = 200, expectedId }: { method?: 'GET' | 'POST'; body?: unknown; expectedStatus?: number; expectedId?: string } = {}): Promise<CartResult> {
  try {
    // Sent once: a timed-out write may still have been applied, so it is never retried.
    const response = await fetch(new URL(path, settings.providerUrl), {
      method, cache: 'no-store',
      signal: AbortSignal.timeout(settings.timeoutMs),
      headers: body === undefined ? { 'X-Request-ID': requestId } : { 'X-Request-ID': requestId, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data: unknown = await response.json();
    if (response.status !== expectedStatus) {
      const code = isRecord(data) && typeof data.code === 'string' && Object.hasOwn(VENDOR_ERRORS, data.code) ? VENDOR_ERRORS[data.code]! : null;
      return failure(code ?? (response.status === 400 ? 'UPSTREAM_INVALID_RESPONSE' : 'UPSTREAM_UNAVAILABLE'), requestId);
    }
    const cart = normalizeCart(data);
    if (!cart || (expectedId && cart.id !== expectedId)) return failure('UPSTREAM_INVALID_RESPONSE', requestId);
    return { ok: true, cart };
  } catch (error) {
    if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) return failure('UPSTREAM_TIMEOUT', requestId);
    if (error instanceof SyntaxError) return failure('UPSTREAM_INVALID_RESPONSE', requestId);
    return failure('UPSTREAM_UNAVAILABLE', requestId);
  }
}

export async function createCart(settings: ProviderSettings, requestId = randomUUID()): Promise<CartResult> {
  const result = await callProvider(settings, '/carts', requestId, { method: 'POST', expectedStatus: 201 });
  return result.ok && result.cart.lines.length > 0 ? failure('UPSTREAM_INVALID_RESPONSE', requestId) : result;
}
export async function getCart(settings: ProviderSettings, cartId: unknown, requestId = randomUUID()): Promise<CartResult> {
  if (!isCartId(cartId)) return failure('INVALID_INPUT', requestId);
  return callProvider(settings, `/carts/${cartId}`, requestId, { expectedId: cartId });
}
// Only IDs and quantities cross this boundary; price/total fields make the input invalid.
export async function addCartItem(settings: ProviderSettings, cartId: unknown, input: unknown, requestId = randomUUID()): Promise<CartResult> {
  if (!isCartId(cartId) || !isCartItemInput(input)) return failure('INVALID_INPUT', requestId);
  return callProvider(settings, `/carts/${cartId}/lines`, requestId, {
    method: 'POST', body: { sku: input.productId, qty: input.quantity }, expectedId: cartId,
  });
}
