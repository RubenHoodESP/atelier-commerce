export type Product = {
  id: string; name: string; collection: string;
  price: { amountMinor: number; currency: 'EUR' }; stock: number;
};
export type ProductQuery = { id: string };
export const ERROR_STATUS = {
  INVALID_INPUT: 400,
  PRODUCT_NOT_FOUND: 404,
  UPSTREAM_TIMEOUT: 504,
  UPSTREAM_UNAVAILABLE: 502,
  UPSTREAM_INVALID_RESPONSE: 502,
  INTERNAL_ERROR: 500,
} as const;
export type ErrorCode = keyof typeof ERROR_STATUS;
export type ProductResult =
  | { ok: true; product: Product }
  | { ok: false; error: { code: ErrorCode; message: string; requestId: string } };
export type CommerceClient = {
  getProduct: (query: ProductQuery) => Promise<ProductResult>;
  getProducts: (query?: CatalogQuery) => Promise<CatalogResult>;
};

export const COLLECTIONS = ['horizon', 'meridian', 'nocturne'] as const;
export const SORTS = ['featured', 'price-asc', 'price-desc', 'name-asc'] as const;
export type CatalogQuery = { collection?: typeof COLLECTIONS[number]; sort?: typeof SORTS[number] };
export type Failure = Extract<ProductResult, { ok: false }>;
export type CatalogResult = { ok: true; products: Product[]; total: number } | Failure;
export type BrandContent = { headline: string; intro: string; story: string };
export type ContentResult = { ok: true; content: BrandContent } | Failure;
export type ContentClient = { getBrandContent: () => Promise<ContentResult> };

export function isCatalogQuery(value: unknown): value is CatalogQuery {
  return isRecord(value) && Object.keys(value).every(key => key === 'collection' || key === 'sort')
    && (value.collection === undefined || COLLECTIONS.some(item => item === value.collection))
    && (value.sort === undefined || SORTS.some(item => item === value.sort));
}

export function catalogSearch(query: CatalogQuery): string {
  const params = new URLSearchParams();
  if (query.collection) params.set('collection', query.collection);
  if (query.sort && query.sort !== 'featured') params.set('sort', query.sort);
  return params.size ? `?${params}` : '';
}

export function isCatalogResult(value: unknown): value is CatalogResult {
  if (!isRecord(value)) return false;
  if (value.ok !== true) return isProductResult(value) && value.ok === false;
  return Array.isArray(value.products) && value.products.every(isProduct)
    && value.total === value.products.length
    && new Set(value.products.map(product => product.id)).size === value.products.length;
}

export function isBrandContent(value: unknown): value is BrandContent {
  return isRecord(value) && ['headline', 'intro', 'story'].every(key =>
    typeof value[key] === 'string' && value[key].trim().length > 0
    && (value[key] as string).length <= (key === 'headline' ? 200 : 2000));
}

export function isContentResult(value: unknown): value is ContentResult {
  if (!isRecord(value)) return false;
  return value.ok === true ? isBrandContent(value.content) : isProductResult(value) && value.ok === false;
}

export function isProductResult(value: unknown): value is ProductResult {
  if (!isRecord(value)) return false;
  if (value.ok === true) return isProduct(value.product);
  if (value.ok !== false || !isRecord(value.error)) return false;
  return typeof value.error.code === 'string'
    && Object.hasOwn(ERROR_STATUS, value.error.code)
    && typeof value.error.message === 'string' && value.error.message.length > 0
    && typeof value.error.requestId === 'string' && value.error.requestId.length > 0;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function isProductQuery(value: unknown): value is ProductQuery {
  return isRecord(value) && Object.keys(value).length === 1 && typeof value.id === 'string' && /^watch-[0-9]{3}$/.test(value.id);
}
export function isProduct(value: unknown): value is Product {
  if (!isRecord(value) || !isRecord(value.price)) return false;
  return typeof value.id === 'string' && /^watch-[0-9]{3}$/.test(value.id)
    && typeof value.name === 'string' && value.name.length > 0 && value.name.length <= 200
    && typeof value.collection === 'string' && value.collection.length > 0 && value.collection.length <= 80
    && Number.isSafeInteger(value.stock) && (value.stock as number) >= 0
    && value.price.currency === 'EUR' && Number.isSafeInteger(value.price.amountMinor)
    && (value.price.amountMinor as number) >= 0;
}
