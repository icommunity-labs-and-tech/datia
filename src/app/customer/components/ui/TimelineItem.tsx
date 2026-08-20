'use client';

import { Badge, Group, Image, Loader, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { useTranslations } from 'next-intl';
import { StateData } from '../../types';
import { TimestampBadge } from './TimestampBadge';
import { VerifiedBadge } from './VerifiedBadge';
import { EvidenceVerification } from '../EvidenceVerification';
import GeolocationMap from '@/components/GeolocationMapClient';
import { extractGeolocationField } from '@/lib/template-helpers';
import type { StateLoadStatus } from '../sections/ItemHistorySection';

interface TimelineItemProps {
  state: StateData;
  loadStatus?: StateLoadStatus;
}

export function TimelineItem({ state, loadStatus = 'loaded' }: TimelineItemProps) {
  const t = useTranslations('customer');
  const isPending = loadStatus === 'pending';
  const geolocation = extractGeolocationField(state.templateConfig);

  return (
    <Paper p="md" radius="md">
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm" mb={6}>
        <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
          <Text fw={600} size="sm" style={{ minWidth: 0 }}>{state.title}</Text>
          {state.evidenceID && <VerifiedBadge title={t('stateVerified')} size="sm" />}
        </Group>
        <TimestampBadge timestamp={state.createdAt} />
      </Group>

      {state.statusType?.name && (
        <Badge size="xs" variant="light" color="gray" mb={8}>
          {state.statusType.name}
        </Badge>
      )}

      {state.description && (
        <Text size="sm" c="dimmed" mb="sm">{state.description}</Text>
      )}

      {geolocation && (
        <Stack mb="sm">
          <GeolocationMap value={geolocation} readOnly />
        </Stack>
      )}

      {state.imageUrls && state.imageUrls.length > 0 && (
        <SimpleGrid cols={{ base: 3, xs: 4, sm: 6 }} spacing="xs" mb="sm">
          {state.imageUrls.map((url, index) => (
            <Image
              key={url}
              src={url}
              alt={t('evidenceImageAlt', { index: index + 1 })}
              h={64}
              radius="sm"
              fit="cover"
            />
          ))}
        </SimpleGrid>
      )}

      {state.evidenceID && isPending && (
        <Group gap="xs">
          <Loader size="xs" />
          <Text size="xs" c="dimmed">{t('loadingCertification')}</Text>
        </Group>
      )}

      {state.evidenceID && !isPending && (
        <EvidenceVerification
          evidenceId={state.evidenceID}
          type="state"
          entityId={state.id}
          createdAt={state.createdAt}
          createdBy={state.createdBy}
        />
      )}
    </Paper>
  );
}
