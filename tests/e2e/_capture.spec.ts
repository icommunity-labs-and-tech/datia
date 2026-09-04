import { test, expect, Page } from '@playwright/test';
import path from 'node:path';

/**
 * Captures the figures used by the functionality report. Not part of the test
 * suite: it runs on demand against a server pointed at the demo dataset.
 *
 * Shots are viewport-sized on purpose. Full-page captures of a long dashboard
 * produce tall, narrow strips that become unreadable once scaled into a page.
 *
 * Run with: npx playwright test tests/e2e/_capture.spec.ts --project=chromium-capture
 */

const DIR = path.join('test-results', 'informe');
const VIEWPORT = { width: 1440, height: 900 };

const EMAIL = 'demo@datia.icommunitylabs.com';
const PASSWORD = 'DatiaDemo2026!';

/** Asset with the fullest history, used for the detail figure. */
const FEATURED = '0739710e-f95d-55c3-8364-97e59c204517';

async function shot(page: Page, name: string) {
  // Charts animate in and map tiles stream; give them a beat to settle.
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(DIR, `${name}.png`) });
}

async function signIn(page: Page) {
  await page.goto('/auth/admin/login', { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: /acceder|iniciar sesión|access|sign in/i }).click();
  await page.waitForURL('**/dashboard**', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
}

test.describe.configure({ mode: 'serial' });

test.use({ viewport: VIEWPORT, storageState: { cookies: [], origins: [] } });

test('acceso', async ({ page }) => {
  await page.goto('/auth/admin/login', { waitUntil: 'networkidle' });
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await shot(page, '01-acceso');
});

test('recorrido completo', async ({ page }) => {
  await signIn(page);

  await shot(page, '02-inicio');

  await page.goto('/dashboard/items', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
  await shot(page, '03-inventario');

  await page.goto(`/dashboard/items/${FEATURED}`, { waitUntil: 'networkidle' });
  await expect(page.getByText(/estados del activo|resumen/i).first()).toBeVisible();
  await shot(page, '04-detalle-activo');

  for (const [view, name] of [
    ['sources', '05-energia-fuentes'],
    ['consumption', '06-energia-consumo'],
    ['emissions', '07-energia-emisiones'],
  ] as const) {
    await page.goto(`/dashboard/energy/${view}`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
    await shot(page, name);
  }

  await page.goto('/dashboard/api', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
  await shot(page, '08-api-documentacion');

  for (const [tab, name] of [
    [/eventos|events/i, '09-api-eventos'],
    [/webhooks/i, '10-api-webhooks'],
    [/autenticaci[óo]n|tokens|auth/i, '11-api-tokens'],
  ] as const) {
    await page.getByRole('tab', { name: tab }).click();
    await shot(page, name);
  }

  await page.goto('/dashboard/settings', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
  await shot(page, '12-configuracion');
});
