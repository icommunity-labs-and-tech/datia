"use server";

import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/auth/tenant";

export interface OrgModuleConfig {
  passport?: boolean;
  energy?: boolean;
}

export interface OrganizationDetail {
  id: string;
  nombre: string;
  slug: string;
  activa: boolean;
  dominio: string | null;
  configuracion: { modules?: OrgModuleConfig } | null;
  createdAt: Date;
  updatedAt: Date;
  userCount: number;
  itemCount: number;
  stateCount: number;
  categoryCount: number;
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
        nombre: true,
        slug: true,
        activa: true,
        dominio: true,
        configuracion: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            User: true,
            Item: true,
            Category: true,
          },
        },
        Item: {
          select: {
            _count: {
              select: {
                State: true,
              },
            },
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
    const stateCount = organization.Item.reduce((sum, item) => sum + item._count.State, 0);
    
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
      nombre: organization.nombre,
      slug: organization.slug,
      activa: organization.activa,
      dominio: organization.dominio,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
      userCount: organization._count.User,
      itemCount: organization._count.Item,
      categoryCount: organization._count.Category,
      stateCount,
      activeUsersCount: activeCount,
      pendingUsersCount: pendingCount,
      adminActivated: firstAdmin ? firstAdmin.status === 'ACTIVE' : false,
      adminEmail: firstAdmin?.email || null,
      adminName: firstAdmin?.name || null,
      configuracion: (organization.configuracion && typeof organization.configuracion === 'object')
        ? organization.configuracion as { modules?: OrgModuleConfig }
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

