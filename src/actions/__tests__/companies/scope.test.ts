import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, mockTenant, store } = vi.hoisted(() => ({
  mockPrisma: { company: { findFirst: vi.fn(), findMany: vi.fn() } },
  mockTenant: vi.fn(),
  store: { set: vi.fn(), delete: vi.fn() },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('next/headers', () => ({ cookies: async () => store }));
vi.mock('@/lib/auth/tenant', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/tenant')>('@/lib/auth/tenant');
  return { ...actual, getCurrentTenant: mockTenant };
});

import { getCompanySwitcher, setCompanyScope } from '@/actions/companies/scope';

const orgAccount = { organizationId: 'org-1', companyId: null, userRole: 'ORG_ADMIN', userId: 'u-org' };
const companyAccount = { organizationId: 'org-1', companyId: 'co-1', userRole: 'ADMIN', userId: 'u-co' };

beforeEach(() => {
  vi.clearAllMocks();
  mockTenant.mockResolvedValue(orgAccount);
});

describe('setCompanyScope', () => {
  it('remembers a company of the organization', async () => {
    mockPrisma.company.findFirst.mockResolvedValue({ id: 'co-2' });

    expect(await setCompanyScope('co-2')).toEqual({ success: true });
    expect(mockPrisma.company.findFirst.mock.calls[0][0].where).toEqual({ id: 'co-2', organizationId: 'org-1' });
    expect(store.set).toHaveBeenCalledWith('datia-company-scope', 'co-2', expect.objectContaining({ httpOnly: true, path: '/' }));
  });

  it('refuses a company of another organization', async () => {
    mockPrisma.company.findFirst.mockResolvedValue(null);

    expect(await setCompanyScope('co-ajena')).toEqual({ success: false });
    expect(store.set).not.toHaveBeenCalled();
  });

  it('goes back to all of them with null', async () => {
    expect(await setCompanyScope(null)).toEqual({ success: true });
    expect(store.delete).toHaveBeenCalledWith('datia-company-scope');
  });

  it('is refused to a company account', async () => {
    mockTenant.mockResolvedValue(companyAccount);

    expect(await setCompanyScope('co-2')).toEqual({ success: false });
    expect(store.set).not.toHaveBeenCalled();
  });
});

describe('getCompanySwitcher', () => {
  it('lists the active companies of the organization and the one in view', async () => {
    mockTenant.mockResolvedValue({ ...orgAccount, companyId: 'co-2' });
    mockPrisma.company.findMany.mockResolvedValue([{ id: 'co-2', name: 'Norte' }]);

    expect(await getCompanySwitcher()).toEqual({ companies: [{ id: 'co-2', name: 'Norte' }], current: 'co-2' });
    expect(mockPrisma.company.findMany.mock.calls[0][0].where).toEqual({ organizationId: 'org-1', active: true });
  });

  it('answers nothing to a company account, so its bar shows no selector', async () => {
    mockTenant.mockResolvedValue(companyAccount);
    expect(await getCompanySwitcher()).toBeNull();
    expect(mockPrisma.company.findMany).not.toHaveBeenCalled();
  });

  it('answers nothing without a session', async () => {
    mockTenant.mockRejectedValue(new Error('sin sesión'));
    expect(await getCompanySwitcher()).toBeNull();
  });
});
