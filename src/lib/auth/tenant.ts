import { cookies } from 'next/headers';
import { verifyAdminJWT } from './admin/jwt';
import { verifySuperAdminJWT } from './superadmin/jwt';
import { superadminAuthConfig } from './superadmin/config';
import { adminAuthConfig } from './admin/config';
import { prisma } from '@/lib/prisma';
import type { Scope } from '@/lib/scope';
import type { JWTPayload } from './shared/types';
import { verifyOrganizationJWT } from './organization/jwt';
import { organizationAuthConfig } from './organization/config';

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
   * Empresa de la cuenta (#20). NULL para SUPER_ADMIN, para la cuenta de la
   * organización y para una sesión sin empresa: el dashboard no opera sin ella
   * (ver `requireScope`).
   */
  companyId: string | null;
  
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
 * La empresa de una sesión. Las anteriores a la fase 2 de #20 no la llevan en
 * el JWT: se lee de la cuenta, que la tiene desde la migración.
 */
async function companyOf(payload: JWTPayload): Promise<string | null> {
  if (payload.companyId !== undefined) return payload.companyId;
  const user = await prisma.user.findUnique({ where: { id: payload.id }, select: { companyId: true } });
  return user?.companyId ?? null;
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
        companyId: await companyOf(payload),
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
        companyId: null,
        userRole: payload.role,
        userId: payload.id,
      };
    }
  }

  // La cuenta que opera una organización: su organización, sin empresa. Solo
  // vale para lo que ese panel hace con una empresa concreta y validada; nunca
  // para el ámbito del dashboard (`requireScope` la rechaza).
  const organizationToken = cookieStore.get(organizationAuthConfig.cookieName)?.value;
  if (organizationToken) {
    const payload = await verifyOrganizationJWT(organizationToken);
    if (payload) {
      return {
        organizationId: payload.organizationId,
        companyId: null,
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
        companyId: await companyOf(payload),
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

/**
 * El ámbito del dashboard: la organización y la empresa de la cuenta (#20).
 *
 * Falla sin empresa: sin ella no hay a qué restringir, y devolver la
 * organización entera sería abrirle datos que no son suyos. También rechaza a la
 * cuenta de la organización, que no usa el dashboard y accede a sus empresas
 * desde su panel, una a una.
 */
export async function requireScope(): Promise<Scope> {
  const tenant = await getCurrentTenant();

  if (!tenant.organizationId) {
    throw new TenantContextNotFoundError(
      "organizationId es requerido para esta operación"
    );
  }
  if (!tenant.companyId) {
    throw new TenantContextNotFoundError(
      "La cuenta no tiene empresa asignada"
    );
  }

  return { organizationId: tenant.organizationId, companyId: tenant.companyId };
}
