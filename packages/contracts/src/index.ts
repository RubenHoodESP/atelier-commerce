export type Money = { amountMinor: number; currency: 'EUR' };
export type Product = {
  id: string; name: string; collection: string;
  price: Money; stock: number;
};
export type ProductQuery = { id: string };
export const ERROR_STATUS = {
  INVALID_INPUT: 400,
  PRODUCT_NOT_FOUND: 404,
  CART_NOT_FOUND: 404,
  CART_LINE_NOT_FOUND: 404,
  ORDER_NOT_FOUND: 404,
  OUT_OF_STOCK: 409,
  CART_LIMIT_EXCEEDED: 409,
  CART_EMPTY: 409,
  IDEMPOTENCY_CONFLICT: 409,
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
  createCart: () => Promise<CartResult>;
  getCart: (query: CartQuery) => Promise<CartResult>;
  addCartItem: (query: CartQuery, input: CartItemInput) => Promise<CartResult>;
  setCartItemQuantity: (query: CartQuery, input: CartLineUpdate & { productId: string }) => Promise<CartResult>;
  placeOrder: (input: PlaceOrderInput, idempotencyKey: string) => Promise<OrderResult>;
  getOrder: (query: OrderQuery) => Promise<OrderResult>;
};

export const COLLECTIONS = ['horizon', 'meridian', 'nocturne'] as const;
export const SORTS = ['featured', 'price-asc', 'price-desc', 'name-asc'] as const;
export type CatalogQuery = { collection?: typeof COLLECTIONS[number]; sort?: typeof SORTS[number] };
export type Failure = Extract<ProductResult, { ok: false }>;
export type CatalogResult = { ok: true; products: Product[]; total: number } | Failure;
export type BrandContent = { headline: string; intro: string; story: string };
export type ContentResult = { ok: true; content: BrandContent } | Failure;
export type ContentClient = { getBrandContent: () => Promise<ContentResult> };

// Type guards narrow for real (no `as` casts), so the compiler checks what is validated.
export function isCollection(value: unknown): value is typeof COLLECTIONS[number] {
  return COLLECTIONS.some(item => item === value);
}
export function isSort(value: unknown): value is typeof SORTS[number] {
  return SORTS.some(item => item === value);
}
export function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
}
export function isCatalogQuery(value: unknown): value is CatalogQuery {
  return isRecord(value) && Object.keys(value).every(key => key === 'collection' || key === 'sort')
    && (value.collection === undefined || isCollection(value.collection))
    && (value.sort === undefined || isSort(value.sort));
}

export function catalogSearch(query: CatalogQuery): string {
  const params = new URLSearchParams();
  if (query.collection) params.set('collection', query.collection);
  if (query.sort && query.sort !== 'featured') params.set('sort', query.sort);
  return params.size ? `?${params}` : '';
}

export function isCatalogResult(value: unknown): value is CatalogResult {
  if (!isRecord(value)) return false;
  if (value.ok !== true) return isProductResult(value) && !value.ok;
  return Array.isArray(value.products) && value.products.every(isProduct)
    && value.total === value.products.length
    && new Set(value.products.map(product => product.id)).size === value.products.length;
}

export function isBrandContent(value: unknown): value is BrandContent {
  return isRecord(value) && ['headline', 'intro', 'story'].every(key => {
    const text = value[key];
    return typeof text === 'string' && text.trim().length > 0 && text.length <= (key === 'headline' ? 200 : 2000);
  });
}

export function isContentResult(value: unknown): value is ContentResult {
  if (!isRecord(value)) return false;
  return value.ok === true ? isBrandContent(value.content) : isProductResult(value) && !value.ok;
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
    && isIntegerInRange(value.stock, 0, Number.MAX_SAFE_INTEGER)
    && value.price.currency === 'EUR' && isIntegerInRange(value.price.amountMinor, 0, Number.MAX_SAFE_INTEGER);
}

