'use client';

import { Group, Paper, Stack, Text } from '@mantine/core';
import { IconUser } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

interface SignerBadgeProps {
  name: string;
}

export function SignerBadge({ name }: SignerBadgeProps) {
  const t = useTranslations('customer');

  return (
    <Paper p="xs" radius="sm" bg="var(--mantine-color-gray-0)">
      <Group gap="xs" wrap="nowrap">
        <IconUser size={15} stroke={1.7} color="var(--mantine-color-gray-6)" />
        <Stack gap={0} style={{ minWidth: 0 }}>
          <Text size="xs" c="dimmed">{t('signer')}</Text>
          <Text size="sm" fw={550} truncate title={name}>{name}</Text>
        </Stack>
      </Group>
    </Paper>
  );
}
