'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import {
  Anchor,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconArrowRight,
  IconBolt,
  IconBuilding,
  IconCloudFog,
  IconMap,
  IconUsers,
} from '@tabler/icons-react';
import PageHeader from '@/components/layout/PageHeader';
import CertificationChart, { TrendStat } from '@/components/dashboard/CertificationChart';
import ScopeBreakdown from '@/components/dashboard/ScopeBreakdown';
import CompanyComparisonTable from './CompanyComparisonTable';
import type { OrganizationOverview as OrganizationOverviewData } from '@/actions/organizations/get-overview';
import type { CertificationTrend } from '@/lib/dashboard/certificationTrend';
import type { EnergySummary } from '@/lib/dashboard/energySummary';
import type { CompanyComparisonRow } from '@/actions/organizations/get-company-comparison';
import type { RecentOrganizationAsset } from '@/actions/organizations/get-recent-assets';

interface Props {
  overview: OrganizationOverviewData;
  trend?: CertificationTrend;
  energySummary: EnergySummary;
  energyEnabled: boolean;
  comparison: CompanyComparisonRow[];
  recentAssets: RecentOrganizationAsset[];
}

/** Renders a `YYYY-MM` key in the reader's locale. */
function monthName(month: string, locale: string) {
  if (!month) return '';
  const [year, m] = month.split('-').map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString(locale, { month: 'short', year: '2-digit' });
}

