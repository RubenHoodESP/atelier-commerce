'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { CART_LIMITS, isIdempotencyKey, isProductQuery, type CartResult, type ErrorCode, type OrderResult } from '@atelier/contracts';
import { getCommerce } from '../../lib/commerce';
import { clearCartId, readCartId, writeCartId } from '../../lib/cart';

export type AddToBagState = { message: string } | null;

const MESSAGES: Partial<Record<ErrorCode, string>> = {
  OUT_OF_STOCK: 'That quantity is no longer available.',
  CART_LIMIT_EXCEEDED: 'Your bag has reached the limit for this watch.',
  PRODUCT_NOT_FOUND: 'This watch is no longer part of the collection.',
};
const UNAVAILABLE = 'The bag is temporarily unavailable. Please try again.';

// Next rejects Server Action requests whose Origin does not match the host.
// The form sends only a product ID; quantity and prices are decided on the server.
export async function addToBag(_previous: AddToBagState, formData: FormData): Promise<AddToBagState> {
  const productId = formData.get('productId');
  if (typeof productId !== 'string' || !isProductQuery({ id: productId })) return { message: 'This watch could not be added.' };
  const input = { productId, quantity: 1 };
  const commerce = getCommerce();
  let result: CartResult | null;
  try {
    const cartId = await readCartId();
    result = cartId ? await commerce.addCartItem({ cartId }, input) : null;
    if (!result || (!result.ok && result.error.code === 'CART_NOT_FOUND')) {
      // No cart yet, or the provider restarted and lost it. Nothing was applied, so starting a new cart is safe.
      const created = await commerce.createCart();
      if (!created.ok) return { message: UNAVAILABLE };
      await writeCartId(created.cart.id);
      result = await commerce.addCartItem({ cartId: created.cart.id }, input);
    }
  } catch {
    return { message: UNAVAILABLE };
  }
  if (!result.ok) return { message: MESSAGES[result.error.code] ?? UNAVAILABLE };
  // Layouts persist across navigations; revalidate so the header bag count is fresh.
  revalidatePath('/', 'layout');
  return redirect('/cart');
}

export type UpdateBagState = { message: string; focusStatus: boolean; version: number } | null;

// Sets a line quantity (intent=update) or removes it (intent=remove). Setting is idempotent,
// so a repeated submission cannot add extra units. The page is re-rendered with commerce totals.
export async function updateBagItem(previous: UpdateBagState, formData: FormData): Promise<UpdateBagState> {
  const version = (previous?.version ?? 0) + 1;
  const reply = (message: string, focusStatus = false) => ({ message, focusStatus, version });
  const productId = formData.get('productId');
  const intent = formData.get('intent');
  const rawQuantity = formData.get('quantity');
  if (typeof productId !== 'string' || !isProductQuery({ id: productId }) || (intent !== 'update' && intent !== 'remove')) {
    return reply('That change could not be applied.');
  }
  const quantity = intent === 'remove' ? 0
    : typeof rawQuantity === 'string' && /^[0-9]{1,2}$/.test(rawQuantity) ? Number(rawQuantity) : NaN;
  if (!(quantity === 0 && intent === 'remove') && !(quantity >= 1 && quantity <= CART_LIMITS.maxQuantity)) {
    return reply(`Choose a quantity from 1 to ${CART_LIMITS.maxQuantity}.`);
  }
  const cartId = await readCartId();
  if (!cartId) return reply('Your bag is no longer available.', true);
  let result: CartResult;
  try {
    result = await getCommerce().setCartItemQuantity({ cartId }, { productId, quantity });
  } catch {
    return reply(UNAVAILABLE);
  }
  revalidatePath('/', 'layout');
  if (result.ok) return quantity === 0 ? reply('Watch removed from your bag.', true) : reply('Bag updated.');
  if (result.error.code === 'OUT_OF_STOCK') return reply('That quantity is not available.');
  if (result.error.code === 'CART_NOT_FOUND' || result.error.code === 'CART_LINE_NOT_FOUND') return reply('Your bag has changed. Please review it.', true);
  return reply(UNAVAILABLE);
}

export type PlaceOrderState = { message: string; key: string } | null;

// The idempotency key is rendered with the bag and returned unchanged on every failure, so a
// retry after an ambiguous failure (e.g. a timeout) replays the same order instead of creating
// another. Failures do not revalidate the page for the same reason.
export async function placeOrder(_previous: PlaceOrderState, formData: FormData): Promise<PlaceOrderState> {
  const key = formData.get('idempotencyKey');
  if (!isIdempotencyKey(key)) return { message: 'Please reload your bag and try again.', key: '' };
  const cartId = await readCartId();
  if (!cartId) return { message: 'Your bag is empty.', key };
  let result: OrderResult;
  try {
    result = await getCommerce().placeOrder({ cartId }, key);
  } catch {
    return { message: 'We could not confirm your order. Please try again; you will not be charged twice.', key };
  }
  if (!result.ok) {
    const message = result.error.code === 'OUT_OF_STOCK' ? 'Some watches are no longer available in that quantity. Please review your bag.'
      : result.error.code === 'CART_EMPTY' || result.error.code === 'CART_NOT_FOUND' ? 'Your bag is empty.'
      : result.error.code === 'IDEMPOTENCY_CONFLICT' ? 'Your bag changed. Please reload it and try again.'
      : 'We could not confirm your order. Please try again; you will not be charged twice.';
    return { message, key };
  }
  await clearCartId();
  revalidatePath('/', 'layout');
  return redirect(`/orders/${result.order.id}`);
}
