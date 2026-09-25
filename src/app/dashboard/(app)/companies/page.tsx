import { notFound } from 'next/navigation';
import { requireOrganizationAccount } from '@/actions/companies/access';
import { listCompanies } from '@/actions/companies/list';
import CompaniesPanel from './CompaniesPanel';

export const dynamic = 'force-dynamic';

/** The companies of the organization: only its own account manages them (#20). */
export default async function CompaniesPage() {
  try {
    await requireOrganizationAccount();
  } catch {
    notFound();
  }

  return <CompaniesPanel initial={await listCompanies()} />;
}
