import { test, expect } from '@playwright/test';

/**
 * The public passport: what an end customer reaches by scanning the QR on a
 * physical asset. It must render without a session.
 */

// Seeded by scripts/bootstrap-e2e-users.mjs.
const KNOWN_CODE = process.env.CUSTOMER_E2E_CODE || 'e2e-item-0';

test.describe('Public asset passport', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('renders the passport for a known code', async ({ page }) => {
    await page.goto(`/p/${KNOWN_CODE}`);

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

  // Printed QR codes cannot be reissued: every URL one has ever carried has to
  // keep reaching the passport for good.
  for (const legacy of ['customer/item', 'customer/asset']) {
    test(`the printed /${legacy}/<id> URL still reaches the passport`, async ({ page, request }) => {
      const res = await request.get(`/${legacy}/${KNOWN_CODE}`, { maxRedirects: 0 });
      expect(res.status()).toBe(308);
      expect(res.headers()['location']).toMatch(new RegExp(`/p/${KNOWN_CODE}$`));

      await page.goto(`/${legacy}/${KNOWN_CODE}`);
      await expect(page).toHaveURL(new RegExp(`/p/${KNOWN_CODE}$`));
      await expect(page.getByRole('heading', { level: 3 })).toBeVisible();
    });
  }

  test('the old code-lookup landing falls back to the app selector', async ({ page }) => {
    await page.goto('/customer');

    await expect(page).toHaveURL(/\/apps$/);
  });

  test('shows a not-found message for an unknown code', async ({ page }) => {
    await page.goto('/p/invalid-e2e-code');

    await expect(
      page.getByText(/activo no encontrado|asset not found|product not found/i).first()
    ).toBeVisible();
  });
});
