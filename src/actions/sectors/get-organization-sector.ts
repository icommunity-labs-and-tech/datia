"use server";

import { prisma } from "@/lib/prisma";
import { requireOrganizationId } from "@/lib/auth/tenant";

export interface OrganizationSectorResult {
  sectorSlug: string | null;
}

/**
 * Obtiene el sector de la organización actual.
 * Retorna null si no hay sesión válida o no hay sector asignado.
 */
export async function getOrganizationSector(): Promise<OrganizationSectorResult> {
  try {
    const organizationId = await requireOrganizationId();

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        Sector: {
          select: { slug: true },
        },
      },
    });

    return {
      sectorSlug: organization?.Sector?.slug ?? null,
    };
  } catch {
    return { sectorSlug: null };
  }
}
