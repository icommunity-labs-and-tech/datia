import { redirect } from 'next/navigation';

export default function DeveloperEventsPage() {
  redirect('/company/api?tab=events');
}
