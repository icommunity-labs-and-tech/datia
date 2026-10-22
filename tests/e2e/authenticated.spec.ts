import { test, expect } from '@playwright/test';
import { logoutUser, ADMIN_STORAGE_STATE } from './utils/auth';

/**
 * End-to-end behaviour of an authenticated admin across the three surfaces the
 * redesigned UI exposes: assets, API and organisation settings.
 *
 * Labels are matched in both locales because the run's language depends on the
 * NEXT_LOCALE cookie.
 */

test.use({ storageState: ADMIN_STORAGE_STATE });

test.describe('Authenticated User Flow (Admin)', () => {

  test('should access dashboard after login', async ({ page }) => {
    await page.goto('/company', { waitUntil: 'networkidle' });

    await expect(page).toHaveURL(/\/company$/);
    await expect(page.getByRole('heading', { name: /inicio|home/i, level: 2 })).toBeVisible();
  });

  test('should navigate between dashboard sections', async ({ page }) => {
    await page.goto('/company/assets', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /activos|assets/i, level: 2 })).toBeVisible();

    await page.goto('/company/api', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'API', level: 2 })).toBeVisible();
    await expect(page.getByRole('tab', { name: /documenta/i })).toBeVisible();
  });

  test('should display organisation settings', async ({ page }) => {
    await page.goto('/company/settings', { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: /organizaci[óo]n|organisation/i }).first())
      .toBeVisible();
    await expect(page.getByRole('heading', { name: /tu cuenta|your account/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /contrase[ñn]a|password/i }).first())
      .toBeVisible();
  });

  test('settings holds organisation config only', async ({ page }) => {
    await page.goto('/company/settings', { waitUntil: 'networkidle' });

    // The old hub split this screen into States / Users / Organisation tabs.
    await expect(page.getByRole('tab')).toHaveCount(0);
    for (const hidden of ['/company/users', '/company/status-types']) {
      await expect(page.locator(`a[href^="${hidden}"]`)).toHaveCount(0);
    }
  });

  test('profile URL redirects to settings', async ({ page }) => {
    await page.goto('/company/profile');

    await expect(page).toHaveURL(/\/company\/settings$/);
  });

  test('should change the password form validation state', async ({ page }) => {
    await page.goto('/company/settings', { waitUntil: 'networkidle' });

    const submit = page.getByRole('button', { name: /cambiar contrase[ñn]a|change password/i });
    await expect(submit).toBeDisabled();

    await page.getByLabel(/contrase[ñn]a actual|current password/i).fill('whatever123');
    await page.getByLabel(/nueva contrase[ñn]a|new password/i).first().fill('newpassword123');
    await page.getByLabel(/confirmar|confirm/i).fill('different456');

    // Mismatch keeps the form locked and explains why.
    await expect(page.getByText(/no coinciden|do not match/i)).toBeVisible();
    await expect(submit).toBeDisabled();
  });

  test('should logout successfully', async ({ page }) => {
    await page.goto('/company', { waitUntil: 'networkidle' });

    await logoutUser(page);

    await expect(page).toHaveURL(/\/auth\/company\/login/);
  });
});

test.describe('Assets gallery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/company/assets', { waitUntil: 'networkidle' });
  });

  test('opening an installation shows as many assets as its row says', async ({ page }) => {
    // Installations come first, as rows beside the map; their assets appear
    // once one is opened.
    const row = page.getByRole('button', { name: /\d+ (activos?|assets?)/i }).first();
    await expect(row).toBeVisible();
    const count = Number((await row.innerText()).match(/(\d+) (activos?|assets?)/i)![1]);

    await row.click();

    await expect(page.locator('a[href^="/company/assets/"]')).toHaveCount(count);
  });

  test('asset detail carries its QR inline, pointing at the public passport', async ({ page }) => {
    await page.goto('/company/assets/e2e-item-0', { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: /c[óo]digo qr|qr code/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /pasaporte p[úu]blico|public passport/i }))
      .toHaveAttribute('href', '/p/e2e-item-0');
    // QR and passport used to be header buttons; deleting is the only action left there.
    await expect(page.getByRole('button', { name: /^qr$/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /^(pasaporte|passport)$/i })).toHaveCount(0);
  });

  test('search with no match offers a way back', async ({ page }) => {
    await page.getByPlaceholder(/buscar|search/i).fill('zzz-no-match-zzz');

    await expect(page.getByText(/ning[úu]n activo coincide|no asset matches/i)).toBeVisible();

    const clear = page.getByRole('button', { name: /limpiar filtros|clear filters/i });
    await clear.click();

    // Back to the installations, with the total count.
    await expect(page.getByText(/\b\d+ (activos?|assets?)\b/i).first()).toBeVisible();
  });
});
