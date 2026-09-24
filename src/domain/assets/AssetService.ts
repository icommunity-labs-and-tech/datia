import type { Scope } from '@/lib/scope';
import { AssetInputError, AssetAlreadyExistsError, UserNotVerifiedError, AssetCreationRollbackError } from './errors';
import { EvidenceInputError, ImageFetchError, ImageSizeExceededError, EvidenceBuildError } from '../evidence/errors';
import { ICommunityConfigError, ICommunityHTTPError } from '../../infrastructure/icommunity/errors';
import type { AssetRepository } from './AssetRepository';
import type { UserRepository } from '../users/UserRepository';
import type { EvidenceService } from '../evidence/EvidenceService';

export interface CreateAssetRequest {
  name: string;
  description: string;
  customId: string;
  imageUrl?: string;
  /**
   * Who creates the asset. Omitted: the signed-in user. `null`: nobody — an API
   * token belongs to the organization, not to a person.
   */
  createdByUserId?: string | null;
  /** Where the asset is. Since #37 it is a field of its own, not a template. */
  latitude?: number | null;
  longitude?: number | null;
}

export interface AssetResponse {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
}

export interface AssetService {
  createAsset(
    scope: Scope,
    data: CreateAssetRequest
  ): Promise<AssetResponse>;
}
