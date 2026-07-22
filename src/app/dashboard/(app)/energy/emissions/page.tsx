import { redirect } from 'next/navigation';

export default function EmissionsPage() {
  redirect('/dashboard/energy?tab=emissions');
}
