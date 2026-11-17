import Link from 'next/link';
import type { Metadata } from 'next';
import { getCommerce } from '../../lib/commerce';
import { readCartId } from '../../lib/cart';
import { formatPrice } from '../../lib/catalog';
import { BagEditor } from '../../components/bag-editor';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your bag | Atelier', robots: { index: false } };

// Server-rendered per request from the guest cookie. Totals come from commerce, never from the browser.
export default async function CartPage() {
  const cartId = await readCartId();
  const result = cartId ? await getCommerce().getCart({ cartId }) : null;
  if (result && !result.ok && result.error.code !== 'CART_NOT_FOUND') {
    return (
      <main id="main" className="intro">
        <h1>Your bag</h1>
        <p>We could not load your bag. Please try again shortly.</p>
        <Link className="button" href="/cart" prefetch={false}>Try again</Link>
      </main>
    );
  }
  const cart = result?.ok ? result.cart : null;
  if (!cart) {
    return (
      <main id="main" className="intro">
        <h1>Your bag</h1>
        <p>Your bag is empty.</p>
        <Link className="button" href="/products">Explore the collection</Link>
      </main>
    );
  }
  const lines = cart.lines.map(line => ({
    productId: line.productId, name: line.name, quantity: line.quantity,
    unitPrice: formatPrice(line.unitPrice.amountMinor), lineTotal: formatPrice(line.lineTotal.amountMinor),
  }));
  return (
    <main id="main" className="intro">
      <h1>Your bag</h1>
      <BagEditor lines={lines} subtotal={formatPrice(cart.subtotal.amountMinor)}
        summary={cart.itemCount === 1 ? '1 watch in your bag' : `${cart.itemCount} watches in your bag`} />
      <p className="mt-6 text-sm text-muted">
        Prices and availability are confirmed by commerce when an order is placed. Checkout is not available in this demonstration yet.
      </p>
    </main>
  );
}
