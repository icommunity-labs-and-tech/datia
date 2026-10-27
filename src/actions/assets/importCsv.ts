'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireScope } from '@/lib/auth/tenant';
import {
  assetCsvIds,
  readAssetsCsv,
  IMPORT_BATCH_SIZE,
  MAX_ASSET_CSV_LENGTH,
  type AssetCsvResult,
} from '@/lib/import/assets-csv';
import { findMunicipality, nearestMunicipality } from '@/lib/map/municipality';
import { createAssetServiceImpl } from '@/domain/assets/AssetServiceImpl';
import { createEvidenceServiceImpl } from '@/domain/evidence/EvidenceServiceImpl';
import { icommunityService } from '@/infrastructure/icommunity/ICommunityServiceImpl';
import { assetRepository } from '@/infrastructure/prisma/repositories/AssetRepositoryPrisma';
import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';
import { CompanyNotVerifiedError } from '@/domain/assets/errors';

/** Reads a CSV of assets and reports what would be created, without writing anything. */
export async function previewAssetsCsv(text: string): Promise<AssetCsvResult> {
  await requireScope();
  if (text.length > MAX_ASSET_CSV_LENGTH) return { fileIssues: [{ code: 'too_large' }], rows: [] };

  const ids = assetCsvIds(text);
  // Global on purpose: an asset ID is the primary key, so one used by another
  // company would only fail later, at the write.
  const taken = ids.length
    ? await prisma.asset.findMany({ where: { id: { in: ids } }, select: { id: true } })
    : [];

  return readAssetsCsv(text, { takenIds: new Set(taken.map((a) => a.id)), findMunicipality, nearestMunicipality });
}

export interface ImportAssetInput {
  id: string;
  name: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ImportAssetOutcome {
  id: string;
  ok: boolean;
  error?: string;
}

export interface ImportBatchResult {
  outcomes: ImportAssetOutcome[];
  /** The company cannot certify (no verified KYC): nothing further will succeed. */
  stop?: string;
}

/**
 * Creates a batch of assets through the same path as the "new asset" dialog:
 * same checks, same evidence in iBS, same event. Rows are re-checked here —
 * the batch comes from the browser.
 */
export async function importAssetsBatch(batch: ImportAssetInput[]): Promise<ImportBatchResult> {
  const scope = await requireScope();
  const service = createAssetServiceImpl({
    assetRepository,
    userRepository,
    evidenceService: createEvidenceServiceImpl({ icommunityService }),
  });

  const outcomes: ImportAssetOutcome[] = [];
  for (const row of batch.slice(0, IMPORT_BATCH_SIZE)) {
    const id = row.id?.trim() ?? '';
    const name = row.name?.trim() ?? '';
    const located =
      row.latitude != null && row.longitude != null && Math.abs(row.latitude) <= 90 && Math.abs(row.longitude) <= 180;
    if (!id || !name) {
      outcomes.push({ id, ok: false, error: 'missing_fields' });
      continue;
    }
    try {
      await service.createAsset(scope, {
        customId: id,
        name,
        description: row.description?.trim() ?? '',
        latitude: located ? row.latitude : null,
        longitude: located ? row.longitude : null,
      });
      outcomes.push({ id, ok: true });
    } catch (error) {
      if (error instanceof CompanyNotVerifiedError) {
        outcomes.push({ id, ok: false, error: error.message });
        revalidatePath('/company/assets');
        return { outcomes, stop: error.message };
      }
      outcomes.push({ id, ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  revalidatePath('/company/assets');
  return { outcomes };
}
