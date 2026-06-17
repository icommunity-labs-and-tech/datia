import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyItemAntifalsificacion } from '@/actions/antifraud/verify-item';
import { prisma } from '@/lib/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    item: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock Effect services
vi.mock('@/lib/effects/antifraud/implementation', () => ({
  AntifraudVerificationServiceLive: {
    pipe: vi.fn(),
  },
}));

describe('verifyItemAntifalsificacion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error if item not found', async () => {
    (prisma.item.findUnique as any).mockResolvedValue(null);

    const result = await verifyItemAntifalsificacion('non-existent-id');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Item no encontrado');
  });

  it('should return false for already verified item', async () => {
    (prisma.item.findUnique as any).mockResolvedValue({
      id: 'test-id',
      createdByUserId: 'user-id',
      antifraudEvidenceId: 'evidence-id-123',
    });

    const result = await verifyItemAntifalsificacion('test-id');

    expect(result.success).toBe(true);
    expect(result.data?.isFirstVerification).toBe(false);
    expect(result.data?.evidenceID).toBe('evidence-id-123');
  });

  it('should handle NO_SIGNATURE evidence ID', async () => {
    (prisma.item.findUnique as any).mockResolvedValue({
      id: 'test-id',
      createdByUserId: 'user-id',
      antifraudEvidenceId: 'NO_SIGNATURE',
    });

    const result = await verifyItemAntifalsificacion('test-id');

    expect(result.success).toBe(true);
    expect(result.data?.isFirstVerification).toBe(false);
    expect(result.data?.evidenceID).toBeUndefined();
  });
});

