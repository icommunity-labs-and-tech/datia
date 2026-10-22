'use client';

import { Group, Paper, Stack, Text } from '@mantine/core';
import { IconLink, IconExternalLink } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

interface BlockchainLinkProps {
  href: string;
  label?: string;
}

export function BlockchainLink({ href, label }: BlockchainLinkProps) {
  const t = useTranslations('customer');
  const displayLabel = label ?? t('blockchainCertification');

  return (
    <Paper
      component="a"
      href={href}
      target="_blank"
      rel="noreferrer"
      p="xs"
      radius="sm"
      bg="var(--mantine-color-gray-0)"
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      <Group gap="xs" wrap="nowrap">
        <IconLink size={15} stroke={1.7} color="var(--mantine-color-gray-6)" />
        <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
          <Text size="xs" c="dimmed">{t('blockchainCertification')}</Text>
          <Text size="sm" fw={550} truncate>{displayLabel}</Text>
        </Stack>
        <IconExternalLink size={14} stroke={1.7} color="var(--mantine-color-gray-5)" />
      </Group>
    </Paper>
  );
}
