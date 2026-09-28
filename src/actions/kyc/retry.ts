"use server";

import { prisma } from "@/lib/prisma";
import { requireScope } from "@/lib/auth/tenant";
import { startCompanySignature } from "@/lib/kyc/create-company-signature";

export interface RetryCompanyKycResult {
  success: boolean;
  kycURL?: string | null;
  error?: string;
}

/**
 * Reintenta el KYC de la empresa de la sesión (#23), sustituyendo su firma
 * anterior por una nueva. Cada empresa reintenta la suya: no hay ya una sola
 * firma de organización que cubra a todas.
 */
export async function retryCompanyKyc(): Promise<RetryCompanyKycResult> {
  try {
    const scope = await requireScope();

    const company = await prisma.company.findUnique({
      where: { id: scope.companyId! },
      select: { id: true, name: true },
    });

    if (!company) {
      return {
        success: false,
        error: "Empresa no encontrada",
      };
    }

    // Siempre crear una nueva firma, sustituyendo la anterior (si existe)
    const signature = await startCompanySignature(company.name);

    await prisma.company.update({
      where: { id: company.id },
      data: {
        signatureID: signature.signatureID,
        kycURL: signature.kycURL,
        verificationStatus: signature.verificationStatus,
      },
    });

    return {
      success: true,
      kycURL: signature.kycURL,
    };
  } catch (error) {
    console.error("Error retrying company KYC:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al reintentar el proceso de KYC",
    };
  }
}
