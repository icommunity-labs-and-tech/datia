import { test, expect } from '@playwright/test';
import { ADMIN_STORAGE_STATE } from './utils/auth';
import { findRowByText, clickActionInRow, saveForm } from './utils/table';
import path from 'path';

test.describe('Admin - Item Evidence Uploads', () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/(app)/items');
    if (!/\/dashboard\/.*/.test(page.url())) {
      await page.goto('/dashboard/items');
    }
  });

  test('upload and delete evidence for an item', async ({ page }) => {
    const uniqueName = `E2E-Item-Evidence-${Date.now()}`;

    // Create item first
    const newBtn = page.getByRole('button', { name: /nuevo item|nuevo ítem|nuevo|crear/i }).first();
    if (await newBtn.isVisible()) await newBtn.click();
    else {
      const linkNew = page.getByRole('link', { name: /nuevo item|nuevo ítem|nuevo|crear/i }).first();
      if (await linkNew.isVisible()) await linkNew.click();
    }
    const nameInput = page.getByLabel(/nombre|título|title/i);
    if (await nameInput.isVisible()) await nameInput.fill(uniqueName);
        await saveForm(page);

        // Wait for any navigation or page change
        await page.waitForLoadState('networkidle');

        // Verify created - wait for either table or success message
        await Promise.race([
          page.waitForSelector('table, .table', { timeout: 10000 }),
          page.waitForSelector('text=item creado', { timeout: 10000 }),
          page.waitForSelector('text=item guardado', { timeout: 10000 }),
          page.waitForSelector('text=elemento creado', { timeout: 10000 })
        ]);
        
        // Check if the item was created successfully
        const table = page.locator('table, .table');
        const emptyState = page.locator('text=No hay elementos para mostrar');
        const hasTable = await table.isVisible();
        const hasEmptyState = await emptyState.isVisible();
        
        let row = null;
        if (hasTable) {
          await page.waitForTimeout(1000); // Wait a bit for the table to fully render
          
          // Try to find the row by direct text content search
          const rowWithText = page.locator(`tr:has-text("${uniqueName}")`).first();
          if (await rowWithText.isVisible()) {
            row = rowWithText;
          } else {
            // Fallback to findRowByText function
            row = await findRowByText(table, uniqueName);
          }
          
          expect(row).not.toBeNull();
        } else {
          // If no table visible, the item creation might have failed
          throw new Error('Item creation failed - no table visible after creation');
        }

    if (!row) return;

    // Go to item detail page if there is a link
    const detailLink = row.getByRole('link').first();
    if (await detailLink.isVisible()) {
      await detailLink.click();
    } else {
      await clickActionInRow(row, /ver|detalle|edit|editar/i);
    }

    // Upload evidence
    const uploadInput = page.locator('input[type="file"]');
    const sample = path.resolve(process.cwd(), 'public/next.svg');
    await uploadInput.setInputFiles(sample);

    // Fill metadata if present
    const description = page.getByLabel(/descripción|description/i);
    if (await description.isVisible()) await description.fill('E2E evidence');
    await saveForm(page);

    // Verify evidence appears
    const evidenceList = page.locator('[data-testid="evidence-list"], .evidence, .list-group');
    await expect(evidenceList).toBeVisible();

    // Delete first evidence entry
    const firstRow = evidenceList.locator('li, .row, .evidence-item').first();
    const del = firstRow.getByRole('button', { name: /eliminar|borrar|delete/i }).first();
    if (await del.isVisible()) {
      await del.click();
      const confirmBtn = page.getByRole('button', { name: /confirmar|sí|si|aceptar|eliminar/i });
      if (await confirmBtn.isVisible()) await confirmBtn.click();
    }
  });
});


