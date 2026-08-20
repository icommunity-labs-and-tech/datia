import { test as setup } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { loginAdmin, ADMIN_STORAGE_STATE } from './utils/auth';

/**
 * Logs in once per run and stores the session, so specs can start authenticated
 * instead of hitting the login endpoint on every test — the admin login is rate
 * limited to 10 attempts per 15 minutes, which a per-test login blows through.
 *
 * Specs opt in with `test.use({ storageState: ADMIN_STORAGE_STATE })`.
 */

setup('authenticate as admin', async ({ page }) => {
  const email = process.env.ADMIN_E2E_EMAIL || 'admin@datia.icommunitylabs.com';
  const password = process.env.ADMIN_E2E_PASSWORD || 'admin123';

  fs.mkdirSync(path.dirname(ADMIN_STORAGE_STATE), { recursive: true });

  await loginAdmin(page, email, password);
  await page.context().storageState({ path: ADMIN_STORAGE_STATE });
});
