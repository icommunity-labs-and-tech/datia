'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Anchor, Badge, Center, Group, Pagination, Paper, Select, Table, Text } from '@mantine/core';
import { IconClock, IconShieldCheck, IconX } from '@tabler/icons-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  listConsumptionRecords,
  listEmissionRecords,
  type ConsumptionRecordRow,
  type EmissionRecordRow,
  type RecordsPage,
  type RecordsQuery,
} from '@/actions/energy/records';

export interface RecordFilters {
  /** Assets with records, to narrow by. */
  assets: Array<{ value: string; label: string }>;
  /** Months with records, YYYY-MM. */
  months: string[];
}

const STATUS = {
  VERIFIED: { color: 'green', icon: IconShieldCheck },
  PENDING: { color: 'yellow', icon: IconClock },
  REJECTED: { color: 'red', icon: IconX },
} as const;

/** One page of records, re-fetched from the server whenever the page or a filter changes. */
function useRecords<T>(initial: RecordsPage<T>, fetchPage: (q: RecordsQuery) => Promise<RecordsPage<T>>) {
  const [data, setData] = useState(initial);
  const [query, setQuery] = useState<RecordsQuery>({ page: 1, assetId: null, month: null });
  const [pending, start] = useTransition();

  const update = (next: Partial<RecordsQuery>) => {
    // Narrowing the list starts again from its first page.
    const q = { ...query, ...next, page: next.page ?? 1 };
    setQuery(q);
    start(async () => setData(await fetchPage(q)));
  };
  return { data, query, update, pending };
}

function useFormat() {
  const locale = useLocale();
  const day = (iso: string) => new Date(iso).toLocaleDateString(locale, { timeZone: 'UTC' });
  return {
    locale,
    period: (start: string, end: string) => (day(start) === day(end) ? day(start) : `${day(start)} – ${day(end)}`),
    month: (yyyyMm: string) => {
      const [y, m] = yyyyMm.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });
    },
  };
}

/** Title, filters above the table and paging below: the same frame for both tables. */
function RecordsFrame<T>({
  filters,
  records,
  children,
}: {
  filters: RecordFilters;
  records: ReturnType<typeof useRecords<T>>;
  children: React.ReactNode;
}) {
  const t = useTranslations('energyHub.records');
  const f = useFormat();
  const { data, query, update, pending } = records;
  const pages = Math.ceil(data.total / data.pageSize);
  const from = data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = Math.min(data.page * data.pageSize, data.total);

  return (
    <Paper withBorder radius="md" style={{ overflow: 'auto' }}>
      <Group justify="space-between" px="md" pt="md" pb="xs" gap="xs">
        <Text fw={600}>{t('title')}</Text>
        <Group gap="xs">
          <Select
            size="xs"
            w={200}
            placeholder={t('allAssets')}
            aria-label={t('assetFilter')}
            data={filters.assets}
            value={query.assetId ?? null}
            onChange={(v) => update({ assetId: v })}
            clearable
            searchable
          />
          <Select
            size="xs"
            w={170}
            placeholder={t('allMonths')}
            aria-label={t('monthFilter')}
            data={[...filters.months].reverse().map((m) => ({ value: m, label: f.month(m) }))}
            value={query.month ?? null}
            onChange={(v) => update({ month: v })}
            clearable
          />
        </Group>
      </Group>
      <div style={{ opacity: pending ? 0.5 : 1, transition: 'opacity 120ms' }}>
        {data.total === 0 ? (
          <Center py="xl">
            <Text size="sm" c="dimmed">{t('empty')}</Text>
          </Center>
        ) : (
          children
        )}
      </div>
      {data.total > 0 && (
        <Group justify="space-between" px="md" py="sm">
          <Text size="xs" c="dimmed" data-testid="records-range">
            {t('range', { from, to, total: data.total })}
          </Text>
          {pages > 1 && (
            <Pagination size="sm" total={pages} value={data.page} onChange={(page) => update({ page })} disabled={pending} />
          )}
        </Group>
      )}
    </Paper>
  );
}

