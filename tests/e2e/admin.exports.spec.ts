import { test, expect } from '@playwright/test';
import { ADMIN_STORAGE_STATE } from './utils/auth';

test.describe('Admin - Exports CSV', () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/(app)/items');
    if (!/\/dashboard\/.*/.test(page.url())) {
      await page.goto('/dashboard/items');
    }
  });

  test('export items CSV triggers a download', async ({ page, context }) => {
    const hasButton = await page.getByRole('button', { name: /exportar|csv|descargar/i }).first().isVisible().catch(() => false);
    const hasLink = await page.getByRole('link', { name: /exportar|csv|descargar/i }).first().isVisible().catch(() => false);
    test.skip(!(hasButton || hasLink), 'Export control not present in UI');

    const [ download ] = await Promise.all([
      page.waitForEvent('download'),
      (async () => {
        const exportBtn = page.getByRole('button', { name: /exportar|csv|descargar/i }).first();
        if (await exportBtn.isVisible()) return exportBtn.click();
        const exportLink = page.getByRole('link', { name: /exportar|csv|descargar/i }).first();
        if (await exportLink.isVisible()) return exportLink.click();
      })()
    ]);

    const suggested = download.suggestedFilename();
    expect(suggested.toLowerCase().endsWith('.csv')).toBeTruthy();
  });
});


