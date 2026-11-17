import { randomUUID } from 'node:crypto';
import { isIdempotencyKey, isOrder, isOrderId, isPlaceOrderInput, isRecord,
  type ErrorCode, type Failure, type Order, type OrderResult } from '@atelier/contracts';
import type { ProviderSettings } from './product.js';
import { getCart } from './cart.js';

const MESSAGES: Partial<Record<ErrorCode, string>> = {
  INVALID_INPUT: 'Invalid order request.',
  CART_NOT_FOUND: 'Cart not found.',
  CART_EMPTY: 'The bag is empty.',
  ORDER_NOT_FOUND: 'Order not found.',
  PRODUCT_NOT_FOUND: 'A product in the order does not exist.',
  OUT_OF_STOCK: 'A selected product is no longer available in that quantity.',
  IDEMPOTENCY_CONFLICT: 'This order request conflicts with an earlier one.',
  UPSTREAM_TIMEOUT: 'The order service took too long.',
  UPSTREAM_INVALID_RESPONSE: 'Invalid order service response.',
};
function failure(code: ErrorCode, requestId: string): Failure {
  return { ok: false, error: { code, message: MESSAGES[code] ?? 'The order service is unavailable.', requestId } };
}
const PROVIDER_CODES: readonly ErrorCode[] = ['PRODUCT_NOT_FOUND', 'OUT_OF_STOCK', 'IDEMPOTENCY_CONFLICT', 'ORDER_NOT_FOUND'];
const isProviderCode = (value: unknown): value is ErrorCode => PROVIDER_CODES.some(code => code === value);

// Provider order -> public Order; totals must agree with the lines.
export function normalizeOrder(data: unknown): Order | null {
  if (!isRecord(data) || !Array.isArray(data.items)) return null;
  const lines = data.items.map(item => isRecord(item) ? {
    productId: item.productId, name: item.name, quantity: item.quantity, unitPrice: item.unitPrice, lineTotal: item.lineTotal,
  } : null);
  const order = { id: data.id, status: data.status, lines, total: data.total,
    itemCount: lines.reduce((sum, line) => sum + (line && typeof line.quantity === 'number' ? line.quantity : 0), 0) };
  return isOrder(order) ? order : null;
}

async function callProvider(settings: ProviderSettings, path: string, requestId: string,
  { body, idempotencyKey, accept }: { body?: unknown; idempotencyKey?: string; accept: number[] }): Promise<{ result: OrderResult; status: number }> {
  try {
    // Sent once. After a timeout the outcome is unknown; the caller may resend the SAME key,
    // which the provider answers with the original order instead of creating another.
    const response = await fetch(new URL(path, settings.providerUrl), {
      method: body === undefined ? 'GET' : 'POST', cache: 'no-store', signal: AbortSignal.timeout(settings.timeoutMs),
      headers: { 'X-Request-ID': requestId, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data: unknown = await response.json();
    if (!accept.includes(response.status)) {
      const code = isRecord(data) && isProviderCode(data.code) ? data.code : null;
      return { result: failure(code ?? (response.status === 400 ? 'UPSTREAM_INVALID_RESPONSE' : 'UPSTREAM_UNAVAILABLE'), requestId), status: 0 };
    }
    const order = normalizeOrder(data);
    return order ? { result: { ok: true, order }, status: response.status } : { result: failure('UPSTREAM_INVALID_RESPONSE', requestId), status: 0 };
  } catch (error) {
    const code = error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name) ? 'UPSTREAM_TIMEOUT'
      : error instanceof SyntaxError ? 'UPSTREAM_INVALID_RESPONSE' : 'UPSTREAM_UNAVAILABLE';
    return { result: failure(code, requestId), status: 0 };
  }
}

// The order is built from the commerce cart: the request carries only the cart ID and the key.
// `created` distinguishes a new order (201) from an idempotent replay (200).
export async function placeOrder(settings: ProviderSettings, input: unknown, idempotencyKey: unknown,
  requestId = randomUUID()): Promise<{ result: OrderResult; created: boolean }> {
  if (!isPlaceOrderInput(input) || !isIdempotencyKey(idempotencyKey)) return { result: failure('INVALID_INPUT', requestId), created: false };
  const cart = await getCart(settings, input.cartId, requestId);
  if (!cart.ok) return { result: cart, created: false };
  if (cart.cart.lines.length === 0) return { result: failure('CART_EMPTY', requestId), created: false };
  const items = cart.cart.lines.map(line => ({ productId: line.productId, quantity: line.quantity }));
  const { result, status } = await callProvider(settings, '/orders', requestId, { body: { items }, idempotencyKey, accept: [200, 201] });
  return { result, created: status === 201 };
}

export async function getOrder(settings: ProviderSettings, orderId: unknown, requestId = randomUUID()): Promise<OrderResult> {
  if (!isOrderId(orderId)) return failure('INVALID_INPUT', requestId);
  const { result } = await callProvider(settings, `/orders/${orderId}`, requestId, { accept: [200] });
  return result.ok && result.order.id !== orderId ? failure('UPSTREAM_INVALID_RESPONSE', requestId) : result;
}
