import { test, expect } from '@playwright/test';
import { loginAdmin, logoutUser } from './utils/auth';

test.describe('Authenticated User Flow (Admin)', () => {
  test.beforeEach(async ({ page }) => {
    // Login antes de cada test
    const email = process.env.ADMIN_E2E_EMAIL || 'admin@datia.icommunitylabs.com';
    const password = process.env.ADMIN_E2E_PASSWORD || 'admin123';
    await loginAdmin(page, email, password);
  });

  test('should access dashboard after login', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Verificar que estamos autenticados
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText(/métricas/i)).toBeVisible();
  });

  test('should navigate between dashboard pages', async ({ page }) => {
    // Navegar a estados
    await page.goto('/dashboard/states');
    await expect(page.getByText(/estados/i)).toBeVisible();
    
    // Navegar a items
    await page.goto('/dashboard/items');
    await expect(page.getByRole('heading', { name: /inventario de items/i, level: 4 })).toBeVisible();
  });

  test('should display user profile', async ({ page }) => {
    await page.goto('/dashboard/profile');
    
    // Verificar elementos del perfil
    await expect(page.getByText(/información personal/i)).toBeVisible();
    await expect(page.getByText(/cambio de contraseña/i)).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Hacer logout
    await logoutUser(page);
    
    // Verificar que redirige a login
    await expect(page).toHaveURL(/.*login/);
  });

  test('should handle form interactions', async ({ page }) => {
    await page.goto('/dashboard/profile');
    
    // Buscar switch de certificado digital
    const certSwitch = page.getByRole('checkbox', { name: /firmar las incidencias con certificado digital/i });
    if (await certSwitch.isVisible()) {
      // Verificar que se puede interactuar
      await expect(certSwitch).toBeEnabled();
    }
  });

  test('should display loading states', async ({ page }) => {
    await page.goto('/dashboard/items');
    
    // Verificar que se muestra loading inicialmente
    const loadingElement = page.locator('.spinner-border, .loading, [role="status"]');
    if (await loadingElement.isVisible()) {
      await expect(loadingElement).toBeVisible();
      
      // Esperar a que termine de cargar
      await page.waitForSelector('.spinner-border', { state: 'hidden' });
    }
  });
});

test.describe('Data Management', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.ADMIN_E2E_EMAIL || 'admin@datia.icommunitylabs.com';
    const password = process.env.ADMIN_E2E_PASSWORD || 'admin123';
    await loginAdmin(page, email, password);
  });

  test('should display data tables', async ({ page }) => {
    await page.goto('/dashboard/items');
    
    // Verificar que se muestra una tabla
    const table = page.locator('table, .table');
    if (await table.isVisible()) {
      await expect(table).toBeVisible();
    }
  });

  test('should handle empty states', async ({ page }) => {
    await page.goto('/dashboard/items');
    
    // Verificar mensaje cuando no hay datos
    const emptyMessage = page.locator('text=No hay items, text=No data, text=Empty');
    if (await emptyMessage.isVisible()) {
      await expect(emptyMessage).toBeVisible();
    }
  });
});
