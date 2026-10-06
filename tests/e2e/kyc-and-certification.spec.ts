import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * A company's KYC is confirmed by iBS, and then it certifies an emission end to
 * end: anchored when written, certified on chain, verified against the checksum
 * iBS publishes (#38). iBS is the double in tests/e2e/support/ibs-stub.mjs, so
 * each step is driven by the same webhooks iBS would call.
 */

const IBS = 'http://127.0.0.1:4010';
const COMPANY_C_SIGNATURE = 'e2e-signature-company-c';
const COMPANY_C_TOKEN = 'e2e-company-c-token-do-not-use-in-prod';
const AUTH = { Authorization: `Bearer ${COMPANY_C_TOKEN}` };
const ASSET_ID = 'e2e-c-asset-certified';

test.describe.configure({ mode: 'serial' });

test.describe('KYC and certification of an emission, through the iBS double', () => {
  let sourceId: string;
  let consumptionId: string;
  let emissionId: string;

  test('before iBS confirms the identity, the company cannot create assets', async ({ request }) => {
    const res = await request.post('/api/v1/assets', {
      headers: AUTH,
      data: { id: 'e2e-c-asset-too-early', name: 'Antes del KYC', description: 'La firma aún no está confirmada.' },
    });
    expect(res.status()).toBe(403);
    expect((await res.json()).code).toBe('COMPANY_NOT_VERIFIED');
  });

  test('iBS confirms the identity and its webhook verifies the company', async ({ request }) => {
    const set = await request.post(`${IBS}/__control/signature/${COMPANY_C_SIGNATURE}`, { data: { status: 'success' } });
    expect(set.status()).toBe(200);

    const res = await request.post('/api/hooks/signature/ok', {
      data: { data: { signature_id: COMPANY_C_SIGNATURE } },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).applied).toBe(true);
  });

  test('once verified, the company records an asset, its energy and an emission, anchored as written', async ({ request }) => {
    const asset = await request.post('/api/v1/assets', {
      headers: AUTH,
      data: { id: ASSET_ID, name: 'Activo certificado', description: 'Certificado de extremo a extremo en e2e.' },
    });
    expect(asset.status()).toBe(201);

    sourceId = (
      await (await request.post('/api/v1/energy/source', {
        headers: AUTH,
        data: { name: 'Fuente certificada', energyCarrier: 'ELECTRICITY', assetId: ASSET_ID },
      })).json()
    ).data.id;

    consumptionId = (
      await (await request.post('/api/v1/energy/consumption', {
        headers: AUTH,
        data: {
          energySourceId: sourceId,
          periodStart: '2026-08-01T00:00:00.000Z',
          periodEnd: '2026-08-31T23:59:59.000Z',
          consumptionKwh: 500,
          lifecycleStage: 'USE',
        },
      })).json()
    ).data.id;

    const emission = await request.post('/api/v1/emissions', {
      headers: AUTH,
      data: {
        energyConsumptionId: consumptionId,
        co2eKg: 80.5,
        scope: 'SCOPE_2',
        systemBoundary: 'CRADLE_TO_GATE',
        emissionFactor: 0.161,
        emissionFactorSource: 'IEA 2025',
        calculationMethodology: 'ISO 14067',
      },
    });
    expect(emission.status()).toBe(201);
    const body = await emission.json();
    emissionId = body.data.id;
    expect(body.data.certification).toMatchObject({ status: 'ISSUED', hash: null });
  });

  test('iBS certifies the evidence on chain and its webhook confirms it', async ({ request }) => {
    const certified = await request.post(`${IBS}/__control/certify-waiting`);
    const ids: string[] = (await certified.json()).evidence_ids;
    expect(ids.length).toBeGreaterThan(0);

    for (const evidenceId of ids) {
      const res = await request.post('/api/hooks/evidence', { data: { data: { evidence_id: evidenceId } } });
      expect(res.status()).toBe(200);
    }
  });

  test('the emission shows it is certified, with the hash and the links to check it', async ({ request }) => {
    const res = await request.get(`/api/v1/emissions/${emissionId}`, { headers: AUTH });
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    expect(data.verificationStatus).toBe('VERIFIED');
    expect(data.certification).toMatchObject({
      status: 'CERTIFIED',
      checkerUrl: expect.stringContaining('checker.stub'),
      blockExplorerUrl: expect.stringContaining('explorer.stub'),
    });
    expect(data.certification.hash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(data.certification.certifiedAt).not.toBeNull();
  });

  test('verification compares the checksum iBS published with the one certified, and agrees', async ({ request }) => {
    const res = await request.get(`/api/v1/emissions/${emissionId}/verify`, { headers: AUTH });
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    expect(data.verified).toBe(true);
    expect(data.proof.publishedChecksum).toBeTruthy();
  });
});
