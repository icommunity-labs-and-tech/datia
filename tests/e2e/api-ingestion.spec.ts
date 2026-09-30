import { test, expect } from '@playwright/test';

/**
 * Ingestion through the public API with a company token (#38), with no
 * dashboard session anywhere in the request (a plain, cookie-less request
 * context, like the isolation spec's headless case).
 *
 * "Datia E2E"'s company has no KYC signature — same as every real company
 * before #23's onboarding, and why the dashboard's own asset-creation e2e
 * also stops at the KYC notice rather than a real certification, which needs
 * a live iBS account this environment does not have. So asset creation here
 * proves the KYC gate itself (a real business rule, not a stub), while energy
 * ingestion — ungated, no evidence to certify — runs against one of the
 * already-seeded assets and proves the full round trip.
 *
 * Seeded by scripts/bootstrap-e2e-users.mjs (DATIA_ORG_TOKEN, scoped to
 * "Datia E2E"; e2e-item-0..3 as its pre-existing assets).
 */

const DATIA_ORG_TOKEN = 'e2e-datia-org-token-do-not-use-in-prod';
const AUTH = { Authorization: `Bearer ${DATIA_ORG_TOKEN}` };
const EXISTING_ASSET_ID = 'e2e-item-0';

test.describe('API ingestion with a company token', () => {
  test('refuses to create an asset before the company’s KYC is done, with a real reason', async ({ request }) => {
    const res = await request.post('/api/v1/assets', {
      headers: AUTH,
      data: { id: 'e2e-should-not-exist', name: 'No debería crearse', description: 'La empresa no tiene KYC.' },
    });

    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('COMPANY_NOT_VERIFIED');

    const lookup = await request.get('/api/v1/assets/e2e-should-not-exist', { headers: AUTH });
    expect(lookup.status()).toBe(404);
  });

  test('refuses an asset without a description — validation runs before the KYC check', async ({ request }) => {
    const res = await request.post('/api/v1/assets', {
      headers: AUTH,
      data: { id: 'e2e-invalid-asset', name: 'Sin descripción' },
    });
    expect(res.status()).toBe(400);
  });

  test('registers an energy source on an existing asset, no KYC involved', async ({ request }) => {
    const res = await request.post('/api/v1/energy/source', {
      headers: AUTH,
      data: { name: 'Fuente ingerida por API', energyCarrier: 'ELECTRICITY', assetId: EXISTING_ASSET_ID },
    });
    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.data.assetId).toBe(EXISTING_ASSET_ID);
  });

  test('logs a month of consumption on that source, and it shows up listed', async ({ request }) => {
    const sourceRes = await request.post('/api/v1/energy/source', {
      headers: AUTH,
      data: { name: 'Fuente para consumo', energyCarrier: 'ELECTRICITY', assetId: EXISTING_ASSET_ID },
    });
    const sourceId = (await sourceRes.json()).data.id;

    const consumptionRes = await request.post('/api/v1/energy/consumption', {
      headers: AUTH,
      data: {
        energySourceId: sourceId,
        periodStart: '2026-08-01T00:00:00.000Z',
        periodEnd: '2026-08-31T23:59:59.000Z',
        consumptionKwh: 1234.5,
        lifecycleStage: 'USE',
      },
    });
    expect(consumptionRes.status()).toBe(201);
    const consumptionId = (await consumptionRes.json()).data.id;

    const list = await request.get('/api/v1/energy/consumption?limit=100', { headers: AUTH });
    const ids = (await list.json()).data.map((c: { id: string }) => c.id);
    expect(ids).toContain(consumptionId);
  });

  test('refuses an energy source for an asset from another organization', async ({ request }) => {
    const res = await request.post('/api/v1/energy/source', {
      headers: AUTH,
      data: { name: 'Fuente ajena', energyCarrier: 'ELECTRICITY', assetId: 'e2e-isolated-item' },
    });
    expect(res.status()).toBe(404);
  });
});
