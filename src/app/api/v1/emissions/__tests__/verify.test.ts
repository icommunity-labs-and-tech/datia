import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const ORG_ID = 'org-test-1';
const EMISSION_ID = 'emission-test-1';
const ITEM_ID = 'item-test-1';
const CERT_ID = 'cert-test-1';
const EVIDENCE_ID = 'ev-blockchain-1';

const certifiedAt = '2026-07-15T10:00:00.000Z';

const storedTemplateConfig = {
  emissionRecordId: EMISSION_ID,
  co2eKg: 42.5,
  scope: 'SCOPE_2',
  systemBoundary: 'CRADLE_TO_GATE',
  calculationMethodology: 'GHG Protocol',
  emissionFactor: 0.233,
  emissionFactorSource: 'IEA 2023',
  gwpCharacterizationFactors: 'IPCC AR6',
  functionalUnit: 'kWh',
  verifierBody: 'AENOR',
  verificationStandard: 'ISO 14064-3',
  certifiedAt,
};

const storedEvidenceJson = JSON.stringify(
  {
    description: 'Emisión certificada por AENOR según ISO 14064-3',
    imageUrls: [],
    id: CERT_ID,
    itemId: ITEM_ID,
    title: 'Certificación Energética — 42.5 kg CO₂e',
    createdAt: certifiedAt,
    templateConfig: storedTemplateConfig,
  },
  null,
  2
);

const { mockValidateApiToken, mockPrisma, mockGetEvidence } = vi.hoisted(() => ({
  mockValidateApiToken: vi.fn(),
  mockPrisma: {
    emissionRecord: { findFirst: vi.fn() },
  },
  mockGetEvidence: vi.fn(),
}));

