"use server";

import { prisma } from "@/lib/prisma";
import { isDashboardRole, isOrganizationRole } from '@/lib/auth/roles';

export interface OnboardingInfo {
  isFirstAdmin: boolean;
  userName: string;
  organizationName: string;
  organizationId: string;
  kycURL: string | null;
  verificationStatus: "NOT_VERIFIED" | "WAITING" | "VERIFIED" | "REJECTED";
  tokenValid: boolean;
  tokenExpired: boolean;
  alreadyActivated: boolean;
}

export interface GetOnboardingInfoResult {
  success: boolean;
  info?: OnboardingInfo;
  error?: string;
}

/**
 * Obtiene información necesaria para el onboarding desde el token de activación
 * Determina si el usuario es el primer admin y retorna información relevante
 */
export async function getOnboardingInfo(
  activationToken: string
): Promise<GetOnboardingInfoResult> {
  try {
    if (!activationToken) {
      return {
        success: false,
        error: "Token de activación requerido",
      };
    }

    // Buscar usuario por token de activación
    const user = await prisma.user.findFirst({
      where: { activationToken },
      include: {
        Organization: {
          select: {
            id: true,
            name: true,
            active: true,
            signatureID: true,
            kycURL: true,
            verificationStatus: true,
            User: {
              where: {
                role: { in: ['ADMIN', 'ORG_ADMIN'] },
              },
              orderBy: {
                createdAt: "asc",
              },
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return {
        success: false,
        error: "Token de activación inválido",
      };
    }

    // Verificar si el token ha expirado
    const tokenExpired =
      user.activationExpiresAt !== null &&
      user.activationExpiresAt < new Date();

    // Verificar si ya está activado
    const alreadyActivated = user.status === "ACTIVE" && user.password !== null;

    // Verificar si es el primer admin
    // Es primer admin si:
    // 1. Es ADMIN o ORG_ADMIN
    // 2. Es el primer usuario ADMIN creado en la organización (ordenado por createdAt)
    const isFirstAdmin =
      (isDashboardRole(user.role) || isOrganizationRole(user.role)) &&
      user.Organization !== null &&
      user.Organization.User.length > 0 &&
      user.Organization.User[0].id === user.id;

    if (!user.Organization) {
      return {
        success: false,
        error: "Usuario sin organización asociada",
      };
    }

    return {
      success: true,
      info: {
        isFirstAdmin,
        userName: user.name,
        organizationName: user.Organization.name,
        organizationId: user.Organization.id,
        kycURL: user.Organization.kycURL,
        verificationStatus: user.Organization.verificationStatus,
        tokenValid: true,
        tokenExpired,
        alreadyActivated,
      },
    };
  } catch (error) {
    console.error("Error getting onboarding info:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al obtener información de onboarding",
    };
  }
}
