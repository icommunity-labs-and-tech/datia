'use client';

import { Button, Card, SimpleGrid, Text, ThemeIcon, Title } from '@mantine/core';
import { IconBuildingSkyscraper, IconHeadset, IconSettings } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function SuperAdminDashboard() {
  const t = useTranslations('superadminPanel.home');

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
      <Card withBorder radius="lg" padding="xl" style={{ textAlign: 'center' }}>
        <ThemeIcon size={80} radius="md" variant="light" color="datiaBlue" mx="auto" mb="lg">
          <IconBuildingSkyscraper size={40} stroke={1.5} />
        </ThemeIcon>
        <Title order={3} mb="xs">{t('organizations.title')}</Title>
        <Text c="dimmed" mb="lg" mih={48}>{t('organizations.description')}</Text>
        <Button
          component={Link}
          href="/superadmin/organizations"
          fullWidth
          radius="md"
          leftSection={<IconBuildingSkyscraper size={18} stroke={1.6} />}
        >
          {t('organizations.cta')}
        </Button>
      </Card>

      <Card withBorder radius="lg" padding="xl" style={{ textAlign: 'center' }}>
        <ThemeIcon size={80} radius="md" variant="light" color="datiaBlue" mx="auto" mb="lg">
          <IconHeadset size={40} stroke={1.5} />
        </ThemeIcon>
        <Title order={3} mb="xs">{t('support.title')}</Title>
        <Text c="dimmed" mb="lg" mih={48}>{t('support.description')}</Text>
        <Button
          component={Link}
          href="/superadmin/support-messages"
          fullWidth
          radius="md"
          leftSection={<IconHeadset size={18} stroke={1.6} />}
        >
          {t('support.cta')}
        </Button>
      </Card>

      <Card withBorder radius="lg" padding="xl" style={{ textAlign: 'center', opacity: 0.7 }}>
        <ThemeIcon size={80} radius="md" variant="light" color="gray" mx="auto" mb="lg">
          <IconSettings size={40} stroke={1.5} />
        </ThemeIcon>
        <Title order={3} mb="xs">{t('settings.title')}</Title>
        <Text c="dimmed" mb="lg" mih={48}>{t('settings.description')}</Text>
        <Button fullWidth radius="md" variant="default" disabled leftSection={<IconSettings size={18} stroke={1.6} />}>
          {t('settings.cta')}
        </Button>
      </Card>
    </SimpleGrid>
  );
}
