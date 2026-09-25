import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({ mockPrisma: { certification: { findMany: vi.fn(async () => []) } } }));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { listCertifications } from '../queries';

beforeEach(() => vi.clearAllMocks());

describe('listCertifications', () => {
  it('reads the proofs of the company in the scope, newest first', async () => {
    await listCertifications({ organizationId: 'org-1', companyId: 'co-2' }, 25);

    expect(mockPrisma.certification.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', companyId: 'co-2' },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });
  });

  it('reads the whole organization when the scope has no company', async () => {
    await listCertifications({ organizationId: 'org-1', companyId: null });

    expect(mockPrisma.certification.findMany.mock.calls[0][0].where).toEqual({ organizationId: 'org-1' });
  });

  it('shapes a monthly proof by its aggregate and a single one by its own figure', async () => {
    const row = { id: 'c', status: 'CERTIFIED', hash: 'h', network: 'n', checkerUrl: null, certifiedAt: null, createdAt: new Date() };
    (mockPrisma.certification.findMany as any).mockResolvedValue([
      { ...row, payload: { period: 'Enero 2026', totalCo2eKg: 12.5, co2eKg: 1, readings: 31 } },
      { ...row, id: 'd', payload: { co2eKg: 0.4 } },
    ]);

    const [monthly, single] = await listCertifications({ organizationId: 'org-1', companyId: null });
    expect(monthly).toMatchObject({ period: 'Enero 2026', co2eKg: 12.5, readings: 31 });
    expect(single).toMatchObject({ period: null, co2eKg: 0.4, readings: null });
  });
});
