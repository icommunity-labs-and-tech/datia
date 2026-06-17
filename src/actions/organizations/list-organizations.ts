"use server";

import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/auth/tenant";

export interface OrganizationListItem {
  id: string;
  nombre: string;
  slug: string;
  plan: string;
  activa: boolean;
  createdAt: Date;
  userCount: number;
  itemCount: number;
  stateCount: number;
  adminActivated: boolean;
  activeUsersCount: number;
  pendingUsersCount: number;
  sectorName: string | null;
}

export interface ListOrganizationsResult {
  success: boolean;
  organizations?: OrganizationListItem[];
  error?: string;
}

/**
 * Lista todas las organizaciones del sistema
 * Solo accesible por SUPER_ADMIN
 */
export async function listOrganizations(): Promise<ListOrganizationsResult> {
  try {
    // Verificar que sea SUPER_ADMIN
    const superAdmin = await isSuperAdmin();
    
    if (!superAdmin) {
      throw new Error("Solo SUPER_ADMIN puede listar organizaciones");
    }
    
    // Obtener todas las organizaciones con conteos
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        nombre: true,
        slug: true,
        plan: true,
        activa: true,
        createdAt: true,
        Sector: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            User: true,
            Item: true,
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
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    // Obtener conteos de usuarios por estado para cada organización
    const orgIds = organizations.map(org => org.id);
    const userCountsByStatus = await prisma.user.groupBy({
      by: ['organizationId', 'status'],
      where: {
        organizationId: {
          in: orgIds,
        },
      },
      _count: {
        id: true,
      },
    });
    
    // Crear un mapa de conteos por organización y estado
    const countsMap = new Map<string, { active: number; pending: number }>();
    for (const orgId of orgIds) {
      countsMap.set(orgId, { active: 0, pending: 0 });
    }
    
    userCountsByStatus.forEach(({ organizationId, status, _count }) => {
      const counts = countsMap.get(organizationId!);
      if (counts) {
        if (status === 'ACTIVE') {
          counts.active = _count.id;
        } else if (status === 'PENDING') {
          counts.pending = _count.id;
        }
      }
    });
    
    const result: OrganizationListItem[] = organizations.map((org) => {
      // Contar estados sumando los estados de todos los items
      const stateCount = org.Item.reduce((sum, item) => sum + item._count.State, 0);
      
      // Verificar si el primer admin ha activado su cuenta
      const firstAdmin = org.User[0];
      const adminActivated = firstAdmin ? firstAdmin.status === 'ACTIVE' : false;
      
      // Obtener conteos de usuarios por estado
      const counts = countsMap.get(org.id) || { active: 0, pending: 0 };
      
      return {
        id: org.id,
        nombre: org.nombre,
        slug: org.slug,
        plan: org.plan,
        activa: org.activa,
        createdAt: org.createdAt,
        userCount: org._count.User,
        itemCount: org._count.Item,
        stateCount,
        adminActivated,
        activeUsersCount: counts.active,
        pendingUsersCount: counts.pending,
        sectorName: org.Sector?.name ?? null,
      };
    });
    
    return {
      success: true,
      organizations: result,
    };
  } catch (error) {
    console.error("Error listing organizations:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al listar organizaciones",
      organizations: [],
    };
  }
}

