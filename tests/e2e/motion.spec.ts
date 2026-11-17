import { expect, test, type Page } from '@playwright/test';

const animationName = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate(element => getComputedStyle(element).animationName);

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('no seconds sweep and no entrance animation', async ({ page }) => {
    await page.goto('/products/watch-001');
    expect(await animationName(page, '.watch-seconds')).toBe('none');
    expect(await animationName(page, 'h1.reveal')).toBe('none');
  });
});

test('server HTML never hides content waiting for JavaScript animations', async ({ request }) => {
  for (const route of ['/', '/products', '/products/watch-001']) {
    const html = await (await request.get(route)).text();
    expect(html, route).not.toMatch(/style="[^"]*opacity:\s*0/);
  }
});

test.describe('with motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('detail sweeps the seconds hand and cards only sweep on hover', async ({ page }) => {
    await page.goto('/products/watch-001');
    expect(await animationName(page, '.watch-seconds')).toBe('atelier-sweep');
    expect(await animationName(page, 'h1.reveal')).toBe('atelier-reveal');
    await page.goto('/products');
    const seconds = page.locator('.watch-seconds').first();
    expect(await seconds.evaluate(element => getComputedStyle(element).animationPlayState)).toBe('paused');
    await page.getByRole('link', { name: 'View Atelier Horizon', exact: true }).hover();
    await expect.poll(() => seconds.evaluate(element => getComputedStyle(element).animationPlayState)).toBe('running');
  });

  test('filtering still lands on the right cards while they animate', async ({ page }) => {
    await page.goto('/products');
    await page.getByLabel('Collection', { exact: true }).selectOption('nocturne');
    await expect(page).toHaveURL(/collection=nocturne$/);
    await expect(page.getByRole('list', { name: 'Watches' }).getByRole('listitem')).toHaveCount(4);
    await expect(page.getByRole('link', { name: 'View Atelier Nocturne Ink' })).toBeVisible();
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });
    test('CSS entrance finishes fully visible', async ({ page }) => {
      await page.goto('/');
      await expect.poll(() => page.locator('h1').evaluate(element => getComputedStyle(element).opacity)).toBe('1');
    });
  });
});
