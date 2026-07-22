import { redirect } from 'next/navigation';

export default function StatusTypesPage() {
  redirect('/dashboard/settings?tab=states');
}
