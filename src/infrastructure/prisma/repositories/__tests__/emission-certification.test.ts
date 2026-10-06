import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Scope } from '@/lib/scope';

/**
 * Every emission the API returns says whether it is certified, and where to
 * check it, so an integration can read the proof without asking for a second
 * resource. An emission without a certification says so with null.
 */

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    emissionRecord: { findMany: vi.fn(), findFirst: vi.fn() },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { energyRepository } from '@/infrastructure/prisma/repositories/EnergyRepositoryPrisma';

const SCOPE: Scope = { organizationId: 'org-1', companyId: null };

const emissionRow = (certification: unknown) => ({
  id: 'e-1',
  energyConsumptionId: 'c-1',
  co2eKg: 12.5,
  scope: 'SCOPE_2',
  systemBoundary: 'CRADLE_TO_GATE',
  emissionFactor: 0.158,
  emissionFactorSource: 'IEA 2025',
  calculationMethodology: 'ISO 14067',
  gwpCharacterizationFactors: 'IPCC AR6',
  functionalUnit: null,
  verificationStatus: 'VERIFIED',
  verifierBody: null,
  verificationStandard: null,
  createdAt: new Date('2026-10-01T00:00:00Z'),
  Certification: certification,
});

const certified = {
  status: 'CERTIFIED',
  hash: 'abc123',
  checkerUrl: 'https://checker.example/abc123',
  blockExplorerUrl: 'https://explorer.example/tx/abc123',
  certifiedAt: new Date('2026-10-01T00:05:00Z'),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('emission certification in the API', () => {
  it('reads the certification with the emission, in the list and in the detail', async () => {
    mockPrisma.emissionRecord.findMany.mockResolvedValueOnce([]);
    mockPrisma.emissionRecord.findFirst.mockResolvedValueOnce(null);

    await energyRepository.findEmissionsByOrganization(SCOPE, 20);
    await energyRepository.findEmissionById(SCOPE, 'e-1');

    const listInclude = mockPrisma.emissionRecord.findMany.mock.calls[0][0].include;
    const detailInclude = mockPrisma.emissionRecord.findFirst.mock.calls[0][0].include;
    expect(listInclude.Certification.select).toEqual({
      status: true,
      hash: true,
      checkerUrl: true,
      blockExplorerUrl: true,
      certifiedAt: true,
    });
    expect(detailInclude).toEqual(listInclude);
  });

  it('returns the certification of a certified emission', async () => {
    mockPrisma.emissionRecord.findFirst.mockResolvedValueOnce(emissionRow(certified));

    const record = await energyRepository.findEmissionById(SCOPE, 'e-1');

    expect(record?.certification).toEqual(certified);
  });

  it('returns null while the emission has no certification yet', async () => {
    mockPrisma.emissionRecord.findMany.mockResolvedValueOnce([emissionRow(null)]);

    const page = await energyRepository.findEmissionsByOrganization(SCOPE, 20);

    expect(page.data[0].certification).toBeNull();
  });

  it('keeps the certification of each emission in a list', async () => {
    mockPrisma.emissionRecord.findMany.mockResolvedValueOnce([
      emissionRow(certified),
      { ...emissionRow(null), id: 'e-2' },
    ]);

    const page = await energyRepository.findEmissionsByOrganization(SCOPE, 20);

    expect(page.data.map((r) => [r.id, r.certification?.status ?? null])).toEqual([
      ['e-1', 'CERTIFIED'],
      ['e-2', null],
    ]);
  });
});
