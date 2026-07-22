const INSECURE_DEFAULT = 'superadmin-secret-key-change-in-production';

function getSecret(): string {
  const secret = process.env.SUPERADMIN_JWT_SECRET || INSECURE_DEFAULT;
  if (process.env.NODE_ENV === 'production' && secret === INSECURE_DEFAULT) {
    throw new Error('SUPERADMIN_JWT_SECRET must be set in production. Refusing to start.');
  }
  return secret;
}

export const superadminAuthConfig = {
  cookieName: 'superadmin-auth-token',
  get jwtSecret() { return getSecret(); },
  sessionDuration: 60 * 60 * 8, // 8 horas
} as const;

export const SUPERADMIN_REQUIRED_ROLE = 'SUPER_ADMIN' as const;





