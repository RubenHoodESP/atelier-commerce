import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

// Automated WCAG 2.0/2.1/2.2 A and AA audit of the shopping journey in both themes.
// axe finds a subset of issues only; it does not replace keyboard or screen-reader testing.
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function state(request: APIRequestContext, value = {}) {
  expect((await request.post('http://127.0.0.1:4199/state', { data: value })).ok()).toBe(true);
}
test.beforeEach(async ({ request }) => { await state(request); });
test.afterEach(async ({ request }) => { await state(request); });

// Audit the settled page: finite entrance/exit animations finished (the infinite seconds sweep is
// ignored) and the document title written after client navigations. Mid-animation opacity would
// otherwise be reported as low contrast although the stable content passes.
async function settle(page: Page) {
  await page.waitForFunction(() => document.title.length > 0
    && document.getAnimations().every(animation => animation.playState !== 'running'
      || animation.effect?.getTiming().iterations === Infinity));
}

async function audit(page: Page, label: string) {
  await settle(page);
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = results.violations.map(violation =>
    `${violation.id} (${violation.impact}): ${violation.nodes.map(node => node.target.join(' ')).slice(0, 5).join(' | ')}`);
  expect(summary, `${label}\n${summary.join('\n')}`).toEqual([]);
  return results.passes.length;
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme });

    test('static and catalog pages', async ({ page }) => {
      for (const route of ['/', '/products', '/products?collection=nocturne&sort=price-desc', '/products/watch-001', '/products/watch-003', '/products/watch-999', '/cart']) {
        await page.goto(route);
        await audit(page, `${colorScheme} ${route}`);
      }
    });

    test('bag with lines, status messages and order confirmation', async ({ page }) => {
      await page.goto('/products/watch-004');
      await page.getByRole('button', { name: 'Add to bag' }).click();
      await expect(page).toHaveURL(/\/cart$/);
      await audit(page, `${colorScheme} /cart with a line`);
      await page.getByRole('spinbutton', { name: 'Quantity for Atelier Horizon Field' }).fill('5');
      await page.getByRole('button', { name: 'Update Atelier Horizon Field' }).click();
      await expect(page.getByRole('status').filter({ hasText: 'That quantity is not available.' })).toBeVisible();
      await audit(page, `${colorScheme} /cart with an error message`);
      await page.getByRole('button', { name: 'Place order' }).click();
      await expect(page.getByRole('heading', { name: 'Thank you.' })).toBeVisible();
      await audit(page, `${colorScheme} order confirmation`);
    });

    test('error states', async ({ page, request }) => {
      await state(request, { catalogFail: true });
      await page.goto('/products');
      await expect(page.getByRole('heading', { name: 'Temporarily unavailable' })).toBeVisible();
      await audit(page, `${colorScheme} catalog error`);
      await state(request, { empty: true });
      await page.goto('/products');
      await audit(page, `${colorScheme} empty catalog`);
    });
  });
}
