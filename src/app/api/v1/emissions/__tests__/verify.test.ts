import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const ORG_ID = 'org-test-1';
const EMISSION_ID = 'emission-test-1';
const CERT_ID = 'cert-test-1';
const EVIDENCE_ID = 'evd_test1';
const CHECKSUM = 'YoWBBhPj8t+AdvlMUvSoi2TNujl6lQUkY3k5K+L8ayu1O0PNzN4h8D6N42Pi/5mlsGD/C8o2vKtYzIbEnm8tYA==';
const certifiedAt = '2026-09-22T08:29:27.627Z';

const { mockValidateApiToken, mockPrisma, mockGetEvidence } = vi.hoisted(() => ({
  mockValidateApiToken: vi.fn(),
  mockPrisma: { emissionRecord: { findFirst: vi.fn() } },
  mockGetEvidence: vi.fn(),
}));

vi.mock('@/lib/auth/api-tokens/middleware', () => ({ validateApiToken: mockValidateApiToken }));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/infrastructure/icommunity/ICommunityServiceImpl', () => ({
  icommunityService: { getEvidence: mockGetEvidence },
}));

import * as route from '../[id]/verify/route';

const verify = () =>
  route.GET(
    new NextRequest(`http://localhost/api/v1/emissions/${EMISSION_ID}/verify`),
    { params: Promise.resolve({ id: EMISSION_ID }) }
  );

const certification = {
  id: CERT_ID,
  evidenceId: EVIDENCE_ID,
  status: 'CERTIFIED',
  payloadChecksum: CHECKSUM,
  hash: '0xabc',
  network: 'gnosis',
  certifiedAt: new Date(certifiedAt),
  createdAt: new Date(certifiedAt),
  payload: {
    co2eKg: 246.9,
    scope: 'SCOPE_2',
    systemBoundary: 'CRADLE_TO_GATE',
    emissionFactor: 0.2,
    emissionFactorSource: 'IEA 2024',
    verifierBody: 'AENOR',
    verificationStandard: 'ISO 14064-3',
  },
};

const emission = {
  id: EMISSION_ID,
  co2eKg: 246.9,
  scope: 'SCOPE_2',
  systemBoundary: 'CRADLE_TO_GATE',
  emissionFactor: 0.2,
  emissionFactorSource: 'IEA 2024',
  verificationStatus: 'VERIFIED',
  verifierBody: 'AENOR',
  verificationStandard: 'ISO 14064-3',
  Certification: certification,
};

const evidence = {
  id: EVIDENCE_ID,
  status: 'certified',
  certification: { hash: '0xabc', network: 'gnosis', timestamp: certifiedAt },
  // iBS publishes the checksum of each file, never the file itself.
  payload: { integrity: [{ name: 'issue_data.json', algorithm: 'SHA-512', checksum: CHECKSUM, sanitizer: 'base64.standard' }] },
};

describe('GET /api/v1/emissions/[id]/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiToken.mockResolvedValue({ organizationId: ORG_ID });
    mockPrisma.emissionRecord.findFirst.mockResolvedValue(emission);
    mockGetEvidence.mockResolvedValue(evidence);
  });

  it('returns 401 without a token', async () => {
    mockValidateApiToken.mockResolvedValue(null);
    expect((await verify()).status).toBe(401);
  });

  it('returns 404 for an emission of another organisation', async () => {
    mockPrisma.emissionRecord.findFirst.mockResolvedValue(null);
    expect((await verify()).status).toBe(404);
  });

  it('returns 422 while the proof is not on chain yet', async () => {
    mockPrisma.emissionRecord.findFirst.mockResolvedValue({
      ...emission,
      verificationStatus: 'PENDING',
      Certification: { ...certification, status: 'ISSUED' },
    });
    const res = await verify();
    expect(res.status).toBe(422);
    expect((await res.json()).certification).toBe('issued');
  });

  it('returns 409 for a proof issued before checksums were recorded', async () => {
    mockPrisma.emissionRecord.findFirst.mockResolvedValue({
      ...emission,
      Certification: { ...certification, payloadChecksum: null },
    });
    const res = await verify();
    expect(res.status).toBe(409);
    expect(mockGetEvidence).not.toHaveBeenCalled();
  });

  it('returns 502 when iBS cannot be read', async () => {
    mockGetEvidence.mockRejectedValue(new Error('down'));
    expect((await verify()).status).toBe(502);
  });

  it('returns 502 when the evidence publishes no checksum', async () => {
    mockGetEvidence.mockResolvedValue({ ...evidence, payload: { integrity: [] } });
    expect((await verify()).status).toBe(502);
  });

  it('verifies the proof against the checksum iBS publishes', async () => {
    const res = await verify();
    expect(res.status).toBe(200);
    const { data } = await res.json();

    expect(data.verified).toBe(true);
    expect(data.proof).toMatchObject({ intact: true, publishedChecksum: CHECKSUM, storedChecksum: CHECKSUM });
    expect(data.certificationId).toBe(CERT_ID);
    expect(data.discrepancies).toEqual([]);
  });

  it('reports a proof whose published checksum no longer matches', async () => {
    mockGetEvidence.mockResolvedValue({
      ...evidence,
      payload: { integrity: [{ name: 'issue_data.json', checksum: 'otra-huella' }] },
    });
    const { data } = await (await verify()).json();

    expect(data.proof.intact).toBe(false);
    expect(data.verified).toBe(false);
  });

  it('reports a figure that changed after being certified', async () => {
    mockPrisma.emissionRecord.findFirst.mockResolvedValue({ ...emission, co2eKg: 999 });
    const { data } = await (await verify()).json();

    expect(data.proof.intact).toBe(true);
    expect(data.verified).toBe(false);
    expect(data.discrepancies).toEqual(['co2eKg: certificado=246.9, actual=999']);
    expect(data.certifiedData.co2eKg).toBe(246.9);
  });
});
