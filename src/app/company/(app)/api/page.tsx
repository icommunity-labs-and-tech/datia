'use client';

import { Tabs } from '@mantine/core';
import { IconBook, IconCalendarEvent, IconWebhook, IconKey } from '@tabler/icons-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Center, Loader } from '@mantine/core';
import PageHeader from '@/components/layout/PageHeader';

const ApiDocsClient = dynamic(() => import('../developer/api/ApiDocsPageClient'), { ssr: false, loading: () => <Center h={200}><Loader /></Center> });
const EventsPageClient = dynamic(() => import('../developer/events/EventsPageClient'), { ssr: false, loading: () => <Center h={200}><Loader /></Center> });
const WebhooksPageClient = dynamic(() => import('../developer/webhooks/WebhooksPageClient'), { ssr: false, loading: () => <Center h={200}><Loader /></Center> });
const AuthPageClient = dynamic(() => import('../developer/auth/AuthPageClient'), { ssr: false, loading: () => <Center h={200}><Loader /></Center> });

function ApiHubContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') ?? 'docs';
  const t = useTranslations('apiHub');

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <Tabs defaultValue={defaultTab} keepMounted={false}>
        <Tabs.List mb="md">
          <Tabs.Tab value="docs" leftSection={<IconBook size={16} />}>
            {t('docs')}
          </Tabs.Tab>
          <Tabs.Tab value="events" leftSection={<IconCalendarEvent size={16} />}>
            {t('events')}
          </Tabs.Tab>
          <Tabs.Tab value="webhooks" leftSection={<IconWebhook size={16} />}>
            {t('webhooks')}
          </Tabs.Tab>
          <Tabs.Tab value="auth" leftSection={<IconKey size={16} />}>
            {t('auth')}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="docs">
          <ApiDocsClient />
        </Tabs.Panel>
        <Tabs.Panel value="events">
          <EventsPageClient />
        </Tabs.Panel>
        <Tabs.Panel value="webhooks">
          <WebhooksPageClient />
        </Tabs.Panel>
        <Tabs.Panel value="auth">
          <AuthPageClient />
        </Tabs.Panel>
      </Tabs>
    </>
  );
}

export default function ApiHubPage() {
  return (
    <Suspense fallback={<Center h={200}><Loader /></Center>}>
      <ApiHubContent />
    </Suspense>
  );
}
