import { test, expect } from '@playwright/test';
import { loginAdmin } from './utils/auth';

/**
 * The organization's own account has no company and sees all of them (#20). It
 * opens the dashboard like a company account and reads the organization's data.
 * Seeded by scripts/bootstrap-e2e-users.mjs.
 */

test.describe('Organization account (ORG_ADMIN)', () => {
  test('signs in and sees the organization\'s assets', async ({ page }) => {
    await loginAdmin(page, 'orgadmin@datia.icommunitylabs.com', 'orgadmin123');

    await expect(page).toHaveURL(/\/dashboard/);
    await page.goto('/dashboard/assets', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /activos|assets/i, level: 2 })).toBeVisible();
    // The seeded assets belong to the organization's company, which this account
    // reaches through the organization rather than through a company of its own.
    await expect(page.getByText(/^4 (activos|assets)$/i)).toBeVisible();
  });
});
