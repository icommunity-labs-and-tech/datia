'use server';

import { assetRepository } from '@/infrastructure/prisma/repositories/AssetRepositoryPrisma';
import { requireScope } from '@/lib/auth/tenant';
import { certifiedAssetIds } from '@/lib/certification/queries';

export async function getAssets() {
  try {
    const scope = await requireScope();
    const [rows, certified] = await Promise.all([
      assetRepository.listForExport(scope, { fullPassport: false }),
      certifiedAssetIds(scope),
    ]);
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      imageUrl: r.imageUrl ?? undefined,
      createdAt: r.createdAt,
      // What can be proven about an asset is what has been anchored for it.
      certified: certified.has(r.id),
      // Position has its own columns now (#37); the map needs nothing else.
      location: r.latitude != null && r.longitude != null ? { lat: r.latitude, lng: r.longitude } : null,
      siteName: r.siteName ?? null,
    }));
  } catch (error) {
    console.error('Error ejecutando getAssets:', error);
    throw error;
  }
}
