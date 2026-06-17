import type { VerificationResult } from '../antifraud/types';
import type { EvidenceService } from './evidence';
export type { VerificationResult } from '../antifraud/types';
import type { AntifraudRepository } from '@/infrastructure/repositories/antifraud-repository';

export interface AntifraudVerificationService {
  verifyItem(
    itemId: string,
    signatureID: string | null,
    metadata: {
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<VerificationResult>;
}
import { ItemNotFoundError, NoCreatorSignatureError, EvidenceCreationError } from '@/domain/antifraud/errors';

export function createAntifraudVerificationService(deps: {
  evidenceService: EvidenceService;
  antifraudRepository: AntifraudRepository;
}): AntifraudVerificationService {
  const { evidenceService: evidence, antifraudRepository: repository } = deps;

  return {
    async verifyItem(
      itemId: string,
      signatureID: string | null,
      metadata: {
        ipAddress?: string;
        userAgent?: string;
      }
    ): Promise<VerificationResult> {
      try {
        // 1. Check current verification status
        const currentEvidenceId = await repository.getVerificationStatus(itemId);

        // If already verified, return false
        if (currentEvidenceId !== null) {
          return {
            isFirstVerification: false,
            evidenceID: currentEvidenceId === 'NO_SIGNATURE' ? undefined : currentEvidenceId,
          } satisfies VerificationResult;
        }

        // 2. If no signatureID, mark as verified without evidence
        if (!signatureID) {
          try {
            await repository.verifyAndRegister(itemId, 'NO_SIGNATURE');
          } catch (e) {
            throw new EvidenceCreationError(
              itemId,
              `Failed to register verification: ${e}`,
              e
            );
          }
          return {
            isFirstVerification: true,
            evidenceID: undefined,
          } satisfies VerificationResult;
        }

        // 3. Create evidence in IBS
        const verificationDate = new Date().toISOString();
        console.log('[Antifraud] Creating evidence in IBS for item:', itemId);
        console.log('[Antifraud] Using signatureID:', signatureID);
        
        let evidenceID: string;
        try {
          evidenceID = await evidence.createEvidence({
            signatureID,
            title: 'Verificación Antifalsificación',
            description: `Primera verificación del producto ${itemId}`,
            imageUrls: [],
            metadata: {
              type: 'antifraud_verification',
              itemId,
              verificationDate,
              ipAddress: metadata.ipAddress,
              userAgent: metadata.userAgent,
              verificationType: 'first_scan',
            },
          });
          console.log('[Antifraud] Evidence created successfully, ID:', evidenceID);
        } catch (e) {
          console.error('[Antifraud] Error creating evidence:', e);
          throw new EvidenceCreationError(
            itemId,
            `Failed to create evidence: ${e}`,
            e
          );
        }

        // 4. Save evidence ID to item
        console.log('[Antifraud] Saving evidence ID to database:', evidenceID);
        try {
          await repository.verifyAndRegister(itemId, evidenceID);
          console.log('[Antifraud] Evidence ID saved successfully');
        } catch (e) {
          console.error('[Antifraud] Error saving evidence ID:', e);
          throw new EvidenceCreationError(
            itemId,
            `Failed to save evidence ID: ${e}`,
            e
          );
        }

        console.log('[Antifraud] Verification complete, returning result');
        return {
          isFirstVerification: true,
          evidenceID,
        } satisfies VerificationResult;
      } catch (error) {
        if (error instanceof ItemNotFoundError || 
            error instanceof NoCreatorSignatureError || 
            error instanceof EvidenceCreationError) {
          throw error;
        }
        throw new EvidenceCreationError(
          itemId,
          `Unexpected error: ${error}`,
          error
        );
      }
    },
  };
}
