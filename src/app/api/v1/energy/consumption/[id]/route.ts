import { NextRequest, NextResponse } from 'next/server';
import { validateApiToken } from '@/lib/auth/api-tokens/middleware';
import { energyRepository } from '@/infrastructure/prisma/repositories/EnergyRepositoryPrisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateApiToken(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const record = await energyRepository.findConsumptionById(auth.organizationId, id);
  if (!record) return NextResponse.json({ error: 'Energy consumption record not found' }, { status: 404 });

  return NextResponse.json({ data: record });
}
