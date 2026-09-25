'use server';

import { headers } from 'next/headers';
import { getDynamicAppUrl } from '@/lib/env';
import { createRateLimiter } from '@/lib/auth/rate-limit';
import {
  requestPasswordReset,
  resetPassword,
  isResetTokenValid,
  type PasswordResetFailure,
} from '@/lib/auth/password-reset';

// Per address, as a second line behind the per-account limit in the database.
// It is per instance, so it only slows down a caller that hits one.
const checkRequestRate = createRateLimiter({ windowMs: 15 * 60 * 1000, maxAttempts: 10 });
const checkResetRate = createRateLimiter({ windowMs: 15 * 60 * 1000, maxAttempts: 10 });

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || 'unknown';
}

/**
 * Asks for a reset link. It answers the same for an address with an account, one
 * without, and one over its limit, and it does not wait for the email, so how
 * long it takes says nothing either.
 */
export async function requestPasswordResetAction(
  email: string,
  language: 'es' | 'en' = 'es'
): Promise<{ success: true } | { success: false; error: 'rate_limited' }> {
  if (!checkRequestRate(await clientIp()).allowed) {
    return { success: false, error: 'rate_limited' };
  }

  const appUrl = await getDynamicAppUrl();
  void requestPasswordReset({ email: String(email ?? ''), appUrl, language: language === 'en' ? 'en' : 'es' }).catch(
    (error) => console.error('[password-reset] request failed:', error)
  );

  return { success: true };
}

export async function checkResetTokenAction(token: string): Promise<boolean> {
  return isResetTokenValid(String(token ?? ''));
}

export async function resetPasswordAction(
  token: string,
  password: string
): Promise<{ success: true } | { success: false; error: PasswordResetFailure | 'rate_limited' }> {
  if (!checkResetRate(await clientIp()).allowed) {
    return { success: false, error: 'rate_limited' };
  }
  return resetPassword({ token: String(token ?? ''), password: String(password ?? '') });
}
