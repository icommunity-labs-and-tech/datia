import { describe, it, expect, vi, beforeEach } from 'vitest';

/** `deleteCompany` is the organization account's own reach: scoped to its organization (#138). */

const { mockVerify, mockCore } = vi.hoisted(() => ({ mockVerify: vi.fn(), mockCore: vi.fn() }));

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (name === 'organization-auth-token' ? { value: 'tok' } : undefined) }),
}));
vi.mock('@/lib/auth/organization/jwt', () => ({ verifyOrganizationJWT: mockVerify }));
vi.mock('@/actions/companies/delete-core', () => ({ deleteCompanyCore: mockCore }));

import { deleteCompany } from '@/actions/companies/delete';

beforeEach(() => {
  vi.clearAllMocks();
  mockVerify.mockResolvedValue({ id: 'u-org', role: 'ORG_ADMIN', organizationId: 'org-1' });
  mockCore.mockResolvedValue({ success: true });
});

describe('deleteCompany', () => {
  it('deletes a company scoped to its own organization', async () => {
    expect(await deleteCompany('co-1')).toEqual({ success: true });
    expect(mockCore).toHaveBeenCalledWith('co-1', 'org-1');
  });

  it('is refused without an organization session', async () => {
    mockVerify.mockResolvedValue(null);
    expect(await deleteCompany('co-1')).toMatchObject({ success: false });
    expect(mockCore).not.toHaveBeenCalled();
  });
});
