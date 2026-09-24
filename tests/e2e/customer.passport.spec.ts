import { test, expect } from '@playwright/test';

/**
 * The public passport: what an end customer reaches by scanning the QR on a
 * physical asset. It must render without a session.
 */

// Seeded by scripts/bootstrap-e2e-users.mjs.
const KNOWN_CODE = process.env.CUSTOMER_E2E_CODE || 'e2e-item-0';

test.describe('Customer - Item Passport', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('renders the passport for a known code', async ({ page }) => {
    await page.goto(`/customer/asset/${KNOWN_CODE}`);

    // Identity and certification status are the two things the page must answer.
    await expect(page.getByRole('heading', { level: 3 })).toBeVisible();
    await expect(
      page.getByText(
        /certificado en blockchain|pendiente de certificar|certified on blockchain|pending certification/i
      )
    ).toBeVisible();

    // Tabs render on every viewport — no JS-driven mobile/desktop split.
    await expect(page.getByRole('tab', { name: /informaci[óo]n|information/i })).toBeVisible();
    // The state history is gone (#63); what a passport proves now is its energy.
    await expect(page.getByRole('tab', { name: /historial|history/i })).toHaveCount(0);
  });

  test('the URL printed on existing QR codes still reaches the passport', async ({ page, request }) => {
    // Printed QR codes point at /customer/item/<id> and cannot be reissued: that
    // URL has to keep working for good, redirecting to where the passport lives.
    const res = await request.get(`/customer/item/${KNOWN_CODE}`, { maxRedirects: 0 });
    expect(res.status()).toBe(308);
    expect(res.headers()['location']).toContain(`/customer/asset/${KNOWN_CODE}`);

    await page.goto(`/customer/item/${KNOWN_CODE}`);
    await expect(page).toHaveURL(new RegExp(`/customer/asset/${KNOWN_CODE}$`));
    await expect(page.getByRole('heading', { level: 3 })).toBeVisible();
  });

  test('shows a recoverable error for an unknown code', async ({ page }) => {
    await page.goto('/customer/asset/invalid-e2e-code');

    await expect(
      page.getByText(/activo no encontrado|asset not found|product not found/i).first()
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /volver al scanner|back to scanner/i })
    ).toBeVisible();
  });

  test('scanner accepts a code and navigates to its passport', async ({ page }) => {
    await page.goto('/customer', { waitUntil: 'networkidle' });

    await page.getByRole('textbox').fill(KNOWN_CODE);
    await page.getByRole('button', { name: /buscar|search/i }).click();

    await expect(page).toHaveURL(new RegExp(`/customer/asset/${KNOWN_CODE}$`));
  });
});
