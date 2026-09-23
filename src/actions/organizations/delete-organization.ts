"use server";

import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/auth/tenant";

export interface DeleteOrganizationResult {
  success: boolean;
  error?: string;
}

/**
 * Elimina una organización y todos sus datos asociados
 * Solo accesible por SUPER_ADMIN
 */
export async function deleteOrganization(id: string): Promise<DeleteOrganizationResult> {
  try {
    // Verificar que sea SUPER_ADMIN
    const superAdmin = await isSuperAdmin();
    
    if (!superAdmin) {
      throw new Error("Solo SUPER_ADMIN puede eliminar organizaciones");
    }
    
    // Verificar que la organización existe
    const organization = await prisma.organization.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
      },
    });
    
    if (!organization) {
      return {
        success: false,
        error: "Organización no encontrada",
      };
    }
    
    // Eliminar la organización (las relaciones están configuradas con onDelete: Cascade)
    // Esto eliminará automáticamente: users, categories, items, states, invitations, etc.
    await prisma.organization.delete({
      where: { id },
    });
    
    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting organization:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al eliminar la organización",
    };
  }
}