// Guest cart. Commerce owns prices and totals; clients send only IDs and quantities.
export const CART_LIMITS = { maxLines: 10, maxQuantity: 20 } as const;
export type CartQuery = { cartId: string };
export type CartItemInput = { productId: string; quantity: number };
// Sets (not increments) an existing line; 0 removes it. Repeating the same request gives the same cart.
export type CartLineUpdate = { quantity: number };
export type CartLine = { productId: string; name: string; quantity: number; unitPrice: Money; lineTotal: Money };
export type Cart = { id: string; lines: CartLine[]; itemCount: number; subtotal: Money };
export type CartResult = { ok: true; cart: Cart } | Failure;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function isCartId(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}
export function isQuantity(value: unknown): value is number {
  return isIntegerInRange(value, 1, CART_LIMITS.maxQuantity);
}
export function isCartItemInput(value: unknown): value is CartItemInput {
  return isRecord(value) && Object.keys(value).length === 2
    && isProductQuery({ id: value.productId }) && isQuantity(value.quantity);
}
export function isCartLineUpdate(value: unknown): value is CartLineUpdate {
  return isRecord(value) && Object.keys(value).length === 1 && isIntegerInRange(value.quantity, 0, CART_LIMITS.maxQuantity);
}
function isMoney(value: unknown): value is Money {
  return isRecord(value) && Object.keys(value).length === 2 && value.currency === 'EUR'
    && isIntegerInRange(value.amountMinor, 0, Number.MAX_SAFE_INTEGER);
}
export function isCartLine(value: unknown): value is CartLine {
  return isRecord(value) && isProductQuery({ id: value.productId })
    && typeof value.name === 'string' && value.name.length > 0 && value.name.length <= 200
    && isQuantity(value.quantity) && isMoney(value.unitPrice) && isMoney(value.lineTotal)
    && value.lineTotal.amountMinor === value.unitPrice.amountMinor * value.quantity;
}
// Totals must agree with the lines: a malformed cart is rejected, never repaired.
function hasConsistentLines(lines: unknown, itemCount: unknown, total: Money): lines is CartLine[] {
  if (!Array.isArray(lines) || lines.length > CART_LIMITS.maxLines || !lines.every(isCartLine)) return false;
  return new Set(lines.map(line => line.productId)).size === lines.length
    && itemCount === lines.reduce((sum, line) => sum + line.quantity, 0)
    && total.amountMinor === lines.reduce((sum, line) => sum + line.lineTotal.amountMinor, 0);
}
export function isCart(value: unknown): value is Cart {
  return isRecord(value) && isCartId(value.id) && isMoney(value.subtotal)
    && hasConsistentLines(value.lines, value.itemCount, value.subtotal);
}
export function isCartResult(value: unknown): value is CartResult {
  if (!isRecord(value)) return false;
  return value.ok === true ? isCart(value.cart) : isProductResult(value) && !value.ok;
}

// Simulated orders. Commerce re-prices and decrements stock atomically; the browser sends
// only its cart (via the server) and an idempotency key.
export type OrderQuery = { orderId: string };
export type PlaceOrderInput = { cartId: string };
export type OrderLine = CartLine;
export type Order = { id: string; status: 'confirmed'; lines: OrderLine[]; itemCount: number; total: Money };
export type OrderResult = { ok: true; order: Order } | Failure;

export const isOrderId = isCartId;
export function isIdempotencyKey(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9-]{16,100}$/.test(value);
}
export function isPlaceOrderInput(value: unknown): value is PlaceOrderInput {
  return isRecord(value) && Object.keys(value).length === 1 && isCartId(value.cartId);
}
export function isOrder(value: unknown): value is Order {
  return isRecord(value) && isOrderId(value.id) && value.status === 'confirmed' && isMoney(value.total)
    && Array.isArray(value.lines) && value.lines.length > 0 && hasConsistentLines(value.lines, value.itemCount, value.total);
}
export function isOrderResult(value: unknown): value is OrderResult {
  if (!isRecord(value)) return false;
  return value.ok === true ? isOrder(value.order) : isProductResult(value) && !value.ok;
}
