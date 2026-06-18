import { SignJWT, jwtVerify } from 'jose';
import { JWTPayload, AuthResult } from '../shared/types';
import { superadminAuthConfig } from './config';
import { authenticateUser, createAuthError } from '../shared/utils';

/**
 * Autentica un Super Admin
 */
export async function authenticateSuperAdmin(email: string, password: string): Promise<AuthResult> {
  const user = await authenticateUser(email, password);
  
  if (!user) {
    return createAuthError('Credenciales inválidas');
  }

  // Validar que sea SUPER_ADMIN
  if (user.role !== 'SUPER_ADMIN') {
    return createAuthError('Acceso denegado. Solo Super Administradores pueden acceder.');
  }

  const payload: JWTPayload = {
    ...user,
    context: 'superadmin',
  };

  const token = await signSuperAdminJWT(payload);

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
 * Firma un JWT para Super Admin
 */
export async function signSuperAdminJWT(payload: JWTPayload): Promise<string> {
  const secret = new TextEncoder().encode(superadminAuthConfig.jwtSecret);
  const now = Math.floor(Date.now() / 1000);
  const exp = now + superadminAuthConfig.sessionDuration;
  
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(new Date(exp * 1000))
    .setIssuer('datia-superadmin')
    .setAudience('datia-superadmin-panel')
    .sign(secret);
}

/**
 * Verifica un JWT de Super Admin
 */
export async function verifySuperAdminJWT(token: string): Promise<JWTPayload | null> {
  try {
    const secret = new TextEncoder().encode(superadminAuthConfig.jwtSecret);
    
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'datia-superadmin',
      audience: 'datia-superadmin-panel',
    });
    
    const decoded = payload as JWTPayload;
    
    // Validar que el token sea del contexto correcto
    if (decoded.context !== 'superadmin') {
      return null;
    }
    
    // Validar que sea SUPER_ADMIN
    if (decoded.role !== 'SUPER_ADMIN') {
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error('Super Admin JWT verification error:', error);
    return null;
  }
}





