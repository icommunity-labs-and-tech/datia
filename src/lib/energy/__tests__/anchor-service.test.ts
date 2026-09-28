import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Anchoring signs with the company the asset actually belongs to, not the
 * scope's (#23): an organisation-level API token's scope has no company, and
 * would otherwise pick an arbitrary one among several.
 */

const { mockPrisma, mockCompanyKycStatus, mockIssueCertification } = vi.hoisted(() => ({
  mockPrisma: { emissionRecord: { findFirst: vi.fn() } },
  mockCompanyKycStatus: vi.fn(),
  mockIssueCertification: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/kyc/company-status', () => ({ companyKycStatus: mockCompanyKycStatus }));
vi.mock('@/lib/certification', () => ({ issueCertification: mockIssueCertification }));

import { anchorEmissionById } from '../anchor-service';

const orgScope = { organizationId: 'org-1', companyId: null }; // an organisation-level API token
const companyScope = { organizationId: 'org-1', companyId: 'co-1' };

const emission = (companyId: string | null) => ({
  id: 'em-1',
  co2eKg: 1.2,
  scope: 'SCOPE_2',
  systemBoundary: 'gate-to-gate',
  emissionFactor: null,
  emissionFactorSource: null,
  calculationMethodology: null,
  gwpCharacterizationFactors: null,
  EnergyConsumption: {
    id: 'ec-1',
    periodStart: new Date('2026-09-01'),
    periodEnd: new Date('2026-09-02'),
    consumptionKwh: 10,
    measurementStandard: null,
    EnergySource: {
      id: 'es-1',
      name: 'Solar',
      Asset: { id: 'asset-1', name: 'Planta', companyId },
    },
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  mockCompanyKycStatus.mockResolvedValue({ signatureID: 'sig-1', verified: true });
  mockIssueCertification.mockResolvedValue({ id: 'cert-1', evidenceId: 'ev-1' });
});

describe('anchorEmissionById', () => {
  it('signs with the KYC of the emission\'s own company, for an organisation-level token', async () => {
    mockPrisma.emissionRecord.findFirst.mockResolvedValue(emission('co-2'));

    const result = await anchorEmissionById(orgScope, 'em-1');

    expect(mockCompanyKycStatus).toHaveBeenCalledWith('co-2');
    expect(result).toMatchObject({ certificationId: 'cert-1', evidenceId: 'ev-1' });
  });

  it('does not certify an asset with no company: nobody to check the KYC of', async () => {
    mockPrisma.emissionRecord.findFirst.mockResolvedValue(emission(null));

    await expect(anchorEmissionById(orgScope, 'em-1')).resolves.toBeNull();
    expect(mockCompanyKycStatus).not.toHaveBeenCalled();
    expect(mockIssueCertification).not.toHaveBeenCalled();
  });

  it('does nothing while the company has no verified signature', async () => {
    mockPrisma.emissionRecord.findFirst.mockResolvedValue(emission('co-1'));
    mockCompanyKycStatus.mockResolvedValue({ signatureID: null, verified: false });

    await expect(anchorEmissionById(companyScope, 'em-1')).resolves.toBeNull();
    expect(mockIssueCertification).not.toHaveBeenCalled();
  });

  it('does nothing for an emission outside the scope', async () => {
    mockPrisma.emissionRecord.findFirst.mockResolvedValue(null);

    await expect(anchorEmissionById(companyScope, 'em-1')).resolves.toBeNull();
    expect(mockCompanyKycStatus).not.toHaveBeenCalled();
  });

  it('never throws: a proof issued late is fine, a write that fails is not', async () => {
    mockPrisma.emissionRecord.findFirst.mockRejectedValue(new Error('db down'));

    await expect(anchorEmissionById(companyScope, 'em-1')).resolves.toBeNull();
  });
});
