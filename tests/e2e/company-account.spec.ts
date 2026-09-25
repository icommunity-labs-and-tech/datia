import { test, expect } from '@playwright/test';
import { ADMIN_STORAGE_STATE } from './utils/auth';

/** A company's own account has the dashboard and nothing of the organization's panel (#20). */

test.use({ storageState: ADMIN_STORAGE_STATE });

test.describe('Company account', () => {
  test('opens the dashboard but not the organization panel', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/dashboard$/);

    // Its session is not one of the panel's: it is sent to that panel's login.
    await page.goto('/superadmin/companies');
    await expect(page).toHaveURL(/\/auth\/superadmin\/login/);
  });
});
