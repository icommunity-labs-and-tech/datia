import { AuthConfig } from '../shared/types';

const INSECURE_DEFAULT = 'fallback-admin-secret';

/**
 * Secret that signs and verifies admin sessions.
 *
 * Outside production it falls back to a fixed value so local development needs
 * no setup. In production that value would let anyone sign an admin session, so
 * it refuses instead, as the superadmin secret already does. Read lazily: the
 * build runs with NODE_ENV=production and no secrets.
 */
export function getAdminJwtSecret(): string {
  const secret = process.env.DASHBOARD_JWT_SECRET || process.env.JWT_SECRET || INSECURE_DEFAULT;
  if (process.env.NODE_ENV === 'production' && secret === INSECURE_DEFAULT) {
    throw new Error('DASHBOARD_JWT_SECRET or JWT_SECRET must be set in production. Refusing to use the default.');
  }
  return secret;
}

export const adminAuthConfig: AuthConfig = {
  get jwtSecret() { return getAdminJwtSecret(); },
  sessionDuration: parseInt(process.env.DASHBOARD_SESSION_DURATION || '28800'), // 8 horas por defecto
  cookieName: 'admin-auth-token',
  cookiePath: '/',
  sameSite: 'strict', // Más restrictivo para admin
  rateLimitMax: parseInt(process.env.DASHBOARD_RATE_LIMIT_MAX || '5'),
};

export const ADMIN_REQUIRED_ROLE = 'ADMIN';
