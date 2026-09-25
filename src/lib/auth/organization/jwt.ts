import { SignJWT, jwtVerify } from 'jose';
import type { JWTPayload } from '../shared/types';
import { organizationAuthConfig, ORGANIZATION_REQUIRED_ROLE } from './config';

/** Signs the session of an organization account. */
export async function signOrganizationJWT(payload: JWTPayload): Promise<string> {
  const secret = new TextEncoder().encode(organizationAuthConfig.jwtSecret);
  const exp = Math.floor(Date.now() / 1000) + organizationAuthConfig.sessionDuration;

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(new Date(exp * 1000))
    .setIssuer('datia-organization')
    .setAudience('datia-organization-panel')
    .sign(secret);
}

/**
 * Verifies it: right issuer and audience, the organization context, the
 * organization role, and an organization to operate.
 */
export async function verifyOrganizationJWT(token: string): Promise<JWTPayload | null> {
  try {
    const secret = new TextEncoder().encode(organizationAuthConfig.jwtSecret);
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'datia-organization',
      audience: 'datia-organization-panel',
    });

    const decoded = payload as JWTPayload;
    if (decoded.context !== 'organization') return null;
    if (decoded.role !== ORGANIZATION_REQUIRED_ROLE) return null;
    if (!decoded.organizationId) return null;
    return decoded;
  } catch {
    return null;
  }
}
