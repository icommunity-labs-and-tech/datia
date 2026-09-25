'use server';

import { prisma } from '@/lib/prisma';
import { requireOrganizationAccount } from './access';

export interface CompanySummary {
  id: string;
  name: string;
  active: boolean;
  createdAt: Date;
  assets: number;
  accounts: number;
}

/** The companies of the organization, with what each one holds. */
export async function listCompanies(): Promise<CompanySummary[]> {
  const { organizationId } = await requireOrganizationAccount();

  const companies = await prisma.company.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      active: true,
      createdAt: true,
      _count: { select: { Asset: true, User: true } },
    },
  });

  return companies.map((c) => ({
    id: c.id,
    name: c.name,
    active: c.active,
    createdAt: c.createdAt,
    assets: c._count.Asset,
    accounts: c._count.User,
  }));
}
