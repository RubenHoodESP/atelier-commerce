import Link from 'next/link';
import { randomUUID } from 'node:crypto';
import type { Metadata } from 'next';
import { getCommerce } from '../../lib/commerce';
import { readCartId } from '../../lib/cart';
import { formatPrice } from '../../lib/catalog';
import { BagEditor } from '../../components/bag-editor';
import { PlaceOrder } from '../../components/place-order';

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
      {lines.length > 0 && (
        <>
          {/* A new key per bag content: editing the bag remounts the form and discards the old key. */}
          <PlaceOrder key={lines.map(line => `${line.productId}:${line.quantity}`).join(',')} initialKey={randomUUID()} />
          <p className="mt-6 text-sm text-muted">
            Commerce confirms prices and availability when the order is placed. This is a simulated order: no payment or personal data is taken.
          </p>
        </>
      )}
    </main>
  );
}
