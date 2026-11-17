import { expect, test, type APIRequestContext } from '@playwright/test';
async function state(request: APIRequestContext, value = {}) {
  const response = await request.post('http://127.0.0.1:4199/state', { data: value });
  expect(response.ok()).toBe(true);
}
test.beforeEach(async ({ request }) => { await state(request); });
test.afterEach(async ({ request }) => { await state(request); });

test('adds a watch from detail and shows commerce totals in the bag', async ({ page, context }) => {
  await page.goto('/cart');
  await expect(page.getByText('Your bag is empty.')).toBeVisible();
  await page.goto('/products/watch-001');
  await page.getByRole('button', { name: 'Add to bag' }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByRole('status').filter({ hasText: '1 watch in your bag' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Bag items' }).getByRole('link', { name: 'Atelier Horizon' })).toBeVisible();
  await expect(page.getByTestId('bag-subtotal')).toHaveText('€1,250.00');

  const cookie = (await context.cookies()).find(item => item.name === 'atelier_cart');
  expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' });
  expect(cookie?.value).toMatch(/^[0-9a-f-]{36}$/);

  await page.goto('/products/watch-001');
  await page.getByRole('button', { name: 'Add to bag' }).click();
  await expect(page.getByRole('status').filter({ hasText: '2 watches in your bag' })).toBeVisible();
  await expect(page.getByTestId('bag-subtotal')).toHaveText('€2,500.00');
  await page.screenshot({ path: 'test-results/m3-bag.png', fullPage: true });
});

test('stock limits are reported on the detail page without changing the bag', async ({ page }) => {
  for (let i = 0; i < 2; i += 1) {
    await page.goto('/products/watch-004');
    await page.getByRole('button', { name: 'Add to bag' }).click();
    await expect(page).toHaveURL(/\/cart$/);
  }
  await page.goto('/products/watch-004');
  await page.getByRole('button', { name: 'Add to bag' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'That quantity is no longer available.' })).toBeVisible();
  await expect(page).toHaveURL(/\/products\/watch-004$/);
  await page.goto('/cart');
  await expect(page.getByRole('status').filter({ hasText: '2 watches in your bag' })).toBeVisible();
});

test('out-of-stock detail offers no add button', async ({ page }) => {
  await page.goto('/products/watch-003');
  await expect(page.getByText('This reference is currently unavailable.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add to bag' })).toHaveCount(0);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('native form submission adds to the bag and renders server messages', async ({ page }) => {
    await page.goto('/products/watch-008');
    await page.getByRole('button', { name: 'Add to bag' }).click();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.getByRole('list', { name: 'Bag items' }).getByRole('link', { name: 'Atelier Meridian Coast' })).toBeVisible();
    await page.goto('/products/watch-008');
    await page.getByRole('button', { name: 'Add to bag' }).click();
    await expect(page.getByText('That quantity is no longer available.')).toBeVisible();
  });
});

test('a cross-origin form post is rejected and sets no cart cookie', async ({ page, request }) => {
  const html = await (await request.get('/products/watch-001')).text();
  await page.setContent(html);
  const fields = await page.locator('form:has(input[name="productId"]) input').evaluateAll(inputs =>
    inputs.map(input => [(input as HTMLInputElement).name, (input as HTMLInputElement).value]));
  expect(fields.some(([name]) => name.startsWith('$ACTION'))).toBe(true);
  const multipart = Object.fromEntries(fields);
  const forged = await request.post('/products/watch-001', { multipart, headers: { Origin: 'http://evil.example' }, maxRedirects: 0 });
  expect(forged.status()).toBeGreaterThanOrEqual(400);
  expect(forged.headers()['set-cookie'] ?? '').not.toContain('atelier_cart');
  const sameOrigin = await request.post('/products/watch-001', { multipart, headers: { Origin: 'http://127.0.0.1:3000' }, maxRedirects: 0 });
  expect(sameOrigin.status()).toBe(303);
  expect(sameOrigin.headers()['set-cookie']).toMatch(/atelier_cart=.*HttpOnly/i);
});

test('the bag page is private and never share-cached', async ({ request }) => {
  const response = await request.get('/cart');
  expect(response.headers()['cache-control']).toMatch(/no-store/);
});
