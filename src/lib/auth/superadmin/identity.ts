import { headers, cookies } from 'next/headers';
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
 * In production, the Load Balancer in front of `/admin*` is the only way
 * in, and Google has already verified the caller before the request reaches
 * here. This used to also require a matching, active SUPER_ADMIN row in
 * `User` — removed by explicit decision (#146 follow-up): IAP's own IAM
 * policy (`roles/iap.httpsResourceAccessor` on desarrollo@/founders@
 * icommunity.io) is now the access list, so platform access no longer needs
 * its own `User` row, and that row's email is free to be used for an
 * ordinary company account instead. If the IAM policy ever grows beyond
 * people who should have full platform access, this is the line that stops
 * doing anything about it.
 *
 * Outside production there is no IAP in front of the dev server, so this
 * falls back to the password session the login route still issues there —
 * `authenticateSuperAdmin` already checks role and status at login time,
 * so the JWT's own claims are enough without hitting the DB again here.
 */
export async function currentSuperAdmin(): Promise<SuperAdminIdentity | null> {
  if (process.env.NODE_ENV === 'production') {
    const assertion = (await headers()).get('x-goog-iap-jwt-assertion');
    const email = await verifiedIapEmail(assertion);
    if (!email) return null;
    return { id: email, email, name: email.split('@')[0], role: 'SUPER_ADMIN' };
  }

  // Dev and e2e: no IAP sits in front of `next dev`, so this is the same
  // password-issued cookie the login route still sets outside production.
  const token = (await cookies()).get(superadminAuthConfig.cookieName)?.value;
  if (!token) return null;
  const payload = await verifySuperAdminJWT(token);
  if (!payload) return null;

  return { id: payload.id, email: payload.email, name: payload.name, role: 'SUPER_ADMIN' };
}
