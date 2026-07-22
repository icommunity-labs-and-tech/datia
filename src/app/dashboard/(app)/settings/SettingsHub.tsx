'use client';

import { Tabs } from '@mantine/core';
import { IconTag, IconUsers, IconBuilding } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { StatusTypesTable } from '@/components/views';
import UsersPageClient from '../users/UsersPageClient';
import ProfilePageClient from '../../profile/ProfilePageClient';

interface SettingsHubProps {
  defaultTab?: string;
  user?: any;
}

export default function SettingsHub({ defaultTab = 'states', user }: SettingsHubProps) {
  const t = useTranslations('settingsHub');

  return (
    <Tabs defaultValue={defaultTab} keepMounted={false}>
      <Tabs.List mb="md">
        <Tabs.Tab value="states" leftSection={<IconTag size={16} />}>
          {t('states')}
        </Tabs.Tab>
        <Tabs.Tab value="users" leftSection={<IconUsers size={16} />}>
          {t('users')}
        </Tabs.Tab>
        <Tabs.Tab value="org" leftSection={<IconBuilding size={16} />}>
          {t('org')}
        </Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="states">
        <StatusTypesTable />
      </Tabs.Panel>
      <Tabs.Panel value="users">
        <UsersPageClient />
      </Tabs.Panel>
      <Tabs.Panel value="org">
        {user ? <ProfilePageClient user={user} /> : null}
      </Tabs.Panel>
    </Tabs>
  );
}
