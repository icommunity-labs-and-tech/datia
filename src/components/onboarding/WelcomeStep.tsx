'use client';

import { useTranslations } from 'next-intl';
import { Button, Group, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconArrowRight, IconBuilding, IconMoodSmile } from '@tabler/icons-react';

interface WelcomeStepProps {
  userName: string;
  organizationName: string;
  onNext: () => void;
}

export default function WelcomeStep({ userName, organizationName, onNext }: WelcomeStepProps) {
  const t = useTranslations('onboardingWelcome');

  const steps = [
    { title: t('steps.password.title'), body: t('steps.password.body') },
    { title: t('steps.kyc.title'), body: t('steps.kyc.body') },
  ];

  return (
    <Stack align="center" gap="lg" ta="center">
      <ThemeIcon size={88} radius="xl" color="datiaBlue" variant="light">
        <IconMoodSmile size={44} stroke={1.5} />
      </ThemeIcon>

      <div>
        <Title order={2} mb="xs">{t('title')}</Title>
        <Text c="dimmed">
          {t.rich('greeting', { name: userName, strong: (chunks) => <strong>{chunks}</strong> })}
        </Text>
      </div>

      <Paper withBorder radius="md" p="md" w="100%" maw={520} ta="left">
        <Group gap="xs" mb={6} wrap="nowrap">
          <IconBuilding size={18} color="var(--mantine-color-datiaBlue-6)" />
          <Text fw={600}>
            {t('organization')}: <Text component="span" inherit c="datiaBlue">{organizationName}</Text>
          </Text>
        </Group>
        <Text size="sm" c="dimmed">{t('intro')}</Text>
      </Paper>

      <Stack gap="sm" w="100%" maw={520} ta="left">
        <Title order={5}>{t('whatNext')}</Title>
        {steps.map((step, i) => (
          <Group key={step.title} gap="sm" wrap="nowrap" align="flex-start">
            <ThemeIcon size={28} radius="xl" color="datiaBlue" variant="filled">
              <Text size="xs" fw={700} c="white">{i + 1}</Text>
            </ThemeIcon>
            <div>
              <Text size="sm" fw={600}>{step.title}</Text>
              <Text size="sm" c="dimmed">{step.body}</Text>
            </div>
          </Group>
        ))}
      </Stack>

      <Button size="lg" onClick={onNext} rightSection={<IconArrowRight size={18} />}>
        {t('start')}
      </Button>
    </Stack>
  );
}
