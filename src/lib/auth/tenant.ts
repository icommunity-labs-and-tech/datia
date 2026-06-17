import { cookies } from 'next/headers';
import { verifyAdminJWT } from './admin/jwt';
import { verifyOperatorJWT } from './operator/jwt';
import { verifySuperAdminJWT } from './superadmin/jwt';
import { superadminAuthConfig } from './superadmin/config';
import { adminAuthConfig } from './admin/config';
import { operatorAuthConfig } from './operator/config';

/**
 * Contexto del tenant actual
 */
export interface TenantContext {
  /**
   * ID de la organización actual
   * NULL para SUPER_ADMIN que puede acceder a todas las organizaciones
   */
  organizationId: string | null;
  
  /**
   * Role del usuario actual
   */
  userRole: string;
  
  /**
   * ID del usuario actual
   */
  userId: string;
}

export class TenantContextNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantContextNotFoundError';
  }
}

/**
 * Obtiene el contexto del tenant actual desde el JWT o sesión
 */
export async function getCurrentTenant(): Promise<TenantContext> {
  const cookieStore = await cookies();
  
  // Verificar super admin token primero
  const superAdminToken = cookieStore.get(superadminAuthConfig.cookieName)?.value;
  if (superAdminToken) {
    const payload = await verifySuperAdminJWT(superAdminToken);
    if (payload) {
      return {
        organizationId: null, // SUPER_ADMIN no tiene organización
        userRole: payload.role,
        userId: payload.id,
      };
    }
  }
  
  // Verificar admin token
  const adminToken = cookieStore.get(adminAuthConfig.cookieName)?.value;
  if (adminToken) {
    const payload = await verifyAdminJWT(adminToken);
    if (payload) {
      return {
        organizationId: payload.organizationId,
        userRole: payload.role,
        userId: payload.id,
      };
    }
  }
  
  // Luego verificar operator token
  const operatorToken = cookieStore.get(operatorAuthConfig.cookieName)?.value;
  if (operatorToken) {
    const payload = await verifyOperatorJWT(operatorToken);
    if (payload) {
      return {
        organizationId: payload.organizationId,
        userRole: payload.role,
        userId: payload.id,
      };
    }
  }
  
  // Si no hay token válido, fallar
  throw new TenantContextNotFoundError(
    "No se pudo obtener el contexto del tenant. Token no válido o no presente."
  );
}

/**
 * Verifica si el usuario actual es SUPER_ADMIN
 */
export async function isSuperAdmin(): Promise<boolean> {
  try {
    const tenant = await getCurrentTenant();
    return tenant.userRole === 'SUPER_ADMIN';
  } catch {
    return false;
  }
}

// Thread-local storage for API routes
let apiOrganizationId: string | null = null;

/**
 * Establece el organizationId para el contexto actual (solo para API routes)
 * @internal
 */
export function setApiOrganizationId(orgId: string | null): void {
  apiOrganizationId = orgId;
}

/**
 * Obtiene el organizationId obligatorio (falla si es SUPER_ADMIN sin org especificada)
 */
export async function requireOrganizationId(): Promise<string> {
  // Check API context first (for API routes)
  if (apiOrganizationId) {
    return apiOrganizationId;
  }
  
  const tenant = await getCurrentTenant();
  
  if (!tenant.organizationId) {
    throw new TenantContextNotFoundError(
      "organizationId es requerido para esta operación"
    );
  }
  
  return tenant.organizationId;
}
