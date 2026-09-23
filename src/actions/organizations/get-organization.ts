"use server";

import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/auth/tenant";

export interface OrgModuleConfig {
  passport?: boolean;
  energy?: boolean;
}

export interface OrganizationDetail {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  domain: string | null;
  settings: { modules?: OrgModuleConfig } | null;
  createdAt: Date;
  updatedAt: Date;
  userCount: number;
  itemCount: number;
  certificationCount: number;
  activeUsersCount: number;
  pendingUsersCount: number;
  adminActivated: boolean;
  adminEmail: string | null;
  adminName: string | null;
}

export interface GetOrganizationResult {
  success: boolean;
  organization?: OrganizationDetail;
  error?: string;
}

/**
 * Obtiene los detalles de una organización
 * Solo accesible por SUPER_ADMIN
 */
export async function getOrganizationById(id: string): Promise<GetOrganizationResult> {
  try {
    // Verificar que sea SUPER_ADMIN
    const superAdmin = await isSuperAdmin();
    
    if (!superAdmin) {
      throw new Error("Solo SUPER_ADMIN puede ver detalles de organizaciones");
    }
    
    // Obtener organización con detalles
    const organization = await prisma.organization.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        active: true,
        domain: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            User: true,
            Asset: true,
            Certification: true,
          },
        },
        User: {
          where: {
            role: 'ADMIN',
          },
          orderBy: {
            createdAt: 'asc',
          },
          take: 1,
          select: {
            status: true,
            email: true,
            name: true,
          },
        },
      },
    });
    
    if (!organization) {
      return {
        success: false,
        error: "Organización no encontrada",
      };
    }
    
    // Contar estados
    
    // Obtener conteos de usuarios por estado
    const userCounts = await prisma.user.groupBy({
      by: ['status'],
      where: {
        organizationId: id,
      },
      _count: {
        id: true,
      },
    });
    
    const activeCount = userCounts.find(c => c.status === 'ACTIVE')?._count.id || 0;
    const pendingCount = userCounts.find(c => c.status === 'PENDING')?._count.id || 0;
    
    const firstAdmin = organization.User[0];
    
    const result: OrganizationDetail = {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      active: organization.active,
      domain: organization.domain,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
      userCount: organization._count.User,
      itemCount: organization._count.Asset,
      certificationCount: organization._count.Certification,
      activeUsersCount: activeCount,
      pendingUsersCount: pendingCount,
      adminActivated: firstAdmin ? firstAdmin.status === 'ACTIVE' : false,
      adminEmail: firstAdmin?.email || null,
      adminName: firstAdmin?.name || null,
      settings: (organization.settings && typeof organization.settings === 'object')
        ? organization.settings as { modules?: OrgModuleConfig }
        : null,
    };
    
    return {
      success: true,
      organization: result,
    };
  } catch (error) {
    console.error("Error getting organization:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener la organización",
    };
  }
}

