import { test, expect } from '@playwright/test';
import { SUPERADMIN_STORAGE_STATE } from './utils/auth';

/**
 * The superadmin explores any organization's companies (#19): the same
 * read-only view the organization's own account has of them, plus energy, and
 * the one thing it can do beyond looking: activate or deactivate a company.
 * Seeded by scripts/bootstrap-e2e-users.mjs.
 */

test.use({ storageState: SUPERADMIN_STORAGE_STATE });

test.describe('Superadmin exploring an organization', () => {
  test('drills from an organization into one of its companies, and toggles it', async ({ page }) => {
    await page.goto('/superadmin/organizations', { waitUntil: 'networkidle' });

    const row = page.getByRole('row', { name: /Datia E2E/ });
    await expect(row).toBeVisible();
    await row.dblclick();

    await expect(page).toHaveURL(/\/superadmin\/organizations\/[^/]+$/);
    await expect(page.getByRole('heading', { name: /Datia E2E/ })).toBeVisible();

    // The organization's default company, with the four seeded assets.
    const companyRow = page.getByRole('row', { name: /Datia E2E/ }).filter({ has: page.getByRole('link') });
    await expect(companyRow).toBeVisible();
    await expect(companyRow).toContainText('4');

    await companyRow.getByRole('link', { name: 'Datia E2E' }).click();
    await expect(page).toHaveURL(/\/superadmin\/organizations\/[^/]+\/companies\/[^/]+$/);
    await expect(page.getByRole('heading', { name: 'Datia E2E', level: 2 })).toBeVisible();
    await expect(page.getByText(/^4 (activos|assets)$/i)).toBeVisible();

    // The energy tab reads without acting on anything: no button in it.
    await page.getByRole('tab', { name: /energ[íi]a|energy/i }).click();
    await expect(page.getByText(/fuentes de energ[íi]a|energy sources/i)).toBeVisible();

    // The one management action: toggle the company's active status.
    await expect(page.getByText(/^activa$|^active$/i).first()).toBeVisible();
    await page.getByRole('button', { name: /desactivar|deactivate/i }).click();
    await expect(page.getByText(/^inactiva$|^inactive$/i).first()).toBeVisible();

    // And back, so the seed stays as it was for whatever runs after this.
    await page.getByRole('button', { name: /activar|activate/i }).click();
    await expect(page.getByText(/^activa$|^active$/i).first()).toBeVisible();
  });

  test('drills from a company into one asset and sees the energy chain behind it', async ({ page }) => {
    await page.goto('/superadmin/organizations', { waitUntil: 'networkidle' });
    await page.getByRole('row', { name: /Datia E2E/ }).dblclick();
    await page.getByRole('row', { name: /Datia E2E/ }).filter({ has: page.getByRole('link') })
      .getByRole('link', { name: 'Datia E2E' }).click();
    await page.getByRole('link', { name: 'Turbina eólica T-100' }).click();

    await expect(page).toHaveURL(/\/superadmin\/organizations\/[^/]+\/companies\/[^/]+\/assets\/e2e-item-0$/);
    await expect(page.getByRole('heading', { name: 'Turbina eólica T-100', level: 2 })).toBeVisible();
    await expect(page.getByText(/solo lectura|read-only/i).first()).toBeVisible();
    await expect(page.getByText(/todavía no tiene certificaciones|has no certifications yet/i)).toBeVisible();

    await page.getByRole('tab', { name: /^energ[íi]a$|^energy$/i }).click();
    await expect(page.getByText('Planta solar Ariza')).toBeVisible();
    await expect(page.getByRole('row', { name: /verificad[oa]|verified/i })).toHaveCount(6);
  });
});
