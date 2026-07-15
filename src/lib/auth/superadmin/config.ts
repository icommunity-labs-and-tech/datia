const INSECURE_DEFAULT = 'superadmin-secret-key-change-in-production';
const secret = process.env.SUPERADMIN_JWT_SECRET || INSECURE_DEFAULT;

if (process.env.NODE_ENV === 'production' && secret === INSECURE_DEFAULT) {
  throw new Error('SUPERADMIN_JWT_SECRET must be set in production. Refusing to start.');
}

export const superadminAuthConfig = {
  cookieName: 'superadmin-auth-token',
  jwtSecret: secret,
  sessionDuration: 60 * 60 * 8, // 8 horas
} as const;

export const SUPERADMIN_REQUIRED_ROLE = 'SUPER_ADMIN' as const;





