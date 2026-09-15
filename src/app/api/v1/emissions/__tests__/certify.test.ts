import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const ORG_ID = 'org-test-1';
const EMISSION_ID = 'emission-test-1';
const ITEM_ID = 'item-test-1';
const STATE_ID = 'state-test-1';
const EVIDENCE_ID = 'evidence-test-1';
const SIGNATURE_ID = 'sig-test-1';

const { mockValidateApiToken, mockPrisma, mockCreateEvidence } = vi.hoisted(() => ({
  mockValidateApiToken: vi.fn(),
  mockPrisma: {
    emissionRecord: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    organization: { findUnique: vi.fn() },
    statusType: { findFirst: vi.fn(), create: vi.fn() },
    state: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    eventLog: { create: vi.fn() },
  },
  mockCreateEvidence: vi.fn(),
}));

vi.mock('@/lib/auth/api-tokens/middleware', () => ({
  validateApiToken: mockValidateApiToken,
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

vi.mock('@/infrastructure/icommunity/ICommunityServiceImpl', () => ({
  icommunityService: { createEvidence: mockCreateEvidence },
}));

vi.mock('@/infrastructure/prisma/repositories/EventRepositoryPrisma', () => ({
  eventRepository: { create: vi.fn().mockResolvedValue({}) },
}));
vi.mock('@/infrastructure/prisma/repositories/WebhookRepositoryPrisma', () => ({
  // recordEvent sends events to subscribed webhooks; none here.
  webhookRepository: { findByEvent: vi.fn(async () => []), updateTriggered: vi.fn(async () => {}) },
}));

vi.mock('@/lib/http', () => ({
  getBaseUrl: vi.fn().mockResolvedValue('http://localhost:3000'),
  toAbsoluteUrl: vi.fn((url: string) => url),
}));

import * as route from '../[id]/certify/route';

const makeRequest = (body: object) =>
  new NextRequest(`http://localhost/api/v1/emissions/${EMISSION_ID}/certify`, {
    method: 'POST',
    body: JSON.stringify(body),
  } as any);

const baseEmission = {
  id: EMISSION_ID,
  co2eKg: 42.5,
  scope: 'SCOPE_2',
  systemBoundary: 'CRADLE_TO_GATE',
  calculationMethodology: 'GHG Protocol',
  emissionFactor: 0.233,
  emissionFactorSource: 'IEA 2023',
  gwpCharacterizationFactors: 'IPCC AR6',
  functionalUnit: 'kWh',
  verificationStatus: 'PENDING',
  verifierBody: null,
  verificationStandard: null,
  EnergyConsumption: {
    EnergySource: {
      Item: { id: ITEM_ID, organizationId: ORG_ID },
    },
  },
};

const baseOrg = {
  signatureID: SIGNATURE_ID,
  verificationStatus: 'VERIFIED',
};

describe('POST /api/v1/emissions/[id]/certify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiToken.mockResolvedValue({ organizationId: ORG_ID });
    mockPrisma.emissionRecord.findFirst.mockResolvedValue(baseEmission);
    mockPrisma.organization.findUnique.mockResolvedValue(baseOrg);
    mockPrisma.statusType.findFirst.mockResolvedValue({ id: 'st-1' });
    mockPrisma.state.create.mockResolvedValue({ id: STATE_ID, title: 'Certificación Energética — 42.5 kg CO₂e', description: '' });
    mockPrisma.state.update.mockResolvedValue({});
    mockPrisma.state.delete.mockResolvedValue({});
    mockPrisma.emissionRecord.update.mockResolvedValue({});
    mockCreateEvidence.mockResolvedValue(EVIDENCE_ID);
  });

  it('returns 401 when token is invalid', async () => {
    mockValidateApiToken.mockResolvedValue(null);
    const res = await route.POST(makeRequest({ verifierBody: 'AENOR', verificationStandard: 'ISO 14064-3' }), { params: Promise.resolve({ id: EMISSION_ID }) });
    expect(res.status).toBe(401);
  });

  it('returns 400 when body is missing verifierBody', async () => {
    const res = await route.POST(makeRequest({ verificationStandard: 'ISO 14064-3' }), { params: Promise.resolve({ id: EMISSION_ID }) });
    expect(res.status).toBe(400);
  });

  it('returns 404 when emission record not found', async () => {
    mockPrisma.emissionRecord.findFirst.mockResolvedValue(null);
    const res = await route.POST(makeRequest({ verifierBody: 'AENOR', verificationStandard: 'ISO 14064-3' }), { params: Promise.resolve({ id: EMISSION_ID }) });
    expect(res.status).toBe(404);
  });

  it('returns 409 when emission is already VERIFIED', async () => {
    mockPrisma.emissionRecord.findFirst.mockResolvedValue({ ...baseEmission, verificationStatus: 'VERIFIED' });
    const res = await route.POST(makeRequest({ verifierBody: 'AENOR', verificationStandard: 'ISO 14064-3' }), { params: Promise.resolve({ id: EMISSION_ID }) });
    expect(res.status).toBe(409);
  });

  it('returns 422 when org has no signatureID', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ signatureID: null, verificationStatus: 'VERIFIED' });
    const res = await route.POST(makeRequest({ verifierBody: 'AENOR', verificationStandard: 'ISO 14064-3' }), { params: Promise.resolve({ id: EMISSION_ID }) });
    expect(res.status).toBe(422);
  });

  it('returns 422 when org KYC is not VERIFIED', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ signatureID: SIGNATURE_ID, verificationStatus: 'PENDING' });
    const res = await route.POST(makeRequest({ verifierBody: 'AENOR', verificationStandard: 'ISO 14064-3' }), { params: Promise.resolve({ id: EMISSION_ID }) });
    expect(res.status).toBe(422);
  });

  it('creates statusType when none exists', async () => {
    mockPrisma.statusType.findFirst.mockResolvedValue(null);
    mockPrisma.statusType.create.mockResolvedValue({ id: 'st-new' });

    const res = await route.POST(makeRequest({ verifierBody: 'AENOR', verificationStandard: 'ISO 14064-3' }), { params: Promise.resolve({ id: EMISSION_ID }) });
    expect(mockPrisma.statusType.create).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
  });

  it('returns 200 with certification data on success', async () => {
    const res = await route.POST(makeRequest({ verifierBody: 'AENOR', verificationStandard: 'ISO 14064-3' }), { params: Promise.resolve({ id: EMISSION_ID }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.emissionRecordId).toBe(EMISSION_ID);
    expect(json.data.verificationStatus).toBe('VERIFIED');
    expect(json.data.evidenceID).toBe(EVIDENCE_ID);
    expect(json.data.stateId).toBe(STATE_ID);
  });

  it('embeds templateConfig in evidence metadata', async () => {
    await route.POST(makeRequest({ verifierBody: 'AENOR', verificationStandard: 'ISO 14064-3' }), { params: Promise.resolve({ id: EMISSION_ID }) });
    const createEvArgs = mockCreateEvidence.mock.calls[0];
    // createEvidence(signatureID, title, files)
    // files[last] is the JSON file — but we test via the title and signatureID
    expect(createEvArgs[0]).toBe(SIGNATURE_ID);
    expect(createEvArgs[1]).toContain('CO₂e');
  });

  it('rolls back state on evidence creation failure', async () => {
    mockCreateEvidence.mockRejectedValue(new Error('iBS down'));
    const res = await route.POST(makeRequest({ verifierBody: 'AENOR', verificationStandard: 'ISO 14064-3' }), { params: Promise.resolve({ id: EMISSION_ID }) });
    expect(res.status).toBe(502);
    expect(mockPrisma.state.delete).toHaveBeenCalledWith({ where: { id: STATE_ID } });
    expect(mockPrisma.emissionRecord.update).not.toHaveBeenCalled();
  });
});