export function ConsumptionRecordsTable({
  initial,
  filters,
}: {
  initial: RecordsPage<ConsumptionRecordRow>;
  filters: RecordFilters;
}) {
  const t = useTranslations('energyHub');
  const tc = useTranslations('energyHub.company');
  const tStage = useTranslations('organizationAssetDetail.lifecycle');
  const f = useFormat();
  const records = useRecords(initial, listConsumptionRecords);

  return (
    <RecordsFrame filters={filters} records={records}>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('consumptionTab.period')}</Table.Th>
            <Table.Th>{tc('asset')}</Table.Th>
            <Table.Th>{t('consumptionTab.source')}</Table.Th>
            <Table.Th ta="right">{t('consumptionTab.consumption')}</Table.Th>
            <Table.Th>{t('consumptionTab.stage')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {records.data.rows.map((r) => (
            <Table.Tr key={r.id}>
              <Table.Td><Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>{f.period(r.periodStart, r.periodEnd)}</Text></Table.Td>
              <Table.Td>
                <Anchor component={Link} href={`/company/assets/${r.assetId}`} size="sm">{r.asset}</Anchor>
              </Table.Td>
              <Table.Td><Text size="sm">{r.source}</Text></Table.Td>
              <Table.Td ta="right">
                <Text size="sm" fw={600} style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {r.consumptionKwh.toLocaleString(f.locale, { maximumFractionDigits: 1 })} kWh
                </Text>
              </Table.Td>
              <Table.Td>
                <Badge size="xs" variant="outline" color="gray">{tStage(r.lifecycleStage as 'USE')}</Badge>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </RecordsFrame>
  );
}

export function EmissionRecordsTable({
  initial,
  filters,
}: {
  initial: RecordsPage<EmissionRecordRow>;
  filters: RecordFilters;
}) {
  const t = useTranslations('energyHub');
  const tc = useTranslations('energyHub.company');
  const tr = useTranslations('energyHub.records');
  const tScope = useTranslations('dashboard.scope');
  const f = useFormat();
  const records = useRecords(initial, listEmissionRecords);

  return (
    <RecordsFrame filters={filters} records={records}>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('consumptionTab.period')}</Table.Th>
            <Table.Th>{tc('asset')}</Table.Th>
            <Table.Th>{t('consumptionTab.source')}</Table.Th>
            <Table.Th ta="right">CO₂e</Table.Th>
            <Table.Th>{t('emissionsTab.scope')}</Table.Th>
            <Table.Th>{t('emissionsTab.state')}</Table.Th>
            <Table.Th ta="right">{t('emissionsTab.emissionFactor')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {records.data.rows.map((r) => {
            const { color, icon: Icon } = STATUS[r.verificationStatus as keyof typeof STATUS] ?? STATUS.PENDING;
            return (
              <Table.Tr key={r.id}>
                <Table.Td><Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>{f.period(r.periodStart, r.periodEnd)}</Text></Table.Td>
                <Table.Td>
                  <Anchor component={Link} href={`/company/assets/${r.assetId}`} size="sm">{r.asset}</Anchor>
                </Table.Td>
                <Table.Td><Text size="sm">{r.source}</Text></Table.Td>
                <Table.Td ta="right">
                  <Anchor
                    component={Link}
                    href={`/company/energy/emissions/${r.id}`}
                    size="sm"
                    fw={600}
                    style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
                  >
                    {r.co2eKg.toLocaleString(f.locale, { maximumFractionDigits: 2 })} kg
                  </Anchor>
                </Table.Td>
                <Table.Td><Text size="sm">{tScope(r.scope as 'SCOPE_1')}</Text></Table.Td>
                <Table.Td>
                  <Group gap={4} wrap="nowrap">
                    <Badge size="xs" color={color} variant="light" leftSection={<Icon size={10} />}>
                      {t(`status.${r.verificationStatus}` as 'status.PENDING')}
                    </Badge>
                    {r.certified && (
                      <Badge size="xs" color="datiaGreen" variant="dot">{tr('onChain')}</Badge>
                    )}
                  </Group>
                </Table.Td>
                <Table.Td ta="right">
                  <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                    {r.emissionFactor != null ? `${r.emissionFactor} kg/kWh` : '—'}
                  </Text>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </RecordsFrame>
  );
}
