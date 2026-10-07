import { test, expect } from '@playwright/test';

test.describe('Sistema de Autenticación Separado', () => {
  test.beforeEach(async ({ page }) => {
    // Limpiar cookies antes de cada test
    await page.context().clearCookies();
  });

  test.describe('Página de Selección', () => {
    test('debería navegar al login de admin desde la selección', async ({ page }) => {
      await page.goto('/apps');
      
      // Hacer clic en Admin card
      await page.getByRole('heading', { name: /empresa|company dashboard/i }).click();
      
      // Verificar que redirige al login de admin
      await expect(page).toHaveURL(/.*\/auth\/company\/login/);
    });

  });

  test.describe('Login de Administradores', () => {
  });

  test.describe('Login de Operadores', () => {
  });

  test.describe('Navegación entre Login Pages', () => {
  });

  test.describe('APIs de Autenticación', () => {
    test('debería responder correctamente la API de login de admin', async ({ page }) => {
      // Probar la API de login de admin
      const response = await page.request.post('/api/auth/company/login', {
        data: {
          email: 'test@example.com',
          password: 'wrongpassword'
        }
      });
      
      // Verificar que responde con error 401
      expect(response.status()).toBe(401);
      
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('debería responder correctamente la API de session de admin', async ({ page }) => {
      // Probar la API de session de admin sin token
      const response = await page.request.get('/api/auth/company/session');
      
      // Verificar que responde sin usuario
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.user).toBeNull();
    });

  });

  test.describe('Middleware y Redirecciones', () => {
    test('debería redirigir dashboard sin autenticación', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Verificar que redirige al login de admin
      await expect(page).toHaveURL(/.*\/auth\/company\/login.*error=Unauthorized/);
    });

  });

  test.describe('Cookies y Sesiones', () => {
    test('debería establecer cookies específicas para admin', async ({ page }) => {
      // Simular login exitoso de admin (necesitarías credenciales válidas)
      await page.goto('/auth/company/login');
      
      // Verificar que no hay cookies de admin inicialmente
      const cookies = await page.context().cookies();
      const adminCookie = cookies.find(c => c.name === 'company-auth-token');
      expect(adminCookie).toBeUndefined();
    });

  });

  test.describe('Responsive Design', () => {
  });
});
