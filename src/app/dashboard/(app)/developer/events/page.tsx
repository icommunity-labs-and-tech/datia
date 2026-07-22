import { redirect } from 'next/navigation';

export default function DeveloperEventsPage() {
  redirect('/dashboard/api?tab=events');
}
