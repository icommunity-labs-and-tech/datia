import { ItemInputError, ItemAlreadyExistsError, UserNotVerifiedError, ItemCreationRollbackError } from './errors';
import { EvidenceInputError, ImageFetchError, ImageSizeExceededError, EvidenceBuildError } from '../evidence/errors';
import { ICommunityConfigError, ICommunityHTTPError } from '../../infrastructure/icommunity/errors';
import type { ItemRepository } from './ItemRepository';
import type { UserRepository } from '../users/UserRepository';
import type { EvidenceService } from '../evidence/EvidenceService';

export interface CreateItemRequest {
  name: string;
  description: string;
  customId: string;
  categoryIds?: string[];
  imageUrl?: string;
  templateFields?: Record<string, any>;
  itemTemplate?: any;
}

export interface ItemResponse {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  itemTemplate?: any;
}

export interface ItemService {
  createItem(
    data: CreateItemRequest
  ): Promise<ItemResponse>;
}
