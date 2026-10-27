import { test, expect } from '@playwright/test';
import { ADMIN_STORAGE_STATE, loginAdmin } from './utils/auth';
import { text } from './utils/i18n';

test.use({ storageState: ADMIN_STORAGE_STATE });

/**
 * Importing assets from a CSV (#147). The file is reviewed before anything is
 * written; then rows are created through the same path as the "new asset"
 * dialog. The e2e company has no iBS signature, so the import stops at the
 * first row with the KYC message — creating nothing it could not certify.
 */
test.describe('Activos - importar CSV', () => {
  test('revisa el fichero fila a fila y no crea lo que no puede certificar', async ({ page }) => {
    await page.goto('/company/assets', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: text('itemsPage.import.button') }).click();
    const dialog = page.getByRole('dialog', { name: text('itemsPage.import.title') });
    await expect(dialog).toBeVisible();

    // Semicolons and decimal commas: what Excel saves in Spanish.
    const csv = [
      'id;nombre;latitud;longitud;municipio;provincia',
      `csv-e2e-${Date.now()};Turbina importada;41,31;-1,55;;`,
      `csv-e2e-mun-${Date.now()};Caldera importada;;;Castejón;Navarra`,
      'e2e-item-0;Ya existe;;;;',
      ';Sin id;;;;',
      'csv-e2e-x;Sitio raro;;;Narnia;',
    ].join('\r\n');
    await dialog.locator('input[type="file"]').setInputFiles({
      name: 'activos.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('﻿' + csv),
    });

    await expect(dialog.getByText(/2 activos listos|2 assets ready/i)).toBeVisible();
    await expect(dialog.getByText(/3 filas con errores|3 rows with errors/i)).toBeVisible();
    await expect(dialog.getByText(/ese id ya existe|that id already exists/i)).toBeVisible();
    await expect(dialog.getByText(/narnia/i)).toBeVisible();
    // Located by coordinates and by municipality name alike.
    await expect(dialog.getByText(/Belmonte de Gracián · (por coordenadas|by coordinates)/)).toBeVisible();
    await expect(dialog.getByText(/Castejón · (por municipio|by municipality)/)).toBeVisible();

    await dialog.getByRole('button', { name: /importar 2 activos|import 2 assets/i }).click();
    // Stopped at the first row: neither asset was created, and it says why once.
    await expect(dialog.getByText(/2 activos no se importaron|2 assets were not imported/i)).toBeVisible({ timeout: 30_000 });
    await expect(dialog.getByText(/kyc/i)).toHaveCount(1);
  });

  test('la plantilla se descarga', async ({ page }) => {
    await page.goto('/company/assets', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: text('itemsPage.import.button') }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: text('itemsPage.import.template') }).click();
    expect((await download).suggestedFilename()).toBe('plantilla-activos.csv');
  });

  test.describe('una empresa verificada', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('crea y certifica los activos, y aparecen agrupados por municipio', async ({ page }) => {
      // Seeded by scripts/bootstrap-e2e-users.mjs, already verified in iBS.
      await loginAdmin(page, 'companyd-e2e@datia.icommunitylabs.com', 'companyd123');
      await page.goto('/company/assets', { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: text('itemsPage.import.button') }).click();
      const dialog = page.getByRole('dialog', { name: text('itemsPage.import.title') });

      const stamp = Date.now();
      const csv = [
        'id,nombre,descripcion,latitud,longitud,municipio',
        `csv-d-1-${stamp},Contador nave A,Importado por CSV,36.7213,-4.4214,`,
        `csv-d-2-${stamp},Contador nave B,Importado por CSV,,,Sevilla`,
      ].join('\n');
      await dialog.locator('input[type="file"]').setInputFiles({
        name: 'activos.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csv),
      });
      await dialog.getByRole('button', { name: /importar 2 activos|import 2 assets/i }).click();

      await expect(dialog.getByText(/se han creado 2 activos|2 assets created/i)).toBeVisible({ timeout: 30_000 });
      await dialog.getByRole('button', { name: text('itemsPage.import.close') }).click();

      // Each one lands in its municipality, and carries its evidence.
      await expect(page.getByRole('button', { name: /^Málaga/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /^Sevilla/ })).toBeVisible();
      await page.goto(`/company/assets/csv-d-2-${stamp}`, { waitUntil: 'networkidle' });
      await expect(page.getByRole('heading', { name: 'Contador nave B' })).toBeVisible();
    });
  });
});
