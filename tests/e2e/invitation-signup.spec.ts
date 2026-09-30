import { test, expect } from '@playwright/test';

/**
 * Invitation and signup (#38). Seeded by scripts/bootstrap-e2e-users.mjs: a
 * pending user with an activation link already issued, standing in for the
 * one `inviteAccount` would normally create — sending the real invitation
 * email is not something this environment can do (no Mailgun here, and
 * `inviteAccount` rolls back the whole invitation if the send fails), so the
 * link itself, not the sending of it, is what this covers.
 *
 * Not the first admin of "Datia E2E"'s company (admin@datia.icommunitylabs.com
 * already is one), so activation is the plain password form, not the
 * KYC wizard a first admin gets.
 */

const INVITATION_TOKEN = 'e2e-activation-token-known-value';
const INVITED_EMAIL = 'invited-e2e@datia.icommunitylabs.com';
const NEW_PASSWORD = 'nueva-contraseña-123';

test.describe('Invitation and signup', () => {
  test('sets a password from the activation link, signs in with it, and the link is spent', async ({ page }) => {
    await page.goto(`/auth/activate?token=${INVITATION_TOKEN}`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /activar cuenta|activate account/i })).toBeVisible();

    // Form.Label isn't wired to its input in this legacy bootstrap-compat
    // form, so the fields' only accessible name is their placeholder.
    await page.getByPlaceholder(/mínimo 8 caracteres|minimum 8 characters/i).fill(NEW_PASSWORD);
    await page.getByPlaceholder(/repite tu contraseña|repeat your password/i).fill(NEW_PASSWORD);
    await page.getByRole('button', { name: /activar cuenta|activate account/i }).click();

    await page.waitForURL(/\/auth\/admin\/login\?message=account-activated/, { timeout: 15000 });

    // The account exists now, and signs in with the password just chosen.
    await page.fill('input[type="email"]', INVITED_EMAIL);
    await page.fill('input[type="password"]', NEW_PASSWORD);
    await page.click('form button[type="submit"]');
    await page.waitForURL(/\/dashboard(\/.*)?$/, { timeout: 20000 });

    // activateAccount clears the token on success, so the same link, used
    // again, is indistinguishable from one that never existed — not a second
    // password prompt, and not a distinct "already activated" message either.
    await page.context().clearCookies();
    await page.goto(`/auth/activate?token=${INVITATION_TOKEN}`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Error' })).toBeVisible();
  });

  test('an unknown activation link says so', async ({ page }) => {
    await page.goto('/auth/activate?token=no-such-token', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Error' })).toBeVisible();
    await expect(page.getByRole('button', { name: /ir al login|go to login/i })).toBeVisible();
  });
});
