import { cookies } from 'next/headers';
import { verifyAdminJWT } from './admin/jwt';
import { verifySuperAdminJWT } from './superadmin/jwt';
import { superadminAuthConfig } from './superadmin/config';
import { adminAuthConfig } from './admin/config';

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

  // El token de admin va primero, y el orden importa: las dos sesiones usan
  // cookies distintas y pueden convivir en el mismo navegador. Un
  // superadministrador que además haya entrado al panel de una organización
  // lleva ambas, y resolviendo primero la de superadmin toda operación con
  // ámbito de organización quedaba sin organización y fallaba, aunque su sesión
  // de admin fuese perfectamente válida.
  //
  // Quien tiene sesión de admin está actuando sobre una organización concreta;
  // eso es lo que el ámbito necesita saber. Los privilegios de
  // superadministrador no se pierden: `isSuperAdmin` mira su propia cookie.
  const adminToken = cookieStore.get(adminAuthConfig.cookieName)?.value;
  if (adminToken) {
    const payload = await verifyAdminJWT(adminToken);
    if (payload?.organizationId) {
      return {
        organizationId: payload.organizationId,
        userRole: payload.role,
        userId: payload.id,
      };
    }
  }

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

  // Una sesión de admin sin organización: válida para identificar al usuario,
  // insuficiente para operar sobre datos de una organización.
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
  
  // Si no hay token válido, fallar
  throw new TenantContextNotFoundError(
    "No se pudo obtener el contexto del tenant. Token no válido o no presente."
  );
}

/**
 * Verifica si el usuario actual es SUPER_ADMIN
 */
export async function isSuperAdmin(): Promise<boolean> {
  // Mira su propia cookie en lugar de deducirlo del tenant: desde que el ámbito
  // de organización prefiere la sesión de admin, deducirlo de ahí le quitaría
  // los privilegios a un superadministrador que además tenga sesión de admin.
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(superadminAuthConfig.cookieName)?.value;
    if (!token) return false;
    const payload = await verifySuperAdminJWT(token);
    return payload?.role === 'SUPER_ADMIN';
  } catch {
    return false;
  }
}

/**
 * Obtiene el organizationId obligatorio (falla si es SUPER_ADMIN sin org especificada)
 *
 * Solo lee la sesión de la petición. Las rutas de la API autentican con token y
 * pasan la organización como parámetro: aquí hubo una variable de módulo para
 * eso, y la compartían todas las peticiones concurrentes de la instancia (#30).
 */
export async function requireOrganizationId(): Promise<string> {
  const tenant = await getCurrentTenant();
  
  if (!tenant.organizationId) {
    throw new TenantContextNotFoundError(
      "organizationId es requerido para esta operación"
    );
  }
  
  return tenant.organizationId;
}
