import { describe, expect, it } from 'vitest';
import { catalogSearch, isCatalogResult, isCatalogQuery, isContentResult } from '@atelier/contracts';
import { needsCatalogRedirect, normalizeCatalogSearch } from '../apps/storefront/lib/catalog';
describe('catalog URL state', () => {
  it('serializes only non-default filters in canonical order', () => {
    expect(catalogSearch({ sort: 'featured' })).toBe('');
    expect(catalogSearch({ sort: 'price-asc', collection: 'horizon' })).toBe('?collection=horizon&sort=price-asc');
  });
  it('preserves valid filters and removes invalid, repeated and unknown parameters', () => {
    const values = { collection: 'horizon', sort: ['price-asc', 'price-desc'], returnTo: 'https://example.com' };
    const query = normalizeCatalogSearch(values);
    expect(query).toEqual({ collection: 'horizon' });
    expect(needsCatalogRedirect(values, query)).toBe(true);
    expect(needsCatalogRedirect({ collection: 'horizon' }, query)).toBe(false);
    expect(normalizeCatalogSearch({ collection: ['horizon'], sort: 'bad' })).toEqual({});
  });
  it('rejects invalid API queries and payloads', () => {
    expect(isCatalogQuery({ collection: ['horizon'] })).toBe(false);
    expect(isCatalogQuery({ price: 1 })).toBe(false);
    expect(isCatalogResult({ ok: true, products: [], total: -1 })).toBe(false);
    expect(isContentResult({ ok: true, content: { headline: 'Valid', intro: ' ', story: 'Valid' } })).toBe(false);
  });
});
