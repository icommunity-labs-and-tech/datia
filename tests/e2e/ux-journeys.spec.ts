import { test, expect, Page } from '@playwright/test';
import path from 'node:path';
import { ADMIN_STORAGE_STATE } from './utils/auth';

/**
 * UX journeys — walks the redesigned dashboard end to end and drops a
 * screenshot at every stop so the new interface can be reviewed as a whole.
 *
 * Artifacts land in `test-results/ux-journeys/{desktop,mobile}/NN-step.png`.
 */

const SHOT_DIR = path.join('test-results', 'ux-journeys');

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

/** Seeded by scripts/bootstrap-e2e-users.mjs. */
const PASSPORT_ITEM_ID = 'e2e-item-0';

/** Entities deliberately hidden from the UI for now. */
const HIDDEN_ROUTES = ['/dashboard/users', '/dashboard/status-types', '/dashboard/states'];

/** Gone with the state history (#63): these routes no longer exist. */
const GONE_ROUTES = ['/dashboard/status-types', '/dashboard/states'];

async function shot(page: Page, device: string, step: string) {
  await page.waitForTimeout(400); // let Mantine transitions and maps settle
  await page.screenshot({
    path: path.join(SHOT_DIR, device, `${step}.png`),
    fullPage: true,
  });
}

/** Horizontal overflow is the most common regression when tightening layouts. */
async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow, 'the page must not scroll horizontally').toBeLessThanOrEqual(1);
}

test.describe('UX journey — sign in', () => {
  // The only signed-out stop. It never submits the form, so it costs no attempt
  // against the login rate limit.
  test.use({ viewport: DESKTOP, storageState: { cookies: [], origins: [] } });

  test('login screen', async ({ page }) => {
    await page.goto('/auth/admin/login', { waitUntil: 'networkidle' });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await shot(page, 'desktop', '01-login');
    await expectNoHorizontalScroll(page);
  });
});

test.describe('UX journey — desktop', () => {
  test.use({ viewport: DESKTOP, storageState: ADMIN_STORAGE_STATE });

  test('full admin walkthrough', async ({ page }) => {
    // ── 2. Home ──
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await shot(page, 'desktop', '02-home');
    await expectNoHorizontalScroll(page);

    // The top nav carries content surfaces only: Home, Assets, the energy views
    // when that module is on, and API. Settings lives in the account menu.
    const nav = page.locator('header a[href^="/dashboard"]');
    const navHrefs = await nav.evaluateAll((els) =>
      els.map((e) => (e as HTMLAnchorElement).getAttribute('href'))
    );
    expect(navHrefs, 'the home entry is always present').toContain('/dashboard');
    expect(navHrefs, 'settings is reached from the account menu, not the nav')
      .not.toContain('/dashboard/settings');
    for (const hidden of HIDDEN_ROUTES) {
      expect(navHrefs, `${hidden} must not be linked from the top nav`).not.toContain(hidden);
    }

    // ── 3. Assets ──
    await page.getByRole('link', { name: /activos|assets/i }).first().click();
    await page.waitForURL('**/dashboard/assets');
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
    await page.waitForLoadState('networkidle');
    await shot(page, 'desktop', '03-assets');
    await expectNoHorizontalScroll(page);

    // ── 4. Assets — search with no match shows a recoverable empty state ──
    await page.getByPlaceholder(/buscar|search/i).fill('zzz-no-match-zzz');
    await expect(page.getByRole('button', { name: /limpiar filtros|clear filters/i })).toBeVisible();
    await shot(page, 'desktop', '04-assets-empty-search');
    await page.getByRole('button', { name: /limpiar filtros|clear filters/i }).click();

    // ── 5. API hub — every tab is its own migrated surface ──
    await page.goto('/dashboard/api', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
    await shot(page, 'desktop', '05-api');
    await expectNoHorizontalScroll(page);

    await page.getByRole('tab', { name: /webhooks/i }).click();
    await expect(page.getByRole('button', { name: /crear webhook|create webhook/i })).toBeVisible();
    await shot(page, 'desktop', '05b-api-webhooks');
    await expectNoHorizontalScroll(page);

    await page.getByRole('tab', { name: /autenticaci[óo]n|auth/i }).click();
    await expect(page.getByRole('button', { name: /crear token|create token/i })).toBeVisible();
    await shot(page, 'desktop', '05c-api-auth');
    await expectNoHorizontalScroll(page);

    // ── 6. Settings, reached through the avatar menu ──
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /cuenta|account/i }).click();
    await shot(page, 'desktop', '06-account-menu');
    await page.getByRole('menuitem', { name: /configuración|settings/i }).click();
    await page.waitForURL('**/dashboard/settings');
    await page.waitForLoadState('networkidle');
    await shot(page, 'desktop', '07-settings');
    await expectNoHorizontalScroll(page);

    // Settings holds organisation config only — no users, no status types.
    await expect(page.getByRole('tab')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /organizaci[óo]n|organisation/i }).first())
      .toBeVisible();
  });
});

