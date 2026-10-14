import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * What the superadmin's "Certificaciones" nav item shows: proofs issued to
 * iBS but not yet confirmed on chain (`Certification.status = 'ISSUED'`),
 * across every organization — only the superadmin sees through all of them.
 */

const { mockPrisma, mockIsSuperAdmin } = vi.hoisted(() => ({
  mockPrisma: { certification: { findMany: vi.fn() } },
  mockIsSuperAdmin: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/auth/tenant', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/tenant')>('@/lib/auth/tenant');
  return { ...actual, isSuperAdmin: mockIsSuperAdmin };
});

import { listPendingCertifications } from '@/actions/certifications/list-pending';

beforeEach(() => {
  vi.clearAllMocks();
  mockIsSuperAdmin.mockResolvedValue(true);
});

describe('listPendingCertifications', () => {
  it('lists issued-but-unconfirmed certifications from any organization', async () => {
    const createdAt = new Date('2026-10-01');
    mockPrisma.certification.findMany.mockResolvedValue([
      {
        id: 'cert-1',
        evidenceId: 'ev-1',
        createdAt,
        Organization: { name: 'Norte' },
        Company: { name: 'Filial' },
        _count: { EmissionRecord: 3 },
      },
      {
        id: 'cert-2',
        evidenceId: 'ev-2',
        createdAt,
        Organization: { name: 'Sur' },
        Company: null,
        _count: { EmissionRecord: 1 },
      },
    ]);

    const result = await listPendingCertifications();

    expect(result).toEqual([
      { id: 'cert-1', evidenceId: 'ev-1', createdAt, organizationName: 'Norte', companyName: 'Filial', recordCount: 3 },
      { id: 'cert-2', evidenceId: 'ev-2', createdAt, organizationName: 'Sur', companyName: null, recordCount: 1 },
    ]);
    expect(mockPrisma.certification.findMany.mock.calls[0][0].where).toEqual({ status: 'ISSUED' });
  });

  it('is refused to anyone but the superadmin', async () => {
    mockIsSuperAdmin.mockResolvedValue(false);
    expect(await listPendingCertifications()).toEqual([]);
    expect(mockPrisma.certification.findMany).not.toHaveBeenCalled();
  });
});
