import { test, expect } from '@playwright/test';
import { ADMIN_STORAGE_STATE } from './utils/auth';

/**
 * No organization sees another's data, by API or by dashboard (#38). Seeded
 * by scripts/bootstrap-e2e-users.mjs: a second, unrelated organization
 * ("Aislada E2E") with its own asset and API token, entirely apart from
 * "Datia E2E".
 *
 * The by-id and listing checks here are what would have caught the bug fixed
 * alongside this spec: GET /api/v1/assets and GET /api/v1/assets/{id} read
 * the organisation from the dashboard session cookie instead of the API
 * token that authenticated the request (the same class #78 already fixed for
 * /api/v1/events, never audited for its sibling here).
 */

const ISOLATED_ASSET_ID = 'e2e-isolated-item';
const DATIA_ASSET_ID = 'e2e-item-0';
const DATIA_ORG_TOKEN = 'e2e-datia-org-token-do-not-use-in-prod';
const ISOLATED_ORG_TOKEN = 'e2e-isolated-org-token-do-not-use-in-prod';

test.describe('Isolation between organizations', () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test('the dashboard cannot open another organization’s asset by guessing its id', async ({ page }) => {
    await page.goto(`/dashboard/assets/${ISOLATED_ASSET_ID}`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/activo no encontrado|asset not found/i)).toBeVisible();
  });

  test('a token cannot fetch another organization’s asset by id, even carrying this session’s cookies', async ({ page }) => {
    const res = await page.request.get(`/api/v1/assets/${ISOLATED_ASSET_ID}`, {
      headers: { Authorization: `Bearer ${DATIA_ORG_TOKEN}` },
    });
    expect(res.status()).toBe(404);
  });

  test('a token’s own asset is still reachable, cookies or not', async ({ page }) => {
    const res = await page.request.get(`/api/v1/assets/${DATIA_ASSET_ID}`, {
      headers: { Authorization: `Bearer ${DATIA_ORG_TOKEN}` },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).id).toBe(DATIA_ASSET_ID);
  });

  test('a listing never includes another organization’s asset', async ({ page }) => {
    const res = await page.request.get('/api/v1/assets?limit=100', {
      headers: { Authorization: `Bearer ${DATIA_ORG_TOKEN}` },
    });
    expect(res.status()).toBe(200);
    const ids = (await res.json()).data.map((a: { id: string }) => a.id);
    expect(ids).not.toContain(ISOLATED_ASSET_ID);
  });
});

// A plain, cookie-less context: the documented, intended way to call the API.
test.describe('Isolation between organizations (no dashboard session)', () => {
  test('the other organization’s token cannot see this one’s asset either', async ({ request }) => {
    const res = await request.get(`/api/v1/assets/${DATIA_ASSET_ID}`, {
      headers: { Authorization: `Bearer ${ISOLATED_ORG_TOKEN}` },
    });
    expect(res.status()).toBe(404);
  });

  test('a token alone, with no cookie at all, still lists its own assets', async ({ request }) => {
    const res = await request.get('/api/v1/assets', {
      headers: { Authorization: `Bearer ${ISOLATED_ORG_TOKEN}` },
    });
    expect(res.status()).toBe(200);
  });
});
