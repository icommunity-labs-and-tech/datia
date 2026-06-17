import { StateInputError, StateAlreadyExistsError, UserNotVerifiedError, StateCreationRollbackError } from './errors';
import { EvidenceInputError, ImageFetchError, ImageSizeExceededError, EvidenceBuildError } from '../evidence/errors';
import { ICommunityConfigError, ICommunityHTTPError } from '../../infrastructure/icommunity/errors';
import type { StateRepository } from './StateRepository';
import type { UserRepository } from '../users/UserRepository';
import type { StatusTypeRepository } from '../status-types/StatusTypeRepository';
import type { EvidenceService } from '../evidence/EvidenceService';

export interface CreateStateRequest {
  name: string;
  description: string;
  statusTypeId: string;
  itemId: string;
  imageUrls: string[];
  metadata: Record<string, unknown>;
  templateConfig?: Record<string, any> | null;
}

export interface StateResponse {
  id: string;
  name: string;
  description: string;
  statusTypeId: string;
  itemId: string;
  imageUrls: string[];
}

export interface StateService {
  createState(
    data: CreateStateRequest
  ): Promise<StateResponse>;
}
