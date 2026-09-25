import { test, expect } from '@playwright/test';

/**
 * Password recovery (#36). Seeded by scripts/bootstrap-e2e-users.mjs: an account
 * with a recovery link outstanding, whose token the seed knows.
 */

const RESET_EMAIL = 'reset-e2e@datia.icommunitylabs.com';
const RESET_TOKEN = 'e2e-reset-token-known-value';

test.describe('Password recovery', () => {
  test('the login points to it, and asking gives the same answer for any address', async ({ page }) => {
    await page.goto('/auth/admin/login', { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: /olvidado tu contraseña|forgot your password/i }).click();
    await expect(page).toHaveURL(/\/auth\/forgot-password$/);

    // An address with no account: the page still says a link is on its way.
    await page.getByLabel(/correo electrónico|email/i).fill('nadie-e2e@example.com');
    await page.getByRole('button', { name: /enviar enlace|send link/i }).click();
    await expect(page.getByRole('heading', { name: /revisa tu correo|check your email/i })).toBeVisible();
    await expect(page.getByText(/nadie-e2e@example\.com/)).toBeVisible();
  });

  test('a link chooses a new password once, and the account signs in with it', async ({ page }) => {
    await page.goto(`/auth/reset-password?token=${RESET_TOKEN}`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /elige una contraseña nueva|choose a new password/i })).toBeVisible();

    await page.getByLabel(/^(contraseña nueva|new password)/i).fill('corta');
    await page.getByLabel(/repite la contraseña|repeat the password/i).fill('corta');
    await page.getByRole('button', { name: /guardar contraseña|save password/i }).click();
    await expect(page.getByText(/al menos 8 caracteres|at least 8 characters/i).last()).toBeVisible();

    await page.getByLabel(/^(contraseña nueva|new password)/i).fill('nueva-contraseña-123');
    await page.getByLabel(/repite la contraseña|repeat the password/i).fill('nueva-contraseña-123');
    await page.getByRole('button', { name: /guardar contraseña|save password/i }).click();
    await expect(page.getByRole('heading', { name: /contraseña actualizada|password updated/i })).toBeVisible();

    // The new password works; the link does not, a second time.
    await page.goto('/auth/admin/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', RESET_EMAIL);
    await page.fill('input[type="password"]', 'nueva-contraseña-123');
    await page.click('form button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 20000 });

    await page.context().clearCookies();
    await page.goto(`/auth/reset-password?token=${RESET_TOKEN}`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /enlace no válido|invalid link/i })).toBeVisible();
  });

  test('an unknown link says so', async ({ page }) => {
    await page.goto('/auth/reset-password?token=no-existe', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /enlace no válido|invalid link/i })).toBeVisible();
  });
});
