import { ICommunityConfigError, ICommunityHTTPError } from './errors';

export interface EvidenceFile {
  name: string;
  file: string; // base64 encoded
}

export interface EvidenceData {
  id: string;
  payload: { files: EvidenceFile[]; title?: string };
  data?: any;
  timestamp?: string;
}

export interface ICommunityService {
  createEvidence(
    signatureID: string,
    title: string,
    files: EvidenceFile[]
  ): Promise<string>;
  createSignature(
    name: string,
    okUrl?: string,
    koUrl?: string
  ): Promise<{ signature_id: string; url?: string }>;
  retrySignature(
    signatureId: string
  ): Promise<{ url?: string }>;
  getEvidence(
    evidenceId: string
  ): Promise<EvidenceData>;
}
