import { expect, test } from '@playwright/test';
test('renders provider data in HTML through Next and Express', async ({ page, request }) => {
  const html = await request.get('/products/watch-001');
  expect(html.ok()).toBeTruthy();
  expect(await html.text()).toContain('Atelier Horizon');
  await page.goto('/');
  await page.getByRole('link', { name: /Explore Horizon/ }).click();
  await expect(page.getByRole('heading', { name: 'Atelier Horizon' })).toBeVisible();
  await expect(page.getByText('3 available', { exact: true })).toBeVisible();
  await expect(page.locator('.price')).toHaveText('\u20ac1,250.00');
  await page.screenshot({ path: 'test-results/m1-product.png', fullPage: true });
});
test('unknown product has an HTTP 404 and a useful page', async ({ page, request }) => {
  const response = await request.get('/products/watch-999');
  expect(response.status()).toBe(404);
  await page.goto('/products/watch-999');
  await expect(page.getByRole('heading', { name: 'Watch not found.' })).toBeVisible();
});
