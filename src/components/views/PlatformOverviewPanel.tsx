'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  Anchor,
  Badge,
  Box,
  Center,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import PageHeader from '@/components/layout/PageHeader';
import CertificationChart, { TrendStat } from '@/components/dashboard/CertificationChart';
import ScopeBreakdown from '@/components/dashboard/ScopeBreakdown';
import { getPlatformHome, type PlatformHome } from '@/actions/admin/get-overview';

/** Renders a `YYYY-MM` key in the reader's locale. */
function monthName(month: string, locale: string) {
  if (!month) return '';
  const [year, m] = month.split('-').map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString(locale, { month: 'short', year: '2-digit' });
}

export default function PlatformOverviewPanel() {
  const t = useTranslations('superadminPanel.home');
  const tDashboard = useTranslations('dashboard');
  const locale = useLocale();
  const [data, setData] = useState<PlatformHome | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlatformHome()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  if (!data) return null;

  const { stats, trend, topOrganizations } = data;

  const tiles = (
    <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="md">
      <TrendStat
        label={t('stats.organizations')}
        value={stats.organizationsCount.toLocaleString(locale)}
        hint={t('stats.companiesHint', { active: stats.activeCompaniesCount, total: stats.companiesCount })}
      />
      <TrendStat
        label={tDashboard('stat.tracked')}
        value={stats.totalAssets.toLocaleString(locale)}
        hint={tDashboard('stat.trackedHint', {
          certified: stats.certifiedCertifications,
          pending: stats.totalCertifications - stats.certifiedCertifications,
        })}
      />
      <TrendStat
        label={tDashboard('stat.coverage')}
        value={`${trend.coverage}%`}
        hint={tDashboard('stat.coverageHint', {
          certified: Math.round((trend.coverage / 100) * trend.totalRecords).toLocaleString(locale),
          total: trend.totalRecords.toLocaleString(locale),
        })}
      />
      <TrendStat
        label={t('stats.pendingCertifications')}
        value={stats.pendingCertifications.toLocaleString(locale)}
        hint={stats.pendingCertifications > 0 ? t('stats.pendingCertificationsHint') : undefined}
      />
    </SimpleGrid>
  );

  const topOrganizationsPanel = topOrganizations.length > 0 && (
    <Paper withBorder radius="md" p="md" h="100%">
      <Group justify="space-between" mb="sm" wrap="nowrap">
        <Text fw={600} size="sm">{t('topOrganizations.title')}</Text>
        <Anchor component={Link} href="/admin/organizations" size="xs">
          {t('topOrganizations.viewAll')}
        </Anchor>
      </Group>
      <Stack gap={2}>
        {topOrganizations.map((org) => (
          <Anchor
            key={org.id}
            component={Link}
            href={`/admin/organizations/${org.id}`}
            underline="never"
            c="inherit"
            px={8}
            py={7}
            style={{ borderRadius: 8 }}
          >
            <Group justify="space-between" wrap="nowrap" gap="sm">
              <Text size="sm" fw={550} truncate style={{ minWidth: 0 }}>{org.name}</Text>
              <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
                <Badge size="sm" variant="light" color="datiaBlue">
                  {t('topOrganizations.assets', { count: org.assets })}
                </Badge>
                <Badge size="sm" variant="light" color="yellow">
                  {t('topOrganizations.certifications', { count: org.certifications })}
                </Badge>
              </Group>
            </Group>
          </Anchor>
        ))}
      </Stack>
    </Paper>
  );

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />

      {/* The platform's own Inicio leads with the trend across every
          organization, not a row of tiles — the figures that matter are
          downstream of what's moving, not the other way round. */}
      {trend.monthly.length > 0 && (
        <Box mb="lg">
          <CertificationChart data={trend.monthly} />
        </Box>
      )}

      <Box mb="lg">{tiles}</Box>

      {(trend.monthly.length > 0 || topOrganizationsPanel) && (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {trend.monthly.length > 0 && (
            <ScopeBreakdown
              slices={trend.byScope}
              period={`${monthName(trend.from, locale)} – ${monthName(trend.to, locale)}`}
            />
          )}
          {topOrganizationsPanel}
        </SimpleGrid>
      )}
    </>
  );
}
