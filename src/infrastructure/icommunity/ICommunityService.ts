import { ICommunityConfigError, ICommunityHTTPError } from './errors';

export interface EvidenceFile {
  name: string;
  file: string; // base64 encoded
}

/**
 * Where an evidence stands on chain. iBS issues it first and anchors it a few
 * seconds later, so `created` and `certified` are distinct states, not a
 * formality — an evidence is only proof once it carries a transaction.
 */
export type EvidenceStatus = 'created' | 'waiting' | 'certified' | 'failed' | (string & {});

export interface EvidenceCertification {
  timestamp?: string;
  hash?: string;
  network?: string;
  /** Same evidence anchored on further chains, each with its own hash. */
  mirrors?: Array<{ timestamp?: string; hash?: string; network?: string }>;
  links?: {
    checker?: string;
    block_explorer?: string;
  };
}

export interface EvidenceData {
  id: string;
  payload: { files: EvidenceFile[]; title?: string };
  data?: any;
  timestamp?: string;
  status?: EvidenceStatus;
  certification?: EvidenceCertification;
}

/**
 * Where a signature's KYC flow stands. Only `success` and `failed` are outcomes;
 * `created` and `pending` mean the person has not finished yet.
 */
export type SignatureStatus = 'created' | 'pending' | 'success' | 'failed' | (string & {});

export interface SignatureData {
  id: string;
  name?: string;
  status?: SignatureStatus;
  created_at?: string;
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
  getSignature(
    signatureId: string
  ): Promise<SignatureData>;
}
