export interface JWTPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string | null; // NULL para SUPER_ADMIN
  context: 'admin' | 'superadmin';
  iat?: number;
  exp?: number;
  [key: string]: any; // Para compatibilidad con jose
}

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  error?: string;
  token?: string;
}

export interface AuthConfig {
  jwtSecret: string;
  sessionDuration: number;
  cookieName: string;
  cookiePath: string;
  sameSite: 'strict' | 'lax' | 'none';
  rateLimitMax: number;
}

export type AuthContext = 'admin' | 'superadmin';
