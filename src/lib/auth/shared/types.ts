export interface JWTPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string | null; // NULL para SUPER_ADMIN
  /** Empresa de la cuenta (#20). Ausente en las sesiones anteriores a la fase 2. */
  companyId?: string | null;
  context: 'admin' | 'superadmin' | 'organization';
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

export type AuthContext = 'admin' | 'superadmin' | 'organization';
