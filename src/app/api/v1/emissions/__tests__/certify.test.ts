import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const ORG_ID = 'org-test-1';
const EMISSION_ID = 'emission-test-1';
const CERT_ID = 'cert-test-1';
const EVIDENCE_ID = 'evidence-test-1';

const { mockValidateApiToken, mockPrisma, mockAnchor } = vi.hoisted(() => ({
  mockValidateApiToken: vi.fn(),
  mockPrisma: {
    emissionRecord: { findFirst: vi.fn() },
    organization: { findUnique: vi.fn() },
    certification: { findUnique: vi.fn() },
  },
  mockAnchor: vi.fn(),
}));

vi.mock('@/lib/auth/api-tokens/middleware', () => ({ validateApiToken: mockValidateApiToken }));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/energy/anchor-service', () => ({ anchorEmissionById: mockAnchor }));

import * as route from '../[id]/certify/route';

const certify = () =>
  route.POST(
    new NextRequest(`http://localhost/api/v1/emissions/${EMISSION_ID}/certify`, { method: 'POST' }),
    { params: Promise.resolve({ id: EMISSION_ID }) }
  );

const issued = {
  id: CERT_ID,
  organizationId: ORG_ID,
  evidenceId: EVIDENCE_ID,
  status: 'ISSUED',
  payload: {},
  network: null,
  hash: null,
  checkerUrl: null,
  blockExplorerUrl: null,
  certifiedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('POST /api/v1/emissions/[id]/certify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiToken.mockResolvedValue({ organizationId: ORG_ID, tokenId: 't', isSandbox: false });
    mockPrisma.emissionRecord.findFirst.mockResolvedValue({ id: EMISSION_ID, Certification: null });
    mockPrisma.organization.findUnique.mockResolvedValue({ signatureID: 'sig', verificationStatus: 'VERIFIED' });
    mockPrisma.certification.findUnique.mockResolvedValue(issued);
    mockAnchor.mockResolvedValue({ emissionId: EMISSION_ID, certificationId: CERT_ID, evidenceID: EVIDENCE_ID });
  });

  it('returns 401 when the token is invalid', async () => {
    mockValidateApiToken.mockResolvedValue(null);
    expect((await certify()).status).toBe(401);
  });

  it('returns 404 for an emission of another organisation', async () => {
    mockPrisma.emissionRecord.findFirst.mockResolvedValue(null);
    expect((await certify()).status).toBe(404);
    expect(mockAnchor).not.toHaveBeenCalled();
  });

  it('returns 409 with the existing proof instead of issuing a second one', async () => {
    mockPrisma.emissionRecord.findFirst.mockResolvedValue({ id: EMISSION_ID, Certification: issued });
    const res = await certify();
    expect(res.status).toBe(409);
    expect((await res.json()).certification).toMatchObject({ id: CERT_ID, status: 'issued' });
    expect(mockAnchor).not.toHaveBeenCalled();
  });

  it('returns 422 when the organisation cannot sign', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ signatureID: 'sig', verificationStatus: 'WAITING' });
    expect((await certify()).status).toBe(422);
    mockPrisma.organization.findUnique.mockResolvedValue({ signatureID: null, verificationStatus: 'VERIFIED' });
    expect((await certify()).status).toBe(422);
    expect(mockAnchor).not.toHaveBeenCalled();
  });

  it('issues the proof through the same anchoring as ingestion', async () => {
    const res = await certify();
    expect(res.status).toBe(201);
    expect(mockAnchor).toHaveBeenCalledWith(ORG_ID, EMISSION_ID);
    // Issued, not certified: the emission is verified only when iBS confirms.
    expect((await res.json()).data).toMatchObject({ id: CERT_ID, status: 'issued', evidenceId: EVIDENCE_ID });
  });

  it('returns 502 when iBS rejects the evidence', async () => {
    mockAnchor.mockResolvedValue({ emissionId: EMISSION_ID, error: 'iBS down' });
    const res = await certify();
    expect(res.status).toBe(502);
    expect((await res.json()).details).toBe('iBS down');
  });
});
