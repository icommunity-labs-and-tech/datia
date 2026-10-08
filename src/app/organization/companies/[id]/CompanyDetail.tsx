'use client';

import {
  Anchor,
  Badge,
  Group,
  Paper,
  ScrollArea,
  Table,
  Tabs,
  Text,
} from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import PageHeader from '@/components/layout/PageHeader';
import { EnergyConsumption, EnergyEmissions } from '@/components/energy/EnergyViews';
import type { CompanyOverview } from '@/actions/companies/overview-core';
import type { CompanyEnergy } from '@/actions/companies/get-company-energy';
import { getCompanyEnergyForecast } from '@/actions/companies/get-company-energy';
import type { Heatmap } from '@/lib/energy/heatmap';

export default function CompanyDetail({
  overview,
  energy,
  companyId,
}: {
  overview: CompanyOverview;
  energy: CompanyEnergy | null;
  companyId: string;
}) {
  const t = useTranslations('companiesPage.detail');
  const tEnergy = useTranslations('energyHub');
  const tScope = useTranslations('dashboard.scope');
  const locale = useLocale();
  const { company, assets, certifications, accounts } = overview;
  const date = (value: Date | null) => (value ? new Date(value).toLocaleDateString(locale) : '—');
  const empty = (label: string) => <Text size="sm" c="dimmed" py="md">{label}</Text>;
  const fetchForecast = (horizon: 3 | 6 | 12) => getCompanyEnergyForecast(companyId, horizon);

  // The heatmap's rows come back as raw GHG scope keys; this is where they
  // meet the reader's language, same as the scope breakdown elsewhere.
  const labeledEmissionsHeatmap: Heatmap | undefined = energy
    ? {
        ...energy.emissionsHeatmap,
        rows: energy.emissionsHeatmap.rows.map((r) => ({
          ...r,
          label: tScope(r.label as 'SCOPE_1' | 'SCOPE_2' | 'SCOPE_3'),
        })),
      }
    : undefined;

  return (
    <>
      <Anchor component={Link} href="/organization/companies" size="sm" mb="xs" display="inline-flex">
        <IconArrowLeft size={14} style={{ marginRight: 4, alignSelf: 'center' }} />
        {t('back')}
      </Anchor>

      <PageHeader
        title={company.name}
        description={t('description')}
        actions={<Badge variant="light" color="gray">{t('readOnly')}</Badge>}
      >
        <Group gap="lg" mt="xs">
          <Text size="sm" c="dimmed">{t('assetsCount', { count: assets.length })}</Text>
          <Text size="sm" c="dimmed">{t('certificationsCount', { count: certifications.length })}</Text>
          <Text size="sm" c="dimmed">{t('accountsCount', { count: accounts.length })}</Text>
        </Group>
      </PageHeader>

      <Paper withBorder radius="md" p="md">
        <Tabs defaultValue="assets">
          <Tabs.List mb="sm">
            <Tabs.Tab value="assets">{t('tabs.assets')}</Tabs.Tab>
            <Tabs.Tab value="accounts">{t('tabs.accounts')}</Tabs.Tab>
            <Tabs.Tab value="consumption">{tEnergy('tabs.consumption')}</Tabs.Tab>
            <Tabs.Tab value="emissions">{tEnergy('tabs.emissions')}</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="assets">
            {assets.length === 0 ? empty(t('emptyAssets')) : (
              <ScrollArea>
                <Table striped verticalSpacing="xs" miw={560}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('assets.id')}</Table.Th>
                      <Table.Th>{t('assets.name')}</Table.Th>
                      <Table.Th>{t('assets.site')}</Table.Th>
                      <Table.Th>{t('assets.created')}</Table.Th>
                      <Table.Th>{t('assets.status')}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {assets.map((asset) => (
                      <Table.Tr key={asset.id}>
                        <Table.Td><Text size="sm" ff="monospace">{asset.id}</Text></Table.Td>
                        <Table.Td>
                          <Anchor component={Link} href={`/organization/companies/${company.id}/assets/${asset.id}`} size="sm" fw={550}>
                            {asset.name}
                          </Anchor>
                        </Table.Td>
                        <Table.Td><Text size="sm" c="dimmed">{asset.siteName ?? '—'}</Text></Table.Td>
                        <Table.Td><Text size="sm" c="dimmed">{date(asset.createdAt)}</Text></Table.Td>
                        <Table.Td>
                          <Badge size="sm" variant="light" color={asset.certified ? 'green' : 'gray'}>
                            {asset.certified ? t('assets.certified') : t('assets.pending')}
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="accounts">
            {accounts.length === 0 ? empty(t('emptyAccounts')) : (
              <ScrollArea>
                <Table striped verticalSpacing="xs" miw={480}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('accounts.name')}</Table.Th>
                      <Table.Th>{t('accounts.email')}</Table.Th>
                      <Table.Th>{t('accounts.created')}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {accounts.map((a) => (
                      <Table.Tr key={a.id}>
                        <Table.Td><Text size="sm" fw={550}>{a.name ?? '—'}</Text></Table.Td>
                        <Table.Td><Text size="sm">{a.email}</Text></Table.Td>
                        <Table.Td><Text size="sm" c="dimmed">{date(a.createdAt)}</Text></Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="consumption">
            {!energy || energy.consumptionTotals.records === 0 ? empty(t('emptyEnergy')) : (
              <EnergyConsumption
                consumption={energy.consumption}
                sources={energy.sources}
                totals={energy.consumptionTotals}
                forecast={energy.forecast}
                heatmap={energy.consumptionHeatmap}
                fetchForecast={fetchForecast}
              />
            )}
          </Tabs.Panel>

          <Tabs.Panel value="emissions">
            {!energy || energy.emissionTotals.records === 0 ? empty(t('emptyEnergy')) : (
              <EnergyEmissions
                emissions={energy.emissions}
                totals={energy.emissionTotals}
                forecast={energy.forecast}
                heatmap={labeledEmissionsHeatmap}
                fetchForecast={fetchForecast}
              />
            )}
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </>
  );
}
