import { test, expect } from '@playwright/test';

const MOBILE = { width: 375, height: 667 };
const DESKTOP = { width: 1440, height: 900 };

/** A page that scrolls sideways is broken on mobile, whatever it looks like. */
async function expectNoHorizontalScroll(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe('Shared - Responsive checks', () => {
  test('apps page mobile/desktop', async ({ page }) => {
    for (const viewport of [MOBILE, DESKTOP]) {
      await page.setViewportSize(viewport);
      await page.goto('/apps');

      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      // Both entry points are offered on every viewport.
      await expect(page.getByRole('link', { name: /panel de empresa|company dashboard/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /pasaporte del activo|asset passport/i })).toBeVisible();
      await expectNoHorizontalScroll(page);
    }
  });

  test('apps page links to the admin login', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/apps');

    await page.getByRole('link', { name: /panel de empresa|company dashboard/i }).click();

    await expect(page).toHaveURL(/\/auth\/company\/login/);
  });

  test('admin login mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('/auth/company/login');

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});
