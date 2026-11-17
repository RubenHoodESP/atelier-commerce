'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { CART_LIMITS, isProductQuery, type CartResult, type ErrorCode } from '@atelier/contracts';
import { getCommerce } from '../../lib/commerce';
import { readCartId, writeCartId } from '../../lib/cart';

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
  redirect('/cart');
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
  revalidatePath('/cart');
  if (result.ok) return quantity === 0 ? reply('Watch removed from your bag.', true) : reply('Bag updated.');
  if (result.error.code === 'OUT_OF_STOCK') return reply('That quantity is not available.');
  if (result.error.code === 'CART_NOT_FOUND' || result.error.code === 'CART_LINE_NOT_FOUND') return reply('Your bag has changed. Please review it.', true);
  return reply(UNAVAILABLE);
}
