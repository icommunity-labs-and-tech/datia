import { test, expect } from '@playwright/test';
import { loginAdmin } from './utils/auth';
import { findRowByText, clickActionInRow, saveForm } from './utils/table';

test.describe('Admin - States CRUD', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.ADMIN_E2E_EMAIL || 'admin@certypass.com';
    const password = process.env.ADMIN_E2E_PASSWORD || 'admin123';
    await loginAdmin(page, email, password);
    await page.goto('/dashboard/states');
  });

  test('list states', async ({ page }) => {
    // Check if there's a table or empty state
    const table = page.locator('table, .table');
    const emptyState = page.locator('text=No hay elementos para mostrar');
    
    // Wait a bit for content to load
    await page.waitForLoadState('networkidle');
    
    const hasTable = await table.isVisible();
    const hasEmptyState = await emptyState.isVisible();
    
    expect(hasTable || hasEmptyState).toBe(true);
  });

  test('create, edit, and delete a state', async ({ page }) => {
    test.skip(true, 'States table is read-only - creation happens through other flows');
  });
});


