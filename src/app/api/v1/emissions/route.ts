import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateApiToken } from '@/lib/auth/api-tokens/middleware';
import { parseCursorPaginationParams } from '@/lib/api/cursor-pagination';
import { createEnergyServiceImpl } from '@/domain/energy/EnergyServiceImpl';
import { energyRepository } from '@/infrastructure/prisma/repositories/EnergyRepositoryPrisma';
import { eventRepository } from '@/infrastructure/prisma/repositories/EventRepositoryPrisma';
import { EnergyValidationError } from '@/domain/energy/EnergyTypes';
import { validateConsumptionOwnership } from '../energy/_validate';

const schema = z.object({
  energyConsumptionId: z.string(),
  co2eKg: z.number().nonnegative(),
  scope: z.enum(['SCOPE_1', 'SCOPE_2', 'SCOPE_3']),
  systemBoundary: z.enum(['CRADLE_TO_GATE', 'CRADLE_TO_GRAVE', 'GATE_TO_GATE', 'CRADLE_TO_CRADLE']),
  emissionFactor: z.number().positive().optional(),
  emissionFactorSource: z.string().optional(),
  calculationMethodology: z.string().optional(),
  gwpCharacterizationFactors: z.string().optional(),
  functionalUnit: z.string().optional(),
  verifierBody: z.string().optional(),
  verificationStandard: z.string().optional(),
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
    const consumption = await validateConsumptionOwnership(parsed.data.energyConsumptionId, auth.organizationId);
    if (!consumption) return NextResponse.json({ error: 'EnergyConsumption not found or does not belong to your organization' }, { status: 404 });

    const service = createEnergyServiceImpl({ energyRepository });
    const record = await service.createEmission(auth.organizationId, parsed.data);

    await eventRepository.create(auth.organizationId, {
      eventType: 'co2_emission_event',
      entityType: 'EmissionRecord',
      entityId: record.id,
      data: {
        id: record.id,
        co2eKg: record.co2eKg,
        scope: record.scope,
        systemBoundary: record.systemBoundary,
        energyConsumptionId: record.energyConsumptionId,
      },
    });

    return NextResponse.json({ data: record }, { status: 201 });
  } catch (err) {
    if (err instanceof EnergyValidationError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error('[POST /api/v1/emissions]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await validateApiToken(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const pagination = parseCursorPaginationParams(new URL(request.url).searchParams);
  const service = createEnergyServiceImpl({ energyRepository });
  return NextResponse.json(await service.listEmissions(auth.organizationId, pagination));
}
