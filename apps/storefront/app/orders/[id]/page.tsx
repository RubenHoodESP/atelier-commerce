import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCommerce } from '../../../lib/commerce';
import { formatPrice } from '../../../lib/catalog';
import { reveal } from '../../../lib/reveal';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Order confirmed | Atelier', robots: { index: false } };

// Read-only confirmation. The random order ID in the URL is the only access control: acceptable
// for a fictional order without personal data; a real order would require an authenticated owner.
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getCommerce().getOrder({ orderId: id });
  if (!result.ok) {
    if (result.error.code === 'ORDER_NOT_FOUND' || result.error.code === 'INVALID_INPUT') notFound();
    return (
      <main id="main" className="intro">
        <h1>Order details unavailable</h1>
        <p>Your order may have been placed, but we could not load its details. Please try again shortly.</p>
        <Link className="button" href={`/orders/${encodeURIComponent(id)}`} prefetch={false}>Try again</Link>
      </main>
    );
  }
  const { order } = result;
  return (
    <main id="main" className="intro">
      <p className="eyebrow reveal">ORDER CONFIRMED</p>
      <h1 className="reveal" style={reveal(1)}>Thank you.</h1>
      <p>Your order is confirmed. Reference <span className="font-mono text-sm break-all">{order.id}</span>.</p>
      <ul aria-label="Order items" className="my-8 border-t border-line">
        {order.lines.map(line => (
          <li key={line.productId} className="grid gap-1 border-b border-line py-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p>{line.name}</p>
              <p className="text-sm text-muted">Quantity {line.quantity} × {formatPrice(line.unitPrice.amountMinor)}</p>
            </div>
            <p>{formatPrice(line.lineTotal.amountMinor)}</p>
          </li>
        ))}
      </ul>
      <dl className="flex justify-between gap-4 text-lg">
        <dt>Total</dt><dd data-testid="order-total">{formatPrice(order.total.amountMinor)}</dd>
      </dl>
      <p className="mt-6 text-sm text-muted">This is a simulated order. No payment was taken and nothing will be shipped.</p>
      <Link className="button mt-8" href="/products">Continue exploring</Link>
    </main>
  );
}
