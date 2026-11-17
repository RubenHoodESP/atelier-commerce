import { notFound } from 'next/navigation';
import { getCommerce } from '../../../lib/commerce';
export const dynamic = 'force-dynamic';
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getCommerce().getProduct({ id });
  if (!result.ok) {
    if (result.error.code === 'PRODUCT_NOT_FOUND' || result.error.code === 'INVALID_INPUT') notFound();
    return <main id="main" className="intro"><h1>Temporarily unavailable</h1><p>We could not load this watch. Please try again shortly.</p><a className="button" href={`/products/${encodeURIComponent(id)}`}>Try again</a></main>;
  }
  const { product } = result;
  const price = new Intl.NumberFormat('en-IE', { style: 'currency', currency: product.price.currency, maximumFractionDigits: 0 }).format(product.price.amountMinor / 100);
  return <main id="main" className="product"><div className="watch-panel"><svg viewBox="0 0 400 480" role="img" aria-labelledby="watch-title"><title id="watch-title">Illustration of the Atelier Horizon watch</title><rect x="158" y="10" width="84" height="460" rx="25" fill="#4e4438" /><rect x="165" y="10" width="70" height="460" rx="20" fill="#655848" /><circle cx="200" cy="240" r="110" fill="#a49375" /><circle cx="200" cy="240" r="101" fill="#e7e0cf" /><circle cx="200" cy="240" r="91" fill="#eee9dd" /><g stroke="#524c3e" strokeWidth="2"><path d="M200 155v12m0 146v12m-85-85h12m146 0h12" /><path d="M200 240v-55m0 55l42 25" strokeWidth="4" /></g><circle cx="200" cy="240" r="5" fill="#524c3e" /><text x="200" y="206" textAnchor="middle" fontSize="11" letterSpacing="3" fill="#524c3e">ATELIER</text><text x="200" y="288" textAnchor="middle" fontSize="8" letterSpacing="2" fill="#74694f">HORIZON</text></svg></div><section className="product-copy"><p className="eyebrow">THE {product.collection.toUpperCase()} COLLECTION</p><h1>{product.name}</h1><p className="price">{price}</p><p className="description">An exercise in balance. A warm dial, a considered silhouette, and room for what matters.</p><dl><div><dt>Reference</dt><dd>{product.id}</dd></div><div><dt>Availability</dt><dd>{product.stock > 0 ? `${product.stock} available` : 'Currently unavailable'}</dd></div></dl><p className="availability" role="status">{product.stock > 0 ? 'Available in this demonstration collection.' : 'This reference is currently unavailable.'}</p></section></main>;
}
