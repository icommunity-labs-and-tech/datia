'use client';

import { Anchor, Badge, Button, Code, List, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import {
  IconCode,
  IconBolt,
  IconBox,
  IconKey,
  IconExternalLink,
  IconInfoCircle,
  IconCirclePlus,
  IconRosetteDiscountCheck,
  IconSearch,
  IconShieldCheck,
  IconClockHour4,
  IconDatabaseOff,
  IconCircleCheck,
} from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import SectionCard from '@/components/layout/SectionCard';

const CAPABILITIES = [
  { icon: IconCirclePlus, key: 'createProducts' },
  { icon: IconRosetteDiscountCheck, key: 'addStates' },
  { icon: IconSearch, key: 'queryData' },
  { icon: IconKey, key: 'tokenAuth' },
] as const;

const SANDBOX_FEATURES = [
  { icon: IconShieldCheck, key: 'noRealData' },
  { icon: IconClockHour4, key: 'ephemeral' },
  { icon: IconDatabaseOff, key: 'noDb' },
  { icon: IconCircleCheck, key: 'realStatusTypes' },
] as const;

interface FeatureProps {
  icon: React.ElementType;
  color: string;
  title: string;
  description: string;
}

function Feature({ icon: Icon, color, title, description }: FeatureProps) {
  return (
    <Stack gap={2}>
      <ThemeIcon variant="light" color={color} size={26} radius="sm" mb={2}>
        <Icon size={14} stroke={1.7} />
      </ThemeIcon>
      <Text size="sm" fw={600}>{title}</Text>
      <Text size="xs" c="dimmed">{description}</Text>
    </Stack>
  );
}

export default function ApiDocsPageClient() {
  const t = useTranslations('developer.api');

  const openDocs = (
    <Button
      component="a"
      href="/api/v1/docs"
      target="_blank"
      rel="noopener noreferrer"
      size="xs"
      rightSection={<IconExternalLink size={14} stroke={1.7} />}
    >
      {t('openDocs')}
    </Button>
  );

  return (
    <Stack gap="md">
      <SectionCard icon={IconCode} title={t('title')} description={t('subtitle')} actions={openDocs}>
        <Text size="sm" c="dimmed">{t('description')}</Text>
      </SectionCard>

      <SectionCard icon={IconBolt} title={t('capabilities.title')}>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          {CAPABILITIES.map(({ icon, key }) => (
            <Feature
              key={key}
              icon={icon}
              color="datiaBlue"
              title={t(`capabilities.${key}.title`)}
              description={t(`capabilities.${key}.description`)}
            />
          ))}
        </SimpleGrid>
      </SectionCard>

      <SectionCard
        icon={IconBox}
        color="green"
        title={t('sandbox.title')}
        description={t('sandbox.description')}
        actions={<Badge variant="light" color="green">{t('sandbox.badge')}</Badge>}
      >
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" mb="xl">
          {SANDBOX_FEATURES.map(({ icon, key }) => (
            <Feature
              key={key}
              icon={icon}
              color="green"
              title={t(`sandbox.features.${key}.title`)}
              description={t(`sandbox.features.${key}.description`)}
            />
          ))}
        </SimpleGrid>

        <Title order={5} mb="sm">{t('sandbox.howTo.title')}</Title>
        <List type="ordered" size="sm" c="dimmed" spacing="xs" mb="lg">
          {(['step1', 'step2', 'step3', 'step4'] as const).map((step) => (
            <List.Item key={step}>
              <span dangerouslySetInnerHTML={{ __html: t.raw(`sandbox.howTo.${step}`) as string }} />
            </List.Item>
          ))}
        </List>

        <Button
          component="a"
          href="/api/v1/docs"
          target="_blank"
          rel="noopener noreferrer"
          color="green"
          size="xs"
          rightSection={<IconExternalLink size={14} stroke={1.7} />}
          style={{ alignSelf: 'flex-start' }}
        >
          {t('sandbox.howTo.cta')}
        </Button>
      </SectionCard>

      <SectionCard icon={IconKey} title={t('auth.title')} description={t('auth.description')}>
        <Code block>{'Authorization: Bearer <API_TOKEN>'}</Code>
        <Text size="xs" c="dimmed" mt="sm">
          <IconInfoCircle
            size={13}
            stroke={1.7}
            style={{ verticalAlign: -2, marginRight: 4 }}
          />
          {t('auth.hint')}{' '}
          <Anchor href="/dashboard/api?tab=auth" size="xs">
            {t('auth.hintLink')}
          </Anchor>
        </Text>
      </SectionCard>
    </Stack>
  );
}
