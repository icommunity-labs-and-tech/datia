import { test, expect } from '@playwright/test';
import { loginOperator } from './utils/auth';

test.describe('Operator - Scanner', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.OPERATOR_E2E_EMAIL || 'operator@datia.icommunitylabs.com';
    const password = process.env.OPERATOR_E2E_PASSWORD || 'operator123';
    await loginOperator(page, email, password);
  });

  test('scanner page loads and shows camera or input fallback', async ({ page }) => {
    await page.goto('/scanner');
    // Expect either video element for camera or a manual code input
    const camera = page.locator('video');
    const codeInput = page.getByLabel(/código|code|qr/i).first();
    const visible = (await camera.isVisible()) || (await codeInput.isVisible());
    expect(visible).toBeTruthy();
  });

  test('accepts a code via input or URL param and reacts', async ({ page }) => {
    const testCode = process.env.SCANNER_E2E_CODE || 'TEST-E2E-CODE';

    await page.goto('/scanner');
    const codeInput = page.getByLabel(/código|code|qr/i).first();
    if (await codeInput.isVisible()) {
      await codeInput.fill(testCode);
      const submit = page.getByRole('button', { name: /buscar|verificar|comprobar|go|ok/i }).first();
      if (await submit.isVisible()) await submit.click();
    } else {
      await page.goto(`/scanner?code=${encodeURIComponent(testCode)}`);
    }

    // Expect either a found item/result or a friendly error
    const success = page.getByText(/resultado|item|encontrado|result/i).first();
    const error = page.getByText(/no encontrado|no válido|error|not found/i).first();
    const reacted = (await success.isVisible()) || (await error.isVisible());
    expect(reacted).toBeTruthy();
  });
});


