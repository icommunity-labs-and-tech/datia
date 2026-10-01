import { test, expect } from '@playwright/test';
import { loginOrganization, SUPERADMIN_STORAGE_STATE } from './utils/auth';

/**
 * Logging into one panel used to leave the other's cookie behind: /session
 * checks the platform one first, so a leftover superadmin cookie silently
 * shadowed a fresh, valid organization login in the same browser — no error,
 * just bounced back to the organization login with nothing to explain why.
 * Each login now clears the other's cookie.
 *
 * The login endpoint shares a 5-attempts/15-minutes limiter, in-memory for
 * the whole suite, with auth.setup.ts — so this starts from the superadmin's
 * already-saved session (no live call) and performs exactly one live login,
 * rather than reproducing the leftover cookie with a second superadmin login.
 */

test.use({ storageState: SUPERADMIN_STORAGE_STATE });

test('an organization login succeeds despite a leftover superadmin session', async ({ page }) => {
  await loginOrganization(page, 'orgadmin@datia.icommunitylabs.com', 'orgadmin123');

  // loginOrganization already waits for this URL; the real assertion is that
  // it landed there instead of being bounced back to the organization login.
  await expect(page).toHaveURL(/\/organization\/companies/);
  await expect(page.getByRole('heading', { name: /empresas|companies/i, level: 2 })).toBeVisible();
});
