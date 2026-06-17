import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateApiToken } from '@/lib/auth/api-tokens/middleware';
import { parseCursorPaginationParams } from '@/lib/api/cursor-pagination';
import { createEnergyServiceImpl } from '@/domain/energy/EnergyServiceImpl';
import { energyRepository } from '@/infrastructure/prisma/repositories/EnergyRepositoryPrisma';
import { eventRepository } from '@/infrastructure/prisma/repositories/EventRepositoryPrisma';
import { EnergyValidationError } from '@/domain/energy/EnergyTypes';
import { validateSourceOwnership } from '../_validate';

const schema = z.object({
  energySourceId: z.string(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  consumptionKwh: z.number().positive(),
  consumptionMj: z.number().positive().optional(),
  lifecycleStage: z.enum(['MANUFACTURING', 'TRANSPORT', 'USE', 'MAINTENANCE', 'END_OF_LIFE']),
  measurementStandard: z.string().optional(),
  operatingConditions: z.record(z.string(), z.unknown()).optional(),
  costAmount: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
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
    const source = await validateSourceOwnership(parsed.data.energySourceId, auth.organizationId);
    if (!source) return NextResponse.json({ error: 'EnergySource not found or does not belong to your organization' }, { status: 404 });

    const service = createEnergyServiceImpl({ energyRepository });
    const record = await service.createConsumption(auth.organizationId, {
      ...parsed.data,
      periodStart: new Date(parsed.data.periodStart),
      periodEnd: new Date(parsed.data.periodEnd),
    });

    await eventRepository.create(auth.organizationId, {
      eventType: 'energy_consumption_event',
      entityType: 'EnergyConsumption',
      entityId: record.id,
      data: {
        id: record.id,
        consumptionKwh: record.consumptionKwh,
        consumptionMj: record.consumptionMj,
        lifecycleStage: record.lifecycleStage,
        periodStart: record.periodStart,
        periodEnd: record.periodEnd,
        energySourceId: record.energySourceId,
      },
    });

    return NextResponse.json({ data: record }, { status: 201 });
  } catch (err) {
    if (err instanceof EnergyValidationError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error('[POST /api/v1/energy/consumption]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await validateApiToken(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const pagination = parseCursorPaginationParams(new URL(request.url).searchParams);
  const service = createEnergyServiceImpl({ energyRepository });
  return NextResponse.json(await service.listConsumption(auth.organizationId, pagination));
}
