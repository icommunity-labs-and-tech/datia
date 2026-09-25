import { test, expect } from '@playwright/test';
import { ORGANIZATION_STORAGE_STATE } from './utils/auth';

/**
 * The organization's own account operates from the superadmin panel, limited to
 * its organization, and has no dashboard: that one is the companies' (#20).
 * Seeded by scripts/bootstrap-e2e-users.mjs.
 */

test.use({ storageState: ORGANIZATION_STORAGE_STATE });

test.describe('Organization account', () => {
  test('signs in to the panel and lands on its companies, without the platform half', async ({ page }) => {
    await page.goto('/superadmin', { waitUntil: 'networkidle' });

    await expect(page).toHaveURL(/\/superadmin\/companies$/);
    await expect(page.getByRole('heading', { name: /empresas|companies/i, level: 2 })).toBeVisible();
    // The company the seeded assets belong to, with them counted.
    await expect(page.getByRole('row', { name: /Datia E2E/ })).toContainText('4');

    // Organizations and support messages are the platform's.
    await expect(page.getByRole('link', { name: /^organizaciones$/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /^soporte$/i })).toHaveCount(0);
    await page.goto('/superadmin/organizations');
    await expect(page).toHaveURL(/\/superadmin\/companies$/);
  });

  test('reads what a company holds, without acting on it', async ({ page }) => {
    await page.goto('/superadmin/companies', { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: 'Datia E2E' }).click();

    await expect(page).toHaveURL(/\/superadmin\/companies\/[^/]+$/);
    await expect(page.getByRole('heading', { name: 'Datia E2E', level: 2 })).toBeVisible();
    await expect(page.getByText(/solo lectura|read-only/i).first()).toBeVisible();
    await expect(page.getByRole('row', { name: /Turbina eólica T-100/ })).toBeVisible();

    await page.getByRole('tab', { name: /cuentas|accounts/i }).click();
    await expect(page.getByRole('cell', { name: 'admin@datia.icommunitylabs.com', exact: true })).toBeVisible();

    // Reading only: nothing here creates, edits or deletes.
    await expect(page.getByRole('button', { name: /nuevo|new|crear|create|eliminar|delete/i })).toHaveCount(0);

    // A company that is not one of its own shows nothing.
    await page.goto('/superadmin/companies/no-es-de-esta-organizacion', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(0);
  });

  test('has no dashboard: its address leads back to the panel', async ({ page }) => {
    await page.goto('/dashboard/assets');
    await expect(page).toHaveURL(/\/superadmin\/companies$/);
  });

  test('creates a company and sees it listed; the same name is refused', async ({ page }) => {
    await page.goto('/superadmin/companies', { waitUntil: 'networkidle' });

    const name = `Filial ${Date.now()}`;
    await page.getByRole('button', { name: /nueva empresa|new company/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/nombre de la empresa|company name/i).fill(name);
    await dialog.getByRole('button', { name: /crear empresa|create company/i }).click();
    await expect(page.getByRole('row', { name })).toBeVisible();

    await page.getByRole('button', { name: /nueva empresa|new company/i }).click();
    await page.getByRole('dialog').getByLabel(/nombre de la empresa|company name/i).fill(name);
    await page.getByRole('dialog').getByRole('button', { name: /crear empresa|create company/i }).click();
    await expect(page.getByRole('dialog')).toContainText(/ya hay una empresa|already a company/i);
  });
});
