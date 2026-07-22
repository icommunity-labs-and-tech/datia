import { redirect } from 'next/navigation';

export default function DeveloperApiPage() {
  redirect('/dashboard/api?tab=docs');
}
