import Link from 'next/link';
import { catalogSearch } from '@atelier/contracts';
import { WatchIllustration } from '../../../components/watch-illustration';
import { AddToBag } from '../../../components/add-to-bag';
import { reveal } from '../../../lib/reveal';
import { normalizeCatalogSearch, formatPrice, type SearchValues } from '../../../lib/catalog';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getProductOnce } from '../../../lib/commerce';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const result = await getProductOnce((await params).id);
  return { title: result.ok ? `${result.product.name} | Atelier` : 'Watch | Atelier' };
}

export default async function ProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchValues> }) {
  const { id } = await params;
  const search = catalogSearch(normalizeCatalogSearch(await searchParams));
  const result = await getProductOnce(id);
  if (!result.ok) {
    if (result.error.code === 'PRODUCT_NOT_FOUND' || result.error.code === 'INVALID_INPUT') notFound();
    return (
      <main id="main" className="intro">
        <h1>Temporarily unavailable</h1>
        <p>We could not load this watch. Please try again shortly.</p>
        <a className="button" href={`/products/${encodeURIComponent(id)}${search}`}>Try again</a>
      </main>
    );
  }
  const { product } = result;
  const price = formatPrice(product.price.amountMinor);
  return (
    <main id="main" className="product">
      <div className="watch-panel reveal"><WatchIllustration product={product} /></div>
      <section className="product-copy">
        <Link className="text-sm underline underline-offset-4" href={`/products${search}`}>Back to collection</Link>
        <p className="eyebrow reveal" style={reveal(1)}>THE {product.collection.toUpperCase()} COLLECTION</p>
        <h1 className="reveal" style={reveal(2)}>{product.name}</h1>
        <p className="price reveal" style={reveal(3)}>{price}</p>
        <p className="description">
          An exercise in balance. A warm dial, a considered silhouette, and room for what matters.
        </p>
        <dl>
          <div><dt>Reference</dt><dd>{product.id}</dd></div>
          <div>
            <dt>Availability</dt>
            <dd>{product.stock > 0 ? `${product.stock} available` : 'Currently unavailable'}</dd>
          </div>
        </dl>
        <p className="availability" role="status">
          {product.stock > 0 ? 'Available in this demonstration collection.' : 'This reference is currently unavailable.'}
        </p>
        {product.stock > 0 && <AddToBag productId={product.id} />}
      </section>
    </main>
  );
}
