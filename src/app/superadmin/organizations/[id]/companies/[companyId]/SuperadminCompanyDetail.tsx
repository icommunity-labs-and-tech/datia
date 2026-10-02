'use client';

import { useState } from 'react';
import {
  Anchor,
  Badge,
  Button,
  Group,
  Paper,
  ScrollArea,
  Table,
  Tabs,
  Text,
} from '@mantine/core';
import { IconArrowLeft, IconPlayerPlay, IconPlayerStop } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import PageHeader from '@/components/layout/PageHeader';
import { setCompanyActive, type SuperadminCompanyOverview } from '@/actions/companies/superadmin';

interface Props {
  organizationId: string;
  overview: SuperadminCompanyOverview;
}

export default function SuperadminCompanyDetail({ organizationId, overview }: Props) {
  const t = useTranslations('superadminCompany');
  const locale = useLocale();
  const router = useRouter();
  const { company, assets, certifications, accounts, energy } = overview;
  const [active, setActive] = useState(company.active);
  const [toggling, setToggling] = useState(false);

  const date = (value: Date | null) => (value ? new Date(value).toLocaleDateString(locale) : '—');
  const empty = (label: string) => <Text size="sm" c="dimmed" py="md">{label}</Text>;

  const toggleActive = async () => {
    setToggling(true);
    const result = await setCompanyActive(company.id, !active);
    if (result.success) {
      setActive(!active);
      router.refresh();
    }
    setToggling(false);
  };

  return (
    <>
      <Anchor component={Link} href={`/superadmin/organizations/${organizationId}`} size="sm" mb="xs" display="inline-flex">
        <IconArrowLeft size={14} style={{ marginRight: 4, alignSelf: 'center' }} />
        {t('back')}
      </Anchor>

      <PageHeader
        title={company.name}
        description={t('description')}
        actions={
          <Group gap="xs">
            <Badge variant="light" color={active ? 'green' : 'gray'}>
              {active ? t('active') : t('inactive')}
            </Badge>
            <Button
              size="xs"
              variant="default"
              color={active ? 'red' : 'green'}
              loading={toggling}
              leftSection={active ? <IconPlayerStop size={14} /> : <IconPlayerPlay size={14} />}
              onClick={toggleActive}
            >
              {active ? t('deactivate') : t('activate')}
            </Button>
          </Group>
        }
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
            <Tabs.Tab value="energy">{t('tabs.energy')}</Tabs.Tab>
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
                        <Table.Td>
                          <Anchor
                            component={Link}
                            href={`/superadmin/organizations/${organizationId}/companies/${company.id}/assets/${asset.id}`}
                            size="sm"
                            fw={550}
                          >
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

          <Tabs.Panel value="energy">
            <Group gap="xl" py="md">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase">{t('energy.sources')}</Text>
                <Text size="xl" fw={700}>{energy.sources}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" tt="uppercase">{t('energy.consumptionRecords')}</Text>
                <Text size="xl" fw={700}>{energy.consumption.records}</Text>
                <Text size="xs" c="dimmed">{t('energy.totalKwh', { value: energy.consumption.totalKwh.toLocaleString(locale) })}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" tt="uppercase">{t('energy.emissionRecords')}</Text>
                <Text size="xl" fw={700}>{energy.emissions.records}</Text>
                <Text size="xs" c="dimmed">
                  {t('energy.totalCo2e', { value: energy.emissions.totalCo2eKg.toLocaleString(locale) })}
                  {' · '}
                  {t('energy.verified', { count: energy.emissions.verified })}
                </Text>
              </div>
            </Group>
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
