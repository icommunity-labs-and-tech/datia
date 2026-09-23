"use server";

import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export interface ActivateAccountInput {
  activationToken: string;
  password: string;
  skipKycCheck?: boolean; // Si es true, no verifica KYC antes de activar
}

export interface ActivateAccountResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId: string;
  };
  error?: string;
}

/**
 * Activa una cuenta de usuario estableciendo su contraseña
 */
export async function activateAccount(
  input: ActivateAccountInput
): Promise<ActivateAccountResult> {
  try {
    // Buscar usuario por token de activación
    const user = await prisma.user.findFirst({
      where: { activationToken: input.activationToken },
      include: {
        Organization: {
          select: {
            id: true,
            name: true,
            active: true,
            verificationStatus: true,
            User: {
              where: {
                role: "ADMIN",
              },
              orderBy: {
                createdAt: "asc",
              },
              select: {
                id: true,
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
    
    // Verificar que el usuario esté PENDING
    if (user.status !== "PENDING") {
      return {
        success: false,
        error: "Esta cuenta ya ha sido activada",
      };
    }
    
    // Verificar que el token no haya expirado
    if (user.activationExpiresAt && user.activationExpiresAt < new Date()) {
      return {
        success: false,
        error: "El token de activación ha expirado",
      };
    }
    
    // Verificar que la organización esté activa
    if (user.Organization && !user.Organization.active) {
      return {
        success: false,
        error: "La organización está desactivada",
      };
    }

    // El KYC ya no es obligatorio para activar la cuenta
    // Los usuarios pueden acceder al sistema sin tener el KYC aprobado
    
    // Hash de la contraseña
    const hashedPassword = await hash(input.password, 10);
    
    // Actualizar usuario
    const activatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        status: "ACTIVE",
        activatedAt: new Date(),
        activationToken: null, // Limpiar token
        activationExpiresAt: null,
      },
    });
    
    return {
      success: true,
      user: {
        id: activatedUser.id,
        email: activatedUser.email,
        name: activatedUser.name,
        role: activatedUser.role,
        organizationId: activatedUser.organizationId!,
      },
    };
  } catch (error) {
    console.error("Error activating account:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al activar la cuenta",
    };
  }
}






