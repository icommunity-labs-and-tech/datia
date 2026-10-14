import { redirect } from 'next/navigation';

export default function DeveloperApiPage() {
  redirect('/company/api?tab=docs');
}
