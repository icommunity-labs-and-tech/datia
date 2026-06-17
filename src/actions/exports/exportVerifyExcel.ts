'use server';

import { itemRepository } from '@/infrastructure/prisma/repositories/ItemRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';
import { excelExportService } from '@/lib/services/excel';

export interface ExportVerifyExcelInput {
  itemIds: string[];
}

export async function exportVerifyExcel(
  params: ExportVerifyExcelInput,
): Promise<{ filename: string; contentType: string; base64: string }> {
  const organizationId = await requireOrganizationId();
  const allItems = await itemRepository.listForExport(organizationId, { fullPassport: false });
  const selected = allItems.filter((it) => params.itemIds.includes(it.id));

  const result = await excelExportService.generateExcelWithVerifyQRCodes(
    selected.map((it: any) => ({
      id: it.id,
      name: it.name,
      description: it.description ?? null,
      categoryName: it.categoryName ?? null,
      url: '',
    })),
  );

  return result;
}
