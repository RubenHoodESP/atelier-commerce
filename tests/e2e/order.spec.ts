import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
async function state(request: APIRequestContext, value = {}) {
  const response = await request.post('http://127.0.0.1:4199/state', { data: value });
  expect(response.ok()).toBe(true);
}
// Each state call also resets the test-only provider: fresh inventory, carts and orders.
test.beforeEach(async ({ request }) => { await state(request); });
test.afterEach(async ({ request }) => { await state(request); });

async function add(page: Page, id: string, times = 1) {
  for (let i = 0; i < times; i += 1) {
    await page.goto(`/products/${id}`);
    await page.getByRole('button', { name: 'Add to bag' }).click();
    await expect(page).toHaveURL(/\/cart$/);
  }
}

test('places an order from the bag, empties the bag and decrements stock', async ({ page }) => {
  await add(page, 'watch-001', 2);
  await page.getByRole('button', { name: 'Place order' }).click();
  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { name: 'Thank you.' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Order items' })).toContainText('Atelier Horizon');
  await expect(page.getByTestId('order-total')).toHaveText('€2,500.00');
  await page.screenshot({ path: 'test-results/m3-order.png', fullPage: true });
  await page.goto('/cart');
  await expect(page.getByText('Your bag is empty.')).toBeVisible();
  await page.goto('/products/watch-001');
  await expect(page.getByText('1 available', { exact: true })).toBeVisible();
});

test('a bag that exceeds stock at order time is rejected without creating an order', async ({ browser }) => {
  const first = await browser.newPage();
  const second = await browser.newPage();
  await add(first, 'watch-008');
  await add(second, 'watch-008');
  await first.getByRole('button', { name: 'Place order' }).click();
  await expect(first).toHaveURL(/\/orders\//);
  await second.getByRole('button', { name: 'Place order' }).click();
  await expect(second.getByRole('alert').filter({ hasText: 'Some watches are no longer available in that quantity. Please review your bag.' })).toBeVisible();
  await expect(second).toHaveURL(/\/cart$/);
  await first.goto('/products/watch-008');
  await expect(first.getByText('Currently unavailable', { exact: true })).toBeVisible();
  await first.close(); await second.close();
});

test('unknown order references have a real 404', async ({ request }) => {
  expect((await request.get('/orders/00000000-0000-4000-8000-000000000000')).status()).toBe(404);
  expect((await request.get('/orders/not-an-order')).status()).toBe(404);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('native submission places the order', async ({ page }) => {
    await add(page, 'watch-005');
    await page.getByRole('button', { name: 'Place order' }).click();
    await expect(page.getByRole('heading', { name: 'Thank you.' })).toBeVisible();
    await expect(page.getByTestId('order-total')).toHaveText('€1,100.00');
  });

  test('a double submission with the same idempotency key creates one order', async ({ page }) => {
    await add(page, 'watch-004', 2);
    const fields = await page.locator('form:has(input[name="idempotencyKey"]) input').evaluateAll(inputs =>
      inputs.map(input => [(input as HTMLInputElement).name, (input as HTMLInputElement).value]));
    const multipart = Object.fromEntries(fields);
    expect(multipart.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
    const submit = () => page.request.post('/cart', { multipart, headers: { Origin: 'http://127.0.0.1:3000' }, maxRedirects: 0 });
    const [one, two] = await Promise.all([submit(), submit()]);
    expect([one.status(), two.status()]).toEqual([303, 303]);
    expect(one.headers()['location']).toMatch(/\/orders\/[0-9a-f-]{36}$/);
    expect(two.headers()['location']).toBe(one.headers()['location']);
    await page.goto('/products/watch-004');
    await expect(page.getByText('Currently unavailable', { exact: true })).toBeVisible();
  });
});
