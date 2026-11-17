export type Product = {
  id: string; name: string; collection: string;
  price: { amountMinor: number; currency: 'EUR' }; stock: number;
};
export type ProductQuery = { id: string };
export type ErrorCode = 'INVALID_INPUT' | 'PRODUCT_NOT_FOUND' | 'UPSTREAM_TIMEOUT' | 'UPSTREAM_UNAVAILABLE' | 'UPSTREAM_INVALID_RESPONSE';
export type ProductResult =
  | { ok: true; product: Product }
  | { ok: false; error: { code: ErrorCode; message: string; requestId: string } };
export type CommerceEndpoints = { getProduct: (query: ProductQuery) => Promise<ProductResult> };

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
    && typeof value.collection === 'string' && value.collection.length > 0
    && Number.isSafeInteger(value.stock) && (value.stock as number) >= 0
    && value.price.currency === 'EUR' && Number.isSafeInteger(value.price.amountMinor)
    && (value.price.amountMinor as number) >= 0;
}
