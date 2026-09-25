import { test, expect } from '@playwright/test';
import { loginAdmin } from './utils/auth';

/**
 * The organization's own account has no company and sees all of them (#20). It
 * opens the dashboard like a company account and reads the organization's data.
 * Seeded by scripts/bootstrap-e2e-users.mjs.
 */

test.describe('Organization account (ORG_ADMIN)', () => {
  test('signs in and sees the organization\'s assets', async ({ page }) => {
    await loginAdmin(page, 'orgadmin@datia.icommunitylabs.com', 'orgadmin123');

    await expect(page).toHaveURL(/\/dashboard/);
    await page.goto('/dashboard/assets', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /activos|assets/i, level: 2 })).toBeVisible();
    // The seeded assets belong to the organization's company, which this account
    // reaches through the organization rather than through a company of its own.
    await expect(page.getByText(/^4 (activos|assets)$/i)).toBeVisible();
  });
});

test.describe('Companies page', () => {
  test('the organization account creates a company and sees it listed', async ({ page }) => {
    await loginAdmin(page, 'orgadmin@datia.icommunitylabs.com', 'orgadmin123');

    // It is in the navigation only for this account.
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: /^(empresas|companies)$/i }).first().click();
    await expect(page).toHaveURL(/\/dashboard\/companies$/);
    await expect(page.getByRole('heading', { name: /empresas|companies/i, level: 2 })).toBeVisible();
    // The company the seeded assets belong to, with them counted.
    await expect(page.getByRole('row', { name: /Datia E2E/ })).toContainText('4');

    const name = `Filial ${Date.now()}`;
    await page.getByRole('button', { name: /nueva empresa|new company/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/nombre de la empresa|company name/i).fill(name);
    await dialog.getByRole('button', { name: /crear empresa|create company/i }).click();

    await expect(page.getByRole('row', { name })).toBeVisible();

    // The same name again is refused.
    await page.getByRole('button', { name: /nueva empresa|new company/i }).click();
    await page.getByRole('dialog').getByLabel(/nombre de la empresa|company name/i).fill(name);
    await page.getByRole('dialog').getByRole('button', { name: /crear empresa|create company/i }).click();
    await expect(page.getByRole('dialog')).toContainText(/ya hay una empresa|already a company/i);
  });
});

test.describe('Company selector', () => {
  test('narrows the dashboard to one company and asks for one before creating', async ({ page }) => {
    await loginAdmin(page, 'orgadmin@datia.icommunitylabs.com', 'orgadmin123');

    const name = `Selector ${Date.now()}`;
    await page.goto('/dashboard/companies', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /nueva empresa|new company/i }).click();
    await page.getByRole('dialog').getByLabel(/nombre de la empresa|company name/i).fill(name);
    await page.getByRole('dialog').getByRole('button', { name: /crear empresa|create company/i }).click();
    await expect(page.getByRole('row', { name })).toBeVisible();

    const selector = () => page.getByRole('textbox', { name: /^(empresa|company)$/i });
    const assetCount = page.getByText(/^4 (activos|assets)$/i);

    // Looking at all of them, it sees the organization's four assets and cannot
    // create one: it would land in a company it did not pick.
    await page.goto('/dashboard/assets', { waitUntil: 'networkidle' });
    await expect(assetCount).toBeVisible();
    await page.getByRole('button', { name: /nuevo activo|new asset/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/^id|identificador/i).first().fill('sel-1');
    await dialog.getByLabel(/nombre|name/i).first().fill('Activo de prueba');
    await dialog.getByRole('button', { name: /crear|create/i }).click();
    await expect(dialog).toContainText(/elige una empresa|pick a company/i);
    await page.keyboard.press('Escape');

    // Narrowed to the new company, it sees none of them.
    // The page reloads once the choice is stored; wait for that before moving on.
    await selector().click();
    await Promise.all([page.waitForEvent('load'), page.getByRole('option', { name }).click()]);
    await page.goto('/dashboard/assets', { waitUntil: 'networkidle' });
    await expect(assetCount).toHaveCount(0);

    // And back to all of them.
    await selector().click();
    await Promise.all([
      page.waitForEvent('load'),
      page.getByRole('option', { name: /todas las empresas|all companies/i }).click(),
    ]);
    await page.goto('/dashboard/assets', { waitUntil: 'networkidle' });
    await expect(assetCount).toBeVisible();
  });
});