test.describe('UX journey — mobile', () => {
  test.use({ viewport: MOBILE, storageState: ADMIN_STORAGE_STATE });

  test('drawer navigation and key screens', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await shot(page, 'mobile', '01-home');
    await expectNoHorizontalScroll(page);

    // Drawer
    await page.getByRole('button', { name: /abrir men[úu]|open menu/i }).click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await shot(page, 'mobile', '02-drawer');

    await drawer.getByRole('link', { name: /activos|assets/i }).first().click();
    await page.waitForURL('**/dashboard/assets');
    await page.waitForLoadState('networkidle');
    await shot(page, 'mobile', '03-assets');
    await expectNoHorizontalScroll(page);

    await page.goto('/dashboard/settings', { waitUntil: 'networkidle' });
    await shot(page, 'mobile', '04-settings');
    await expectNoHorizontalScroll(page);
  });
});

test.describe('Hidden entities', () => {
  test.use({ viewport: DESKTOP, storageState: ADMIN_STORAGE_STATE });

  test('users and status types are not reachable from the UI', async ({ page }) => {
    // Users are hidden: direct navigation bounces back to the dashboard.
    await page.goto('/dashboard/users');
    await expect(page).toHaveURL(/\/dashboard\/?$/);

    // States and status types no longer exist at all.
    for (const route of GONE_ROUTES) {
      const res = await page.goto(route);
      expect(res?.status(), `${route} should be gone`).toBe(404);
    }

    // And no link anywhere in the shell points at them.
    await page.goto('/dashboard/settings', { waitUntil: 'networkidle' });
    for (const hidden of HIDDEN_ROUTES) {
      await expect(page.locator(`a[href^="${hidden}"]`)).toHaveCount(0);
    }
  });
});

test.describe('UX journey — public passport', () => {
  // The passport is public: it must render for a visitor with no session.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('scanner and asset passport', async ({ page }) => {
    await page.setViewportSize(DESKTOP);

    // Entry point into the whole product.
    await page.goto('/apps', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await shot(page, 'desktop', '00-apps');
    await expectNoHorizontalScroll(page);

    await page.goto('/customer', { waitUntil: 'networkidle' });
    await shot(page, 'desktop', '08-scanner');
    await expectNoHorizontalScroll(page);

    await page.goto(`/customer/asset/${PASSPORT_ITEM_ID}`, { waitUntil: 'networkidle' });

    // Certification status is the reason this page exists.
    await expect(
      page.getByText(/certificado en blockchain|pendiente de certificar|certified on blockchain|pending certification/i)
    ).toBeVisible();
    await shot(page, 'desktop', '09-passport');
    await expectNoHorizontalScroll(page);

    // Tabs replace the old JS-driven mobile/desktop split, so they exist on both.
    // The state history is gone (#63): what the passport proves is its energy.
    await expect(page.getByRole('tab', { name: /historial|history/i })).toHaveCount(0);
    await page.getByRole('tab', { name: /certificación energética|energy certification/i }).click();
    await shot(page, 'desktop', '10-passport-energy');

    await page.setViewportSize(MOBILE);
    await page.goto(`/customer/asset/${PASSPORT_ITEM_ID}`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('tab').first()).toBeVisible();
    await shot(page, 'mobile', '05-passport');
    await expectNoHorizontalScroll(page);
  });

  test('energy certification report', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(`/customer/asset/${PASSPORT_ITEM_ID}`, { waitUntil: 'networkidle' });

    await page.getByRole('tab', { name: /certificación energética|energy certification/i }).click();
    await expect(page.getByText(/co₂e certificado|certified co₂e/i)).toBeVisible();
    await shot(page, 'desktop', '12-energy-report');
    await expectNoHorizontalScroll(page);
  });

  test('the old energy portal folds into the passport', async ({ page }) => {
    await page.setViewportSize(DESKTOP);

    // Printed QR codes point at /customer/asset/<id>, so that is the URL that
    // survives; /energy/* only forwards old links now.
    await page.goto(`/energy/${PASSPORT_ITEM_ID}`);
    await expect(page).toHaveURL(new RegExp(`/customer/asset/${PASSPORT_ITEM_ID}$`));

    await page.goto('/energy');
    await expect(page).toHaveURL(/\/customer$/);
  });

  test('unknown code shows a recoverable error', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/customer/asset/does-not-exist', { waitUntil: 'networkidle' });

    await expect(page.getByRole('button', { name: /volver al scanner|back to scanner/i })).toBeVisible();
    await shot(page, 'desktop', '11-passport-not-found');
    await expectNoHorizontalScroll(page);
  });
});

test.describe('Vistas de energía', () => {
  test.use({ viewport: DESKTOP, storageState: ADMIN_STORAGE_STATE });

  test('each energy view is a route of its own', async ({ page }) => {
    // They used to be tabs of one hub that loaded all three datasets at once.
    // Sources have no page of their own any more: they live in their installation.
    for (const view of ['consumption', 'emissions']) {
      await page.goto(`/dashboard/energy/${view}`, { waitUntil: 'networkidle' });
      await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
      await expectNoHorizontalScroll(page);
    }
  });

  test('links to the former hub still resolve', async ({ page }) => {
    // The hub's default view was sources, which now redirects to the assets page.
    await page.goto('/dashboard/energy');
    await expect(page).toHaveURL(/\/dashboard\/assets$/);

    await page.goto('/dashboard/energy?tab=consumption');
    await expect(page).toHaveURL(/\/dashboard\/energy\/consumption$/);

    await page.goto('/dashboard/energy?tab=emissions');
    await expect(page).toHaveURL(/\/dashboard\/energy\/emissions$/);
  });
});
