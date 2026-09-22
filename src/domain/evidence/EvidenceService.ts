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
  /**
   * Returns the evidence id and the checksum iBS publishes for the certified
   * JSON: base64(SHA-512(bytes)), the same it computes on its side. Storing it
   * is what later lets a verification prove that what the database holds is
   * what was certified — iBS returns those checksums, never the file itself.
   */
  createCertificationEvidence(
    input: EvidencePayloadInput
  ): Promise<{ evidenceId: string; payloadChecksum: string }>;
}
