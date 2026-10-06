import { test, expect } from '@playwright/test';
import { loginAdmin } from './utils/auth';

/**
 * No company sees another company's data, by dashboard or by API, inside the
 * same organization (#38). Seeded by scripts/bootstrap-e2e-users.mjs: "Datia E2E"
 * has two companies. Company A (the default one) owns e2e-item-0; company B owns
 * e2e-company-b-asset. The org-wide token has no company and must see both.
 */

const COMPANY_A_ASSET_ID = 'e2e-item-0';
const COMPANY_B_ASSET_ID = 'e2e-company-b-asset';
const COMPANY_A_TOKEN = 'e2e-datia-org-token-do-not-use-in-prod';
const COMPANY_B_TOKEN = 'e2e-company-b-token-do-not-use-in-prod';
const ORG_WIDE_TOKEN = 'e2e-datia-org-wide-token-do-not-use-in-prod';
const COMPANY_B_EMAIL = 'companyb-e2e@datia.icommunitylabs.com';
const COMPANY_B_PASSWORD = 'companyb123';

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

const listedIds = async (request: import('@playwright/test').APIRequestContext, token: string) => {
  const res = await request.get('/api/v1/assets?limit=100', { headers: bearer(token) });
  expect(res.status()).toBe(200);
  return ((await res.json()).data as { id: string }[]).map((a) => a.id);
};

test.describe('Company isolation: dashboard', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('company B’s account cannot open company A’s asset by its id', async ({ page }) => {
    await loginAdmin(page, COMPANY_B_EMAIL, COMPANY_B_PASSWORD);
    await page.goto(`/dashboard/assets/${COMPANY_A_ASSET_ID}`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/activo no encontrado|asset not found/i)).toBeVisible();
  });
});

test.describe('Company isolation: API, without a dashboard session', () => {
  test('company B’s token cannot fetch company A’s asset', async ({ request }) => {
    const res = await request.get(`/api/v1/assets/${COMPANY_A_ASSET_ID}`, { headers: bearer(COMPANY_B_TOKEN) });
    expect(res.status()).toBe(404);
  });

  test('company A’s token cannot fetch company B’s asset', async ({ request }) => {
    const res = await request.get(`/api/v1/assets/${COMPANY_B_ASSET_ID}`, { headers: bearer(COMPANY_A_TOKEN) });
    expect(res.status()).toBe(404);
  });

  test('a company’s listing contains only its own assets', async ({ request }) => {
    const idsA = await listedIds(request, COMPANY_A_TOKEN);
    const idsB = await listedIds(request, COMPANY_B_TOKEN);

    expect(idsA).toContain(COMPANY_A_ASSET_ID);
    expect(idsA).not.toContain(COMPANY_B_ASSET_ID);
    expect(idsB).toContain(COMPANY_B_ASSET_ID);
    expect(idsB).not.toContain(COMPANY_A_ASSET_ID);
  });

  test('company B’s token cannot register energy on company A’s asset', async ({ request }) => {
    const res = await request.post('/api/v1/energy/source', {
      headers: bearer(COMPANY_B_TOKEN),
      data: { assetId: COMPANY_A_ASSET_ID, name: 'Intento ajeno', energyCarrier: 'SOLAR_THERMAL', capacityKw: 1 },
    });
    expect(res.status()).toBe(404);
  });

  test('the organisation-wide token still sees both companies’ assets', async ({ request }) => {
    const ids = await listedIds(request, ORG_WIDE_TOKEN);
    expect(ids).toContain(COMPANY_A_ASSET_ID);
    expect(ids).toContain(COMPANY_B_ASSET_ID);
  });
});
