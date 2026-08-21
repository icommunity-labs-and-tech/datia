'use client';

import {
  Box,
  Paper,
  Text,
  Group,
  ThemeIcon,
  Title,
  Stack,
  SimpleGrid,
  Anchor,
  Badge,
} from '@mantine/core';
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

interface DashboardMantineProps {
  kpis: DashboardKPIs;
  energySummary: EnergySummary;
  /** When the energy module is off, its metrics stay out of the way. */
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
  energyEnabled = false,
  recentItems = [],
}: DashboardMantineProps) {
  const t = useTranslations('dashboard');
  const tEnergy = useTranslations('energyHub');
  const tSidebar = useTranslations('sidebar');
  const tItems = useTranslations('itemsPage');

  const co2Tonnes = (energySummary.co2eKgThisMonth / 1000).toFixed(3);
  const kwhDisplay =
    energySummary.kwhThisMonth >= 1000
      ? `${(energySummary.kwhThisMonth / 1000).toFixed(1)} MWh`
      : `${energySummary.kwhThisMonth.toFixed(0)} kWh`;

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

        {/* Entry points rather than an embedded copy: each energy view is a
            destination of its own in the top bar. */}
        {energyEnabled && (
          <Paper p="md" radius="md">
            <Text fw={600} size="sm" mb="sm">{tSidebar('energy')}</Text>
            <Stack gap={2}>
              {[
                { href: '/dashboard/energy/sources', icon: IconMap, label: tEnergy('tabs.map'), hint: `${energySummary.sourcesWithCoords}/${energySummary.totalSources}` },
                { href: '/dashboard/energy/consumption', icon: IconBolt, label: tEnergy('tabs.consumption'), hint: kwhDisplay },
                { href: '/dashboard/energy/emissions', icon: IconCloudFog, label: tEnergy('tabs.emissions'), hint: `${co2Tonnes} t` },
              ].map(({ href, icon: Icon, label, hint }) => (
                <Anchor
                  key={href}
                  component={Link}
                  href={href}
                  underline="never"
                  c="inherit"
                  px={8}
                  py={9}
                  style={{ borderRadius: 8 }}
                >
                  <Group justify="space-between" wrap="nowrap" gap="sm">
                    <Group gap={10} wrap="nowrap">
                      <Icon size={16} stroke={1.7} color="var(--mantine-color-gray-6)" />
                      <Text size="sm" fw={550}>{label}</Text>
                    </Group>
                    <Group gap={6} wrap="nowrap">
                      <Text size="xs" c="dimmed" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {hint}
                      </Text>
                      <IconArrowRight size={14} stroke={1.7} color="var(--mantine-color-gray-5)" />
                    </Group>
                  </Group>
                </Anchor>
              ))}
            </Stack>
          </Paper>
        )}
      </SimpleGrid>
    </Box>
  );
}
