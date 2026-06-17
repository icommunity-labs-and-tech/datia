import type { UserRepository } from '@/domain/users/UserRepository';
import type { StateRepository } from '@/domain/states/StateRepository';

export interface WebhookHandlerService {
  handle(event: any): Promise<void>;
  handleSignatureStatus(status: 'ok' | 'ko', body: { data?: { signature_id?: string }; signature_id?: string }): Promise<void>;
  handleEvidenceCertified(body: { data?: { evidence_id?: string; certification_timestamp?: string } }): Promise<void>;
}

export function createWebhookHandlerService(deps: {
  userRepository: UserRepository;
  stateRepository: StateRepository;
}): WebhookHandlerService {
  const { userRepository: userRepo, stateRepository: stateRepo } = deps;
  
  return {
    async handle(_event: any): Promise<void> {
      // Implementation placeholder
    },
    
    async handleSignatureStatus(status: 'ok' | 'ko', body: { data?: { signature_id?: string }; signature_id?: string }): Promise<void> {
      const signatureId = body?.data?.signature_id || body?.signature_id;
      if (!signatureId) return;
      const verificationStatus = status === 'ok' ? 'VERIFIED' : 'REJECTED';
      // TODO: Implement actual update by signatureID
      // For now, this is a placeholder
    },
    
    async handleEvidenceCertified(body: { data?: { evidence_id?: string; certification_timestamp?: string } }): Promise<void> {
      const evidenceId = body?.data?.evidence_id;
      const ts = body?.data?.certification_timestamp;
      if (!evidenceId) return;
      // TODO: Implement actual update by evidenceID
      // For now, this is a placeholder
    },
  };
}


