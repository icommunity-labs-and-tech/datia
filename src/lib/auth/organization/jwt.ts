import { SignJWT, jwtVerify } from 'jose';
import type { JWTPayload, AuthResult } from '../shared/types';
import { organizationAuthConfig, ORGANIZATION_REQUIRED_ROLE } from './config';
import { authenticateUser, createAuthError } from '../shared/utils';

/**
 * Authenticates the account that operates an organization. Split out of the
 * login the platform panel used to share with this one (#20): once each
 * panel has its own session, there is nothing left for them to share except
 * the password check itself.
 */
export async function authenticateOrganization(email: string, password: string): Promise<AuthResult> {
  const user = await authenticateUser(email, password);
  if (!user) return createAuthError('Credenciales inválidas');

  // Same message as a wrong password: a different one would confirm the
  // password was good for an account that cannot come in here.
  if (user.role !== ORGANIZATION_REQUIRED_ROLE || !user.organizationId) {
    return createAuthError('Credenciales inválidas');
  }

  const token = await signOrganizationJWT({ ...user, context: 'organization' });

  return {
    success: true,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    token,
  };
}

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
