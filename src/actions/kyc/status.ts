"use server";

import { prisma } from "@/lib/prisma";
import { requireScope } from "@/lib/auth/tenant";

export interface KycStatusResult {
  success: boolean;
  verificationStatus?: "NOT_VERIFIED" | "WAITING" | "VERIFIED" | "REJECTED";
  kycURL?: string | null;
  error?: string;
}

/**
 * Estado del KYC de la empresa de la sesión (#23). Se llama durante el
 * onboarding, cuando la activación ya ha abierto sesión; antes leía el de la
 * organización entera, con una sola firma para todas sus empresas.
 */
export async function checkKycStatus(): Promise<KycStatusResult> {
  try {
    const scope = await requireScope();

    const company = await prisma.company.findUnique({
      // requireScope ya garantiza que hay empresa: sin ella habría lanzado.
      where: { id: scope.companyId! },
      select: {
        verificationStatus: true,
        kycURL: true,
      },
    });

    if (!company) {
      return {
        success: false,
        error: "Empresa no encontrada",
      };
    }

    return {
      success: true,
      verificationStatus: company.verificationStatus,
      kycURL: company.kycURL,
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
