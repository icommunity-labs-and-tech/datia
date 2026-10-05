import { test, expect } from '@playwright/test';
import { SUPERADMIN_STORAGE_STATE } from './utils/auth';

/**
 * The superadmin's inbox for messages the organizations send from their
 * dashboards. Read-only here: the seed has no messages and this suite must not
 * add any, since the notification spec counts what the admin account receives.
 */

test.use({ storageState: SUPERADMIN_STORAGE_STATE });

test.describe('Superadmin support inbox', () => {
  test('renders the inbox as a table or an empty state', async ({ page }) => {
    await page.goto('/superadmin/support-messages', { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: /mensajes de soporte|support messages/i, level: 2 })).toBeVisible();
    const table = page.getByRole('table');
    const empty = page.getByText(/no hay mensajes de soporte|no support messages/i);
    await expect(table.or(empty)).toBeVisible();
  });
});
