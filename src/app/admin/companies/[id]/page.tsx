import { redirect } from 'next/navigation';

/** Moved to its own panel (#20): an organization account is a customer, not platform staff. */
export default async function CompanyPageRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/organization/companies/${id}`);
}
