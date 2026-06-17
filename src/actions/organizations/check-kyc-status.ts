"use server";

import { prisma } from "@/lib/prisma";

export interface KycStatusResult {
  success: boolean;
  verificationStatus?: "NOT_VERIFIED" | "WAITING" | "VERIFIED" | "REJECTED";
  kycURL?: string | null;
  error?: string;
}

/**
 * Verifica el estado actual del KYC de una organización
 * Puede recibir organizationId o activationToken
 */
export async function checkKycStatus(
  organizationId?: string,
  activationToken?: string
): Promise<KycStatusResult> {
  try {
    let organizationIdToCheck: string | null = null;

    // Si se proporciona organizationId, usarlo directamente
    if (organizationId) {
      organizationIdToCheck = organizationId;
    }
    // Si se proporciona activationToken, obtener organizationId del usuario
    else if (activationToken) {
      const user = await prisma.user.findFirst({
        where: { activationToken },
        select: {
          organizationId: true,
        },
      });

      if (!user || !user.organizationId) {
        return {
          success: false,
          error: "Token de activación inválido o usuario sin organización",
        };
      }

      organizationIdToCheck = user.organizationId;
    } else {
      return {
        success: false,
        error: "Se requiere organizationId o activationToken",
      };
    }

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
