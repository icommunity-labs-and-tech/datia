import { test, expect } from '@playwright/test';
import { ADMIN_STORAGE_STATE } from './utils/auth';
import { text } from './utils/i18n';

test.use({ storageState: ADMIN_STORAGE_STATE });

/**
 * Crear un token de API desde el panel. El repositorio no generaba el id y la
 * creación fallaba siempre, sin que ningún test lo viera.
 */
test.describe('Admin - API tokens', () => {
  test('crea un token y lo muestra una sola vez', async ({ page }) => {
    const name = `e2e-token-${Date.now()}`;

    await page.goto('/dashboard/api', { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: text('apiHub.auth') }).click();

    await page.getByRole('button', { name: text('developer.auth.createToken') }).first().click();
    const createDialog = page.getByRole('dialog', { name: text('developer.auth.createModal.title') });
    await createDialog.getByLabel(text('developer.auth.createModal.nameLabel')).fill(name);
    await createDialog.getByRole('button', { name: text('developer.auth.createModal.create') }).click();

    const createdDialog = page.getByRole('dialog', { name: text('developer.auth.tokenCreated.title') });
    await expect(createdDialog).toBeVisible();
    await expect(createdDialog.locator('code, pre').first()).not.toBeEmpty();
    await createdDialog.getByRole('button', { name: /close|cerrar/i }).first().click().catch(() => page.keyboard.press('Escape'));

    await expect(page.getByRole('cell', { name })).toBeVisible();
  });
});
