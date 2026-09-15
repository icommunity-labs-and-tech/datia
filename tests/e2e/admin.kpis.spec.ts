import { text } from './utils/i18n';
import { test, expect } from '@playwright/test';
import { ADMIN_STORAGE_STATE } from './utils/auth';

/**
 * The dashboard overview leads with metric tiles. When the energy module is off
 * they are the asset counters only; the energy tiles and the sources map appear
 * for organisations that have it enabled.
 */

test.describe('Admin - KPIs & Activity', () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
  });

  test('the overview leads with the assets it tracks', async ({ page }) => {
    await expect(page.getByText(text('dashboard.stat.tracked')).first()).toBeVisible();
  });

  test('recent assets panel links into the gallery', async ({ page }) => {
    const panel = page.getByText(/activos recientes|recent assets/i);

    // Only rendered when the organisation has assets.
    if (await panel.isVisible()) {
      await expect(page.getByRole('link', { name: /ver todos|view all/i })).toBeVisible();
      await expect(page.locator('a[href^="/dashboard/items/"]').first()).toBeVisible();
    } else {
      await expect(page.getByText(/activos totales|total assets/i)).toBeVisible();
    }
  });
});
