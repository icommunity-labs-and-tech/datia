import { test, expect } from '@playwright/test';

test.describe('Basic Navigation', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    
    // Verificar que la página carga
    await expect(page.locator('body')).toBeVisible();
    
    // Verificar que hay contenido
    const content = page.locator('body');
    await expect(content).toBeVisible();
  });

  test('should have working links', async ({ page }) => {
    await page.goto('/');
    
    // Buscar enlaces en la página
    const links = page.locator('a');
    const linkCount = await links.count();
    
    // Verificar que hay al menos algunos enlaces
    expect(linkCount).toBeGreaterThan(0);
  });

  test('should display page content', async ({ page }) => {
    await page.goto('/');
    
    // Verificar que hay texto en la página
    const textContent = await page.textContent('body');
    expect(textContent).toBeTruthy();
    expect(textContent!.length).toBeGreaterThan(0);
  });
});

test.describe('Page Structure', () => {
  test('should have proper HTML structure', async ({ page }) => {
    await page.goto('/');
    
    // Verificar elementos básicos de HTML
    await expect(page.locator('html')).toBeVisible();
    await expect(page.locator('body')).toBeVisible();
    
    // Verificar que head existe (pero no necesariamente visible)
    const head = page.locator('head');
    await expect(head).toBeAttached();
  });

  test('should load CSS and JavaScript', async ({ page }) => {
    await page.goto('/');
    
    // Verificar que se cargan recursos
    const resources = await page.evaluate(() => {
      return {
        cssSheets: document.styleSheets.length,
        scripts: document.scripts.length,
      };
    });
    
    expect(resources.cssSheets).toBeGreaterThan(0);
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Verificar que la página se carga en móvil
    await expect(page.locator('body')).toBeVisible();
  });

  test('should work on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    
    // Verificar que la página se carga en desktop
    await expect(page.locator('body')).toBeVisible();
  });
});
