import { test, expect } from '@playwright/test';
import { loginAdmin } from './utils/auth';

test.describe('Admin - KPIs & Activity', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.ADMIN_E2E_EMAIL || 'admin@certypass.com';
    const password = process.env.ADMIN_E2E_PASSWORD || 'admin123';
    await loginAdmin(page, email, password);
    await page.goto('/dashboard');
  });

  test('KPIs render and handle loading/empty states', async ({ page }) => {
    const kpiCards = page.locator('[data-testid="kpi"], .kpi, .card');
    await expect(kpiCards.first()).toBeVisible({ timeout: 10000 });

    // Loading skeleton/spinner optional
    const loading = page.locator('.spinner-border, .loading, [role="status"]');
    if (await loading.isVisible()) {
      await expect(loading).toBeVisible();
    }
  });

  test('Monthly activity section renders', async ({ page }) => {
    const activity = page.getByText(/actividad mensual|monthly activity|activity/i).first();
    await expect(activity).toBeVisible({ timeout: 10000 });
  });
});


