import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Companies are managed by the organization's own account and by nobody else
 * (#20): a company account cannot create its own siblings.
 */

const { mockPrisma, mockVerify, mockInvite } = vi.hoisted(() => ({
  mockPrisma: {
    company: { findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn() },
  },
  mockVerify: vi.fn(),
  mockInvite: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
// The organization account's own session: a cookie, verified as such.
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (name === 'organization-auth-token' ? { value: 'tok' } : undefined) }),
}));
vi.mock('@/lib/auth/organization/jwt', () => ({ verifyOrganizationJWT: mockVerify }));
vi.mock('@/actions/organizations/invite-account', () => ({ inviteAccount: mockInvite }));

import { createCompany } from '@/actions/companies/create';
import { listCompanies } from '@/actions/companies/list';
import { inviteCompanyAccount } from '@/actions/companies/invite';

const actor = { organizationId: 'org-1', companyId: null, userRole: 'ORG_ADMIN', userId: 'u-org' };

beforeEach(() => {
  vi.clearAllMocks();
  mockVerify.mockResolvedValue({ id: 'u-org', role: 'ORG_ADMIN', organizationId: 'org-1' });
  mockPrisma.company.findFirst.mockResolvedValue(null);
  // Like the real client with `select: { id, name }`.
  mockPrisma.company.create.mockImplementation(async ({ data }: any) => ({ id: 'co-new', name: data.name }));
  mockInvite.mockResolvedValue({ success: true });
});

describe('createCompany', () => {
  it('creates the company inside the organization of the account', async () => {
    const result = await createCompany({ name: '  Filial Norte ' });

    expect(result).toEqual({ success: true, company: { id: 'co-new', name: 'Filial Norte' } });
    expect(mockPrisma.company.create.mock.calls[0][0].data).toEqual({ organizationId: 'org-1', name: 'Filial Norte' });
    expect(mockInvite).not.toHaveBeenCalled();
  });

  it('invites its first account into it', async () => {
    const result = await createCompany({
      name: 'Filial Norte',
      admin: { name: 'Ana', email: 'ana@norte.test', language: 'en' },
    });

    expect(result.success).toBe(true);
    expect(mockInvite).toHaveBeenCalledWith(actor, {
      companyId: 'co-new',
      name: 'Ana',
      email: 'ana@norte.test',
      role: 'ADMIN',
      language: 'en',
    });
  });

  it('keeps the company when the invitation fails, and says so', async () => {
    mockInvite.mockResolvedValue({ success: false, error: 'Mailgun caído' });
    const result = await createCompany({ name: 'Filial', admin: { name: 'Ana', email: 'ana@norte.test' } });

    expect(result).toMatchObject({ success: true, inviteError: 'Mailgun caído', company: { id: 'co-new' } });
  });

  it('is refused to anyone without an organization session: a company account has none', async () => {
    mockVerify.mockResolvedValue(null);
    const result = await createCompany({ name: 'Hermana' });

    expect(result).toEqual({ success: false, error: 'forbidden' });
    expect(mockPrisma.company.create).not.toHaveBeenCalled();
  });

  it('needs a name', async () => {
    expect(await createCompany({ name: '   ' })).toEqual({ success: false, error: 'name_required' });
  });

  it('refuses half of an account and a malformed email', async () => {
    expect(await createCompany({ name: 'X', admin: { name: 'Ana', email: '' } })).toMatchObject({ error: 'email_invalid' });
    expect(await createCompany({ name: 'X', admin: { name: 'Ana', email: 'no-es-un-correo' } })).toMatchObject({ error: 'email_invalid' });
    expect(mockPrisma.company.create).not.toHaveBeenCalled();
  });

  it('accepts an empty account: it is optional', async () => {
    expect((await createCompany({ name: 'X', admin: { name: '', email: '' } })).success).toBe(true);
    expect(mockInvite).not.toHaveBeenCalled();
  });

  it('refuses a name already used in the organization', async () => {
    mockPrisma.company.findFirst.mockResolvedValue({ id: 'co-1' });
    expect(await createCompany({ name: 'Datia' })).toEqual({ success: false, error: 'name_taken' });
    expect(mockPrisma.company.findFirst.mock.calls[0][0].where).toEqual({ organizationId: 'org-1', name: 'Datia' });
  });

  it('answers a race for the same name like a taken one', async () => {
    mockPrisma.company.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    expect(await createCompany({ name: 'Datia' })).toEqual({ success: false, error: 'name_taken' });
  });
});

describe('listCompanies', () => {
  it('lists the companies of the organization with what each holds', async () => {
    mockPrisma.company.findMany.mockResolvedValue([
      { id: 'co-1', name: 'Datia', active: true, createdAt: new Date('2026-09-24'), _count: { Asset: 24, User: 26 } },
    ]);

    await expect(listCompanies()).resolves.toEqual([
      { id: 'co-1', name: 'Datia', active: true, createdAt: new Date('2026-09-24'), assets: 24, accounts: 26 },
    ]);
    expect(mockPrisma.company.findMany.mock.calls[0][0].where).toEqual({ organizationId: 'org-1' });
  });

  it('is refused without an organization session', async () => {
    mockVerify.mockResolvedValue(null);
    await expect(listCompanies()).rejects.toThrow();
    expect(mockPrisma.company.findMany).not.toHaveBeenCalled();
  });
});

describe('inviteCompanyAccount', () => {
  const input = { companyId: 'co-2', name: 'Ana', email: 'ana@norte.test' };

  it('invites into the chosen company', async () => {
    expect(await inviteCompanyAccount(input)).toEqual({ success: true });
    expect(mockInvite).toHaveBeenCalledWith(actor, expect.objectContaining({ companyId: 'co-2', role: 'ADMIN' }));
  });

  it('is refused without an organization session', async () => {
    mockVerify.mockResolvedValue(null);
    expect(await inviteCompanyAccount(input)).toEqual({ success: false, error: 'forbidden' });
    expect(mockInvite).not.toHaveBeenCalled();
  });

  it('passes on why the invitation failed', async () => {
    mockInvite.mockResolvedValue({ success: false, error: 'El email "ana@norte.test" ya está registrado' });
    expect(await inviteCompanyAccount(input)).toEqual({
      success: false,
      error: 'invite_failed',
      detail: 'El email "ana@norte.test" ya está registrado',
    });
  });

  it('checks the email', async () => {
    expect(await inviteCompanyAccount({ ...input, email: 'x' })).toEqual({ success: false, error: 'email_invalid' });
  });
});
