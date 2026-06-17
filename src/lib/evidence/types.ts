/**
 * Types for Evidence service
 */

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
