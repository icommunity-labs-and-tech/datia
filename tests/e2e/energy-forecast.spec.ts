import { test, expect } from '@playwright/test';
import { ADMIN_STORAGE_STATE } from './utils/auth';

/**
 * The consumption and emissions forecast (#21): a trend projection over each
 * energy source, composed into a scope-wide total. Seeded by
 * scripts/bootstrap-e2e-users.mjs, which gives e2e-source-solar exactly the
 * six months of history the forecast requires as a minimum.
 */

test.use({ storageState: ADMIN_STORAGE_STATE });

test.describe('Energy forecast', () => {
  test('projects consumption and lets the reader change the horizon', async ({ page }) => {
    await page.goto('/dashboard/energy/consumption', { waitUntil: 'networkidle' });

    await expect(page.getByText(/proyección|forecast/i)).toBeVisible();
    // Exactly six months of history is enough — no "not enough history" message.
    await expect(page.getByText(/sin histórico suficiente|not enough history/i)).toBeHidden();

    await page.getByText(/^12 (meses|months)$/i).click();
    await expect(page.getByText(/sin histórico suficiente|not enough history/i)).toBeHidden();
  });

  test('projects emissions from the same underlying history', async ({ page }) => {
    await page.goto('/dashboard/energy/emissions', { waitUntil: 'networkidle' });

    await expect(page.getByText(/proyección|forecast/i)).toBeVisible();
    await expect(page.getByText(/sin histórico suficiente|not enough history/i)).toBeHidden();
  });
});
