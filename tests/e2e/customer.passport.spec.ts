import { test, expect } from '@playwright/test';

test.describe('Customer - Item Passport', () => {
  test('renders passport for a known code or shows error', async ({ page }) => {
    // If you have a known public code, set CUSTOMER_E2E_CODE env; otherwise expect error page
    const code = process.env.CUSTOMER_E2E_CODE || 'invalid-e2e-code';
    await page.goto(`/customer/item/${code}`);

    const passport = page.getByText(/pasaporte|item|evidencia|evidence|verificación/i).first();
    const error = page.getByText(/no encontrado|no válido|error/i).first();

    // Expect either passport content or a friendly error
    const ok = (await passport.isVisible()) || (await error.isVisible());
    expect(ok).toBeTruthy();
  });
});




