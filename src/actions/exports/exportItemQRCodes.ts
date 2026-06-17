'use server';

import { itemRepository } from '@/infrastructure/prisma/repositories/ItemRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';
import { qrExportService } from '@/lib/services/qr';

export interface ExportItemQRCodesInput {
  itemIds: string[];
}

export async function exportItemQRCodes(
  params: ExportItemQRCodesInput,
): Promise<{ filename: string; contentType: string; base64: string }> {
  const organizationId = await requireOrganizationId();
  const allItems = await itemRepository.listForExport(organizationId, { fullPassport: false });
  const selected = allItems.filter((it) => params.itemIds.includes(it.id));

  const result = await qrExportService.generateZipForItems(
    selected.map((it: any) => ({
      id: it.id,
      name: it.name,
      url: '', // se reconstruye desde getAppUrl en el servicio
    })),
  );

  return result;
}


