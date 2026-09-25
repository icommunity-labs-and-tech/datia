import { test, expect } from '@playwright/test';
import { ADMIN_STORAGE_STATE } from './utils/auth';

/** A company's own account does not manage companies (#20). */

test.use({ storageState: ADMIN_STORAGE_STATE });

test.describe('Company account', () => {
  test('has no companies page and no link to it', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await expect(page.getByRole('link', { name: /^(empresas|companies)$/i })).toHaveCount(0);

    const response = await page.goto('/dashboard/companies');
    expect(response?.status()).toBe(404);
  });
});
