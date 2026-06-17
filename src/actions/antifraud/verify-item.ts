'use server';

import { createAntifraudVerificationService } from '@/lib/services/antifraud';
import { createEvidenceService } from '@/lib/services/evidence';
import { icommunityService } from '@/infrastructure/icommunity/ICommunityServiceImpl';
import { antifraudRepository } from '@/infrastructure/repositories/antifraud-repository';
import { prisma } from '@/lib/prisma';

export interface VerifyItemResult {
  success: boolean;
  data?: {
    isFirstVerification: boolean;
    evidenceID?: string;
  };
  error?: string;
}

export async function verifyItemAntifalsificacion(
  itemId: string,
  metadata: {
    ipAddress?: string;
    userAgent?: string;
  } = {}
): Promise<VerifyItemResult> {
  try {
    // 1. Get item with organization using Prisma directly (no org context needed)
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        organizationId: true,
        antifraudEvidenceId: true,
      },
    });

    if (!item) {
      return {
        success: false,
        error: 'Item no encontrado',
      };
    }

    // If already verified, return status
    if (item.antifraudEvidenceId) {
      return {
        success: true,
        data: {
          isFirstVerification: false,
          evidenceID: item.antifraudEvidenceId === 'NO_SIGNATURE' ? undefined : item.antifraudEvidenceId,
        },
      };
    }

    // 2. Get organization's signatureID
    let signatureID: string | null = null;
    if (item.organizationId) {
      const organization = await prisma.organization.findUnique({
        where: { id: item.organizationId },
        select: { signatureID: true },
      });
      signatureID = organization?.signatureID ?? null;
    }

    // 3. Verify item using service
    console.log('[Antifraud] Starting verification for item:', itemId);
    console.log('[Antifraud] SignatureID:', signatureID ? 'present' : 'missing');
    console.log('[Antifraud] Metadata:', metadata);
    
    const evidenceService = createEvidenceService({ icommunityService });
    const antifraudService = createAntifraudVerificationService({
      evidenceService,
      antifraudRepository,
    });
    
    const result = await antifraudService.verifyItem(itemId, signatureID, metadata);
    console.log('[Antifraud] Verification result:', result);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('[Antifraud] Exception in verifyItemAntifalsificacion:', error);
    if (error instanceof Error) {
      console.error('[Antifraud] Error stack:', error.stack);
    }
    return {
      success: false,
      error: `Error al verificar item: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

