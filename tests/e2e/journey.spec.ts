import { expect, test, type APIRequestContext } from '@playwright/test';
async function state(request: APIRequestContext, value = {}) {
  const response = await request.post('http://127.0.0.1:4199/state', { data: value });
  expect(response.ok()).toBe(true);
}
test.beforeEach(async ({ request }) => { await state(request); });
test.afterEach(async ({ request }) => { await state(request); });

const nav = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Main navigation' });

test('keyboard-only journey: catalog → detail → bag → order', async ({ page }) => {
  await page.goto('/products');
  await page.getByRole('link', { name: 'View Atelier Horizon Sand' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Atelier Horizon Sand' })).toBeVisible();
  await page.getByRole('button', { name: 'Add to bag' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/cart$/);

  const quantity = page.getByRole('spinbutton', { name: 'Quantity for Atelier Horizon Sand' });
  await quantity.focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('2');
  await page.keyboard.press('Enter'); // implicit submission uses the first submit button: Update
  await expect(page.getByRole('status').filter({ hasText: 'Bag updated.' })).toBeVisible();
  await expect(page.getByTestId('bag-subtotal')).toHaveText('€1,900.00');

  await page.getByRole('button', { name: 'Place order' }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('heading', { name: 'Thank you.' })).toBeVisible();
  await expect(page.getByTestId('order-total')).toHaveText('€1,900.00');
});

test('skip link is the first stop and moves keyboard focus into the main content', async ({ page }) => {
  await page.goto('/products');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('main')))).toBe(true);
});

test('header marks the current page and shows the commerce bag count', async ({ page }) => {
  await page.goto('/');
  await expect(nav(page).getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
  await expect(nav(page).getByRole('link', { name: 'Bag', exact: true })).toBeVisible();
  await expect(page.getByTestId('bag-count')).toHaveCount(0);

  await page.goto('/products/watch-002');
  await expect(nav(page).getByRole('link', { name: 'Collection' })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: 'Add to bag' }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(nav(page).getByRole('link', { name: 'Bag 1 item' })).toHaveAttribute('aria-current', 'page');

  await page.getByRole('spinbutton', { name: 'Quantity for Atelier Horizon Sand' }).fill('3');
  await page.getByRole('button', { name: 'Update Atelier Horizon Sand' }).click();
  await expect(nav(page).getByRole('link', { name: 'Bag 3 items' })).toBeVisible();
  await expect(page.getByTestId('bag-count')).toHaveText('3');

  await page.getByRole('button', { name: 'Place order' }).click();
  await expect(page.getByRole('heading', { name: 'Thank you.' })).toBeVisible();
  await expect(nav(page).getByRole('link', { name: 'Bag', exact: true })).toBeVisible();
  await expect(page.getByTestId('bag-count')).toHaveCount(0);
});

test('every journey page has a descriptive title', async ({ page }) => {
  for (const [route, title] of [['/products', 'The collection | Atelier'], ['/products/watch-001', 'Atelier Horizon | Atelier'], ['/cart', 'Your bag | Atelier']]) {
    await page.goto(route);
    await expect(page, route).toHaveTitle(title);
  }
});

test('form controls have a border with at least 3:1 contrast', async ({ page }) => {
  await page.goto('/products');
  const border = await page.getByLabel('Collection', { exact: true }).evaluate(element => getComputedStyle(element).borderTopColor);
  expect(border).toBe('rgb(133, 127, 114)');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('the server-rendered header already shows the bag count', async ({ page }) => {
    await page.goto('/products/watch-001');
    await page.getByRole('button', { name: 'Add to bag' }).click();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(nav(page).getByRole('link', { name: 'Bag 1 item' })).toBeVisible();
  });
});

test('the whole catalog card is clickable although only the name is the link', async ({ page }) => {
  await page.goto('/products');
  const card = page.getByRole('list', { name: 'Watches' }).getByRole('listitem').filter({ hasText: 'Atelier Meridian Slate' });
  // Click where the illustration is: the link's ::after overlay receives it.
  await card.click({ position: { x: 120, y: 120 } });
  await expect(page.getByRole('heading', { name: 'Atelier Meridian Slate' })).toBeVisible();
});
