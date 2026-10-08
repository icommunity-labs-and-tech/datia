import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The organization's trend, energy summary and energy-module flag reuse the
 * exact same scope-parameterized functions a company's own Inicio calls
 * (#20) — just with a scope that has no `companyId`, covering every company.
 */

const { mockPrisma, mockVerify, mockComputeTrend, mockComputeEnergy } = vi.hoisted(() => ({
  mockPrisma: {
    organization: { findUnique: vi.fn() },
  },
  mockVerify: vi.fn(),
  mockComputeTrend: vi.fn(),
  mockComputeEnergy: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (name === 'organization-auth-token' ? { value: 'tok' } : undefined) }),
}));
vi.mock('@/lib/auth/organization/jwt', () => ({ verifyOrganizationJWT: mockVerify }));
vi.mock('@/lib/dashboard/certificationTrend', () => ({ computeCertificationTrend: mockComputeTrend }));
vi.mock('@/lib/dashboard/energySummary', () => ({ computeEnergySummary: mockComputeEnergy }));

import {
  getOrganizationTrend,
  getOrganizationEnergySummary,
  isOrganizationEnergyEnabled,
} from '@/actions/organizations/get-trend';

beforeEach(() => {
  vi.clearAllMocks();
  mockVerify.mockResolvedValue({ id: 'u-org', role: 'ORG_ADMIN', organizationId: 'org-1' });
  mockComputeTrend.mockResolvedValue({ monthly: [], from: '', to: '', currentMonth: null, byScope: [], coverage: 0, totalRecords: 0, kwhChange: null, co2eChange: null });
  mockComputeEnergy.mockResolvedValue({ totalSources: 0, sourcesWithCoords: 0, kwhThisMonth: 0, co2eKgThisMonth: 0, avgRenewableShare: null });
  mockPrisma.organization.findUnique.mockResolvedValue({ settings: { modules: { energy: true } } });
});

describe('getOrganizationTrend', () => {
  it('scopes the shared trend computation to the whole organization', async () => {
    await getOrganizationTrend();
    expect(mockComputeTrend).toHaveBeenCalledWith({ organizationId: 'org-1', companyId: null });
  });

  it('refuses a session that is not the organization account', async () => {
    mockVerify.mockResolvedValue(null);
    await expect(getOrganizationTrend()).rejects.toThrow();
  });
});

describe('getOrganizationEnergySummary', () => {
  it('scopes the shared energy summary to the whole organization', async () => {
    await getOrganizationEnergySummary();
    expect(mockComputeEnergy).toHaveBeenCalledWith({ organizationId: 'org-1', companyId: null });
  });
});

describe('isOrganizationEnergyEnabled', () => {
  it('reads the flag off the organization, not off any one company', async () => {
    const enabled = await isOrganizationEnergyEnabled();
    expect(enabled).toBe(true);
    expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith({
      where: { id: 'org-1' },
      select: { settings: true },
    });
  });

  it('is false when the module is off or unset', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ settings: {} });
    expect(await isOrganizationEnergyEnabled()).toBe(false);

    mockPrisma.organization.findUnique.mockResolvedValue({ settings: null });
    expect(await isOrganizationEnergyEnabled()).toBe(false);
  });
});
