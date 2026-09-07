'use client';

import {
  Box,
  Paper,
  Text,
  Group,
  Title,
  Stack,
  SimpleGrid,
  Anchor,
  Badge,
} from '@mantine/core';
import {
  IconBolt,
  IconCloudFog,
  IconMap,
  IconArrowRight,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import CertificationChart, { TrendStat } from '@/components/dashboard/CertificationChart';
import ScopeBreakdown from '@/components/dashboard/ScopeBreakdown';
import type { CertificationTrend } from '@/actions/dashboard/getCertificationTrend';
import type { DashboardKPIs } from '@/types/dashboard';
import type { EnergySummary } from '@/actions/dashboard/getEnergySummary';

interface DashboardMantineProps {
  kpis: DashboardKPIs;
  trend?: CertificationTrend;
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

/** Renders a `YYYY-MM` key in the reader's locale. */
function monthName(month: string, locale: string) {
  if (!month) return '';
  const [year, m] = month.split('-').map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString(locale, { month: 'short', year: '2-digit' });
}

export default function DashboardMantine({
  kpis,
  trend,
  energySummary,
  energyEnabled = false,
  recentItems = [],
}: DashboardMantineProps) {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const tEnergy = useTranslations('energyHub');
  const tSidebar = useTranslations('sidebar');
  const tItems = useTranslations('itemsPage');

  const co2Tonnes = (energySummary.co2eKgThisMonth / 1000).toFixed(3);
  const kwhDisplay =
    energySummary.kwhThisMonth >= 1000
      ? `${(energySummary.kwhThisMonth / 1000).toFixed(1)} MWh`
      : `${energySummary.kwhThisMonth.toFixed(0)} kWh`;

  return (
    <Box px={{ base: 'md', sm: 'xl' }} py="lg" mx="auto" maw={1360}>
      <Title order={2} mb="lg">{tSidebar('home')}</Title>

      {/* Three figures, each with the ground it stands on, in place of six
          standalone numbers that answered no question. */}
      <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="md" mb="lg">
        <TrendStat
          label={t('stat.tracked')}
          value={kpis.totalPassports.toLocaleString()}
          hint={t('stat.trackedHint', {
            certified: kpis.backedPassports,
            pending: kpis.pendingPassports,
          })}
        />
        {trend && (
          <TrendStat
            label={t('stat.coverage')}
            value={`${trend.coverage}%`}
            hint={t('stat.coverageHint', {
              certified: Math.round((trend.coverage / 100) * trend.totalRecords).toLocaleString(locale),
              total: trend.totalRecords.toLocaleString(locale),
            })}
          />
        )}
        {trend?.monthly.length ? (
          <TrendStat
            label={t('stat.carbon')}
            value={(trend.monthly.at(-1)!.co2eKg / 1000).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            unit="t CO₂e"
            change={trend.co2eChange}
            hint={
              trend.currentMonth
                ? t('stat.inProgress', { kwh: trend.currentMonth.kwh.toLocaleString() })
                : undefined
            }
          />
        ) : null}
      </SimpleGrid>

      {trend && energyEnabled && (
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg" mb="lg">
          <Box style={{ gridColumn: 'span 2' }}>
            <CertificationChart data={trend.monthly} />
          </Box>
          <ScopeBreakdown
            slices={trend.byScope}
            period={`${monthName(trend.from, locale)} – ${monthName(trend.to, locale)}`}
          />
        </SimpleGrid>
      )}

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
