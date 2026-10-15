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
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { IconSignature } from '@tabler/icons-react';
import PageHeader from '@/components/layout/PageHeader';
import { TrendStat } from '@/components/dashboard/CertificationChart';
import { getPlatformHome, type PlatformHome } from '@/actions/admin/get-overview';

const DAY_MS = 24 * 60 * 60 * 1000;

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

  const { stats, trend, topOrganizations, pendingSignatures } = data;
  const waitingDays = (since: Date) => Math.floor((Date.now() - new Date(since).getTime()) / DAY_MS);

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

      {/* Emissions are a company's own concern, not iCommunity's — what the
          platform's own Inicio leads with is the one thing only iCommunity
          can act on: companies whose signature iBS still hasn't approved. */}
      <Paper withBorder radius="md" p="md" mb="lg">
        <Group gap="xs" wrap="nowrap" mb="xs">
          <ThemeIcon color="datiaRed" variant="light" size={28} radius="md">
            <IconSignature size={16} stroke={1.6} />
          </ThemeIcon>
          <Text fw={600} size="sm">{t('pendingSignatures.title')}</Text>
        </Group>
        <Text size="xs" c="dimmed" mb="sm">{t('pendingSignatures.description')}</Text>
        {pendingSignatures.length === 0 ? (
          <Center py="lg">
            <Text size="sm" c="dimmed">{t('pendingSignatures.empty')}</Text>
          </Center>
        ) : (
          <ScrollArea>
            <Table striped highlightOnHover verticalSpacing="xs" miw={480}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('pendingSignatures.table.organization')}</Table.Th>
                  <Table.Th>{t('pendingSignatures.table.company')}</Table.Th>
                  <Table.Th>{t('pendingSignatures.table.waiting')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {pendingSignatures.map((row) => {
                  const days = waitingDays(row.waitingSince);
                  return (
                    <Table.Tr key={row.companyId}>
                      <Table.Td><Text size="sm" fw={550}>{row.organizationName}</Text></Table.Td>
                      <Table.Td><Text size="sm" c="dimmed">{row.companyName}</Text></Table.Td>
                      <Table.Td>
                        <Text size="sm" c={days >= 1 ? 'orange' : 'dimmed'}>
                          {t('pendingSignatures.table.waitingSince', { date: new Date(row.waitingSince).toLocaleDateString(locale) })}
                          {days >= 1 && ` · ${t('pendingSignatures.table.daysWaiting', { count: days })}`}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Paper>

      <Box mb="lg">{tiles}</Box>

      {topOrganizationsPanel}
    </>
  );
}
