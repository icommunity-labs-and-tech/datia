import { headers, cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifiedIapEmail } from './iap';
import { verifySuperAdminJWT } from './jwt';
import { superadminAuthConfig } from './config';

export interface SuperAdminIdentity {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN';
}

/**
 * Who is signed in to the platform panel, now that IAP decides who can even
 * reach it rather than a password this app checks itself (#20 follow-up).
 *
 * In production, the Load Balancer in front of `/superadmin*` is the only way
 * in, and Google has already verified the caller before the request reaches
 * here — this only has to confirm that verified identity is a registered,
 * active SUPER_ADMIN, the same way every other login in this app refuses an
 * account that is the right role but not active.
 *
 * Outside production there is no IAP in front of the dev server, so this
 * falls back to the password session the login route still issues there —
 * same pattern `admin/config.ts` and `superadmin/config.ts` already use for
 * their JWT secrets: a production-only requirement, with dev kept simple.
 */
export async function currentSuperAdmin(): Promise<SuperAdminIdentity | null> {
  const email = await emailFromRequest();
  if (!email) return null;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true, status: true },
  });

  if (!user || user.role !== 'SUPER_ADMIN' || user.status !== 'ACTIVE') return null;

  return { id: user.id, email: user.email, name: user.name, role: 'SUPER_ADMIN' };
}

async function emailFromRequest(): Promise<string | null> {
  if (process.env.NODE_ENV === 'production') {
    const assertion = (await headers()).get('x-goog-iap-jwt-assertion');
    return verifiedIapEmail(assertion);
  }

  // Dev and e2e: no IAP sits in front of `next dev`, so this is the same
  // password-issued cookie the login route still sets outside production.
  const token = (await cookies()).get(superadminAuthConfig.cookieName)?.value;
  if (!token) return null;
  const payload = await verifySuperAdminJWT(token);
  return payload?.email ?? null;
}
