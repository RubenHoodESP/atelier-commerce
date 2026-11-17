'use client';
import { useEffect, useRef, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { COLLECTIONS, catalogSearch, type CatalogQuery } from '@atelier/contracts';
export function CatalogFilters({ query }: { query: CatalogQuery }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const restoreFocus = useRef<string | null>(null);
  useEffect(() => {
    if (!pending && restoreFocus.current) {
      document.getElementById(restoreFocus.current)?.focus();
      restoreFocus.current = null;
    }
  }, [pending]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const active = document.activeElement;
    restoreFocus.current = active && event.currentTarget.contains(active) ? active.id : null;
    const data = new FormData(event.currentTarget);
    const next: CatalogQuery = {};
    const collection = data.get('collection');
    const sort = data.get('sort');
    if (collection) next.collection = collection as CatalogQuery['collection'];
    if (sort) next.sort = sort as CatalogQuery['sort'];
    startTransition(() => router.push(`/products${catalogSearch(next)}`, { scroll: false }));
  }
  return (
    <form action="/products" method="get" onSubmit={submit}
      aria-label="Catalog filters" aria-busy={pending} className="my-8 border-y border-line py-5">
      <fieldset disabled={pending} className="flex flex-wrap items-end gap-5 disabled:opacity-60">
        <legend className="sr-only">Filter and sort watches</legend>
        <div className="grid gap-2 text-sm"><label htmlFor="catalog-collection">Collection</label>
          <select id="catalog-collection" name="collection" value={query.collection ?? ''} onChange={event => event.currentTarget.form?.requestSubmit()} className="min-w-40 border border-line bg-paper p-3">
            <option value="">All collections</option>
            {COLLECTIONS.map(collection => <option key={collection} value={collection}>{collection[0]!.toUpperCase() + collection.slice(1)}</option>)}
          </select>
        </div>
        <div className="grid gap-2 text-sm"><label htmlFor="catalog-sort">Sort by</label>
          <select id="catalog-sort" name="sort" value={query.sort ?? 'featured'} onChange={event => event.currentTarget.form?.requestSubmit()} className="min-w-44 border border-line bg-paper p-3">
            <option value="featured">Featured</option><option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option><option value="name-asc">Name: A to Z</option>
          </select>
        </div>
        <button type="submit" className="button">Apply</button>
      </fieldset>
      <p role="status" className="mt-3 min-h-5 text-sm text-muted">{pending ? 'Updating collection…' : ''}</p>
    </form>
  );
}
