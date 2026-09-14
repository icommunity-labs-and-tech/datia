import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applySignatureVerification } from '../signature-verification';
import { prisma } from '@/lib/prisma';
import { icommunityService } from '@/infrastructure/icommunity/ICommunityServiceImpl';

vi.mock('@/lib/prisma', () => ({
  prisma: { organization: { updateMany: vi.fn(async () => ({ count: 1 })) } },
}));

vi.mock('@/infrastructure/icommunity/ICommunityServiceImpl', () => ({
  icommunityService: { getSignature: vi.fn() },
}));

const SIG = 'sig_DkudvEreeP6kv4C8EMpwEK';
const getSignature = icommunityService.getSignature as ReturnType<typeof vi.fn>;
const updateMany = prisma.organization.updateMany as unknown as ReturnType<typeof vi.fn>;

describe('applySignatureVerification', () => {
  beforeEach(() => vi.clearAllMocks());

  it('verifies the organization when iBS reports success', async () => {
    getSignature.mockResolvedValueOnce({ id: SIG, status: 'success' });

    await expect(applySignatureVerification(SIG)).resolves.toBe(true);
    expect(getSignature).toHaveBeenCalledWith(SIG);
    expect(updateMany).toHaveBeenCalledWith({
      where: { signatureID: SIG, verificationStatus: { not: 'VERIFIED' } },
      data: { verificationStatus: 'VERIFIED' },
    });
  });

  it('rejects the organization when iBS reports failed', async () => {
    getSignature.mockResolvedValueOnce({ id: SIG, status: 'failed' });

    await expect(applySignatureVerification(SIG)).resolves.toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: { signatureID: SIG, verificationStatus: { not: 'REJECTED' } },
      data: { verificationStatus: 'REJECTED' },
    });
  });

  it.each(['created', 'pending', undefined])('writes nothing while the flow is %s', async (status) => {
    getSignature.mockResolvedValueOnce({ id: SIG, status });

    await expect(applySignatureVerification(SIG)).resolves.toBe(false);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('writes nothing for an id iBS does not know (empty 200)', async () => {
    getSignature.mockResolvedValueOnce({ id: '', name: '', created_at: '0001-01-01T00:00:00Z' });

    await expect(applySignatureVerification(SIG)).resolves.toBe(false);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('reports no change when the organization already had that status', async () => {
    getSignature.mockResolvedValueOnce({ id: SIG, status: 'success' });
    updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(applySignatureVerification(SIG)).resolves.toBe(false);
  });

  it('lets an iBS failure propagate so the webhook answers 500', async () => {
    getSignature.mockRejectedValueOnce(new Error('iBS down'));

    await expect(applySignatureVerification(SIG)).rejects.toThrow('iBS down');
    expect(updateMany).not.toHaveBeenCalled();
  });
});
