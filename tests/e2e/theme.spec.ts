import { expect, test, type Page } from '@playwright/test';

const DARK_PAPER = 'rgb(22, 21, 15)';
const LIGHT_PAPER = 'rgb(245, 243, 237)';
const background = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const themeButton = (page: Page, label: 'Auto' | 'Light' | 'Dark') => page.getByRole('button', { name: `${label} theme` });

test.describe('system prefers dark', () => {
  test.use({ colorScheme: 'dark' });

  test('Auto follows the system until the guest chooses, and the choice persists', async ({ page, context }) => {
    await page.goto('/products');
    expect(await background(page)).toBe(DARK_PAPER);
    await expect(themeButton(page, 'Auto')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBeUndefined();

    await themeButton(page, 'Light').click();
    await expect(themeButton(page, 'Light')).toHaveAttribute('aria-pressed', 'true');
    expect(await background(page)).toBe(LIGHT_PAPER);
    await expect.poll(async () => (await context.cookies()).some(item => item.name === 'atelier_theme')).toBe(true);
    const cookie = (await context.cookies()).find(item => item.name === 'atelier_theme');
    expect(cookie).toMatchObject({ value: 'light', httpOnly: true, sameSite: 'Lax' });

    await page.reload();
    expect(await background(page)).toBe(LIGHT_PAPER);
    await page.goto('/cart');
    expect(await background(page)).toBe(LIGHT_PAPER);

    await themeButton(page, 'Auto').click();
    await expect(themeButton(page, 'Auto')).toHaveAttribute('aria-pressed', 'true');
    expect(await background(page)).toBe(DARK_PAPER);
    await expect.poll(async () => (await context.cookies()).some(item => item.name === 'atelier_theme')).toBe(false);
  });
});

test.describe('system prefers light', () => {
  test.use({ colorScheme: 'light' });

  test('Dark is applied by the server before first paint (no flash)', async ({ page, context }) => {
    await page.goto('/');
    expect(await background(page)).toBe(LIGHT_PAPER);
    await themeButton(page, 'Dark').click();
    expect(await background(page)).toBe(DARK_PAPER); // immediate client preview
    // The server round trip stores the choice; wait for it before asking for fresh server HTML.
    await expect.poll(async () => (await context.cookies()).find(item => item.name === 'atelier_theme')?.value).toBe('dark');
    const cookies = await context.cookies();
    const html = await (await page.request.get('/', { headers: { Cookie: cookies.map(c => `${c.name}=${c.value}`).join('; ') } })).text();
    expect(html).toMatch(/<html[^>]*data-theme="dark"/);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('dark');
  });

  test('theme buttons meet the 24px minimum target size', async ({ page }) => {
    await page.goto('/');
    for (const label of ['Auto', 'Light', 'Dark'] as const) {
      const box = await themeButton(page, label).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(24);
      expect(box!.width).toBeGreaterThanOrEqual(24);
    }
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });
    test('the native form switches the theme', async ({ page }) => {
      await page.goto('/products/watch-001');
      await themeButton(page, 'Dark').click();
      await expect(page.getByRole('heading', { name: 'Atelier Horizon' })).toBeVisible();
      expect(await background(page)).toBe(DARK_PAPER);
      await expect(themeButton(page, 'Dark')).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
