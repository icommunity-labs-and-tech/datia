import { redirect } from 'next/navigation';

/** Moved to its own panel (#20): an organization account is a customer, not platform staff. */
export default function CompaniesPageRedirect() {
  redirect('/organization/companies');
}
