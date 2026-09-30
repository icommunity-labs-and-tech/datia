import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applySignatureVerification } from '../signature-verification';
import { prisma } from '@/lib/prisma';
import { icommunityService } from '@/infrastructure/icommunity/ICommunityServiceImpl';
import { notifyCompany } from '@/lib/notifications/notify';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    company: {
      findMany: vi.fn(async () => [{ id: 'co-1', organizationId: 'org-1' }]),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
  },
}));

vi.mock('@/infrastructure/icommunity/ICommunityServiceImpl', () => ({
  icommunityService: { getSignature: vi.fn() },
}));

vi.mock('@/lib/notifications/notify', () => ({
  notifyCompany: vi.fn(async () => undefined),
}));

const SIG = 'sig_DkudvEreeP6kv4C8EMpwEK';
const getSignature = icommunityService.getSignature as ReturnType<typeof vi.fn>;
const findMany = prisma.company.findMany as unknown as ReturnType<typeof vi.fn>;
const updateMany = prisma.company.updateMany as unknown as ReturnType<typeof vi.fn>;
const notifyCompanyMock = notifyCompany as ReturnType<typeof vi.fn>;

describe('applySignatureVerification', () => {
  beforeEach(() => vi.clearAllMocks());

  it('verifies the company when iBS reports success', async () => {
    getSignature.mockResolvedValueOnce({ id: SIG, status: 'success' });
    findMany.mockResolvedValueOnce([{ id: 'co-1', organizationId: 'org-1' }]);

    await expect(applySignatureVerification(SIG)).resolves.toBe(true);
    expect(getSignature).toHaveBeenCalledWith(SIG);
    expect(updateMany).toHaveBeenCalledWith({
      where: { signatureID: SIG, verificationStatus: { not: 'VERIFIED' } },
      data: { verificationStatus: 'VERIFIED' },
    });
    expect(notifyCompanyMock).toHaveBeenCalledWith(
      'org-1',
      'co-1',
      expect.objectContaining({ type: 'SUCCESS', data: { companyId: 'co-1' } })
    );
  });

  it('rejects the company when iBS reports failed', async () => {
    getSignature.mockResolvedValueOnce({ id: SIG, status: 'failed' });
    findMany.mockResolvedValueOnce([{ id: 'co-1', organizationId: 'org-1' }]);

    await expect(applySignatureVerification(SIG)).resolves.toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: { signatureID: SIG, verificationStatus: { not: 'REJECTED' } },
      data: { verificationStatus: 'REJECTED' },
    });
    expect(notifyCompanyMock).toHaveBeenCalledWith(
      'org-1',
      'co-1',
      expect.objectContaining({ type: 'ERROR', data: { companyId: 'co-1' } })
    );
  });

  it.each(['created', 'pending', undefined])('writes nothing while the flow is %s', async (status) => {
    getSignature.mockResolvedValueOnce({ id: SIG, status });

    await expect(applySignatureVerification(SIG)).resolves.toBe(false);
    expect(updateMany).not.toHaveBeenCalled();
    expect(notifyCompanyMock).not.toHaveBeenCalled();
  });

  it('writes nothing for an id iBS does not know (empty 200)', async () => {
    getSignature.mockResolvedValueOnce({ id: '', name: '', created_at: '0001-01-01T00:00:00Z' });

    await expect(applySignatureVerification(SIG)).resolves.toBe(false);
    expect(updateMany).not.toHaveBeenCalled();
    expect(notifyCompanyMock).not.toHaveBeenCalled();
  });

  it('reports no change and does not notify when the company already had that status', async () => {
    getSignature.mockResolvedValueOnce({ id: SIG, status: 'success' });
    findMany.mockResolvedValueOnce([]);

    await expect(applySignatureVerification(SIG)).resolves.toBe(false);
    expect(updateMany).not.toHaveBeenCalled();
    expect(notifyCompanyMock).not.toHaveBeenCalled();
  });

  it('lets an iBS failure propagate so the webhook answers 500', async () => {
    getSignature.mockRejectedValueOnce(new Error('iBS down'));

    await expect(applySignatureVerification(SIG)).rejects.toThrow('iBS down');
    expect(findMany).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('notifies every company sharing the signature, not just the first', async () => {
    getSignature.mockResolvedValueOnce({ id: SIG, status: 'success' });
    findMany.mockResolvedValueOnce([
      { id: 'co-1', organizationId: 'org-1' },
      { id: 'co-2', organizationId: 'org-2' },
    ]);

    await applySignatureVerification(SIG);

    expect(notifyCompanyMock).toHaveBeenCalledTimes(2);
    expect(notifyCompanyMock).toHaveBeenCalledWith('org-1', 'co-1', expect.anything());
    expect(notifyCompanyMock).toHaveBeenCalledWith('org-2', 'co-2', expect.anything());
  });
});
