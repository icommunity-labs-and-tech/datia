'use client';

import {
  Box,
  Flex,
  Paper,
  Text,
  Group,
  ThemeIcon,
  Title,
  Stack,
  Progress,
  SimpleGrid,
  Button,
  Center,
  Anchor,
  Badge,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconPackage,
  IconBolt,
  IconCloudFog,
  IconLeaf,
  IconMap,
  IconArrowRight,
  IconCertificate,
  IconHistory,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { DashboardKPIs } from '@/types/dashboard';
import type { EnergySummary } from '@/actions/dashboard/getEnergySummary';
import type { EnergySourceRecord, EnergyCarrier } from '@/domain/energy/EnergyTypes';
import EnergySourcesGlobalMapLazy from '@/components/maps/EnergySourcesGlobalMapLazy';
import { CARRIER_COLORS } from '@/lib/energy/carrierColors';

interface DashboardMantineProps {
  kpis: DashboardKPIs;
  energySummary: EnergySummary;
  energySources: EnergySourceRecord[];
  /** When the energy module is off, its metrics and map stay out of the way. */
  energyEnabled?: boolean;
  recentItems?: RecentItem[];
}

interface RecentItem {
  id: string;
  name: string;
  categoryName: string | null;
  certified: boolean;
}

interface StatTileProps {
  icon: React.ElementType;
  color: string;
  label: string;
  value: string | number;
  hint: string;
}

/** Flat metric tile — one accent per tile, numbers carry the emphasis. */
function StatTile({ icon: Icon, color, label, value, hint }: StatTileProps) {
  return (
    <Paper p="md" radius="md">
      <Group gap={8} mb={10}>
        <ThemeIcon color={color} variant="light" size={26} radius="sm">
          <Icon size={14} stroke={1.7} />
        </ThemeIcon>
        <Text size="xs" c="dimmed" tt="uppercase" fw={650} lts={0.4}>
          {label}
        </Text>
      </Group>
      <Text fw={700} fz={26} lh={1.1} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Text>
      <Text size="xs" c="dimmed" mt={2} lineClamp={1}>{hint}</Text>
    </Paper>
  );
}

export default function DashboardMantine({
  kpis,
  energySummary,
  energySources,
  energyEnabled = false,
  recentItems = [],
}: DashboardMantineProps) {
  const t = useTranslations('dashboard');
  const tHub = useTranslations('energyHub');
  const tSidebar = useTranslations('sidebar');
  const tItems = useTranslations('itemsPage');
  const isMobile = useMediaQuery('(max-width: 62em)');

  const co2Tonnes = (energySummary.co2eKgThisMonth / 1000).toFixed(3);
  const kwhDisplay =
    energySummary.kwhThisMonth >= 1000
      ? `${(energySummary.kwhThisMonth / 1000).toFixed(1)} MWh`
      : `${energySummary.kwhThisMonth.toFixed(0)} kWh`;

  const hasMappedSources =
    energyEnabled && energySources.some((s) => s.latitude != null && s.longitude != null);

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

  const renderTiles = (cols: Record<string, number>) => (
    <SimpleGrid cols={cols} spacing="sm">
      <StatTile
        icon={IconPackage}
        color="datiaBlue"
        label={t('kpis.totalItems.title')}
        value={kpis.totalPassports}
        hint={t('kpis.totalItems.subtitle')}
      />
      <StatTile
        icon={IconCertificate}
        color="green"
        label={t('kpis.backupRate.title')}
        value={`${kpis.backupRate.toFixed(0)}%`}
        hint={t('kpis.backupRate.subtitle', {
          backed: kpis.backedPassports,
          total: kpis.totalPassports,
        })}
      />
      <StatTile
        icon={IconHistory}
        color="gray"
        label={t('kpis.statesThisMonth.title')}
        value={kpis.statesThisMonth}
        hint={t('kpis.statesThisMonth.subtitle')}
      />
      {energyEnabled && (
        <>
          <StatTile
            icon={IconBolt}
            color="datiaAmber"
            label={t('kwhThisMonth')}
            value={kwhDisplay}
            hint={`${energySummary.totalSources} ${t('totalSources')}`}
          />
          <StatTile
            icon={IconCloudFog}
            color="gray"
            label={t('co2ThisMonth')}
            value={`${co2Tonnes} t`}
            hint="CO₂e Scope 2"
          />
          <StatTile
            icon={IconLeaf}
            color="green"
            label={t('renewableAvg')}
            value={
              energySummary.avgRenewableShare != null
                ? `${energySummary.avgRenewableShare}%`
                : '—'
            }
            hint={t('renewableSubtitle')}
          />
        </>
      )}
    </SimpleGrid>
  );

  const activityPanel = (
    <Paper p="md" radius="md">
      <Text fw={600} size="sm" mb="sm">{t('activity')}</Text>
      <Stack gap={8}>
        {[
          [t('kpis.backupRate.title'), `${kpis.backupRate.toFixed(1)}%`],
          [t('kpis.statesThisMonth.title'), kpis.statesThisMonth],
          ...(energyEnabled
            ? ([
                [t('totalSources'), energySummary.totalSources],
                [t('sourcesWithCoords'), energySummary.sourcesWithCoords],
              ] as Array<[string, string | number]>)
            : []),
        ].map(([label, value]) => (
          <Group key={String(label)} justify="space-between">
            <Text size="sm" c="dimmed">{label}</Text>
            <Text size="sm" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</Text>
          </Group>
        ))}
      </Stack>
    </Paper>
  );

  // Either the energy module is off, or it has no mapped sources yet — a blank
  // world map helps nobody, so show a calmer overview instead.
  if (!hasMappedSources) {
    return (
      <Box px={{ base: 'md', sm: 'xl' }} py="lg" mx="auto" maw={1360}>
        <Title order={2} mb="lg">{tSidebar('home')}</Title>

        {renderTiles({ base: 1, xs: 2, md: 3 })}

        <SimpleGrid cols={{ base: 1, md: energyEnabled ? 2 : 1 }} spacing="lg" mt="lg">
          {recentItems.length > 0 && (
            <Paper p="md" radius="md">
              <Group justify="space-between" mb="sm" wrap="nowrap">
                <Text fw={600} size="sm">{t('recentAssets')}</Text>
                <Anchor component={Link} href="/dashboard/items" size="xs" fw={550}>
                  {t('viewAll')}
                </Anchor>
              </Group>
              <Stack gap={2}>
                {recentItems.map((item) => (
                  <Anchor
                    key={item.id}
                    component={Link}
                    href={`/dashboard/items/${item.id}`}
                    underline="never"
                    c="inherit"
                    px={8}
                    py={7}
                    style={{ borderRadius: 8 }}
                  >
                    <Group justify="space-between" wrap="nowrap" gap="sm">
                      <Stack gap={0} style={{ minWidth: 0 }}>
                        <Text size="sm" fw={550} truncate>{item.name}</Text>
                        {item.categoryName && (
                          <Text size="xs" c="dimmed" truncate>{item.categoryName}</Text>
                        )}
                      </Stack>
                      <Badge
                        size="xs"
                        variant="light"
                        color={item.certified ? 'green' : 'yellow'}
                        style={{ flexShrink: 0 }}
                      >
                        {item.certified ? tItems('certified') : tItems('pending')}
                      </Badge>
                    </Group>
                  </Anchor>
                ))}
              </Stack>
            </Paper>
          )}

          {energyEnabled && (
            <Paper p="xl" radius="md">
              <Center h="100%">
                <Stack align="center" gap="sm" maw={360}>
                  <ThemeIcon color="gray" variant="light" size={48} radius="xl">
                    <IconMap size={24} stroke={1.5} />
                  </ThemeIcon>
                  <Text size="sm" c="dimmed" ta="center">{t('noSourcesOnMap')}</Text>
                  <Button
                    component={Link}
                    href="/dashboard/energy"
                    variant="light"
                    size="xs"
                    rightSection={<IconArrowRight size={14} />}
                  >
                    {tSidebar('energy')}
                  </Button>
                </Stack>
              </Center>
            </Paper>
          )}
        </SimpleGrid>
      </Box>
    );
  }

  return (
    <Flex
      direction={{ base: 'column', md: 'row' }}
      p={16}
      gap={16}
      style={{
        minHeight: isMobile ? undefined : 'calc(100vh - var(--app-shell-header-height, 60px))',
        maxHeight: isMobile ? undefined : 'calc(100vh - var(--app-shell-header-height, 60px))',
        overflow: isMobile ? undefined : 'hidden',
      }}
    >
      {/* ── Map ¾ ── */}
      <Paper
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
          px="md"
          py="sm"
          style={{ borderBottom: '1px solid var(--mantine-color-gray-2)', flexShrink: 0 }}
        >
          <ThemeIcon color="datiaBlue" variant="light" size={26} radius="sm">
            <IconMap size={14} stroke={1.7} />
          </ThemeIcon>
          <Title order={5}>{t('energyMap')}</Title>
          <Text size="xs" c="dimmed" ml="auto">
            {energySummary.sourcesWithCoords}/{energySummary.totalSources} {t('totalSources')}
          </Text>
        </Group>

        <Box style={{ flex: 1, minHeight: isMobile ? 280 : 0 }}>
          <EnergySourcesGlobalMapLazy sources={energySources} height="100%" />
        </Box>
      </Paper>

      {/* ── Right panel ¼ ── */}
      <Stack
        style={{
          flex: 1,
          overflowY: isMobile ? undefined : 'auto',
          minWidth: isMobile ? undefined : 280,
        }}
        gap="sm"
      >
        {renderTiles({ base: 2 })}

        {carrierData.length > 0 && (
          <Paper p="md" radius="md">
            <Text fw={600} size="sm" mb="sm">{t('capacityByCarrier')}</Text>
            <Stack gap={10}>
              {carrierData.map(({ carrier, kw, color }) => (
                <Stack key={carrier} gap={4}>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">{tHub(`carriers.${carrier}`)}</Text>
                    <Text size="xs" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {kw >= 1000 ? `${(kw / 1000).toFixed(1)} MW` : `${kw.toFixed(0)} kW`}
                    </Text>
                  </Group>
                  <Progress value={(kw / maxKw) * 100} size={5} color={color} radius="xl" />
                </Stack>
              ))}
            </Stack>
          </Paper>
        )}

        {activityPanel}
      </Stack>
    </Flex>
  );
}
