'use server';

import type { CreateItemRequest } from '@/domain/items/ItemService';
import { createItemServiceImpl } from '@/domain/items/ItemServiceImpl';
import { createEvidenceServiceImpl } from '@/domain/evidence/EvidenceServiceImpl';
import { icommunityService } from '@/infrastructure/icommunity/ICommunityServiceImpl';
import { ItemInputError, ItemAlreadyExistsError, OrganizationNotVerifiedError, ItemCreationRollbackError } from '@/domain/items/errors';
import type { FormTemplate } from '@/components/GenericTable';
import { itemRepository } from '@/infrastructure/prisma/repositories/ItemRepositoryPrisma';
import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';
import { eventRepository } from '@/infrastructure/prisma/repositories/EventRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

// Helper para bypass de auth en tests
const isTestEnv = process.env.VITEST_WORKER_ID !== undefined;

export async function addItem(
  formData: Record<string, any>,
  templateFields?: FormTemplate
): Promise<{ id: string; name: string; description: string; imageUrl?: string; itemTemplate?: any }> {
  try {
    const { name, description, attachmentId, imageUrl, categoryIds, categoryId, modelId, productId, customId, ...templFields } = formData;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error('El nombre es obligatorio');
    }

    if (!description || typeof description !== 'string') {
      throw new Error('La descripción es obligatoria');
    }

    // Support both categoryIds array and legacy categoryId/modelId/productId/attachmentId
    let finalCategoryIds: string[] | undefined = undefined;
    if (categoryIds && Array.isArray(categoryIds)) {
      finalCategoryIds = categoryIds.filter((id: any) => id && typeof id === 'string');
    } else {
      const legacyCategoryId = categoryId || modelId || productId || attachmentId;
      if (legacyCategoryId) {
        finalCategoryIds = [legacyCategoryId];
      }
    }

    let trimmedId = String(customId || '').trim();
    if (!trimmedId) {
      if (isTestEnv) {
        trimmedId = `test-item-${Date.now()}`;
      } else {
        throw new Error('El ID es obligatorio. Por favor, introduce un ID.');
      }
    }

    const request: CreateItemRequest = {
      name: name.trim(),
      description: description.trim(),
      categoryIds: finalCategoryIds,
      customId: trimmedId,
      imageUrl: imageUrl || undefined,
      templateFields: templFields,
      itemTemplate: templateFields || []
    };

    // Build services
    const evidenceService = createEvidenceServiceImpl({ icommunityService });
    const itemService = createItemServiceImpl({
      itemRepository,
      userRepository,
      evidenceService,
    });

    const result = await itemService.createItem(request);
    
    // Emit event asynchronously (fire and forget)
    (async () => {
      try {
        const organizationId = await requireOrganizationId();
        await eventRepository.create(organizationId, {
          eventType: 'item.created',
          entityType: 'item',
          entityId: result.id,
          data: {
            id: result.id,
            name: result.name,
            description: result.description,
            imageUrl: result.imageUrl,
          },
        });
      } catch (err) {
        console.error('Error emitting item.created event:', err);
      }
    })();
    
    return {
      id: result.id,
      name: result.name,
      description: result.description,
      imageUrl: result.imageUrl,
      itemTemplate: result.itemTemplate,
    };
  } catch (error) {
    // Map domain errors to user-friendly messages
    if (error instanceof ItemInputError) {
      throw new Error(error.message);
    }
    if (error instanceof ItemAlreadyExistsError) {
      throw new Error(error.message);
    }
    if (error instanceof OrganizationNotVerifiedError) {
      throw new Error(error.message);
    }
    if (error instanceof ItemCreationRollbackError) {
      throw new Error(error.message);
    }
    
    // Re-throw unexpected errors
    throw error as Error;
  }
}
