import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logout } from '../../auth';

// Mock Next.js modules
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('Auth - Logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete auth token and redirect', async () => {
    const { redirect } = await import('next/navigation');

    await logout();

    expect(redirect).toHaveBeenCalledWith('/dashboard/login');
  });
});
