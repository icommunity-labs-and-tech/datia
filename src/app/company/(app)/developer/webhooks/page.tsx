import { redirect } from 'next/navigation';

export default function DeveloperWebhooksPage() {
  redirect('/company/api?tab=webhooks');
}
