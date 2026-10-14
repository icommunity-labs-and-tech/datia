import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireScope } from '@/lib/auth/tenant';
import { scopeWhere, type Scope } from '@/lib/scope';
import EmissionDetailClient from './EmissionDetailClient';

export const dynamic = 'force-dynamic';

export default async function EmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let scope: Scope;
  try {
    scope = await requireScope();
  } catch {
    notFound();
  }

  const emission = await prisma.emissionRecord.findFirst({
    where: {
      id,
      EnergyConsumption: { EnergySource: { Asset: scopeWhere(scope) } },
    },
    include: {
      EnergyConsumption: {
        include: {
          EnergySource: {
            include: { Asset: { select: { id: true, name: true, imageUrl: true } } },
          },
        },
      },
    },
  });

  if (!emission) notFound();

  return <EmissionDetailClient emission={emission} />;
}
