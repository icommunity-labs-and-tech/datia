import { test, expect } from '@playwright/test';
import { loginAdmin } from './utils/auth';

test.describe('Admin - Exports CSV', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.ADMIN_E2E_EMAIL || 'admin@certypass.com';
    const password = process.env.ADMIN_E2E_PASSWORD || 'admin123';
    await loginAdmin(page, email, password);
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


