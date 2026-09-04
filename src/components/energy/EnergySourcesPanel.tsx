'use client';

import { useState } from 'react';
import { Badge, Group, Paper, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useTranslations } from 'next-intl';
import { SourceDrawer } from './EnergyViews';
import type { EnergySourceRecord, EnergyConsumptionRecord } from '@/domain/energy/EnergyTypes';

/**
 * The energy sources of one installation.
 *
 * Sources used to have a map of their own, which plotted the same sites the
 * asset map already did — every source belongs to an asset, so it is the energy
 * side of one rather than a separate thing. Here they show up inside the
 * installation they belong to, next to the assets they power.
 */
export default function EnergySourcesPanel({
  sources,
  consumption,
}: {
  sources: EnergySourceRecord[];
  consumption: EnergyConsumptionRecord[];
}) {
  const t = useTranslations('energyHub');
  const [selected, setSelected] = useState<EnergySourceRecord | null>(null);
  const [opened, { open, close }] = useDisclosure(false);

  if (!sources.length) return null;

  return (
    <>
      <SourceDrawer source={selected} opened={opened} onClose={close} consumption={consumption} />

      <Stack gap="xs">
        {sources.map((source) => (
          <Paper
            key={source.id}
            withBorder
            p="sm"
            radius="md"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setSelected(source);
              open();
            }}
          >
            <Group justify="space-between" wrap="nowrap">
              <Stack gap={2} style={{ minWidth: 0 }}>
                <Text size="sm" fw={600} lineClamp={1}>{source.name}</Text>
                <Group gap={6}>
                  {source.generationTechnology && (
                    <Badge size="xs" variant="light" color="gray">
                      {source.generationTechnology}
                    </Badge>
                  )}
                  {source.renewableShare != null && (
                    <Badge size="xs" variant="light" color={source.renewableShare >= 90 ? 'green' : 'gray'}>
                      {source.renewableShare}% {t('mapTab.renewableShare').toLowerCase()}
                    </Badge>
                  )}
                  {source.guaranteeOfOriginId && (
                    <Badge size="xs" variant="light" color="datiaBlue">GO</Badge>
                  )}
                </Group>
              </Stack>
              {source.capacityKw != null && (
                <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
                  {source.capacityKw >= 1000
                    ? `${(source.capacityKw / 1000).toFixed(1)} MW`
                    : `${source.capacityKw.toFixed(0)} kW`}
                </Text>
              )}
            </Group>
          </Paper>
        ))}
      </Stack>
    </>
  );
}
