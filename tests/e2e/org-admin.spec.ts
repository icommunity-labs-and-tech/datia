import { test, expect } from '@playwright/test';
import { ORGANIZATION_STORAGE_STATE } from './utils/auth';

/**
 * The organization's own account operates from its own panel (#20), separate
 * from the platform superadmin one — a real customer, not platform staff, so
 * it gets its own URLs, login and branding, even though the access control
 * underneath was already this strict. Has no dashboard: that one is the
 * companies'. Seeded by scripts/bootstrap-e2e-users.mjs.
 */

test.use({ storageState: ORGANIZATION_STORAGE_STATE });

test.describe('Organization account', () => {
  test('a valid session on the wrong panel is sent back to its own', async ({ page }) => {
    await page.goto('/superadmin', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/organization\/companies$/);

    await page.goto('/superadmin/organizations', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/organization\/companies$/);
  });

  test('signs in to its own panel and lands on its companies, without the platform half', async ({ page }) => {
    await page.goto('/organization/companies', { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: /empresas|companies/i, level: 2 })).toBeVisible();
    // The company the seeded assets belong to, with them counted.
    await expect(page.getByRole('row', { name: /Datia E2E/ })).toContainText('4');

    // Organizations and support messages are the platform's — no such links here.
    await expect(page.getByRole('link', { name: /^organizaciones$/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /^soporte$/i })).toHaveCount(0);
  });

  test('reads what a company holds, without acting on it', async ({ page }) => {
    await page.goto('/organization/companies', { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: 'Datia E2E' }).click();

    await expect(page).toHaveURL(/\/organization\/companies\/[^/]+$/);
    await expect(page.getByRole('heading', { name: 'Datia E2E', level: 2 })).toBeVisible();
    await expect(page.getByText(/solo lectura|read-only/i).first()).toBeVisible();
    await expect(page.getByRole('row', { name: /Turbina eólica T-100/ })).toBeVisible();

    await page.getByRole('tab', { name: /cuentas|accounts/i }).click();
    await expect(page.getByRole('cell', { name: 'admin@datia.icommunitylabs.com', exact: true })).toBeVisible();

    // Reading only: nothing here creates, edits or deletes.
    await expect(page.getByRole('button', { name: /nuevo|new|crear|create|eliminar|delete/i })).toHaveCount(0);

    // A company that is not one of its own shows nothing.
    await page.goto('/organization/companies/no-es-de-esta-organizacion', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(0);
  });

  test('drills into one asset and sees the energy chain behind it', async ({ page }) => {
    await page.goto('/organization/companies', { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: 'Datia E2E' }).click();
    await page.getByRole('link', { name: 'Turbina eólica T-100' }).click();

    await expect(page).toHaveURL(/\/organization\/companies\/[^/]+\/assets\/e2e-item-0$/);
    await expect(page.getByRole('heading', { name: 'Turbina eólica T-100', level: 2 })).toBeVisible();
    await expect(page.getByText(/solo lectura|read-only/i).first()).toBeVisible();

    // Seeded with emissions but no Certification row: the timeline stays empty.
    await expect(page.getByText(/todavía no tiene certificaciones|has no certifications yet/i)).toBeVisible();

    await page.getByRole('tab', { name: /^energía$|^energy$/i }).click();
    await expect(page.getByText('Planta solar Ariza')).toBeVisible();
    await expect(page.getByRole('row', { name: /verificad[oa]|verified/i })).toHaveCount(6);
  });

  test('has no dashboard: its address leads back to its own panel', async ({ page }) => {
    await page.goto('/dashboard/assets');
    await expect(page).toHaveURL(/\/organization\/companies$/);
  });

  test('creates a company and sees it listed; the same name is refused', async ({ page }) => {
    await page.goto('/organization/companies', { waitUntil: 'networkidle' });

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
