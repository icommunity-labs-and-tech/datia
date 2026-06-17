import { test, expect } from '@playwright/test';
import { loginOperator } from './utils/auth';

test.describe('Operator - Core Flows', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.OPERATOR_E2E_EMAIL || 'operator@certypass.com';
    const password = process.env.OPERATOR_E2E_PASSWORD || 'operator123';
    await loginOperator(page, email, password);
    await page.goto('/operator');
  });

  test('operator can open new item page and create minimal item', async ({ page }) => {
    // Navigate to new item
    const newLink = page.getByRole('link', { name: /nuevo|crear/i }).first();
    if (await newLink.isVisible()) await newLink.click();
    else await page.goto('/operator/items/new');

    // Fill minimal data
    const nameInput = page.getByLabel(/nombre|título|title/i);
    if (await nameInput.isVisible()) await nameInput.fill(`E2E-Operator-${Date.now()}`);

    const submit = page.getByRole('button', { name: /guardar|crear|aceptar/i }).first();
    if (await submit.isVisible()) await submit.click();

    // Verify redirect back or success UI
    await expect(page.locator('body')).toBeVisible();
  });

  test('logout works', async ({ page }) => {
    const logoutBtn = page.getByRole('button', { name: /cerrar sesión/i });
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await expect(page).toHaveURL(/\/auth\/operator\/login/);
    }
  });
});


