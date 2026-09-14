import { ItemService, type CreateItemRequest, type ItemResponse } from './ItemService';
import { ItemCreationRollbackError, ItemInputError, ItemAlreadyExistsError, OrganizationNotVerifiedError } from './errors';
import type { ItemRepository } from './ItemRepository';
import type { UserRepository } from '../users/UserRepository';
import type { EvidenceService } from '../evidence/EvidenceService';
import { revalidatePath } from 'next/cache';
import { createItemWithEvidence } from './ItemCreationHelper';

export function createItemServiceImpl(deps: {
  itemRepository: ItemRepository;
  userRepository: UserRepository;
  evidenceService: EvidenceService;
}): ItemService {
  const { itemRepository: itemRepo, userRepository: userRepo, evidenceService: evidence } = deps;

  return {
    async createItem(organizationId: string, data: CreateItemRequest): Promise<ItemResponse> {
      try {
        // 1. Validate policies - check if item already exists
        try {
          const existingItem = await itemRepo.getById(data.customId, organizationId);
          if (existingItem) {
            throw new ItemAlreadyExistsError(
              data.customId,
              `El ID "${data.customId}" ya existe. Por favor, elige un ID diferente.`
            );
          }
        } catch (e) {
          if (e instanceof ItemAlreadyExistsError) throw e;
          // Item doesn't exist, continue
        }

        // 2. Use helper function to create item with evidence
        const result = await createItemWithEvidence(
          { itemRepository: itemRepo, userRepository: userRepo, evidenceService: evidence },
          {
            organizationId,
            id: data.customId,
            name: data.name,
            description: data.description,
            categoryIds: data.categoryIds,
            imageUrl: data.imageUrl ?? null,
            templateFields: data.templateFields ?? null,
            itemTemplate: data.itemTemplate ?? [],
            createdByUserId: data.createdByUserId,
          }
        );

        // 3. Revalidate cache
        revalidatePath('/dashboard/items');

        return {
          id: result.id,
          name: result.name,
          description: result.description,
          imageUrl: result.imageUrl || undefined,
          itemTemplate: data.itemTemplate ?? [],
        } satisfies ItemResponse;
      } catch (error) {
        if (error instanceof ItemInputError || 
            error instanceof ItemAlreadyExistsError || 
            error instanceof OrganizationNotVerifiedError || 
            error instanceof ItemCreationRollbackError) {
          throw error;
        }
        throw new ItemCreationRollbackError(
          data.customId,
          'evidence_failed',
          `Unexpected error: ${error}`
        );
      }
    },
  };
}
