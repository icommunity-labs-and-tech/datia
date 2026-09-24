import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, mockCreateCertificationEvidence, mockGetEvidence, mockRecordEvent } = vi.hoisted(() => ({
  mockPrisma: {
    certification: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    emissionRecord: { updateMany: vi.fn() },
    $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops)),
  },
  mockCreateCertificationEvidence: vi.fn(),
  mockGetEvidence: vi.fn(),
  mockRecordEvent: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/company', () => ({ companyFor: async (scope: { companyId: string | null }) => scope.companyId ?? 'company-default' }));
vi.mock('@/lib/services/events', () => ({ recordEvent: mockRecordEvent }));
vi.mock('@/domain/evidence/EvidenceServiceImpl', () => ({
  createEvidenceServiceImpl: () => ({ createCertificationEvidence: mockCreateCertificationEvidence }),
}));
vi.mock('@/infrastructure/icommunity/ICommunityServiceImpl', () => ({
  icommunityService: { getEvidence: mockGetEvidence },
}));

import { issueCertification, applyCertification, certificationSummary } from '@/lib/certification';

const issuedRow = {
  id: 'cert-1',
  organizationId: 'org-1',
  evidenceId: 'ev-1',
  status: 'ISSUED',
  payload: { verifierBody: 'AENOR', verificationStandard: 'ISO 14064-3' },
  network: null,
  hash: null,
  checkerUrl: null,
  blockExplorerUrl: null,
  certifiedAt: null,
  createdAt: new Date('2026-09-18T10:00:00Z'),
  updatedAt: new Date('2026-09-18T10:00:00Z'),
};

const input = {
  scope: { organizationId: 'org-1', companyId: 'co-1' },
  signatureID: 'sig-1',
  assetId: 'item-1',
  title: 'Emisión certificada',
  description: 'desc',
  payload: { co2eKg: 1 },
  emissionRecordIds: ['em-1', 'em-2'],
};

describe('issueCertification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateCertificationEvidence.mockResolvedValue({ evidenceId: 'ev-1', payloadChecksum: 'huella-1' });
    mockPrisma.certification.create.mockImplementation(async ({ data }) => ({ ...issuedRow, ...data }));
  });

  it('records the proof as issued and links the records it covers', async () => {
    const cert = await issueCertification(input);

    expect(cert).toMatchObject({ evidenceId: 'ev-1', organizationId: 'org-1', companyId: 'co-1' });
    // The checksum iBS will publish is recorded now: later it is the only way
    // to prove the stored payload is what was certified.
    expect(mockPrisma.certification.create.mock.calls[0][0].data.payloadChecksum).toBe('huella-1');
    expect(mockPrisma.emissionRecord.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['em-1', 'em-2'] } },
      data: { certificationId: cert.id },
    });
    // The evidence carries the same id the row gets, so iBS and datia agree.
    expect(mockCreateCertificationEvidence.mock.calls[0][0].metadata).toMatchObject({ id: cert.id, templateConfig: { co2eKg: 1 } });
  });

  it('writes nothing when iBS rejects the evidence', async () => {
    mockCreateCertificationEvidence.mockRejectedValue(new Error('iBS down'));
    await expect(issueCertification(input)).rejects.toThrow('iBS down');
    expect(mockPrisma.certification.create).not.toHaveBeenCalled();
    expect(mockPrisma.emissionRecord.updateMany).not.toHaveBeenCalled();
  });
});

describe('applyCertification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.certification.findUnique.mockResolvedValue(issuedRow);
    mockPrisma.certification.update.mockImplementation(async ({ data }) => ({ ...issuedRow, ...data }));
    mockGetEvidence.mockResolvedValue({
      status: 'certified',
      certification: {
        hash: '0xabc',
        network: 'polygon',
        timestamp: '2026-09-18T10:00:05Z',
        links: { checker: 'https://checker/x', block_explorer: 'https://explorer/x' },
      },
    });
  });

  it('confirms the proof and verifies every record it covers', async () => {
    const applied = await applyCertification('ev-1');

    expect(applied?.certification).toMatchObject({ status: 'CERTIFIED', hash: '0xabc', network: 'polygon' });
    expect(mockPrisma.emissionRecord.updateMany).toHaveBeenCalledWith({
      where: { certificationId: 'cert-1' },
      data: { verificationStatus: 'VERIFIED', verifierBody: 'AENOR', verificationStandard: 'ISO 14064-3' },
    });
  });

  it('changes nothing for a proof already certified', async () => {
    mockPrisma.certification.findUnique.mockResolvedValue({ ...issuedRow, status: 'CERTIFIED', hash: '0xabc' });
    const applied = await applyCertification('ev-1');

    expect(applied?.certification.status).toBe('CERTIFIED');
    expect(mockGetEvidence).not.toHaveBeenCalled();
    expect(mockPrisma.emissionRecord.updateMany).not.toHaveBeenCalled();
  });

  it('leaves it issued while iBS has not put it on chain', async () => {
    mockGetEvidence.mockResolvedValue({ status: 'created' });
    expect(await applyCertification('ev-1')).toBeNull();
    expect(mockPrisma.certification.update).not.toHaveBeenCalled();
  });

  it('ignores an evidence that is not a certification here', async () => {
    mockPrisma.certification.findUnique.mockResolvedValue(null);
    expect(await applyCertification('ev-desconocida')).toBeNull();
    expect(mockGetEvidence).not.toHaveBeenCalled();
  });
});

describe('certificationSummary', () => {
  it('shows the lower-case status the API exposes', () => {
    expect(certificationSummary(issuedRow as never)).toMatchObject({ id: 'cert-1', status: 'issued', certifiedAt: null });
  });
});
