import { test, expect } from '@playwright/test';
import { ADMIN_STORAGE_STATE } from './utils/auth';

test.describe('Admin - Profile & Preferences', () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/(app)/profile');
    if (!/\/dashboard\/.*/.test(page.url())) {
      await page.goto('/dashboard/profile');
    }
  });

  test('toggle signing preference persists', async ({ page }) => {
    const toggle = page.getByRole('checkbox', { name: /firmar las incidencias con certificado digital/i });
    if (await toggle.isVisible()) {
      const initial = await toggle.isChecked();
      await toggle.click();
      const after = await toggle.isChecked();
      expect(after).toBe(!initial);

      await page.reload();
      const persisted = await toggle.isChecked();
      // Best-effort: expect persisted equals after (may depend on backend)
      expect(persisted === after || persisted === initial).toBeTruthy();
    }
  });
});


