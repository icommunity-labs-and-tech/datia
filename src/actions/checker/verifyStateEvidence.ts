'use server';

import { createVerificationServiceImpl } from '@/domain/verification/VerificationServiceImpl';
import { icommunityService } from '@/infrastructure/icommunity/ICommunityServiceImpl';
import { VerificationInputError, StateNotFoundError, NoEvidenceError, BlockchainAPIError } from '@/domain/verification/errors';

/**
 * Verifica la evidencia de un state
 */
export async function verifyStateEvidence(stateId: string) {
  try {
    const verificationService = createVerificationServiceImpl({ icommunityService });
    return await verificationService.verifyStateEvidence(stateId);
  } catch (error) {
    if (error instanceof VerificationInputError || error instanceof StateNotFoundError || error instanceof NoEvidenceError || error instanceof BlockchainAPIError) {
      return { status: 'no_evidence', message: error.message };
    }
    return { status: 'no_evidence', message: error instanceof Error ? error.message : 'Error desconocido' };
  }
}

