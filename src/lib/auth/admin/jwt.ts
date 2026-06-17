import { SignJWT, jwtVerify } from 'jose';
import { JWTPayload, AuthResult } from '../shared/types';
import { adminAuthConfig } from './config';
import { authenticateUser, validateUserRole, createAuthError } from '../shared/utils';

/**
 * Autentica un usuario para el contexto admin (dashboard)
 */
export async function authenticateAdmin(email: string, password: string): Promise<AuthResult> {
  const user = await authenticateUser(email, password);
  
  if (!user) {
    return createAuthError('Credenciales inválidas');
  }

  // Validar que sea admin
  if (!validateUserRole({ ...user, context: 'admin' }, 'admin')) {
    return createAuthError('Acceso denegado. Solo administradores pueden acceder al dashboard.');
  }

  const payload: JWTPayload = {
    ...user,
    context: 'admin',
  };

  const token = await signAdminJWT(payload);

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    token,
  };
}

/**
 * Firma un JWT para el contexto admin
 */
export async function signAdminJWT(payload: JWTPayload): Promise<string> {
  const secret = new TextEncoder().encode(adminAuthConfig.jwtSecret);
  const now = Math.floor(Date.now() / 1000);
  const exp = now + adminAuthConfig.sessionDuration;
  
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(new Date(exp * 1000))
    .setIssuer('certypass-admin')
    .setAudience('certypass-dashboard')
    .sign(secret);
}

/**
 * Verifica un JWT del contexto admin
 */
export async function verifyAdminJWT(token: string): Promise<JWTPayload | null> {
  try {
    const secret = new TextEncoder().encode(adminAuthConfig.jwtSecret);
    
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'certypass-admin',
      audience: 'certypass-dashboard',
    });
    
    const decoded = payload as JWTPayload;
    
    // Validar que el token sea del contexto correcto
    if (decoded.context !== 'admin') {
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error('Admin JWT verification error:', error);
    return null;
  }
}
