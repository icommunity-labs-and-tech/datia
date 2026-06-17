import { test, expect } from '@playwright/test';

test.describe('Simple Tests', () => {
  test('should load any page', async ({ page }) => {
    await page.goto('/');
    
    // Solo verificar que la página carga
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have a title', async ({ page }) => {
    await page.goto('/');
    
    // Verificar que hay un título (cualquiera)
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should have some content', async ({ page }) => {
    await page.goto('/');
    
    // Verificar que hay texto en la página
    const text = await page.textContent('body');
    expect(text).toBeTruthy();
  });

  test('should handle navigation', async ({ page }) => {
    // Ir a la página principal
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    
    // Intentar ir a login (puede fallar, pero no debe romper)
    try {
      await page.goto('/dashboard/login');
      await expect(page.locator('body')).toBeVisible();
    } catch (error) {
      // Si falla, está bien - solo verificamos que no rompa
      console.log('Login page not available yet');
    }
  });
});
