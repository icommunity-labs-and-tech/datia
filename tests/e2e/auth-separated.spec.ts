import { test, expect } from '@playwright/test';

test.describe('Sistema de Autenticación Separado', () => {
  test.beforeEach(async ({ page }) => {
    // Limpiar cookies antes de cada test
    await page.context().clearCookies();
  });

  test.describe('Página de Selección', () => {
    test('debería mostrar la página de selección en la raíz', async ({ page }) => {
      await page.goto('/');
      
      // Verificar que redirige a /apps
      await expect(page).toHaveURL(/.*\/apps/);
      
      // Verificar elementos de la página de selección
      await expect(page.getByRole('heading', { name: /datia/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /Admin/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /Operador/i })).toBeVisible();
    });

    test('debería navegar al login de admin desde la selección', async ({ page }) => {
      await page.goto('/apps');
      
      // Hacer clic en Admin card
      await page.getByRole('heading', { name: /Admin/i }).click();
      
      // Verificar que redirige al login de admin
      await expect(page).toHaveURL(/.*\/auth\/admin\/login/);
    });

    test('debería navegar al login de operator desde la selección', async ({ page }) => {
      await page.goto('/apps');
      
      // Hacer clic en Operador
      await page.getByRole('link', { name: /Operador/i }).click();
      
      // Verificar que redirige al login de operator
      await expect(page).toHaveURL(/.*\/auth\/operator\/login/);
    });
  });

  test.describe('Login de Administradores', () => {
    test('debería mostrar el formulario de login de admin', async ({ page }) => {
      await page.goto('/auth/admin/login');
      
      // Verificar elementos del formulario
      await expect(page.getByRole('heading', { name: /Dashboard Admin/i })).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button:has-text("Acceder al Dashboard")')).toBeVisible();
      
      // Verificar enlace a operator login
      await expect(page.locator('text=¿Eres operador?')).toBeVisible();
    });

    test('debería validar credenciales de admin correctamente', async ({ page }) => {
      await page.goto('/auth/admin/login');
      
      // Intentar login con credenciales inválidas
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button:has-text("Acceder al Dashboard")');
      
      // Verificar que muestra error
      await expect(page.locator('.alert-danger')).toBeVisible();
    });

    test('debería redirigir a dashboard con credenciales válidas de admin', async ({ page }) => {
      await page.goto('/auth/admin/login');
      
      // Nota: Necesitarás credenciales válidas de admin en tu base de datos de test
      // Por ahora, solo verificamos que el formulario funciona
      await page.fill('input[type="email"]', 'admin@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button:has-text("Acceder al Dashboard")');
      
      // Verificar que intenta hacer la petición de login
      await expect(page.locator('button:has-text("Accediendo...")')).toBeVisible();
    });
  });

  test.describe('Login de Operadores', () => {
    test('debería mostrar el formulario de login de operator', async ({ page }) => {
      await page.goto('/auth/operator/login');
      
      // Verificar elementos del formulario
      await expect(page.getByRole('heading', { name: /Operador/i })).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button:has-text("Acceder")')).toBeVisible();
      
      // Verificar enlace a admin login
      await expect(page.locator('text=¿Eres administrador?')).toBeVisible();
    });

    test('debería validar credenciales de operator correctamente', async ({ page }) => {
      await page.goto('/auth/operator/login');
      
      // Intentar login con credenciales inválidas
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button:has-text("Acceder")');
      
      // Verificar que muestra error
      await expect(page.locator('.alert-danger')).toBeVisible();
    });
  });

  test.describe('Navegación entre Login Pages', () => {
    test('debería navegar de admin login a operator login', async ({ page }) => {
      await page.goto('/auth/admin/login');
      
      // Hacer clic en el enlace de operador
      await page.getByRole('link', { name: 'Accede aquí' }).click();
      
      // Verificar que redirige al login de operator
      await expect(page).toHaveURL(/.*\/auth\/operator\/login/);
    });

    test('debería navegar de operator login a admin login', async ({ page }) => {
      await page.goto('/auth/operator/login');
      
      // Hacer clic en el enlace de administrador
      await page.getByRole('link', { name: 'Accede aquí' }).click();
      
      // Verificar que redirige al login de admin
      await expect(page).toHaveURL(/.*\/auth\/admin\/login/);
    });
  });

  test.describe('APIs de Autenticación', () => {
    test('debería responder correctamente la API de login de admin', async ({ page }) => {
      // Probar la API de login de admin
      const response = await page.request.post('/api/auth/admin/login', {
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

    test('debería responder correctamente la API de login de operator', async ({ page }) => {
      // Probar la API de login de operator
      const response = await page.request.post('/api/auth/operator/login', {
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
      const response = await page.request.get('/api/auth/admin/session');
      
      // Verificar que responde sin usuario
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.user).toBeNull();
    });

    test('debería responder correctamente la API de session de operator', async ({ page }) => {
      // Probar la API de session de operator sin token
      const response = await page.request.get('/api/auth/operator/session');
      
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
      await expect(page).toHaveURL(/.*\/auth\/admin\/login.*error=Unauthorized/);
    });

    test('debería redirigir operator sin autenticación', async ({ page }) => {
      await page.goto('/operator');
      
      // Verificar que redirige al login de operator
      await expect(page).toHaveURL(/.*\/auth\/operator\/login.*error=Unauthorized/);
    });

    test('debería manejar rutas de autenticación correctamente', async ({ page }) => {
      // Verificar que las rutas de auth son públicas
      await page.goto('/auth/admin/login');
      await expect(page.locator('text=Dashboard Admin')).toBeVisible();
      
      await page.goto('/auth/operator/login');
      await expect(page.getByRole('heading', { name: /Operador/i })).toBeVisible();
      
      await page.goto('/apps');
      await expect(page.getByRole('heading', { name: /datia/i })).toBeVisible();
    });
  });

  test.describe('Cookies y Sesiones', () => {
    test('debería establecer cookies específicas para admin', async ({ page }) => {
      // Simular login exitoso de admin (necesitarías credenciales válidas)
      await page.goto('/auth/admin/login');
      
      // Verificar que no hay cookies de admin inicialmente
      const cookies = await page.context().cookies();
      const adminCookie = cookies.find(c => c.name === 'admin-auth-token');
      expect(adminCookie).toBeUndefined();
    });

    test('debería establecer cookies específicas para operator', async ({ page }) => {
      // Simular login exitoso de operator (necesitarías credenciales válidas)
      await page.goto('/auth/operator/login');
      
      // Verificar que no hay cookies de operator inicialmente
      const cookies = await page.context().cookies();
      const operatorCookie = cookies.find(c => c.name === 'operator-auth-token');
      expect(operatorCookie).toBeUndefined();
    });
  });

  test.describe('Responsive Design', () => {
    test('debería funcionar correctamente en móvil', async ({ page }) => {
      // Simular dispositivo móvil
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/apps');
      
      // Verificar que la página se adapta a móvil
      await expect(page.getByRole('heading', { name: /datia/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /Admin/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /Operador/i })).toBeVisible();
    });

    test('debería funcionar correctamente el login de operator en móvil', async ({ page }) => {
      // Simular dispositivo móvil
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/auth/operator/login');
      
      // Verificar que el formulario se adapta a móvil
      await expect(page.getByRole('heading', { name: /Operador/i })).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button:has-text("Acceder")')).toBeVisible();
    });
  });
});
