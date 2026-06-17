'use server';

import { createVerificationServiceImpl } from '@/domain/verification/VerificationServiceImpl';
import { icommunityService } from '@/infrastructure/icommunity/ICommunityServiceImpl';
import { VerificationInputError, ItemNotFoundError, BlockchainAPIError } from '@/domain/verification/errors';

/**
 * Verifica la cadena de custodia completa de un item (item + todos sus states)
 */
export async function verifyItemChainOfCustody(itemId: string) {
  try {
    const verificationService = createVerificationServiceImpl({ icommunityService });
    return await verificationService.verifyItemChainOfCustody(itemId);
  } catch (error) {
    if (error instanceof VerificationInputError || error instanceof ItemNotFoundError || error instanceof BlockchainAPIError) {
      return {
        itemVerification: { status: 'no_evidence', message: error.message },
        stateVerifications: [],
        chainConsistent: false,
        totalStates: 0,
        message: 'Error al verificar cadena de custodia',
      };
    }
    return {
      itemVerification: { status: 'no_evidence', message: error instanceof Error ? error.message : 'Error desconocido' },
      stateVerifications: [],
      chainConsistent: false,
      totalStates: 0,
      message: 'Error al verificar cadena de custodia',
    };
  }
}

