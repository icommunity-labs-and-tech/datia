import { test, expect } from '@playwright/test';
import { ADMIN_STORAGE_STATE } from './utils/auth';
import { text } from './utils/i18n';

test.use({ storageState: ADMIN_STORAGE_STATE });

/**
 * Creating an asset from the dashboard. The old form hung off categories and
 * went with them (#37); this is the screen that replaces it.
 *
 * The e2e company has no iBS signature, so the flow stops at the KYC
 * message instead of anchoring evidence — which is the honest end for it here.
 */
test.describe('Admin - alta de activos', () => {
  test('el formulario valida y explica por qué no puede certificar', async ({ page }) => {
    await page.goto('/dashboard/assets', { waitUntil: 'networkidle' });

    await page.getByRole('button', { name: text('itemsPage.create.button') }).click();
    const dialog = page.getByRole('dialog', { name: text('itemsPage.create.title') });
    await expect(dialog).toBeVisible();

    // Sin id ni nombre no se envía nada.
    await dialog.getByRole('button', { name: text('itemsPage.create.submit') }).click();
    await expect(dialog.getByText(text('itemsPage.create.errors.required'))).toBeVisible();

    await dialog.getByLabel(text('itemsPage.create.idLabel'), { exact: true }).fill(`e2e-alta-${Date.now()}`);
    await dialog.getByLabel(text('itemsPage.create.nameLabel')).fill('Activo de alta e2e');
    await dialog.getByLabel(text('itemsPage.create.latitudeLabel')).fill('41.31');
    await dialog.getByLabel(text('itemsPage.create.longitudeLabel')).fill('-1.55');
    await dialog.getByRole('button', { name: text('itemsPage.create.submit') }).click();

    // La empresa de e2e no tiene firma: el alta no inventa una evidencia.
    await expect(dialog.getByText(/kyc/i)).toBeVisible();
  });
});
