import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateApiToken } from '@/lib/auth/api-tokens/middleware';
import { authScope } from '@/lib/scope';
import { parseCursorPaginationParams } from '@/lib/api/cursor-pagination';
import { createEnergyServiceImpl } from '@/domain/energy/EnergyServiceImpl';
import { energyRepository } from '@/infrastructure/prisma/repositories/EnergyRepositoryPrisma';
import { recordEvent } from '@/lib/services/events';
import { EnergyValidationError } from '@/domain/energy/EnergyTypes';
import { validateItemOwnership } from '../_validate';

const schema = z.object({
  name: z.string().min(1),
  energyCarrier: z.enum(['ELECTRICITY', 'NATURAL_GAS', 'HYDROGEN', 'SOLAR_THERMAL', 'DISTRICT_HEATING', 'DISTRICT_COOLING', 'BIOMASS', 'OIL', 'COAL', 'OTHER']),
  generationTechnology: z.string().optional(),
  capacityKw: z.number().positive().optional(),
  location: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  installationDate: z.string().datetime().optional(),
  renewableShare: z.number().min(0).max(100).optional(),
  guaranteeOfOriginId: z.string().optional(),
  countryOfOrigin: z.string().length(2).optional(),
  gridEmissionFactor: z.number().nonnegative().optional(),
  assetId: z.string(),
});

export async function POST(request: NextRequest) {
  const auth = await validateApiToken(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (auth.isSandbox) return NextResponse.json({ error: 'Energy module is not available in sandbox mode' }, { status: 422 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const item = await validateItemOwnership(parsed.data.assetId, authScope(auth));
    if (!item) return NextResponse.json({ error: 'Item not found or does not belong to your organization' }, { status: 404 });

    const service = createEnergyServiceImpl({ energyRepository });
    const source = await service.createSource(authScope(auth), {
      ...parsed.data,
      installationDate: parsed.data.installationDate ? new Date(parsed.data.installationDate) : undefined,
    });

    await recordEvent(authScope(auth), {
      eventType: 'energy_source_event',
      entityType: 'EnergySource',
      entityId: source.id,
      data: { sourceId: source.id, name: source.name, energyCarrier: source.energyCarrier, assetId: source.assetId },
    });

    return NextResponse.json({ data: source }, { status: 201 });
  } catch (err) {
    if (err instanceof EnergyValidationError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error('[POST /api/v1/energy/source]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await validateApiToken(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const pagination = parseCursorPaginationParams(new URL(request.url).searchParams);
  const service = createEnergyServiceImpl({ energyRepository });
  return NextResponse.json(await service.listSources(authScope(auth), pagination));
}
