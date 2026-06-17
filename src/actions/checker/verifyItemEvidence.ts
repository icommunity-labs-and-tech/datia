'use server';

import { createVerificationServiceImpl } from '@/domain/verification/VerificationServiceImpl';
import { icommunityService } from '@/infrastructure/icommunity/ICommunityServiceImpl';
import { VerificationInputError, ItemNotFoundError, NoEvidenceError, BlockchainAPIError } from '@/domain/verification/errors';

/**
 * Verifica la evidencia de un item
 */
export async function verifyItemEvidence(itemId: string) {
  try {
    const verificationService = createVerificationServiceImpl({ icommunityService });
    return await verificationService.verifyItemEvidence(itemId);
  } catch (error) {
    if (error instanceof VerificationInputError || error instanceof ItemNotFoundError || error instanceof NoEvidenceError || error instanceof BlockchainAPIError) {
      return { status: 'no_evidence', message: error.message };
    }
    return { status: 'no_evidence', message: error instanceof Error ? error.message : 'Error desconocido' };
  }
}

