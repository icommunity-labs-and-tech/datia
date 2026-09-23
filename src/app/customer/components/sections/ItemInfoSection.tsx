'use client';

import { Box, Group, Stack, Text, Title } from '@mantine/core';
import { useTranslations } from 'next-intl';
import { AssetData } from '../../types';
import { EvidenceVerification } from '../EvidenceVerification';
import GeolocationMap from '@/components/GeolocationMapClient';

interface ItemInfoSectionProps {
  item: AssetData;
}

function isGeolocation(value: unknown): value is { lat: number; lng: number } {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'lat' in value &&
    'lng' in value &&
    typeof (value as { lat: unknown }).lat === 'number' &&
    typeof (value as { lng: unknown }).lng === 'number'
  );
}

/** Label/value row that stacks on narrow screens instead of squeezing. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Group
      justify="space-between"
      align="flex-start"
      gap={4}
      wrap="wrap"
      py={8}
      style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}
    >
      <Text size="sm" c="dimmed">{label}</Text>
      <Box style={{ maxWidth: '100%' }}>
        {typeof children === 'string' ? (
          <Text size="sm" fw={550}>{children}</Text>
        ) : (
          children
        )}
      </Box>
    </Group>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Stack gap={4}>
      <Title order={5} c="dimmed" tt="uppercase" fz={11} lts={0.6}>{title}</Title>
      {children}
    </Stack>
  );
}

export function ItemInfoSection({ item }: ItemInfoSectionProps) {
  const t = useTranslations('customer');

  return (
    <Stack gap="xl">
      <Section title={t('productDetails')}>
        <Field label={t('position')}>
          {item.latitude != null && item.longitude != null
            ? `${item.latitude}, ${item.longitude}`
            : '—'}
        </Field>
      </Section>


      {item.evidenceId && (
        <Section title={t('productCertification')}>
          <EvidenceVerification
            evidenceId={item.evidenceId}
            entityId={item.id}
            createdAt={item.createdAt}
            createdBy={item.createdBy}
          />
        </Section>
      )}
    </Stack>
  );
}
