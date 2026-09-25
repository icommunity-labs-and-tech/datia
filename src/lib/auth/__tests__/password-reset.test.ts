// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';
import { compare } from 'bcryptjs';

const { tx, mockPrisma, mockSend } = vi.hoisted(() => {
  const tx = {
    passwordResetToken: { updateMany: vi.fn() },
    user: { update: vi.fn() },
  };
  return {
    tx,
    mockPrisma: {
      user: { findUnique: vi.fn() },
      passwordResetToken: { count: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
      $transaction: vi.fn(async (fn: any) => fn(tx)),
    },
    mockSend: vi.fn(async () => undefined),
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/services/mailgun', () => ({ mailgunService: { sendPasswordResetEmail: mockSend } }));

import { requestPasswordReset, resetPassword, isResetTokenValid, hashResetToken } from '../password-reset';

const now = new Date('2026-09-25T10:00:00Z');
const active = { id: 'u-1', email: 'ana@x.test', name: 'Ana', status: 'ACTIVE', password: 'hash' };
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.user.findUnique.mockResolvedValue(active);
  mockPrisma.passwordResetToken.count.mockResolvedValue(0);
  mockPrisma.passwordResetToken.create.mockResolvedValue({});
  tx.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
});

describe('requestPasswordReset', () => {
  const ask = (email = 'ana@x.test') =>
    requestPasswordReset({ email, appUrl: 'https://datia.test', language: 'en', now });

  it('stores only the hash of the token it emails, valid for an hour', async () => {
    await ask();

    const stored = mockPrisma.passwordResetToken.create.mock.calls[0][0].data;
    const { resetUrl, expiresInMinutes, language } = (mockSend.mock.calls[0] as any[])[0];
    const token = new URL(resetUrl).searchParams.get('token')!;

    expect(resetUrl.startsWith('https://datia.test/auth/reset-password?token=')).toBe(true);
    expect(stored.tokenHash).toBe(sha(token));
    expect(JSON.stringify(stored)).not.toContain(token);
    expect(stored.expiresAt).toEqual(new Date('2026-09-25T11:00:00Z'));
    expect(expiresInMinutes).toBe(60);
    expect(language).toBe('en');
  });

  it('makes a different link each time', async () => {
    await ask();
    await ask();
    const [a, b] = mockSend.mock.calls.map((c: any[]) => c[0].resetUrl);
    expect(a).not.toBe(b);
  });

  it('does nothing for an address with no account', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await ask('nadie@x.test');

    expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('does nothing for a pending account: it comes in through its activation link', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...active, status: 'PENDING', password: null });
    await ask();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('does nothing past the hourly limit for that account', async () => {
    mockPrisma.passwordResetToken.count.mockResolvedValue(3);
    await ask();

    expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
    // The hour it counts is the one before now.
    expect(mockPrisma.passwordResetToken.count.mock.calls[0][0].where.createdAt.gt).toEqual(new Date('2026-09-25T09:00:00Z'));
  });

  it('looks the account up by the address as typed, trimmed', async () => {
    await ask('  ana@x.test ');
    expect(mockPrisma.user.findUnique.mock.calls[0][0].where).toEqual({ email: 'ana@x.test' });
  });

  it('ignores an empty address', async () => {
    await ask('   ');
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });
});

describe('isResetTokenValid', () => {
  it('accepts an unused, unexpired link', async () => {
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue({ usedAt: null, expiresAt: new Date('2026-09-25T10:30:00Z') });
    expect(await isResetTokenValid('t', now)).toBe(true);
    expect(mockPrisma.passwordResetToken.findUnique.mock.calls[0][0].where).toEqual({ tokenHash: hashResetToken('t') });
  });

  it.each([
    ['used', { usedAt: new Date(), expiresAt: new Date('2026-09-25T10:30:00Z') }],
    ['expired', { usedAt: null, expiresAt: new Date('2026-09-25T09:59:00Z') }],
    ['unknown', null],
  ])('refuses a %s link', async (_name, row) => {
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue(row);
    expect(await isResetTokenValid('t', now)).toBe(false);
  });

  it('refuses an empty token without asking', async () => {
    expect(await isResetTokenValid('')).toBe(false);
    expect(mockPrisma.passwordResetToken.findUnique).not.toHaveBeenCalled();
  });
});

describe('resetPassword', () => {
  const row = { id: 'r-1', userId: 'u-1', usedAt: null, expiresAt: new Date('2026-09-25T10:30:00Z') };
  const reset = (password = 'una-contraseña-larga') => resetPassword({ token: 'tok', password, now });

  beforeEach(() => mockPrisma.passwordResetToken.findUnique.mockResolvedValue(row));

  it('sets the password hashed, spends the link and every other outstanding one', async () => {
    expect(await reset()).toEqual({ success: true });

    const data = tx.user.update.mock.calls[0][0].data;
    expect(data.password).not.toBe('una-contraseña-larga');
    expect(await compare('una-contraseña-larga', data.password)).toBe(true);
    expect(tx.passwordResetToken.updateMany).toHaveBeenCalledWith({ where: { id: 'r-1', usedAt: null }, data: { usedAt: now } });
    expect(tx.passwordResetToken.updateMany).toHaveBeenCalledWith({ where: { userId: 'u-1', usedAt: null }, data: { usedAt: now } });
  });

  it('refuses a short password without touching anything', async () => {
    expect(await reset('corta')).toEqual({ success: false, error: 'weak_password' });
    expect(mockPrisma.passwordResetToken.findUnique).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it.each([
    ['unknown', null],
    ['used', { ...row, usedAt: new Date() }],
    ['expired', { ...row, expiresAt: new Date('2026-09-25T09:00:00Z') }],
  ])('refuses a %s link', async (_name, found) => {
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue(found);

    expect(await reset()).toEqual({ success: false, error: 'invalid_token' });
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('lets only one of two requests with the same link through', async () => {
    tx.passwordResetToken.updateMany.mockResolvedValueOnce({ count: 0 });

    expect(await reset()).toEqual({ success: false, error: 'invalid_token' });
    expect(tx.user.update).not.toHaveBeenCalled();
  });
});
