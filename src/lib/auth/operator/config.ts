import { AuthConfig } from '../shared/types';

export const operatorAuthConfig: AuthConfig = {
  jwtSecret: process.env.OPERATOR_JWT_SECRET || process.env.JWT_SECRET || 'fallback-operator-secret',
  sessionDuration: parseInt(process.env.OPERATOR_SESSION_DURATION || '43200'), // 12 horas por defecto
  cookieName: 'operator-auth-token',
  cookiePath: '/',
  sameSite: 'lax', // Menos restrictivo para móvil
  rateLimitMax: parseInt(process.env.OPERATOR_RATE_LIMIT_MAX || '10'),
};

export const OPERATOR_REQUIRED_ROLE = 'USER'; // Los operadores tienen rol USER
