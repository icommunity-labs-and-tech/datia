"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserWithDetails } from "@/lib/auth/shared/session";
import { icommunityService } from "@/infrastructure/icommunity/ICommunityServiceImpl";

export interface RetryOrganizationKycResult {
  success: boolean;
  kycURL?: string | null;
  error?: string;
}

/**
 * Reintenta el proceso de KYC de la organización obteniendo una nueva URL
 */
export async function retryOrganizationKyc(): Promise<RetryOrganizationKycResult> {
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

    const organization = userWithOrg.Organization;

    // Obtener la URL base de la aplicación para los webhooks
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.APP_URL || 'http://localhost:3000';
    
    const okUrl = `${baseUrl}/api/hooks/signature/ok`;
    const koUrl = `${baseUrl}/api/hooks/signature/ko`;

    // Siempre crear una nueva firma, sustituyendo la anterior (si existe)
    const signatureResult = await icommunityService.createSignature(
      organization.nombre,
      okUrl,
      koUrl
    );

    // Actualizar organización con el nuevo signatureID y kycURL (sustituyendo el anterior)
    await prisma.organization.update({
      where: { id: organization.id },
      data: {
        signatureID: signatureResult.signature_id,
        kycURL: signatureResult.url || null,
        verificationStatus: signatureResult.signature_id ? 'WAITING' : 'NOT_VERIFIED',
      },
    });

    return {
      success: true,
      kycURL: signatureResult.url || null,
    };
  } catch (error) {
    console.error("Error retrying organization KYC:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al reintentar el proceso de KYC",
    };
  }
}
