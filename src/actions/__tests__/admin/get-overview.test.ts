import { describe, it, expect, vi, beforeEach } from 'vitest';

/** The superadmin's home: what the platform holds, across every organization. */

const { mockPrisma, mockIsSuperAdmin, mockTrend } = vi.hoisted(() => ({
  mockPrisma: {
    organization: { count: vi.fn(), findMany: vi.fn() },
    company: { findMany: vi.fn() },
    asset: { count: vi.fn() },
    certification: { count: vi.fn() },
  },
  mockIsSuperAdmin: vi.fn(),
  mockTrend: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/auth/tenant', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/tenant')>('@/lib/auth/tenant');
  return { ...actual, isSuperAdmin: mockIsSuperAdmin };
});
vi.mock('@/lib/dashboard/certificationTrend', () => ({ computeCertificationTrend: mockTrend }));

import { getPlatformHome } from '@/actions/admin/get-overview';

beforeEach(() => {
  vi.clearAllMocks();
  mockIsSuperAdmin.mockResolvedValue(true);
  mockPrisma.organization.count.mockResolvedValue(3);
  mockPrisma.company.findMany
    .mockResolvedValueOnce([{ active: true }, { active: true }, { active: false }])
    .mockResolvedValueOnce([
      { id: 'c-1', name: 'Pendiente SA', updatedAt: new Date('2026-09-01'), Organization: { name: 'Norte' } },
    ]);
  mockPrisma.asset.count.mockResolvedValue(42);
  mockPrisma.certification.count
    .mockResolvedValueOnce(30) // total
    .mockResolvedValueOnce(25) // certified
    .mockResolvedValueOnce(2); // issued (pending)
  mockTrend.mockResolvedValue({ coverage: 80, totalRecords: 30, monthly: [], byScope: [], from: '', to: '', currentMonth: null, kwhChange: null, co2eChange: null });
  mockPrisma.organization.findMany.mockResolvedValue([
    { id: 'org-1', name: 'Norte', _count: { Asset: 20, Certification: 15 } },
  ]);
});

describe('getPlatformHome', () => {
  it('aggregates across every organization, unscoped', async () => {
    const result = await getPlatformHome();

    expect(result).toMatchObject({
      stats: {
        organizationsCount: 3,
        companiesCount: 3,
        activeCompaniesCount: 2,
        totalAssets: 42,
        totalCertifications: 30,
        certifiedCertifications: 25,
        pendingCertifications: 2,
      },
      topOrganizations: [{ id: 'org-1', name: 'Norte', assets: 20, certifications: 15 }],
      pendingSignatures: [
        { companyId: 'c-1', companyName: 'Pendiente SA', organizationName: 'Norte', waitingSince: new Date('2026-09-01') },
      ],
    });
    expect(mockTrend).toHaveBeenCalledWith(null);
    expect(mockPrisma.company.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: { verificationStatus: 'WAITING' },
    }));
  });

  it('is refused to anyone but the superadmin', async () => {
    mockIsSuperAdmin.mockResolvedValue(false);
    expect(await getPlatformHome()).toBeNull();
    expect(mockPrisma.organization.count).not.toHaveBeenCalled();
  });
});
