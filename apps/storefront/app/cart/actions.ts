'use server';
import { redirect } from 'next/navigation';
import { isProductQuery, type CartResult, type ErrorCode } from '@atelier/contracts';
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
