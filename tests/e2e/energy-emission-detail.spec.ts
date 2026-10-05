import { test, expect } from '@playwright/test';
import { ADMIN_STORAGE_STATE } from './utils/auth';

/**
 * One emission record read in full: the chain from asset to source to
 * consumption to emission, and its verification. Seeded by
 * scripts/bootstrap-e2e-users.mjs (e2e-emission-0, VERIFIED, on the seeded solar source).
 */

test.use({ storageState: ADMIN_STORAGE_STATE });

test.describe('Energy emission detail', () => {
  test('shows the chain behind a verified emission', async ({ page }) => {
    await page.goto('/dashboard/energy/emissions/e2e-emission-0', { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: /registro de emisi[óo]n|emission record/i, level: 2 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Turbina eólica T-100' })).toBeVisible();
    await expect(page.getByText('Planta solar Ariza').first()).toBeVisible();
    await expect(page.getByText(/verificado|verified/i).first()).toBeVisible();
    // A verified emission has nothing left to do, so no certification hint.
    await expect(page.getByText(/pendiente de certificar|pending certification/i)).toHaveCount(0);
  });
});
