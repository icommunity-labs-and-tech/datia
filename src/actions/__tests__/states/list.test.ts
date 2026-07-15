import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth/tenant', () => ({
  requireOrganizationId: vi.fn().mockResolvedValue('test-org-id'),
}));

vi.mock('@/infrastructure/prisma/repositories/StateRepositoryPrisma', () => ({
  stateRepository: {
    list: vi.fn().mockResolvedValue([]),
  },
}));

import { getStates } from '../../states/list';

describe('States - Get States List', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array when no states exist', async () => {
    const result = await getStates();
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return array type', async () => {
    const result = await getStates();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle async execution', async () => {
    const result = await getStates();
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});
