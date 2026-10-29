import { test, expect, type Page } from '@playwright/test';
import { ADMIN_STORAGE_STATE, loginAdmin } from './utils/auth';
import { text } from './utils/i18n';

/**
 * Consumption readings by CSV (#147): the asset and source are chosen in the
 * panel, the file carries only readings, emissions come from the source's
 * factor, and each month is certified as one evidence.
 */

const upload = async (page: Page, csv: string) => {
  const dialog = page.getByRole('dialog', { name: text('energyHub.import.title') });
  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'lecturas.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('﻿' + csv),
  });
  return dialog;
};

const pick = async (page: Page, label: RegExp, option: RegExp) => {
  const dialog = page.getByRole('dialog', { name: text('energyHub.import.title') });
  await dialog.getByRole('textbox', { name: label }).click();
  await page.getByRole('option', { name: option }).click();
};

test.describe('Lecturas por CSV', () => {
  test.describe('una empresa verificada', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('crea la fuente, importa las lecturas y certifica cada mes; repetir el fichero no duplica nada', async ({ page }) => {
      await loginAdmin(page, 'companyd-e2e@datia.icommunitylabs.com', 'companyd123');
      await page.goto('/company/energy/consumption', { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: text('energyHub.import.button') }).click();
      const dialog = page.getByRole('dialog', { name: text('energyHub.import.title') });

      await pick(page, text('energyHub.import.assetLabel'), /^Nave D$/);
      // The asset has no source yet: the form to create one is open.
      const name = `Contador ${Date.now()}`;
      await dialog.getByLabel(text('energyHub.import.source.name')).fill(name);
      await dialog.getByLabel(text('energyHub.import.source.factor')).fill('0.2');
      await dialog.getByRole('button', { name: text('energyHub.import.source.create') }).click();
      await expect(dialog.getByText(/0[.,]2 kg CO₂e\/kWh/)).toBeVisible();

      const csv = [
        'inicio;fin;kwh',
        '2026-01-01;2026-01-01;100',
        '2026-01-02;2026-01-02;100,5',
        '2026-02-01;2026-02-01;50',
        '2026-02-02;2026-01-01;5',
      ].join('\r\n');
      await upload(page, csv);
      await expect(dialog.getByText(/3 lecturas nuevas|3 new readings/i)).toBeVisible();
      await expect(dialog.getByText(/1 fila con errores|1 row with errors/i)).toBeVisible();
      // 250.5 kWh at 0.2 kg/kWh.
      await expect(dialog.getByText(/250[.,]5 kWh .* 50[.,]1 kg CO₂e/)).toBeVisible();

      await dialog.getByRole('button', { name: /importar 3 lecturas|import 3 readings/i }).click();
      await expect(dialog.getByText(/3 lecturas importadas|3 readings imported/i)).toBeVisible({ timeout: 30_000 });
      await expect(dialog.getByText(/2 de 2 meses certificados|2 of 2 months certified/i)).toBeVisible();
      await dialog.getByRole('button', { name: text('energyHub.import.close') }).click();

      // The same file again: everything is already there, nothing to write.
      await page.getByRole('button', { name: text('energyHub.import.button') }).click();
      await pick(page, text('energyHub.import.assetLabel'), /^Nave D$/);
      await pick(page, text('energyHub.import.sourceLabel'), new RegExp(name));
      await upload(page, csv);
      await expect(dialog.getByText(/3 ya existen|3 already exist/i)).toBeVisible();
      await expect(dialog.getByRole('button', { name: /importar 0 lecturas|import 0 readings/i })).toBeDisabled();
    });
  });

  test.describe('una empresa sin KYC', () => {
    test.use({ storageState: ADMIN_STORAGE_STATE });

    test('guarda las lecturas pero no las certifica', async ({ page }) => {
      await page.goto('/company/energy/consumption', { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: text('energyHub.import.button') }).click();
      const dialog = page.getByRole('dialog', { name: text('energyHub.import.title') });
      await pick(page, text('energyHub.import.assetLabel'), /^Turbina eólica T-100$/);
      await pick(page, text('energyHub.import.sourceLabel'), /Planta solar Ariza/);

      await upload(page, 'inicio,kwh\n2027-03-01,10\n');
      await dialog.getByRole('button', { name: /importar 1 lectura|import 1 reading/i }).click();
      await expect(dialog.getByText(/1 lectura importada|1 reading imported/i)).toBeVisible({ timeout: 30_000 });
      await expect(dialog.getByText(text('energyHub.import.notVerified'))).toBeVisible();
    });
  });

  test.describe('las tablas de registros', () => {
    test.use({ storageState: ADMIN_STORAGE_STATE });

    test('se paginan y se filtran por mes y por activo, en consumo y en emisiones', async ({ page }) => {
      // February 2028: 29 daily readings, more than one page of 25.
      const days = Array.from({ length: 29 }, (_, i) => `2028-02-${String(i + 1).padStart(2, '0')},${10 + i}`);
      await page.goto('/company/energy/consumption', { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: text('energyHub.import.button') }).click();
      const dialog = page.getByRole('dialog', { name: text('energyHub.import.title') });
      await pick(page, text('energyHub.import.assetLabel'), /^Turbina eólica T-100$/);
      await pick(page, text('energyHub.import.sourceLabel'), /Planta solar Ariza/);
      await upload(page, ['inicio,kwh', ...days].join('\n'));
      await dialog.getByRole('button', { name: /importar 29 lecturas|import 29 readings/i }).click();
      await expect(dialog.getByText(/29 lecturas importadas|29 readings imported/i)).toBeVisible({ timeout: 30_000 });
      await dialog.getByRole('button', { name: text('energyHub.import.close') }).click();

      for (const path of ['/company/energy/consumption', '/company/energy/emissions']) {
        await page.goto(path, { waitUntil: 'networkidle' });
        const range = page.getByTestId('records-range');

        await page.getByRole('textbox', { name: text('energyHub.records.monthFilter') }).click();
        await page.getByRole('option', { name: /febrero de 2028|february 2028/i }).click();
        await expect(range).toHaveText(/1–25 (de|of) 29/);

        await page.getByRole('button', { name: '2' }).click();
        await expect(range).toHaveText(/26–29 (de|of) 29/);

        // Narrowing again starts from the first page.
        await page.getByRole('textbox', { name: text('energyHub.records.assetFilter') }).click();
        await page.getByRole('option', { name: /^Turbina eólica T-100$/ }).click();
        await expect(range).toHaveText(/1–25 (de|of) 29/);
      }
    });
  });
});
