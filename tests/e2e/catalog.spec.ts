import { expect, test, type APIRequestContext } from '@playwright/test';
async function state(request: APIRequestContext, value = {}) {
  const response = await request.post('http://127.0.0.1:4199/state', { data: value });
  expect(response.ok()).toBe(true);
}
test.beforeEach(async ({ request }) => { await state(request); });
test.afterEach(async ({ request }) => { await state(request); });
test('catalog SSR, URL filters, ordering, reload and detail return preserve selection', async ({ page, request }) => {
  const html = await request.get('/products');
  expect(await html.text()).toContain('Atelier Nocturne Midnight');
  await page.goto('/');
  await page.getByRole('link', { name: 'Explore the collection' }).click();
  await expect(page.getByRole('status').filter({ hasText: '12 watches' })).toBeVisible();
  await page.getByLabel('Collection', { exact: true }).selectOption('meridian');
  await expect(page).toHaveURL(/collection=meridian$/);
  await expect(page.getByRole('status').filter({ hasText: '4 watches' })).toBeVisible();
  await page.getByLabel('Sort by').selectOption('price-desc');
  await expect(page).toHaveURL(/collection=meridian&sort=price-desc$/);
  await expect(page.getByRole('list', { name: 'Watches' }).getByRole('link').first()).toHaveAccessibleName('View Atelier Meridian Coast');
  await page.reload();
  await expect(page.getByLabel('Collection', { exact: true })).toHaveValue('meridian');
  await expect(page.getByLabel('Sort by')).toHaveValue('price-desc');
  await page.getByRole('link', { name: 'View Atelier Meridian Coast' }).click();
  await expect(page.getByRole('heading', { name: 'Atelier Meridian Coast' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to collection' }).click();
  await expect(page).toHaveURL(/collection=meridian&sort=price-desc$/);
  await page.getByLabel('Collection', { exact: true }).selectOption('horizon');
  await expect(page).toHaveURL(/collection=horizon&sort=price-desc$/);
  await page.goBack();
  await expect(page.getByLabel('Collection', { exact: true })).toHaveValue('meridian');
  await page.screenshot({ path: 'test-results/m2-catalog.png', fullPage: true });
});
test('canonical URL, out-of-stock detail and mobile keyboard navigation', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/products?collection=nocturne&sort=bad&unexpected=1');
  await expect(page).toHaveURL(/\/products\?collection=nocturne$/);
  await page.getByRole('link', { name: 'View Atelier Nocturne Moon' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Atelier Nocturne Moon' })).toBeVisible();
  await expect(page.getByText('Currently unavailable', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('link', { name: 'Back to collection' }).click();
  await page.getByLabel('Collection', { exact: true }).focus();
  await expect(page.getByLabel('Collection', { exact: true })).toBeFocused();
  await page.screenshot({ path: 'test-results/m2-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
test('empty results can clear filters', async ({ page, request }) => {
  await state(request, { empty: true });
  await page.goto('/products?collection=horizon');
  await expect(page.getByRole('heading', { name: 'No watches found.' })).toBeVisible();
  await state(request);
  await page.getByRole('link', { name: 'Clear filters' }).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByRole('list', { name: 'Watches' }).getByRole('listitem')).toHaveCount(12);
});
test('commerce error retries with the selection intact', async ({ page, request }) => {
  await state(request, { catalogFail: true });
  await page.goto('/products?collection=horizon&sort=price-asc');
  await expect(page.getByRole('heading', { name: 'Temporarily unavailable' })).toBeVisible();
  await state(request);
  await page.getByRole('link', { name: 'Try again' }).click();
  await expect(page).toHaveURL(/collection=horizon&sort=price-asc$/);
  await expect(page.getByRole('list', { name: 'Watches' }).getByRole('listitem')).toHaveCount(4);
});
test('editorial outage keeps real products and local fallback', async ({ page, request }) => {
  await state(request, { contentFail: true });
  await page.goto('/products');
  await expect(page.getByText('Discover the Atelier collection of fictional watches.')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Watches' }).getByRole('listitem')).toHaveCount(12);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'A quieter kind of statement.' })).toBeVisible();
});
test('slow provider announces pending filter navigation and disables controls', async ({ page, request }) => {
  await page.goto('/products');
  await state(request, { catalogDelay: 800 });
  await page.getByLabel('Collection', { exact: true }).focus();
  await page.getByLabel('Collection', { exact: true }).selectOption('horizon');
  await expect(page.getByRole('status').filter({ hasText: 'Updating collection' })).toBeVisible();
  await expect(page.getByLabel('Sort by')).toBeDisabled();
  await expect(page.getByRole('status').filter({ hasText: '4 watches' })).toBeVisible();
  await expect(page.getByLabel('Sort by')).toBeEnabled();
  await expect(page.getByLabel('Collection', { exact: true })).toBeFocused();
});
test('native GET filters work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3000/products');
  await page.getByLabel('Collection', { exact: true }).selectOption('nocturne');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page).toHaveURL(/collection=nocturne$/);
  await expect(page.getByRole('list', { name: 'Watches' }).getByRole('listitem')).toHaveCount(4);
  await context.close();
});
