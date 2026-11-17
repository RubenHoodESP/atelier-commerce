import Link from 'next/link';
import { redirect } from 'next/navigation';
import { catalogSearch } from '@atelier/contracts';
import { getCommerce } from '../../lib/commerce';
import { getBrandContent } from '../../lib/content';
import { formatPrice, needsCatalogRedirect, normalizeCatalogSearch, type SearchValues } from '../../lib/catalog';
import { CatalogFilters } from '../../components/catalog-filters';
import { WatchIllustration } from '../../components/watch-illustration';
export const dynamic = 'force-dynamic';
export default async function CatalogPage({ searchParams }: { searchParams: Promise<SearchValues> }) {
  const values = await searchParams;
  const query = normalizeCatalogSearch(values);
  const search = catalogSearch(query);
  if (needsCatalogRedirect(values, query)) redirect(`/products${search}`);
  const [result, content] = await Promise.all([getCommerce().getProducts(query), getBrandContent()]);
  return (
    <main id="main" className="shell py-12 md:py-20">
      <p className="eyebrow">THE ATELIER COLLECTION</p><h1>Find your own rhythm.</h1>
      <p className="max-w-xl leading-8 text-muted">{content.intro}</p>
      <CatalogFilters query={query} />
      {!result.ok ? <section aria-labelledby="catalog-error"><h2 id="catalog-error">Temporarily unavailable</h2>
        <p>We could not load the collection. Your selection has been kept.</p>
        <a className="button mt-5" href={`/products${search}`}>Try again</a></section>
        : <>
          <p role="status" className="mb-6 text-sm text-muted">{result.total} {result.total === 1 ? 'watch' : 'watches'}</p>
          {result.products.length === 0 ? <section><h2>No watches found.</h2><p>Try exploring all collections.</p>
            <Link href="/products" className="button mt-5">Clear filters</Link></section>
            : <ul aria-label="Watches" className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {result.products.map(product => <li key={product.id}>
                <Link href={`/products/${product.id}${search}`} className="group block" aria-label={`View ${product.name}`}>
                  <div className="h-80 bg-panel transition-colors group-hover:bg-line"><WatchIllustration product={product} decorative /></div>
                  <p className="eyebrow mt-5">{product.collection}</p><h2 className="mt-2 text-2xl">{product.name}</h2>
                  <p className="mt-3">{formatPrice(product.price.amountMinor)}</p>
                  <p className="mt-2 text-sm text-muted">{product.stock > 0 ? `${product.stock} available` : 'Currently unavailable'}</p>
                </Link>
              </li>)}
            </ul>}
        </>}
    </main>
  );
}
