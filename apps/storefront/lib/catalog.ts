import { catalogSearch, isCollection, isSort, type CatalogQuery } from '@atelier/contracts';
export type SearchValues = Record<string, string | string[] | undefined>;
export function normalizeCatalogSearch(values: SearchValues): CatalogQuery {
  const query: CatalogQuery = {};
  const collection = values.collection;
  const sort = values.sort;
  if (isCollection(collection)) query.collection = collection;
  if (isSort(sort) && sort !== 'featured') query.sort = sort;
  return query;
}
export function needsCatalogRedirect(values: SearchValues, query: CatalogQuery): boolean {
  const expected = new URLSearchParams(catalogSearch(query).slice(1));
  return Object.keys(values).length !== expected.size || Object.entries(values).some(([key, value]) =>
    typeof value !== 'string' || expected.get(key) !== value);
}
export function formatPrice(amountMinor: number) {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(amountMinor / 100);
}
