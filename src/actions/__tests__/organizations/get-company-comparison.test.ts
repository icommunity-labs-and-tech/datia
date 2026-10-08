import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * One row per company — the comparison a company's own Inicio has no reason
 * to show (#20). Two `groupBy` queries regardless of company count, not one
 * `certificationCounts` call per company.
 */

const { mockPrisma, mockVerify, mockCompanies } = vi.hoisted(() => ({
  mockPrisma: {
    certification: { groupBy: vi.fn() },
    asset: { groupBy: vi.fn() },
    energyConsumption: { findMany: vi.fn() },
    emissionRecord: { findMany: vi.fn() },
  },
  mockVerify: vi.fn(),
  mockCompanies: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (name === 'organization-auth-token' ? { value: 'tok' } : undefined) }),
}));
vi.mock('@/lib/auth/organization/jwt', () => ({ verifyOrganizationJWT: mockVerify }));
vi.mock('@/actions/companies/list', () => ({ companiesOfOrganization: mockCompanies }));

import { getCompanyComparison } from '@/actions/organizations/get-company-comparison';

beforeEach(() => {
  vi.clearAllMocks();
  mockVerify.mockResolvedValue({ id: 'u-org', role: 'ORG_ADMIN', organizationId: 'org-1' });
  mockCompanies.mockResolvedValue([
    { id: 'co-1', name: 'Norte', active: true, createdAt: new Date('2026-09-01'), assets: 10, accounts: 2 },
    { id: 'co-2', name: 'Sur', active: false, createdAt: new Date('2026-09-02'), assets: 3, accounts: 1 },
    { id: 'co-3', name: 'Sin certificar', active: true, createdAt: new Date('2026-09-03'), assets: 1, accounts: 1 },
  ]);
  mockPrisma.certification.groupBy.mockImplementation(({ where }: { where: { status?: string } }) =>
    where.status === 'CERTIFIED'
      ? Promise.resolve([{ companyId: 'co-1', _count: { id: 4 } }])
      : Promise.resolve([
          { companyId: 'co-1', _count: { id: 5 } },
          { companyId: 'co-2', _count: { id: 2 } },
        ])
  );
  mockPrisma.asset.groupBy.mockResolvedValue([
    { companyId: 'co-1', _max: { createdAt: new Date('2026-10-01') } },
  ]);
  mockPrisma.energyConsumption.findMany.mockResolvedValue([
    { consumptionKwh: 300, EnergySource: { Asset: { companyId: 'co-1' } } },
    { consumptionKwh: 200, EnergySource: { Asset: { companyId: 'co-1' } } },
    { consumptionKwh: 50, EnergySource: { Asset: { companyId: 'co-2' } } },
  ]);
  mockPrisma.emissionRecord.findMany.mockResolvedValue([
    { co2eKg: 10, EnergyConsumption: { EnergySource: { Asset: { companyId: 'co-1' } } } },
    { co2eKg: 5, EnergyConsumption: { EnergySource: { Asset: { companyId: 'co-1' } } } },
  ]);
});

describe('getCompanyComparison', () => {
  it('computes coverage from certified over total certifications, per company', async () => {
    const rows = await getCompanyComparison();
    const co1 = rows.find((r) => r.id === 'co-1')!;
    expect(co1.certifications).toBe(5);
    expect(co1.certifiedCertifications).toBe(4);
    expect(co1.coverage).toBe(80);
  });

  it('reports no coverage, not zero, for a company with no certifications yet', async () => {
    const rows = await getCompanyComparison();
    const co3 = rows.find((r) => r.id === 'co-3')!;
    expect(co3.certifications).toBe(0);
    expect(co3.coverage).toBeNull();
  });

  it('carries last activity only for companies with assets', async () => {
    const rows = await getCompanyComparison();
    expect(rows.find((r) => r.id === 'co-1')!.lastActivityAt).toEqual(new Date('2026-10-01'));
    expect(rows.find((r) => r.id === 'co-2')!.lastActivityAt).toBeNull();
  });

  it('orders companies by asset count, most first', async () => {
    const rows = await getCompanyComparison();
    expect(rows.map((r) => r.id)).toEqual(['co-1', 'co-2', 'co-3']);
  });

  it('excludes organization-level certifications (no companyId) from any one company', async () => {
    await getCompanyComparison();
    const [[totalArgs]] = mockPrisma.certification.groupBy.mock.calls;
    expect(totalArgs.where.companyId).toEqual({ not: null });
    expect(totalArgs.where.organizationId).toBe('org-1');
  });

  it('refuses a session that is not the organization account', async () => {
    mockVerify.mockResolvedValue(null);
    await expect(getCompanyComparison()).rejects.toThrow();
  });

  it('sums consumption and emissions per company, from the asset their energy source belongs to', async () => {
    const rows = await getCompanyComparison();
    const co1 = rows.find((r) => r.id === 'co-1')!;
    const co2 = rows.find((r) => r.id === 'co-2')!;
    const co3 = rows.find((r) => r.id === 'co-3')!;

    expect(co1.consumptionKwh).toBe(500);
    expect(co1.co2eKg).toBe(15);
    expect(co2.consumptionKwh).toBe(50);
    expect(co2.co2eKg).toBe(0);
    expect(co3.consumptionKwh).toBe(0);
    expect(co3.co2eKg).toBe(0);
  });
});
