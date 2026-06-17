import { VerificationInputError, ItemNotFoundError, StateNotFoundError, NoEvidenceError, BlockchainAPIError, VerificationTimeoutError } from './errors';
import type { ICommunityService } from '../../infrastructure/icommunity/ICommunityService';

export type VerificationStatus = 'verified' | 'tampered' | 'no_evidence';

export interface VerificationResult {
  status: VerificationStatus;
  message: string;
  localData?: any;
  blockchainData?: any;
  evidenceID?: string;
  certificationTimestamp?: string;
}

export interface ChainVerificationResult {
  itemVerification: VerificationResult;
  stateVerifications: VerificationResult[];
  chainConsistent: boolean;
  totalStates: number;
  message: string;
}

export interface VerificationService {
  verifyItemEvidence(
    itemId: string
  ): Promise<VerificationResult>;

  verifyStateEvidence(
    stateId: string
  ): Promise<VerificationResult>;

  verifyItemChainOfCustody(
    itemId: string
  ): Promise<ChainVerificationResult>;
}
