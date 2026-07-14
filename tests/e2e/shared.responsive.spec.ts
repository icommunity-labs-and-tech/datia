import { test, expect } from '@playwright/test';

test.describe('Shared - Responsive checks', () => {
  test('apps page mobile/desktop', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/apps');
    await expect(page.getByRole('heading', { name: /datia/i })).toBeVisible();

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByRole('heading', { name: /datia/i })).toBeVisible();
  });

  test('admin login mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/auth/admin/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});


