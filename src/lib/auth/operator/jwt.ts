import { SignJWT, jwtVerify } from 'jose';
import { JWTPayload, AuthResult } from '../shared/types';
import { operatorAuthConfig } from './config';
import { authenticateUser, validateUserRole, createAuthError } from '../shared/utils';

/**
 * Autentica un usuario para el contexto operator
 */
export async function authenticateOperator(email: string, password: string): Promise<AuthResult> {
  const user = await authenticateUser(email, password);
  
  if (!user) {
    return createAuthError('Credenciales inválidas');
  }

  // Validar que sea operador (rol USER)
  if (!validateUserRole({ ...user, context: 'operator' }, 'operator')) {
    return createAuthError('Acceso denegado. Solo operadores pueden acceder a esta aplicación.');
  }

  const payload: JWTPayload = {
    ...user,
    context: 'operator',
  };

  const token = await signOperatorJWT(payload);

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
 * Firma un JWT para el contexto operator
 */
export async function signOperatorJWT(payload: JWTPayload): Promise<string> {
  const secret = new TextEncoder().encode(operatorAuthConfig.jwtSecret);
  const now = Math.floor(Date.now() / 1000);
  const exp = now + operatorAuthConfig.sessionDuration;
  
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(new Date(exp * 1000))
    .setIssuer('certypass-operator')
    .setAudience('certypass-operator-app')
    .sign(secret);
}

/**
 * Verifica un JWT del contexto operator
 */
export async function verifyOperatorJWT(token: string): Promise<JWTPayload | null> {
  try {
    const secret = new TextEncoder().encode(operatorAuthConfig.jwtSecret);
    
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'certypass-operator',
      audience: 'certypass-operator-app',
    });
    
    const decoded = payload as JWTPayload;
    
    // Validar que el token sea del contexto correcto
    if (decoded.context !== 'operator') {
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error('Operator JWT verification error:', error);
    return null;
  }
}
