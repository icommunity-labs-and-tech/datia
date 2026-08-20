import path from 'node:path';
import { Page } from '@playwright/test';

/**
 * Session saved by tests/e2e/auth.setup.ts and reused by specs via
 * `test.use({ storageState: ADMIN_STORAGE_STATE })`, so the suite signs in once
 * instead of per test — the admin login allows 10 attempts per 15 minutes.
 */
export const ADMIN_STORAGE_STATE = path.join('playwright', '.auth', 'admin.json');

export async function loginAdmin(page: Page, email: string, password: string) {
  // Use UI login for reliability with retry logic
  await page.goto('/auth/admin/login', { waitUntil: 'networkidle' });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('form button[type="submit"]');
  
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
  // Logout lives inside the account menu in the top bar.
  await page.getByRole('button', { name: /cuenta|account/i }).click();
  await page.getByRole('menuitem', { name: /cerrar sesi[óo]n|log out/i }).click();
  await page.waitForURL(/\/auth\/(admin|superadmin)\/login/);
}
