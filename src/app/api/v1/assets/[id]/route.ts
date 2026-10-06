import { NextRequest, NextResponse } from 'next/server';
import { withApiTracking } from '@/lib/auth/api-tokens/withApiTracking';
import { assetRepository } from '@/infrastructure/prisma/repositories/AssetRepositoryPrisma';
import { decodeUrlParam } from '@/lib/api/decode-param';
import { assetRepositoryFilesystem } from '@/infrastructure/filesystem/repositories/AssetRepositoryFilesystem';
import { isSandboxRequest } from '@/lib/sandbox/context';
import { authScope } from '@/lib/scope';

export const GET = withApiTracking(async (
  request: NextRequest,
  auth,
  params: { id: string }
) => {
  try {
    const id = decodeUrlParam(params.id);

    // ── Sandbox: read from filesystem ──────────────────────────────────
    if (isSandboxRequest()) {
      const item = await assetRepositoryFilesystem.getById(id, authScope(auth));
      if (!item) {
        return NextResponse.json({ error: 'Asset not found in sandbox' }, { status: 404 });
      }
      return NextResponse.json(item);
    }

    // ── Production ─────────────────────────────────────────────────────
    // Scoped by the token that authenticated this request, not by whatever
    // dashboard cookie the caller's browser happens to also be carrying —
    // `getAsset` read the latter via `requireScope()`, the same bug #78
    // already fixed for /api/v1/events.
    const item = await assetRepository.getById(id, authScope(auth));
    if (!item) {
      return NextResponse.json({ error: 'Asset no encontrado' }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    return NextResponse.json({ error: 'Asset no encontrado' }, { status: 404 });
  }
});

