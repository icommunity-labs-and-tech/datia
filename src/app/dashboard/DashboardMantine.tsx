'use client';

import {
  Box,
  Flex,
  Paper,
  Text,
  Group,
  ThemeIcon,
  Title,
  Alert,
  Stack,
  Progress,
  SimpleGrid,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconPackage,
  IconBolt,
  IconCloudFog,
  IconLeaf,
  IconMap,
  IconInfoCircle,
} from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import type { DashboardKPIs } from '@/types/dashboard';
import type { EnergySummary } from '@/actions/dashboard/getEnergySummary';
import type { EnergySourceRecord, EnergyCarrier } from '@/domain/energy/EnergyTypes';
import EnergySourcesGlobalMapLazy from '@/components/maps/EnergySourcesGlobalMapLazy';
import { CARRIER_COLORS } from '@/components/maps/EnergySourcesGlobalMap';

interface DashboardMantineProps {
  kpis: DashboardKPIs;
  energySummary: EnergySummary;
  energySources: EnergySourceRecord[];
}

export default function DashboardMantine({ kpis, energySummary, energySources }: DashboardMantineProps) {
  const t = useTranslations('dashboard');
  const tHub = useTranslations('energyHub');
  const isMobile = useMediaQuery('(max-width: 62em)');

  const co2Tonnes = (energySummary.co2eKgThisMonth / 1000).toFixed(3);
  const kwhDisplay =
    energySummary.kwhThisMonth >= 1000
      ? `${(energySummary.kwhThisMonth / 1000).toFixed(1)} MWh`
      : `${energySummary.kwhThisMonth.toFixed(0)} kWh`;

  const hasMappedSources = energySources.some((s) => s.latitude != null && s.longitude != null);

  // Capacity by carrier for the right-panel chart
  const capacityByCarrier = energySources.reduce<Record<string, number>>((acc, src) => {
    const c = src.energyCarrier as string;
    acc[c] = (acc[c] ?? 0) + (src.capacityKw ?? 0);
    return acc;
  }, {});

  const carrierData = Object.entries(capacityByCarrier)
    .sort((a, b) => b[1] - a[1])
    .map(([carrier, kw]) => ({
      carrier,
      kw,
      color: CARRIER_COLORS[carrier as EnergyCarrier] ?? '#868e96',
    }));

  const maxKw = carrierData[0]?.kw ?? 1;

  return (
    <Flex
      direction={{ base: 'column', md: 'row' }}
      p={14}
      gap={14}
      style={{
        minHeight: isMobile ? undefined : 'calc(100vh - var(--app-shell-header-height, 56px))',
        maxHeight: isMobile ? undefined : 'calc(100vh - var(--app-shell-header-height, 56px))',
        overflow: isMobile ? undefined : 'hidden',
      }}
    >
      {/* ── Map ¾ ── */}
      <Paper
        withBorder
        radius="md"
        style={{
          flex: isMobile ? undefined : 3,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
          minHeight: isMobile ? 340 : undefined,
        }}
      >
        <Group
          p="sm"
          pb="xs"
          style={{ borderBottom: '1px solid var(--mantine-color-default-border)', flexShrink: 0 }}
        >
          <ThemeIcon color="datiaBlue" variant="light" size={26} radius="sm">
            <IconMap size={15} />
          </ThemeIcon>
          <Title order={5}>{t('energyMap')}</Title>
          <Text size="xs" c="dimmed" ml="auto">
            {energySummary.sourcesWithCoords}/{energySummary.totalSources} {t('totalSources')}
          </Text>
        </Group>

        <Box style={{ flex: 1, minHeight: isMobile ? 280 : 0 }}>
          {!hasMappedSources ? (
            <Alert icon={<IconInfoCircle size={16} />} color="datiaBlue" variant="light" m="md">
              {t('noSourcesOnMap')}
            </Alert>
          ) : (
            <EnergySourcesGlobalMapLazy sources={energySources} height="100%" />
          )}
        </Box>
      </Paper>

      {/* ── Right panel ¼ ── */}
      <Stack
        style={{
          flex: 1,
          overflowY: isMobile ? undefined : 'auto',
          minWidth: isMobile ? undefined : 260,
        }}
        gap="sm"
      >

        {/* KPIs 2×2 */}
        <SimpleGrid cols={2} spacing="xs">
          <Paper withBorder p="sm" radius="md">
            <ThemeIcon color="datiaBlue" variant="light" size={24} radius="sm" mb={4}>
              <IconPackage size={13} />
            </ThemeIcon>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700} lts={0.5} lh={1}>
              {t('kpis.totalItems.title')}
            </Text>
            <Text fw={800} fz="xl" c="datiaBlue" lh={1.1} mt={2}>{kpis.totalPassports}</Text>
            <Text size="xs" c="dimmed">{t('kpis.totalItems.subtitle')}</Text>
          </Paper>

          <Paper withBorder p="sm" radius="md">
            <ThemeIcon color="datiaAmber" variant="light" size={24} radius="sm" mb={4}>
              <IconBolt size={13} />
            </ThemeIcon>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700} lts={0.5} lh={1}>
              {t('kwhThisMonth')}
            </Text>
            <Text fw={800} fz="xl" c="datiaAmber.6" lh={1.1} mt={2}>{kwhDisplay}</Text>
            <Text size="xs" c="dimmed">{energySummary.totalSources} {t('totalSources')}</Text>
          </Paper>

          <Paper withBorder p="sm" radius="md">
            <ThemeIcon color="gray" variant="light" size={24} radius="sm" mb={4}>
              <IconCloudFog size={13} />
            </ThemeIcon>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700} lts={0.5} lh={1}>
              {t('co2ThisMonth')}
            </Text>
            <Text fw={800} fz="xl" c="dimmed" lh={1.1} mt={2}>{co2Tonnes} t</Text>
            <Text size="xs" c="dimmed">CO₂e Scope 2</Text>
          </Paper>

          <Paper withBorder p="sm" radius="md">
            <ThemeIcon color="green" variant="light" size={24} radius="sm" mb={4}>
              <IconLeaf size={13} />
            </ThemeIcon>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700} lts={0.5} lh={1}>
              {t('renewableAvg')}
            </Text>
            <Text fw={800} fz="xl" c="green" lh={1.1} mt={2}>
              {energySummary.avgRenewableShare != null
                ? `${energySummary.avgRenewableShare}%`
                : '—'}
            </Text>
            <Text size="xs" c="dimmed">{t('renewableSubtitle')}</Text>
          </Paper>
        </SimpleGrid>

        {/* Capacity by carrier */}
        {carrierData.length > 0 && (
          <Paper withBorder p="sm" radius="md">
            <Text fw={600} size="sm" mb="xs">{t('capacityByCarrier')}</Text>
            <Stack gap={8}>
              {carrierData.map(({ carrier, kw, color }) => (
                <Stack key={carrier} gap={3}>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">{tHub(`carriers.${carrier}`)}</Text>
                    <Text size="xs" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {kw >= 1000 ? `${(kw / 1000).toFixed(1)} MW` : `${kw.toFixed(0)} kW`}
                    </Text>
                  </Group>
                  <Progress value={(kw / maxKw) * 100} size={6} color={color} radius="xl" />
                </Stack>
              ))}
            </Stack>
          </Paper>
        )}

        {/* Activity */}
        <Paper withBorder p="sm" radius="md">
          <Text fw={600} size="sm" mb="xs">{t('activity')}</Text>
          <Stack gap={6}>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">{t('kpis.backupRate.title')}</Text>
              <Text size="sm" fw={600}>{kpis.backupRate.toFixed(1)}%</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">{t('kpis.statesThisMonth.title')}</Text>
              <Text size="sm" fw={600}>{kpis.statesThisMonth}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">{t('totalSources')}</Text>
              <Text size="sm" fw={600}>{energySummary.totalSources}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">{t('sourcesWithCoords')}</Text>
              <Text size="sm" fw={600}>{energySummary.sourcesWithCoords}</Text>
            </Group>
          </Stack>
        </Paper>

      </Stack>
    </Flex>
  );
}
