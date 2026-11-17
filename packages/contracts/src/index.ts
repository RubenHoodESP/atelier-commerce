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
export type CommerceClient = { getProduct: (query: ProductQuery) => Promise<ProductResult> };

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
