import { redirect } from 'next/navigation';

export default function DeveloperAuthPage() {
  redirect('/company/api?tab=auth');
}
