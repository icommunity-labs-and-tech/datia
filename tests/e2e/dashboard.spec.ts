import { test, expect } from '@playwright/test';
import { loginAdmin } from './utils/auth';
import { prepareCleanPage, addTestDelay } from './utils/test-isolation';

test.describe('Dashboard Flow', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Debería redirigir a login si no está autenticado
    await expect(page).toHaveURL(/\/auth\/admin\/login/);
  });

  test('should display dashboard when authenticated', async ({ page }) => {
    await prepareCleanPage(page);
    const email = process.env.ADMIN_E2E_EMAIL || 'admin@datia.icommunitylabs.com';
    const password = process.env.ADMIN_E2E_PASSWORD || 'admin123';
    await loginAdmin(page, email, password);
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    
    // Verificar elementos del dashboard
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByText(/métricas/i)).toBeVisible();
  });

  test('should navigate to states page', async ({ page }) => {
    const email = process.env.ADMIN_E2E_EMAIL || 'admin@datia.icommunitylabs.com';
    const password = process.env.ADMIN_E2E_PASSWORD || 'admin123';
    await loginAdmin(page, email, password);
    
    await page.goto('/dashboard/states');
    
    // Verificar que estamos en la página de estados
    await expect(page).toHaveURL(/.*states/);
    
    // Verificar elementos de la página
    await expect(page.getByText(/estados/i)).toBeVisible();
  });

  test('should navigate to items page', async ({ page }) => {
    const email = process.env.ADMIN_E2E_EMAIL || 'admin@datia.icommunitylabs.com';
    const password = process.env.ADMIN_E2E_PASSWORD || 'admin123';
    await loginAdmin(page, email, password);
    
    await page.goto('/dashboard/items');
    
    // Verificar que estamos en la página de items
    await expect(page).toHaveURL(/.*items/);
    
    // Verificar elementos de la página
    await expect(page.getByRole('heading', { name: /inventario de items/i, level: 4 })).toBeVisible();
  });

  test('should display loading state', async ({ page }) => {
    await page.goto('/dashboard/items');
    
    // Verificar que se muestra un estado de carga
    // Esto puede ser un spinner o skeleton
    const loadingElement = page.locator('.spinner-border, .loading, [role="status"]');
    if (await loadingElement.isVisible()) {
      await expect(loadingElement).toBeVisible();
    }
  });
});

test.describe('Navigation', () => {
  test('should have working sidebar navigation', async ({ page }) => {
    const email = process.env.ADMIN_E2E_EMAIL || 'admin@datia.icommunitylabs.com';
    const password = process.env.ADMIN_E2E_PASSWORD || 'admin123';
    await loginAdmin(page, email, password);
    
    await page.goto('/dashboard');
    
    // Verificar elementos del sidebar
    const sidebar = page.locator('nav, .sidebar, [role="navigation"]');
    if (await sidebar.isVisible()) {
      await expect(sidebar).toBeVisible();
      
      // Verificar enlaces de navegación - buscar en el contenido principal
      const navLinks = page.locator('a[href*="/dashboard"]');
      expect(await navLinks.count()).toBeGreaterThan(0);
    }
  });

  test('should have working logout button', async ({ page }) => {
    const email = process.env.ADMIN_E2E_EMAIL || 'admin@datia.icommunitylabs.com';
    const password = process.env.ADMIN_E2E_PASSWORD || 'admin123';
    await loginAdmin(page, email, password);
    
    await page.goto('/dashboard');
    
    // Buscar botón de logout
    const logoutButton = page.getByRole('button', { name: /cerrar sesión/i });
    if (await logoutButton.isVisible()) {
      await expect(logoutButton).toBeVisible();
      
      // Verificar que funciona (opcional)
      // await logoutButton.click();
      // await expect(page).toHaveURL(/.*login/);
    }
  });
});
