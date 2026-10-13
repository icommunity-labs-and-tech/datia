import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Whoever invites decides which company the account joins only if they operate
 * the organization (#20); anyone else invites into their own.
 */

const { tx, mockPrisma, mockSend, mockDefault } = vi.hoisted(() => {
  const tx = {
    user: { create: vi.fn(async ({ data }: any) => ({ ...data })), delete: vi.fn() },
    invitation: { create: vi.fn(async ({ data }: any) => ({ ...data })), delete: vi.fn() },
  };
  return {
    tx,
    mockPrisma: {
      user: { findUnique: vi.fn(async () => null), findFirst: vi.fn(async () => null) },
      invitation: { findFirst: vi.fn(async () => null) },
      organization: { findUnique: vi.fn(async () => ({ name: 'Datia' })) },
      company: { findFirst: vi.fn() },
      $transaction: vi.fn(async (fn: any) => fn(tx)),
    },
    mockSend: vi.fn(async () => undefined),
    mockDefault: vi.fn(async () => 'co-default'),
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/company', () => ({ defaultCompanyId: mockDefault }));
vi.mock('../../organizations/helpers', () => ({
  sendInvitationEmail: mockSend,
  buildActivationUrl: vi.fn(async (token: string) => `https://datia.test/auth/activate?token=${token}`),
}));

import { inviteAccount } from '../../organizations/invite-account';

const base = { email: 'ana@norte.test', name: 'Ana', role: 'ADMIN' as const };
const orgAccount = { organizationId: 'org-1', companyId: null, userRole: 'ORG_ADMIN', userId: 'u-org' };
const companyAccount = { organizationId: 'org-1', companyId: 'co-1', userRole: 'ADMIN', userId: 'u-co' };
const createdCompanyId = () => tx.user.create.mock.calls[0][0].data.companyId;

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.company.findFirst.mockResolvedValue({ id: 'co-2' });
});

describe('inviteUser: company of the invited account', () => {
  it('lets the organization account choose it, inside its organization', async () => {
    const result = await inviteAccount(orgAccount, { ...base, companyId: 'co-2', language: 'en' });

    expect(result.success).toBe(true);
    expect(mockPrisma.company.findFirst.mock.calls[0][0].where).toEqual({ id: 'co-2', organizationId: 'org-1' });
    expect(createdCompanyId()).toBe('co-2');
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ language: 'en' }));
  });

  it('refuses a company of another organization', async () => {
    mockPrisma.company.findFirst.mockResolvedValue(null);
    const result = await inviteAccount(orgAccount, { ...base, companyId: 'co-ajena' });

    expect(result).toMatchObject({ success: false, error: 'Empresa no encontrada' });
    expect(tx.user.create).not.toHaveBeenCalled();
  });

  it('refuses a company account choosing another company', async () => {
    const result = await inviteAccount(companyAccount, { ...base, companyId: 'co-2' });

    expect(result.success).toBe(false);
    expect(tx.user.create).not.toHaveBeenCalled();
  });

  it('files the account of a company inviter under the inviter company', async () => {
    await inviteAccount(companyAccount, base);
    expect(createdCompanyId()).toBe('co-1');
  });

  it('files an organization-level invitation without a choice under the default company', async () => {
    await inviteAccount(orgAccount, base);
    expect(createdCompanyId()).toBe('co-default');
  });

  it('never creates a higher role than a company account, whatever the client sends', async () => {
    for (const role of ['SUPER_ADMIN', 'ORG_ADMIN', '']) {
      const result = await inviteAccount(companyAccount, { ...base, role: role as 'ADMIN' });
      expect(result).toMatchObject({ success: false, error: 'Rol no válido' });
    }
    expect(tx.user.create).not.toHaveBeenCalled();
  });
});

describe('inviteUser: an email that already has an account', () => {
  it('says so when the account is in the same organization', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ organizationId: 'org-1' });
    const result = await inviteAccount(orgAccount, base);

    expect(result).toMatchObject({ success: false, error: 'El email "ana@norte.test" ya tiene una cuenta en el sistema' });
    expect(tx.user.create).not.toHaveBeenCalled();
  });

  it('says so too when the account is in another organization (#138: used to hide this, confused more than it protected)', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ organizationId: 'org-2' });
    const result = await inviteAccount(orgAccount, base);

    expect(result).toMatchObject({ success: false, error: 'El email "ana@norte.test" ya tiene una cuenta en el sistema' });
    expect(tx.user.create).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('says so for a platform account too, which has no organization at all', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ organizationId: null });
    const result = await inviteAccount(orgAccount, base);

    expect(result).toMatchObject({ success: false, error: 'El email "ana@norte.test" ya tiene una cuenta en el sistema' });
    expect(tx.user.create).not.toHaveBeenCalled();
  });
});

describe('inviteUser: one account per company (#141)', () => {
  it('refuses a second account when the target company already has one', async () => {
    mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 'u-existing' });
    const result = await inviteAccount(orgAccount, { ...base, companyId: 'co-2' });

    expect(result).toMatchObject({ success: false, error: 'Esta empresa ya tiene una cuenta. Solo puede tener una.' });
    expect(tx.user.create).not.toHaveBeenCalled();
  });

  it('checks the resolved company, not a literal match on the input', async () => {
    mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 'u-existing' });
    await inviteAccount(orgAccount, { ...base, companyId: 'co-2' });

    expect(mockPrisma.user.findFirst.mock.calls[0][0].where).toEqual({ companyId: 'co-2' });
  });

  it('lets the invitation through for a company with none yet', async () => {
    const result = await inviteAccount(orgAccount, { ...base, companyId: 'co-2' });
    expect(result.success).toBe(true);
  });
});

describe('inviteUser: Mailgun outage', () => {
  it('keeps the account and invitation when the email fails, and returns the activation link', async () => {
    mockSend.mockRejectedValueOnce(new Error('Mailgun API error 401: Unauthorized'));
    const result = await inviteAccount(orgAccount, base);

    expect(result.success).toBe(true);
    expect(result.emailSent).toBe(false);
    expect(result.activationUrl).toContain(result.invitation?.token);
    expect(tx.user.delete).not.toHaveBeenCalled();
    expect(tx.invitation.delete).not.toHaveBeenCalled();
  });
});
