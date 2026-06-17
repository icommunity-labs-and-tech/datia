import { DbError } from '@/domain/items/ItemRepository';
import { prisma } from '@/lib/prisma';

export interface AntifraudRepository {
  getVerificationStatus(itemId: string): Promise<string | null>;
  verifyAndRegister(itemId: string, evidenceID: string): Promise<void>;
}

export const antifraudRepository: AntifraudRepository = {
  async getVerificationStatus(itemId: string): Promise<string | null> {
    try {
      const item = await prisma.item.findUnique({
        where: { id: itemId },
        select: { antifraudEvidenceId: true },
      });
      return item?.antifraudEvidenceId ?? null;
    } catch (e) {
      throw new DbError(e);
    }
  },

  async verifyAndRegister(itemId: string, evidenceID: string): Promise<void> {
    try {
      await prisma.item.update({
        where: { id: itemId },
        data: { antifraudEvidenceId: evidenceID },
      });
    } catch (e) {
      throw new DbError(e);
    }
  },
};

