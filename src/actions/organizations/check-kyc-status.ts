"use server";

import { prisma } from "@/lib/prisma";
import { requireOrganizationId } from "@/lib/auth/tenant";

export interface KycStatusResult {
  success: boolean;
  verificationStatus?: "NOT_VERIFIED" | "WAITING" | "VERIFIED" | "REJECTED";
  kycURL?: string | null;
  error?: string;
}

/**
 * Estado del KYC de la organización de la sesión. Se llama durante el
 * onboarding, cuando la activación ya ha abierto sesión; antes aceptaba
 * cualquier organizationId sin sesión y devolvía su kycURL.
 */
export async function checkKycStatus(): Promise<KycStatusResult> {
  try {
    const organizationIdToCheck = await requireOrganizationId();

    // Obtener estado de la organización
    const organization = await prisma.organization.findUnique({
      where: { id: organizationIdToCheck },
      select: {
        verificationStatus: true,
        kycURL: true,
      },
    });

    if (!organization) {
      return {
        success: false,
        error: "Organización no encontrada",
      };
    }

    return {
      success: true,
      verificationStatus: organization.verificationStatus,
      kycURL: organization.kycURL,
    };
  } catch (error) {
    console.error("Error checking KYC status:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al verificar estado de KYC",
    };
  }
}
