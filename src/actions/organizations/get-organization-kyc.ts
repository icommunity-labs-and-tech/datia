"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserWithDetails } from "@/lib/auth/shared/session";

export interface OrganizationKycInfo {
  verificationStatus: "NOT_VERIFIED" | "WAITING" | "VERIFIED" | "REJECTED";
  kycURL: string | null;
  signatureID: string | null;
  organizationName: string;
}

export interface GetOrganizationKycResult {
  success: boolean;
  kycInfo?: OrganizationKycInfo;
  error?: string;
}

/**
 * Obtiene la información del KYC de la organización del usuario actual
 */
export async function getOrganizationKyc(): Promise<GetOrganizationKycResult> {
  try {
    const user = await getCurrentUserWithDetails();
    
    if (!user?.id) {
      return {
        success: false,
        error: "Usuario no autenticado",
      };
    }

    // Obtener usuario con su organización
    const userWithOrg = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        organizationId: true,
        Organization: {
          select: {
            id: true,
            nombre: true,
            signatureID: true,
            kycURL: true,
            verificationStatus: true,
          },
        },
      },
    });

    if (!userWithOrg || !userWithOrg.Organization) {
      return {
        success: false,
        error: "Usuario sin organización asociada",
      };
    }

    return {
      success: true,
      kycInfo: {
        verificationStatus: userWithOrg.Organization.verificationStatus,
        kycURL: userWithOrg.Organization.kycURL,
        signatureID: userWithOrg.Organization.signatureID,
        organizationName: userWithOrg.Organization.nombre,
      },
    };
  } catch (error) {
    console.error("Error getting organization KYC:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al obtener información del KYC",
    };
  }
}