export default function OrganizationOverview({
  overview,
  trend,
  energySummary,
  energyEnabled,
  comparison,
  recentAssets,
}: Props) {
  const t = useTranslations('organizationOverview');
  const tDashboard = useTranslations('dashboard');
  const tEnergy = useTranslations('energyHub');
  const tSidebar = useTranslations('sidebar');
  const tItems = useTranslations('itemsPage');
  const locale = useLocale();

  if (overview.companiesCount === 0) {
    return (
      <>
        <PageHeader title={t('title')} description={t('description')} />
        <Paper withBorder radius="md" p="xl">
          <Center>
            <Text size="sm" c="dimmed">{t('empty')}</Text>
          </Center>
        </Paper>
      </>
    );
  }

  const structureStats = [
    {
      icon: IconBuilding,
      label: t('stats.companies'),
      value: overview.companiesCount,
      detail: t('stats.companiesDetail', { active: overview.activeCompaniesCount }),
    },
    {
      icon: IconUsers,
      label: t('stats.accounts'),
      value: overview.activeAccountsCount + overview.pendingAccountsCount,
      detail: t('stats.accountsDetail', {
        active: overview.activeAccountsCount,
        pending: overview.pendingAccountsCount,
      }),
    },
  ];

  const co2Tonnes = (energySummary.co2eKgThisMonth / 1000).toFixed(3);
  const kwhDisplay =
    energySummary.kwhThisMonth >= 1000
      ? `${(energySummary.kwhThisMonth / 1000).toFixed(1)} MWh`
      : `${energySummary.kwhThisMonth.toFixed(0)} kWh`;

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button
            component={Link}
            href="/organization/companies"
            variant="light"
            rightSection={<IconArrowRight size={16} />}
          >
            {t('viewCompanies')}
          </Button>
        }
      />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="lg">
        {structureStats.map(({ icon: Icon, label, value, detail }) => (
          <Paper key={label} withBorder radius="md" p="md">
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <ThemeIcon color="datiaBlue" variant="light" size={36} radius="md">
                <Icon size={18} stroke={1.6} />
              </ThemeIcon>
              <Stack gap={0}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{label}</Text>
                <Title order={3}>{value}</Title>
                {detail && <Text size="xs" c="dimmed">{detail}</Text>}
              </Stack>
            </Group>
          </Paper>
        ))}
      </SimpleGrid>

      {/* Same figures a company's own Inicio leads with, summed across every
          company this organization operates. */}
      <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="md" mb="lg">
        <TrendStat
          label={tDashboard('stat.tracked')}
          value={overview.totalAssets.toLocaleString(locale)}
          hint={tDashboard('stat.trackedHint', {
            certified: overview.certifiedCertifications,
            pending: overview.totalCertifications - overview.certifiedCertifications,
          })}
        />
        {trend && (
          <TrendStat
            label={tDashboard('stat.coverage')}
            value={`${trend.coverage}%`}
            hint={tDashboard('stat.coverageHint', {
              certified: Math.round((trend.coverage / 100) * trend.totalRecords).toLocaleString(locale),
              total: trend.totalRecords.toLocaleString(locale),
            })}
          />
        )}
        {trend?.monthly.length ? (
          <TrendStat
            label={tDashboard('stat.carbon')}
            value={(trend.monthly.at(-1)!.co2eKg / 1000).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            unit="t CO₂e"
            change={trend.co2eChange}
            hint={
              trend.currentMonth
                ? tDashboard('stat.inProgress', { kwh: trend.currentMonth.kwh.toLocaleString() })
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

      <Box mb="lg">
        <CompanyComparisonTable rows={comparison} />
      </Box>

      <SimpleGrid cols={{ base: 1, md: energyEnabled ? 2 : 1 }} spacing="lg">
        {recentAssets.length > 0 && (
          <Paper p="md" radius="md" withBorder>
            <Group justify="space-between" mb="sm" wrap="nowrap">
              <Text fw={600} size="sm">{tDashboard('recentAssets')}</Text>
            </Group>
            <Stack gap={2}>
              {recentAssets.map((asset) => (
                <Anchor
                  key={asset.id}
                  component={Link}
                  href={asset.companyId ? `/organization/companies/${asset.companyId}/assets/${asset.id}` : '#'}
                  underline="never"
                  c="inherit"
                  px={8}
                  py={7}
                  style={{ borderRadius: 8 }}
                >
                  <Group justify="space-between" wrap="nowrap" gap="sm">
                    <Stack gap={0} style={{ minWidth: 0 }}>
                      <Text size="sm" fw={550} truncate>{asset.name}</Text>
                      {asset.companyName && (
                        <Text size="xs" c="dimmed" truncate>{asset.companyName}</Text>
                      )}
                    </Stack>
                    <Badge
                      size="xs"
                      variant="light"
                      color={asset.certified ? 'green' : 'yellow'}
                      style={{ flexShrink: 0 }}
                    >
                      {asset.certified ? tItems('certified') : tItems('pending')}
                    </Badge>
                  </Group>
                </Anchor>
              ))}
            </Stack>
          </Paper>
        )}

        {energyEnabled && (
          <Paper p="md" radius="md" withBorder>
            <Group justify="space-between" mb="sm" wrap="nowrap">
              <Text fw={600} size="sm">{tSidebar('energy')}</Text>
            </Group>
            <Stack gap={2}>
              {[
                // No organization-wide map exists yet: this row stays a figure, not a link.
                { href: null, icon: IconMap, label: tEnergy('tabs.map'), hint: `${energySummary.sourcesWithCoords}/${energySummary.totalSources}` },
                { href: '/organization/consumption', icon: IconBolt, label: tEnergy('tabs.consumption'), hint: kwhDisplay },
                { href: '/organization/emissions', icon: IconCloudFog, label: tEnergy('tabs.emissions'), hint: `${co2Tonnes} t` },
              ].map(({ href, icon: Icon, label, hint }) =>
                href ? (
                  <Anchor
                    key={label}
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
                ) : (
                  <Group key={label} justify="space-between" wrap="nowrap" gap="sm" px={8} py={9}>
                    <Group gap={10} wrap="nowrap">
                      <Icon size={16} stroke={1.7} color="var(--mantine-color-gray-6)" />
                      <Text size="sm" fw={550}>{label}</Text>
                    </Group>
                    <Text size="xs" c="dimmed" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {hint}
                    </Text>
                  </Group>
                )
              )}
            </Stack>
            <Anchor component={Link} href="/organization/companies" size="xs" fw={550} mt="xs">
              {t('viewCompanies')}
            </Anchor>
          </Paper>
        )}
      </SimpleGrid>
    </>
  );
}
