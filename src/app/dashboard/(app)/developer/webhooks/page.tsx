import { redirect } from 'next/navigation';

export default function DeveloperWebhooksPage() {
  redirect('/dashboard/api?tab=webhooks');
}
