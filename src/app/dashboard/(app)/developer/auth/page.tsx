import { redirect } from 'next/navigation';

export default function DeveloperAuthPage() {
  redirect('/dashboard/api?tab=auth');
}
