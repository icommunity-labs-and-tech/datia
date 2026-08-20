import { test, expect } from '@playwright/test';
import { logoutUser, ADMIN_STORAGE_STATE } from './utils/auth';

/**
 * Covers the shell of the redesigned dashboard: authentication gate, the top
 * navigation, and the account menu. Screen-by-screen appearance is covered by
 * ux-journeys.spec.ts.
 *
 * Labels are matched in both locales because the run's language depends on the
 * NEXT_LOCALE cookie.
 */

/** Content sections in the top bar. Settings deliberately lives elsewhere. */
const NAV_LINKS = ['/dashboard', '/dashboard/items', '/dashboard/api'];

test.describe('Unauthenticated', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/auth\/admin\/login/);
  });
});

test.describe('Dashboard Flow', () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test('should display dashboard when authenticated', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: /inicio|home/i, level: 2 })).toBeVisible();

    // The overview always leads with the assets metric.
    await expect(page.getByText(/activos totales|total assets/i)).toBeVisible();
  });

  test('should navigate to items page from the top bar', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    await page.locator('header').getByRole('link', { name: /activos|assets/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/items$/);
    await expect(page.getByRole('heading', { name: /activos|assets/i, level: 2 })).toBeVisible();
  });

  test('should show the assets gallery once loaded', async ({ page }) => {
    await page.goto('/dashboard/items', { waitUntil: 'networkidle' });

    // Either cards or the empty state — never a stuck skeleton.
    const cards = page.locator('a[href^="/dashboard/items/"]');
    const empty = page.getByText(/no hay activos|no assets registered/i);
    await expect(cards.first().or(empty)).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
  });

  test('top bar exposes only content sections', async ({ page }) => {
    const hrefs = await page
      .locator('header a[href^="/dashboard"]')
      .evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href')));

    for (const href of NAV_LINKS) {
      expect(hrefs, `${href} should be in the top bar`).toContain(href);
    }
    // Settings is reachable from the account menu, not the nav.
    expect(hrefs).not.toContain('/dashboard/settings');
  });

  test('account menu opens settings', async ({ page }) => {
    await page.getByRole('button', { name: /cuenta|account/i }).click();
    await page.getByRole('menuitem', { name: /configuraci[óo]n|settings/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/settings$/);
    await expect(page.getByRole('heading', { name: /configuraci[óo]n|settings/i, level: 2 }))
      .toBeVisible();
  });

  test('account menu logs out', async ({ page }) => {
    await logoutUser(page);

    await expect(page).toHaveURL(/\/auth\/admin\/login/);
  });
});
