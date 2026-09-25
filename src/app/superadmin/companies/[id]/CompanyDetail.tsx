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
import type { CompanyOverview } from '@/actions/companies/overview';

const STATUS_COLOR: Record<string, string> = { CERTIFIED: 'green', ISSUED: 'yellow' };

export default function CompanyDetail({ overview }: { overview: CompanyOverview }) {
  const t = useTranslations('companiesPage.detail');
  const locale = useLocale();
  const { company, assets, certifications, accounts } = overview;
  const date = (value: Date | null) => (value ? new Date(value).toLocaleDateString(locale) : '—');
  const empty = (label: string) => <Text size="sm" c="dimmed" py="md">{label}</Text>;

  return (
    <>
      <Anchor component={Link} href="/superadmin/companies" size="sm" mb="xs" display="inline-flex">
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
            <Tabs.Tab value="certifications">{t('tabs.certifications')}</Tabs.Tab>
            <Tabs.Tab value="accounts">{t('tabs.accounts')}</Tabs.Tab>
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
                        <Table.Td><Text size="sm" fw={550}>{asset.name}</Text></Table.Td>
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

          <Tabs.Panel value="certifications">
            {certifications.length === 0 ? empty(t('emptyCertifications')) : (
              <ScrollArea>
                <Table striped verticalSpacing="xs" miw={640}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('certifications.period')}</Table.Th>
                      <Table.Th ta="right">{t('certifications.co2e')}</Table.Th>
                      <Table.Th ta="right">{t('certifications.readings')}</Table.Th>
                      <Table.Th>{t('certifications.network')}</Table.Th>
                      <Table.Th>{t('certifications.created')}</Table.Th>
                      <Table.Th>{t('certifications.status')}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {certifications.map((c) => (
                      <Table.Tr key={c.id}>
                        <Table.Td><Text size="sm">{c.period ?? '—'}</Text></Table.Td>
                        <Table.Td ta="right"><Text size="sm">{c.co2eKg ?? '—'}</Text></Table.Td>
                        <Table.Td ta="right"><Text size="sm">{c.readings ?? '—'}</Text></Table.Td>
                        <Table.Td><Text size="sm" c="dimmed">{c.network ?? '—'}</Text></Table.Td>
                        <Table.Td><Text size="sm" c="dimmed">{date(c.createdAt)}</Text></Table.Td>
                        <Table.Td>
                          <Badge size="sm" variant="light" color={STATUS_COLOR[c.status] ?? 'gray'}>
                            {c.status === 'CERTIFIED' ? t('certifications.certified') : t('certifications.issued')}
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
        </Tabs>
      </Paper>
    </>
  );
}
