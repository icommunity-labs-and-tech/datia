/**
 * Configuración de autenticación para Super Admin
 */

export const superadminAuthConfig = {
  cookieName: 'superadmin-auth-token',
  jwtSecret: process.env.SUPERADMIN_JWT_SECRET || 'superadmin-secret-key-change-in-production',
  sessionDuration: 60 * 60 * 8, // 8 horas
} as const;

export const SUPERADMIN_REQUIRED_ROLE = 'SUPER_ADMIN' as const;





