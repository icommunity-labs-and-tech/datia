'use client';

import {
  Anchor,
  Badge,
  Card,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Tabs,
  Text,
  Timeline,
} from '@mantine/core';
import { IconArrowLeft, IconShieldCheck, IconClock, IconExternalLink } from '@tabler/icons-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import PageHeader from '@/components/layout/PageHeader';
import type { OrganizationAssetOverview } from '@/actions/companies/asset-overview';

const EMISSION_STATUS_COLOR: Record<string, string> = { PENDING: 'yellow', VERIFIED: 'green', REJECTED: 'red' };

export default function AssetOverview({ overview }: { overview: OrganizationAssetOverview }) {
  const t = useTranslations('organizationAssetDetail');
  const tDetail = useTranslations('companiesPage.detail');
  const tItem = useTranslations('itemDetail');
  const tEnergy = useTranslations('energyHub');
  const tSidebar = useTranslations('sidebar');
  const locale = useLocale();
  const { asset, company, certifications, sources } = overview;

  const date = (value: Date) => new Date(value).toLocaleDateString(locale);
  const dateTime = (value: Date) => new Date(value).toLocaleString(locale);

  const totalKwh = sources.reduce((sum, s) => sum + s.consumption.reduce((a, c) => a + c.consumptionKwh, 0), 0);
  const totalCo2e = sources.reduce(
    (sum, s) => sum + s.consumption.reduce((a, c) => a + (c.emission?.co2eKg ?? 0), 0),
    0
  );

  return (
    <>
      <Anchor
        component={Link}
        href={`/organization/companies/${company.id}`}
        size="sm"
        mb="xs"
        display="inline-flex"
        style={{ alignItems: 'center', gap: 6 }}
      >
        <IconArrowLeft size={14} />
        {company.name}
      </Anchor>

      <PageHeader
        title={asset.name}
        description={asset.siteName ?? undefined}
        actions={<Badge variant="light" color="gray">{tDetail('readOnly')}</Badge>}
      >
        <Group gap="lg" mt="xs">
          <Text size="sm" c="dimmed">{tDetail('certificationsCount', { count: certifications.length })}</Text>
          <Text size="sm" c="dimmed">{t('sourcesCount', { count: sources.length })}</Text>
          <Text size="sm" c="dimmed">{t('totalKwh', { value: totalKwh.toLocaleString(locale) })}</Text>
          <Text size="sm" c="dimmed">{t('totalCo2e', { value: totalCo2e.toLocaleString(locale) })}</Text>
        </Group>
      </PageHeader>

      <Paper withBorder radius="md" p="md">
        <Tabs defaultValue="certifications">
          <Tabs.List mb="sm">
            <Tabs.Tab value="certifications">{tItem('certifications')}</Tabs.Tab>
            <Tabs.Tab value="energy">{tSidebar('energy')}</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="certifications">
            {certifications.length === 0 ? (
              <Text size="sm" c="dimmed" py="md">{tItem('noCertifications')}</Text>
            ) : (
              <Timeline active={certifications.length} bulletSize={24} lineWidth={2} color="datiaBlue">
                {certifications.map((c) => {
                  const certified = c.status === 'CERTIFIED';
                  return (
                    <Timeline.Item
                      key={c.id}
                      bullet={certified ? <IconShieldCheck size={13} /> : <IconClock size={13} />}
                      color={certified ? 'green' : 'datiaBlue'}
                      title={
                        <Group gap={6} wrap="wrap">
                          <Text fw={600} size="sm">{c.period ?? tItem('certificationWithoutPeriod')}</Text>
                          {c.co2eKg != null && (
                            <Badge size="xs" color="datiaBlue" variant="light">{c.co2eKg} kg CO₂e</Badge>
                          )}
                          <Badge size="xs" color={certified ? 'green' : 'yellow'} variant="dot">
                            {certified ? tItem('certified') : tItem('pendingBackup')}
                          </Badge>
                        </Group>
                      }
                    >
                      {c.readings != null && (
                        <Text size="sm" c="dimmed">{tItem('readingsCovered', { count: c.readings })}</Text>
                      )}
                      <Group gap={8} mt={4}>
                        <Text size="xs" c="dimmed">{dateTime(c.certifiedAt ?? c.createdAt)}</Text>
                        {c.checkerUrl && (
                          <Anchor href={c.checkerUrl} target="_blank" rel="noreferrer" size="xs">
                            <Group gap={4}>
                              {tItem('viewProof')}
                              <IconExternalLink size={12} />
                            </Group>
                          </Anchor>
                        )}
                      </Group>
                    </Timeline.Item>
                  );
                })}
              </Timeline>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="energy">
            {sources.length === 0 ? (
              <Text size="sm" c="dimmed" py="md">{t('emptySources')}</Text>
            ) : (
              <Stack gap="md">
                {sources.map((source) => (
                  <Card key={source.id} withBorder radius="md" padding="sm">
                    <Group gap={8} mb="xs">
                      <Text fw={600} size="sm">{source.name}</Text>
                      <Badge size="sm" variant="light">{tEnergy(`carriers.${source.energyCarrier}`)}</Badge>
                      {source.generationTechnology && (
                        <Text size="xs" c="dimmed">{source.generationTechnology}</Text>
                      )}
                      {source.renewableShare != null && (
                        <Badge size="sm" variant="light" color="green">
                          {t('renewableBadge', { share: source.renewableShare })}
                        </Badge>
                      )}
                    </Group>

                    {source.consumption.length === 0 ? (
                      <Text size="sm" c="dimmed" py="sm">{tEnergy('drawer.noConsumption')}</Text>
                    ) : (
                      <ScrollArea>
                        <Table striped verticalSpacing="xs" miw={520}>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>{tEnergy('consumptionTab.period')}</Table.Th>
                              <Table.Th>{tEnergy('consumptionTab.stage')}</Table.Th>
                              <Table.Th ta="right">{tEnergy('consumptionTab.consumption')}</Table.Th>
                              <Table.Th ta="right">{tSidebar('emissions')}</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {source.consumption.map((c) => (
                              <Table.Tr key={c.id}>
                                <Table.Td>
                                  <Text size="sm">{date(c.periodStart)} – {date(c.periodEnd)}</Text>
                                </Table.Td>
                                <Table.Td>
                                  <Text size="sm" c="dimmed">{t(`lifecycle.${c.lifecycleStage}`)}</Text>
                                </Table.Td>
                                <Table.Td ta="right">
                                  <Text size="sm">{c.consumptionKwh.toLocaleString(locale)} kWh</Text>
                                </Table.Td>
                                <Table.Td ta="right">
                                  {c.emission ? (
                                    <Group gap={6} justify="flex-end" wrap="nowrap">
                                      <Text size="sm">{c.emission.co2eKg.toLocaleString(locale)} kg</Text>
                                      <Badge
                                        size="xs"
                                        variant="dot"
                                        color={EMISSION_STATUS_COLOR[c.emission.verificationStatus] ?? 'gray'}
                                      >
                                        {tEnergy(`status.${c.emission.verificationStatus}`)}
                                      </Badge>
                                    </Group>
                                  ) : (
                                    <Text size="sm" c="dimmed">{t('noEmission')}</Text>
                                  )}
                                </Table.Td>
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
                        </Table>
                      </ScrollArea>
                    )}
                  </Card>
                ))}
              </Stack>
            )}
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </>
  );
}
