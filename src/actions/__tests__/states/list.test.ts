import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStates } from '../../states/list';
// Mock removed - Effect.ts has been eliminated

describe('States - Get States List', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array (current implementation)', async () => {
    const result = await getStates();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return array type', async () => {
    const result = await getStates();

    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle async execution', async () => {
    // This test verifies that the async function runs without errors
    const result = await getStates();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});
