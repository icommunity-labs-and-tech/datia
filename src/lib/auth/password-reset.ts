import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { mailgunService } from '@/lib/services/mailgun';

/**
 * Password recovery by email (#36).
 *
 * The link carries a random token that is stored only as its SHA-256 hash, so a
 * copy of the table cannot be turned into working links. It is single use and
 * short-lived, and asking for it never says whether the account exists.
 */

export const RESET_TOKEN_TTL_MINUTES = 60;
/** Requests for one account per hour: past this, the answer is the same, nothing is sent. */
export const RESET_REQUESTS_PER_HOUR = 3;
export const MIN_PASSWORD_LENGTH = 8;

const HOUR_MS = 60 * 60 * 1000;

export const hashResetToken = (token: string) => createHash('sha256').update(token).digest('hex');

export type PasswordResetFailure = 'invalid_token' | 'weak_password';

/**
 * Creates and sends a reset link when the email belongs to an active account.
 *
 * Returns nothing on purpose: the caller answers the same whatever happened, so
 * neither the answer nor its content reveals which addresses have an account.
 * The limit is counted in the database, not in memory: Cloud Run can run several
 * instances and a per-instance counter would let a caller multiply it.
 */
export async function requestPasswordReset(input: {
  email: string;
  appUrl: string;
  language?: 'es' | 'en';
  now?: Date;
}): Promise<void> {
  // As typed, like the login: accounts are matched by their exact address.
  const email = input.email.trim();
  if (!email) return;
  const now = input.now ?? new Date();

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, status: true, password: true },
  });
  // A pending account has no password to recover: it comes in through its
  // activation link.
  if (!user || user.status !== 'ACTIVE' || !user.password) return;

  const recent = await prisma.passwordResetToken.count({
    where: { userId: user.id, createdAt: { gt: new Date(now.getTime() - HOUR_MS) } },
  });
  if (recent >= RESET_REQUESTS_PER_HOUR) return;

  const token = randomBytes(32).toString('base64url');
  await prisma.passwordResetToken.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      tokenHash: hashResetToken(token),
      expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
    },
  });

  await mailgunService.sendPasswordResetEmail({
    recipientEmail: user.email,
    recipientName: user.name ?? user.email,
    appName: 'Datia',
    resetUrl: `${input.appUrl}/auth/reset-password?token=${encodeURIComponent(token)}`,
    expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
    appUrl: input.appUrl,
    language: input.language,
  });
}

/** Whether a link is still usable, so the page can say so before asking for a password. */
export async function isResetTokenValid(token: string, now: Date = new Date()): Promise<boolean> {
  if (!token) return false;
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    select: { usedAt: true, expiresAt: true },
  });
  return !!row && !row.usedAt && row.expiresAt > now;
}

/**
 * Sets the new password and spends the link, and every other one the account
 * had outstanding. Existing sessions are signed tokens with no server-side
 * state, so they run until they expire; only new logins use the new password.
 */
export async function resetPassword(input: {
  token: string;
  password: string;
  now?: Date;
}): Promise<{ success: true } | { success: false; error: PasswordResetFailure }> {
  const now = input.now ?? new Date();

  if (!input.password || input.password.length < MIN_PASSWORD_LENGTH) {
    return { success: false, error: 'weak_password' };
  }

  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(input.token ?? '') },
    select: { id: true, userId: true, usedAt: true, expiresAt: true },
  });
  if (!row || row.usedAt || row.expiresAt <= now) {
    return { success: false, error: 'invalid_token' };
  }

  const passwordHash = await hash(input.password, 10);

  // Spending the link is the guard: two requests with the same one race for the
  // update, and only the one that finds it unused goes on.
  const spent = await prisma.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: now },
    });
    if (claimed.count === 0) return false;

    await tx.user.update({ where: { id: row.userId }, data: { password: passwordHash, updatedAt: now } });
    await tx.passwordResetToken.updateMany({
      where: { userId: row.userId, usedAt: null },
      data: { usedAt: now },
    });
    return true;
  });

  return spent ? { success: true } : { success: false, error: 'invalid_token' };
}
