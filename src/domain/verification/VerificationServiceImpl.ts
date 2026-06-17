import { VerificationService, type VerificationResult, type ChainVerificationResult } from './VerificationService';
import { VerificationInputError, ItemNotFoundError, StateNotFoundError, NoEvidenceError, BlockchainAPIError, VerificationTimeoutError } from './errors';
import type { ICommunityService } from '../../infrastructure/icommunity/ICommunityService';
import { prisma } from '@/lib/prisma';

const compareJson = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

export function createVerificationServiceImpl(deps: {
  icommunityService: ICommunityService;
}): VerificationService {
  const { icommunityService: icommunity } = deps;

  return {
    async verifyItemEvidence(itemId: string): Promise<VerificationResult> {
      try {
        if (!itemId) {
          throw new VerificationInputError('itemId', 'itemId requerido');
        }

        const item = await prisma.item.findUnique({ where: { id: itemId } });
        if (!item) {
          throw new ItemNotFoundError(itemId, 'Item no encontrado');
        }

        if (!item.evidenceID || !item.evidenceDataJson) {
          throw new NoEvidenceError('Item sin evidencia certificada');
        }

        const evidence = await icommunity.getEvidence(item.evidenceID!);
        const localData = JSON.parse(item.evidenceDataJson!);
        const blockchainData = (evidence as any).data ?? (evidence as any).payload;
        const matches = compareJson(localData, blockchainData);

        return {
          status: matches ? 'verified' : 'tampered',
          message: matches ? 'Los datos del item coinciden con blockchain' : 'Los datos locales NO coinciden con blockchain',
          localData,
          blockchainData,
          evidenceID: item.evidenceID!,
          certificationTimestamp: (evidence as any).timestamp,
        } satisfies VerificationResult;
      } catch (error) {
        if (error instanceof VerificationInputError || 
            error instanceof ItemNotFoundError || 
            error instanceof NoEvidenceError || 
            error instanceof BlockchainAPIError || 
            error instanceof VerificationTimeoutError) {
          throw error;
        }
        if (error instanceof Error && error.message.includes('Item no encontrado')) {
          throw new ItemNotFoundError(itemId, 'Item no encontrado');
        }
        throw new BlockchainAPIError(error instanceof Error ? error.message : 'Error obteniendo evidencia de blockchain');
      }
    },

    async verifyStateEvidence(stateId: string): Promise<VerificationResult> {
      try {
        if (!stateId) {
          throw new VerificationInputError('stateId', 'stateId requerido');
        }

        const state = await prisma.state.findUnique({ where: { id: stateId } });
        if (!state) {
          throw new StateNotFoundError(stateId, 'State no encontrado');
        }

        if (!state.evidenceID || !state.issueDataJson) {
          throw new NoEvidenceError('State sin evidencia certificada');
        }

        const evidence = await icommunity.getEvidence(state.evidenceID!);
        const localData = JSON.parse(state.issueDataJson!);
        const blockchainData = (evidence as any).data ?? (evidence as any).payload;
        const matches = compareJson(localData, blockchainData);

        return {
          status: matches ? 'verified' : 'tampered',
          message: matches ? 'Los datos del estado coinciden con blockchain' : 'Los datos locales NO coinciden con blockchain',
          localData,
          blockchainData,
          evidenceID: state.evidenceID!,
          certificationTimestamp: (evidence as any).timestamp,
        } satisfies VerificationResult;
      } catch (error) {
        if (error instanceof VerificationInputError || 
            error instanceof StateNotFoundError || 
            error instanceof NoEvidenceError || 
            error instanceof BlockchainAPIError || 
            error instanceof VerificationTimeoutError) {
          throw error;
        }
        if (error instanceof Error && error.message.includes('State no encontrado')) {
          throw new StateNotFoundError(stateId, 'State no encontrado');
        }
        throw new BlockchainAPIError(error instanceof Error ? error.message : 'Error obteniendo evidencia de blockchain');
      }
    },

    async verifyItemChainOfCustody(itemId: string): Promise<ChainVerificationResult> {
      throw new VerificationTimeoutError('Not implemented yet');
    },
  };
}
