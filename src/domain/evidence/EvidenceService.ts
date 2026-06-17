import { EvidenceInputError, ImageFetchError, ImageSizeExceededError, EvidenceBuildError } from './errors';
import { ICommunityConfigError, ICommunityHTTPError } from '../../infrastructure/icommunity/errors';
import type { ICommunityService } from '../../infrastructure/icommunity/ICommunityService';

export interface EvidencePayloadInput {
  signatureID: string;
  title: string;
  description: string;
  imageUrls: string[];
  metadata: Record<string, unknown>;
}

export interface EvidenceFile {
  name: string;
  file: string; // base64 encoded
}

export interface EvidenceService {
  createItemEvidence(
    input: EvidencePayloadInput
  ): Promise<string>;
  createStateEvidence(
    input: EvidencePayloadInput
  ): Promise<string>;
}
