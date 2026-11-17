import Link from 'next/link';
import { redirect } from 'next/navigation';
import { catalogSearch } from '@atelier/contracts';
import { getCommerce } from '../../lib/commerce';
import { getBrandContent } from '../../lib/content';
import { needsCatalogRedirect, normalizeCatalogSearch, type SearchValues } from '../../lib/catalog';
import { CatalogFilters } from '../../components/catalog-filters';
import { CatalogGrid } from '../../components/catalog-grid';
import { reveal } from '../../lib/reveal';
export const dynamic = 'force-dynamic';
export default async function CatalogPage({ searchParams }: { searchParams: Promise<SearchValues> }) {
  const values = await searchParams;
  const query = normalizeCatalogSearch(values);
  const search = catalogSearch(query);
  if (needsCatalogRedirect(values, query)) redirect(`/products${search}`);
  const [result, content] = await Promise.all([getCommerce().getProducts(query), getBrandContent()]);
  return (
    <main id="main" className="shell py-12 md:py-20">
      <p className="eyebrow reveal">THE ATELIER COLLECTION</p><h1 className="reveal" style={reveal(1)}>Find your own rhythm.</h1>
      <p className="reveal max-w-xl leading-8 text-muted" style={reveal(2)}>{content.intro}</p>
      <CatalogFilters query={query} />
      {!result.ok ? <section aria-labelledby="catalog-error"><h2 id="catalog-error">Temporarily unavailable</h2>
        <p>We could not load the collection. Your selection has been kept.</p>
        <a className="button mt-5" href={`/products${search}`}>Try again</a></section>
        : <>
          <p role="status" className="mb-6 text-sm text-muted">{result.total} {result.total === 1 ? 'watch' : 'watches'}</p>
          {result.products.length === 0 ? <section><h2>No watches found.</h2><p>Try exploring all collections.</p>
            <Link href="/products" className="button mt-5">Clear filters</Link></section>
            : <CatalogGrid products={result.products} search={search} />}
        </>}
    </main>
  );
}
