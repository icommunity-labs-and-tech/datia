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
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: /inicio|home/i, level: 2 })).toBeVisible();
  });

  test('should navigate between dashboard sections', async ({ page }) => {
    await page.goto('/dashboard/assets', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /activos|assets/i, level: 2 })).toBeVisible();

    await page.goto('/dashboard/api', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'API', level: 2 })).toBeVisible();
    await expect(page.getByRole('tab', { name: /documenta/i })).toBeVisible();
  });

  test('should display organisation settings', async ({ page }) => {
    await page.goto('/dashboard/settings', { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: /organizaci[óo]n|organisation/i }).first())
      .toBeVisible();
    await expect(page.getByRole('heading', { name: /tu cuenta|your account/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /contrase[ñn]a|password/i }).first())
      .toBeVisible();
  });

  test('settings holds organisation config only', async ({ page }) => {
    await page.goto('/dashboard/settings', { waitUntil: 'networkidle' });

    // The old hub split this screen into States / Users / Organisation tabs.
    await expect(page.getByRole('tab')).toHaveCount(0);
    for (const hidden of ['/dashboard/users', '/dashboard/status-types']) {
      await expect(page.locator(`a[href^="${hidden}"]`)).toHaveCount(0);
    }
  });

  test('profile URL redirects to settings', async ({ page }) => {
    await page.goto('/dashboard/profile');

    await expect(page).toHaveURL(/\/dashboard\/settings$/);
  });

  test('should change the password form validation state', async ({ page }) => {
    await page.goto('/dashboard/settings', { waitUntil: 'networkidle' });

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
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    await logoutUser(page);

    await expect(page).toHaveURL(/\/auth\/admin\/login/);
  });
});

test.describe('Assets gallery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/assets', { waitUntil: 'networkidle' });
  });

  test('opening an installation shows as many assets as its card says', async ({ page }) => {
    // Installations come first; their assets appear once one is opened.
    const card = page.locator('.mantine-Card-root').filter({ hasText: /\d+ (activos?|assets?)/i }).first();
    await expect(card).toBeVisible();
    const count = Number((await card.innerText()).match(/(\d+) (activos?|assets?)/i)![1]);

    await card.click();

    await expect(page.locator('a[href^="/dashboard/assets/"]')).toHaveCount(count);
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
