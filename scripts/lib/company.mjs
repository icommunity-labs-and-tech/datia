/**
 * The company an organization's seeded rows belong to (#20).
 *
 * Every account and every row of the scoped tables carries a `companyId`, and
 * a session without one is refused, so a seed that skips it produces a user who
 * cannot log in. Same rule as `defaultCompanyId` in src/lib/company.ts: the
 * organization's oldest company, created after the organization if it has none.
 */
export async function companyIdFor(prisma, organizationId) {
  const existing = await prisma.company.findFirst({
    where: { organizationId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (existing) return existing.id;

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });
  const created = await prisma.company.create({
    data: { organizationId, name: organization.name },
    select: { id: true },
  });
  return created.id;
}
