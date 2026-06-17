import { Page } from '@playwright/test';

export async function loginAdmin(page: Page, email: string, password: string) {
  // Use UI login for reliability with retry logic
  await page.goto('/auth/admin/login', { waitUntil: 'networkidle' });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("Acceder al Dashboard")');
  
  // Wait for navigation with retry logic
  try {
    await page.waitForURL(/\/dashboard(\/.*)?$/, { timeout: 15000 });
  } catch (error) {
    // If navigation fails, try refreshing and waiting again
    console.log('Login navigation failed, retrying...');
    await page.waitForTimeout(2000);
    await page.waitForURL(/\/dashboard(\/.*)?$/, { timeout: 10000 });
  }
}

export async function loginOperator(page: Page, email: string, password: string) {
  // Use UI login for reliability with retry logic
  await page.goto('/auth/operator/login', { waitUntil: 'networkidle' });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("Acceder")');
  
  // Wait for navigation with retry logic
  try {
    await page.waitForURL(/\/operator(\/.*)?$/, { timeout: 15000 });
  } catch (error) {
    // If navigation fails, try refreshing and waiting again
    console.log('Operator login navigation failed, retrying...');
    await page.waitForTimeout(2000);
    await page.waitForURL(/\/operator(\/.*)?$/, { timeout: 10000 });
  }
}

// Backward-compatible alias pointing to admin login by default
export async function loginUser(page: Page, email: string, password: string) {
  await loginAdmin(page, email, password);
}

export async function logoutUser(page: Page) {
  // Look for the logout button by its title attribute or icon
  const logoutButton = page.locator('button[title="Cerrar sesión"], button:has(i.bi-box-arrow-right)').first();
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    await page.waitForURL(/\/(auth\/(admin|operator)\/login|apps)/);
  }
}
