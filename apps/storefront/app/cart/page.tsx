import Link from 'next/link';
import type { Metadata } from 'next';
import { getCommerce } from '../../lib/commerce';
import { readCartId } from '../../lib/cart';
import { formatPrice } from '../../lib/catalog';

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
  if (!cart || cart.lines.length === 0) {
    return (
      <main id="main" className="intro">
        <h1>Your bag</h1>
        <p>Your bag is empty.</p>
        <Link className="button" href="/products">Explore the collection</Link>
      </main>
    );
  }
  return (
    <main id="main" className="intro">
      <h1>Your bag</h1>
      <p role="status">{cart.itemCount === 1 ? '1 watch in your bag' : `${cart.itemCount} watches in your bag`}</p>
      <ul aria-label="Bag items" className="my-8 border-t border-line">
        {cart.lines.map(line => (
          <li key={line.productId} className="grid gap-2 border-b border-line py-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <Link className="underline underline-offset-4" href={`/products/${line.productId}`}>{line.name}</Link>
              <p className="text-sm text-muted">Quantity {line.quantity} × {formatPrice(line.unitPrice.amountMinor)}</p>
            </div>
            <p aria-label={`Line total for ${line.name}`}>{formatPrice(line.lineTotal.amountMinor)}</p>
          </li>
        ))}
      </ul>
      <dl className="flex justify-between gap-4 text-lg">
        <dt>Subtotal</dt><dd data-testid="bag-subtotal">{formatPrice(cart.subtotal.amountMinor)}</dd>
      </dl>
      <p className="mt-6 text-sm text-muted">
        Prices and availability are confirmed by commerce when an order is placed. Checkout is not available in this demonstration yet.
      </p>
    </main>
  );
}
