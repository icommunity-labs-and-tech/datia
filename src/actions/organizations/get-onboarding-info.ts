"use server";

import { prisma } from "@/lib/prisma";

export interface OnboardingInfo {
  isFirstAdmin: boolean;
  /** Decides where activation lands: ORG_ADMIN has no dashboard, it has its own panel. */
  role: string;
  userName: string;
  organizationName: string;
  organizationId: string;
  companyId: string | null;
  companyName: string | null;
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
 * Obtiene información necesaria para el onboarding desde el token de
 * activación. Determina si el usuario es el primer administrador de su
 * empresa — solo una cuenta de empresa hace KYC (#23); la cuenta de
 * organización (ORG_ADMIN) no tiene empresa y nunca lo completa.
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
          },
        },
        Company: {
          select: {
            id: true,
            name: true,
            kycURL: true,
            verificationStatus: true,
            User: {
              where: {
                role: 'ADMIN',
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

    // Verificar si es el primer admin de su empresa
    // Es primer admin si:
    // 1. Es ADMIN (cuenta de empresa; ORG_ADMIN no tiene empresa)
    // 2. Es el primer usuario ADMIN creado en la empresa (ordenado por createdAt)
    const isFirstAdmin =
      user.role === 'ADMIN' &&
      user.Company !== null &&
      user.Company.User.length > 0 &&
      user.Company.User[0].id === user.id;

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
        role: user.role,
        userName: user.name,
        organizationName: user.Organization.name,
        organizationId: user.Organization.id,
        companyId: user.Company?.id ?? null,
        companyName: user.Company?.name ?? null,
        kycURL: user.Company?.kycURL ?? null,
        verificationStatus: user.Company?.verificationStatus ?? 'NOT_VERIFIED',
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
