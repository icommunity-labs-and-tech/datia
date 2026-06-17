import { AuthConfig } from '../shared/types';

export const adminAuthConfig: AuthConfig = {
  jwtSecret: process.env.DASHBOARD_JWT_SECRET || process.env.JWT_SECRET || 'fallback-admin-secret',
  sessionDuration: parseInt(process.env.DASHBOARD_SESSION_DURATION || '28800'), // 8 horas por defecto
  cookieName: 'admin-auth-token',
  cookiePath: '/',
  sameSite: 'strict', // Más restrictivo para admin
  rateLimitMax: parseInt(process.env.DASHBOARD_RATE_LIMIT_MAX || '5'),
};

export const ADMIN_REQUIRED_ROLE = 'ADMIN';
