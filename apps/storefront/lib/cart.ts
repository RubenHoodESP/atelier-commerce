import 'server-only';
import { cookies } from 'next/headers';
import { isCartId } from '@atelier/contracts';
import { getCommerce } from './commerce';

// The cookie holds only the opaque cart identifier issued by commerce.
// Possession of that random identifier is what scopes a guest cart to its owner.
const CART_COOKIE = 'atelier_cart';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export async function readCartId(): Promise<string | null> {
  const value = (await cookies()).get(CART_COOKIE)?.value;
  return isCartId(value) ? value : null;
}

export async function writeCartId(cartId: string) {
  (await cookies()).set(CART_COOKIE, cartId, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === 'production',
  });
}

// After an order the bag starts empty; the provider cart is left to bounded eviction.
export async function clearCartId() {
  (await cookies()).delete(CART_COOKIE);
}

// Units in the guest bag for the header. Commerce is asked only when a cart cookie exists;
// any failure returns null so the header shows a plain "Bag" link instead of a wrong count.
export async function getBagCount(): Promise<number | null> {
  const cartId = await readCartId();
  if (!cartId) return 0;
  try {
    const result = await getCommerce().getCart({ cartId });
    if (result.ok) return result.cart.itemCount;
    return result.error.code === 'CART_NOT_FOUND' ? 0 : null;
  } catch {
    return null;
  }
}
