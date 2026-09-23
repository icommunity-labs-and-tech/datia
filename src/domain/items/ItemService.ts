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
  imageUrl?: string;
  /**
   * Who creates the item. Omitted: the signed-in user. `null`: nobody — an API
   * token belongs to the organization, not to a person.
   */
  createdByUserId?: string | null;
  /** Where the asset is. Since #37 it is a field of its own, not a template. */
  latitude?: number | null;
  longitude?: number | null;
}

export interface ItemResponse {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
}

export interface ItemService {
  createItem(
    organizationId: string,
    data: CreateItemRequest
  ): Promise<ItemResponse>;
}
