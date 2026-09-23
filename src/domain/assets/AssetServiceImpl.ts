import { AssetService, type CreateAssetRequest, type AssetResponse } from './AssetService';
import { AssetCreationRollbackError, AssetInputError, AssetAlreadyExistsError, OrganizationNotVerifiedError } from './errors';
import type { AssetRepository } from './AssetRepository';
import type { UserRepository } from '../users/UserRepository';
import type { EvidenceService } from '../evidence/EvidenceService';
import { revalidatePath } from 'next/cache';
import { createAssetWithEvidence } from './AssetCreationHelper';

export function createAssetServiceImpl(deps: {
  assetRepository: AssetRepository;
  userRepository: UserRepository;
  evidenceService: EvidenceService;
}): AssetService {
  const { assetRepository: itemRepo, userRepository: userRepo, evidenceService: evidence } = deps;

  return {
    async createItem(organizationId: string, data: CreateAssetRequest): Promise<AssetResponse> {
      try {
        // 1. Validate policies - check if asset already exists
        try {
          const existingItem = await itemRepo.getById(data.customId, organizationId);
          if (existingItem) {
            throw new AssetAlreadyExistsError(
              data.customId,
              `El ID "${data.customId}" ya existe. Por favor, elige un ID diferente.`
            );
          }
        } catch (e) {
          if (e instanceof AssetAlreadyExistsError) throw e;
          // Item doesn't exist, continue
        }

        // 2. Use helper function to create asset with evidence
        const result = await createAssetWithEvidence(
          { assetRepository: itemRepo, userRepository: userRepo, evidenceService: evidence },
          {
            organizationId,
            id: data.customId,
            name: data.name,
            description: data.description,
            imageUrl: data.imageUrl ?? null,
            createdByUserId: data.createdByUserId,
            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,
          }
        );

        // 3. Revalidate cache
        revalidatePath('/dashboard/items');

        return {
          id: result.id,
          name: result.name,
          description: result.description,
          imageUrl: result.imageUrl || undefined,
        } satisfies AssetResponse;
      } catch (error) {
        if (error instanceof AssetInputError || 
            error instanceof AssetAlreadyExistsError || 
            error instanceof OrganizationNotVerifiedError || 
            error instanceof AssetCreationRollbackError) {
          throw error;
        }
        throw new AssetCreationRollbackError(
          data.customId,
          'evidence_failed',
          `Unexpected error: ${error}`
        );
      }
    },
  };
}