vi.mock('@/lib/auth/api-tokens/middleware', () => ({
  validateApiToken: mockValidateApiToken,
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

vi.mock('@/infrastructure/icommunity/ICommunityServiceImpl', () => ({
  icommunityService: { getEvidence: mockGetEvidence },
}));

import * as route from '../[id]/verify/route';

const makeRequest = () =>
  new NextRequest(`http://localhost/api/v1/emissions/${EMISSION_ID}/verify`, {
    method: 'GET',
  } as any);

const baseEmission = {
  id: EMISSION_ID,
  co2eKg: 42.5,
  scope: 'SCOPE_2',
  systemBoundary: 'CRADLE_TO_GATE',
  emissionFactorSource: 'IEA 2023',
  verificationStatus: 'VERIFIED',
  verifierBody: 'AENOR',
  verificationStandard: 'ISO 14064-3',
  EnergyConsumption: {
    EnergySource: {
      Item: { id: ITEM_ID, organizationId: ORG_ID },
    },
  },
  Certification: {
    id: CERT_ID,
    evidenceId: EVIDENCE_ID,
    status: 'CERTIFIED',
    certifiedAt: new Date(certifiedAt),
    createdAt: new Date(certifiedAt),
  },
};

const baseEvidencePayload = {
  id: EVIDENCE_ID,
  payload: {
    files: [
      {
        name: 'issue_data.json',
        file: Buffer.from(storedEvidenceJson).toString('base64'),
      },
    ],
  },
  timestamp: certifiedAt,
};

describe('GET /api/v1/emissions/[id]/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiToken.mockResolvedValue({ organizationId: ORG_ID });
    mockPrisma.emissionRecord.findFirst.mockResolvedValue(baseEmission);
    mockGetEvidence.mockResolvedValue(baseEvidencePayload);
  });

  it('returns 401 when token is invalid', async () => {
    mockValidateApiToken.mockResolvedValue(null);
    const res = await route.GET(makeRequest(), { params: Promise.resolve({ id: EMISSION_ID }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when emission not found', async () => {
    mockPrisma.emissionRecord.findFirst.mockResolvedValue(null);
    const res = await route.GET(makeRequest(), { params: Promise.resolve({ id: EMISSION_ID }) });
    expect(res.status).toBe(404);
  });

  it('returns 422 when the emission has no certified proof yet', async () => {
    mockPrisma.emissionRecord.findFirst.mockResolvedValue({ ...baseEmission, verificationStatus: 'PENDING', Certification: null });
    const res = await route.GET(makeRequest(), { params: Promise.resolve({ id: EMISSION_ID }) });
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.verificationStatus).toBe('PENDING');
  });

  it('returns 422 while the proof is issued but not yet on chain', async () => {
    mockPrisma.emissionRecord.findFirst.mockResolvedValue({
      ...baseEmission,
      verificationStatus: 'PENDING',
      Certification: { ...baseEmission.Certification, status: 'ISSUED', certifiedAt: null },
    });
    const res = await route.GET(makeRequest(), { params: Promise.resolve({ id: EMISSION_ID }) });
    expect(res.status).toBe(422);
    expect((await res.json()).certification).toBe('issued');
  });

  it('returns 502 when iCommunity is unavailable', async () => {
    mockGetEvidence.mockRejectedValue(new Error('network timeout'));
    const res = await route.GET(makeRequest(), { params: Promise.resolve({ id: EMISSION_ID }) });
    expect(res.status).toBe(502);
  });

  it('returns verified=true when stored data matches current DB values', async () => {
    const res = await route.GET(makeRequest(), { params: Promise.resolve({ id: EMISSION_ID }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.verified).toBe(true);
    expect(json.data.discrepancies).toHaveLength(0);
    expect(json.data.emissionRecordId).toBe(EMISSION_ID);
    expect(json.data.certificationId).toBe(CERT_ID);
  });

  it('returns evidence audit record with blockchain fields', async () => {
    const res = await route.GET(makeRequest(), { params: Promise.resolve({ id: EMISSION_ID }) });
    const json = await res.json();
    const evidence = json.data.evidence;
    expect(evidence.blockchain_tx).toBe(EVIDENCE_ID);
    expect(evidence.event_type).toBe('co2_certification_event');
    expect(evidence.timestamp).toBe(certifiedAt);
    expect(evidence.source).toBe('IEA 2023');
    expect(typeof evidence.hash).toBe('string');
    expect(evidence.hash).toHaveLength(64); // SHA-256 hex
  });

  it('returns verified=false with discrepancies when co2eKg changed', async () => {
    mockPrisma.emissionRecord.findFirst.mockResolvedValue({
      ...baseEmission,
      co2eKg: 99.9, // tampered value
    });
    const res = await route.GET(makeRequest(), { params: Promise.resolve({ id: EMISSION_ID }) });
    const json = await res.json();
    expect(json.data.verified).toBe(false);
    expect(json.data.discrepancies.some((d: string) => d.includes('co2eKg'))).toBe(true);
  });

  it('returns verified=false with discrepancies when verifierBody changed', async () => {
    mockPrisma.emissionRecord.findFirst.mockResolvedValue({
      ...baseEmission,
      verifierBody: 'Different Body',
    });
    const res = await route.GET(makeRequest(), { params: Promise.resolve({ id: EMISSION_ID }) });
    const json = await res.json();
    expect(json.data.verified).toBe(false);
    expect(json.data.discrepancies.some((d: string) => d.includes('verifierBody'))).toBe(true);
  });

  it('returns originalData matching current DB values', async () => {
    const res = await route.GET(makeRequest(), { params: Promise.resolve({ id: EMISSION_ID }) });
    const json = await res.json();
    const orig = json.data.originalData;
    expect(orig.co2eKg).toBe(42.5);
    expect(orig.scope).toBe('SCOPE_2');
    expect(orig.systemBoundary).toBe('CRADLE_TO_GATE');
    expect(orig.verifierBody).toBe('AENOR');
    expect(orig.verificationStandard).toBe('ISO 14064-3');
    expect(orig.certifiedAt).toBe(certifiedAt);
  });
});
