import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyAdminJWT } from '@/lib/auth/admin/jwt';
import { adminAuthConfig } from '@/lib/auth/admin/config';
import EmissionDetailClient from './EmissionDetailClient';

export const dynamic = 'force-dynamic';

export default async function EmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get(adminAuthConfig.cookieName)?.value;
  if (!token) notFound();

  const payload = await verifyAdminJWT(token);
  if (!payload?.organizationId) notFound();

  const emission = await prisma.emissionRecord.findFirst({
    where: {
      id,
      EnergyConsumption: { EnergySource: { Asset: { organizationId: payload.organizationId } } },
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
