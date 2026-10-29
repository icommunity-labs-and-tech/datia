'use client';

/**
 * The company's consumption and emissions, aggregated across all its assets.
 *
 * Breakdowns are ranked bars with their label and value written out, not
 * colour-coded series: the carrier and scope palettes do not stay apart for
 * colour-blind readers, so identity is carried by text and each page keeps a
 * single hue.
 */

import Link from 'next/link';
import {
  Button,
  Center,
  Grid,
  Group,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconBolt,
  IconBuildingFactory2,
  IconClock,
  IconCloudFog,
  IconLeaf,
  IconShieldCheck,
  IconTrendingDown,
  IconTrendingUp,
  IconX,
} from '@tabler/icons-react';
import { useLocale, useTranslations } from 'next-intl';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { EmissionTotals, EnergyConsumptionTotals, MonthlyPoint } from '@/domain/energy/EnergyTypes';
import type { EnergyForecast } from '@/lib/projections/energy-forecast';
import type { ConsumptionBreakdown, EmissionBreakdown, Share } from '@/lib/energy/breakdown';
import { axisProps, gridProps, tooltipStyle } from '@/components/charts/theme';
import { useEnergyForecast } from './useEnergyForecast';
import { ForecastSection } from './ForecastSection';
import { monthLabel } from './EnergyViews';
import { ConsumptionRecordsTable, EmissionRecordsTable } from './RecordsTables';
import type { ConsumptionRecordRow, EmissionRecordRow, RecordsPage } from '@/actions/energy/records';

const CONSUMPTION_HUE = '#F0930A';
const EMISSIONS_HUE = '#0D3585';
/** Rankings show this many entries; the rest fold into one "others" row. */
const RANKED = 6;

const STATUS = {
  VERIFIED: { color: 'green', icon: IconShieldCheck },
  PENDING: { color: 'yellow', icon: IconClock },
  REJECTED: { color: 'red', icon: IconX },
} as const;

function useFormat() {
  const locale = useLocale();
  return {
    locale,
    kwh: (v: number) =>
      v >= 1000
        ? `${(v / 1000).toLocaleString(locale, { maximumFractionDigits: 1 })} MWh`
        : `${v.toLocaleString(locale, { maximumFractionDigits: 0 })} kWh`,
    co2e: (kg: number) =>
      kg >= 1000
        ? `${(kg / 1000).toLocaleString(locale, { maximumFractionDigits: 2 })} t CO₂e`
        : `${kg.toLocaleString(locale, { maximumFractionDigits: 1 })} kg CO₂e`,
    percent: (v: number) => `${v.toLocaleString(locale, { maximumFractionDigits: 0 })}%`,
    month: (yyyyMm: string) => monthLabel(yyyyMm, locale),
    date: (iso: string) => new Date(iso).toLocaleDateString(locale, { month: 'short', year: 'numeric' }),
  };
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <Paper withBorder radius="md" p="md">
      <Group gap={8} mb={6}>
        <ThemeIcon variant="light" color="gray" size={24} radius="sm">
          <Icon size={14} stroke={1.8} />
        </ThemeIcon>
        <Text size="xs" c="dimmed" tt="uppercase" fw={650} lts={0.4}>{label}</Text>
      </Group>
      <Text fw={700} fz={24} lh={1.2} style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</Text>
      {hint && <Text size="xs" c="dimmed" mt={4}>{hint}</Text>}
    </Paper>
  );
}

/** The latest month with data against the one before it. */
function LastMonth({ monthly, format }: { monthly: MonthlyPoint[]; format: (v: number) => string }) {
  const t = useTranslations('energyHub.company');
  const f = useFormat();
  const last = monthly.at(-1);
  const previous = monthly.at(-2);
  if (!last) return null;

  const change = previous && previous.value ? ((last.value - previous.value) / previous.value) * 100 : null;
  const Trend = change != null && change < 0 ? IconTrendingDown : IconTrendingUp;
  return (
    <StatTile
      icon={Trend}
      label={t('lastMonth', { month: f.month(last.month) })}
      value={format(last.value)}
      hint={
        change == null
          ? t('noPrevious')
          : t('vsPrevious', {
              change: `${change > 0 ? '+' : ''}${change.toLocaleString(f.locale, { maximumFractionDigits: 1 })}%`,
              month: f.month(previous!.month),
            })
      }
    />
  );
}

function MonthlyBars({
  title,
  monthly,
  color,
  format,
}: {
  title: string;
  monthly: MonthlyPoint[];
  color: string;
  format: (v: number) => string;
}) {
  const f = useFormat();
  const data = monthly.map((p) => ({ label: f.month(p.month), value: p.value }));
  return (
    <Paper withBorder radius="md" p="md">
      <Text fw={600} mb="sm">{title}</Text>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="label" {...axisProps} />
          {/* The unit is in the title; ticks stay short so they fit on one line. */}
          <YAxis
            {...axisProps}
            width={48}
            tickFormatter={(v: number) => v.toLocaleString(f.locale, { notation: 'compact', maximumFractionDigits: 1 })}
          />
          <Tooltip
            cursor={{ fill: 'var(--mantine-color-gray-1)' }}
            contentStyle={tooltipStyle}
            formatter={(v: number) => [format(v), '']}
            separator=""
          />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
}

/** A ranking: what each part is, how much, and its share of the whole. */
function Ranking({
  title,
  shares,
  color,
  format,
  labelFor = (s) => s.label,
  empty,
}: {
  title: string;
  shares: Share[];
  color: string;
  format: (v: number) => string;
  labelFor?: (s: Share) => string;
  empty?: string;
}) {
  const t = useTranslations('energyHub.company');
  const f = useFormat();
  const total = shares.reduce((n, s) => n + s.value, 0);
  const rest = shares.slice(RANKED);
  const rows = [
    ...shares.slice(0, RANKED).map((s) => ({ key: s.key, label: labelFor(s), value: s.value })),
    ...(rest.length
      ? [{ key: '__others__', label: t('others', { count: rest.length }), value: rest.reduce((n, s) => n + s.value, 0) }]
      : []),
  ];

  return (
    <Paper withBorder radius="md" p="md" h="100%">
      <Text fw={600} mb="sm">{title}</Text>
      {rows.length === 0 ? (
        <Text size="sm" c="dimmed">{empty}</Text>
      ) : (
        <Stack gap={10}>
          {rows.map((r) => {
            const share = total ? (r.value / total) * 100 : 0;
            return (
              <Stack key={r.key} gap={4}>
                <Group justify="space-between" wrap="nowrap" gap="xs">
                  <Text size="sm" lineClamp={1}>{r.label}</Text>
                  <Text size="sm" fw={600} style={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                    {format(r.value)}
                    <Text span size="xs" c="dimmed" fw={400}> · {f.percent(share)}</Text>
                  </Text>
                </Group>
                <Progress value={share} color={color} size={6} radius="xl" aria-hidden />
              </Stack>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
}

function EmptyEnergy({ kind }: { kind: 'consumption' | 'emissions' }) {
  const t = useTranslations('energyHub.company.empty');
  const Icon = kind === 'consumption' ? IconBolt : IconCloudFog;
  return (
    <Paper withBorder radius="md" p={48}>
      <Center>
        <Stack align="center" gap="sm" maw={460}>
          <ThemeIcon color="gray" variant="light" size={52} radius="xl">
            <Icon size={26} stroke={1.5} />
          </ThemeIcon>
          <Title order={4} ta="center">{t(`${kind}Title`)}</Title>
          <Text size="sm" c="dimmed" ta="center">{t('body')}</Text>
          <Button component={Link} href="/company/api" variant="light" size="xs">
            {t('cta')}
          </Button>
        </Stack>
      </Center>
    </Paper>
  );
}

export function CompanyConsumption({
  totals,
  forecast: initialForecast,
  breakdown,
  records,
}: {
  totals: EnergyConsumptionTotals;
  forecast: EnergyForecast;
  breakdown: ConsumptionBreakdown;
  records: RecordsPage<ConsumptionRecordRow>;
}) {
  const t = useTranslations('energyHub');
  const tc = useTranslations('energyHub.company');
  const f = useFormat();
  const { forecast, horizon, setHorizon, isPending } = useEnergyForecast(initialForecast);

  if (totals.records === 0) return <EmptyEnergy kind="consumption" />;

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="md">
        <StatTile
          icon={IconBolt}
          label={tc('totalConsumption')}
          value={f.kwh(totals.totalKwh)}
          hint={tc('records', { count: totals.records })}
        />
        <StatTile
          icon={IconLeaf}
          label={tc('renewable')}
          value={breakdown.renewableShare != null ? f.percent(breakdown.renewableShare) : '—'}
          hint={breakdown.renewableShare != null ? tc('renewableHint') : tc('renewableUnknown')}
        />
        <LastMonth monthly={totals.monthly} format={f.kwh} />
        <StatTile
          icon={IconBuildingFactory2}
          label={tc('coverage')}
          value={breakdown.assets}
          hint={tc('coverageHint', { sources: breakdown.sources })}
        />
      </SimpleGrid>

      <MonthlyBars title={t('consumptionTab.monthlyChart')} monthly={totals.monthly} color={CONSUMPTION_HUE} format={f.kwh} />

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Ranking title={tc('byAsset')} shares={breakdown.byAsset} color={CONSUMPTION_HUE} format={f.kwh} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Ranking
            title={tc('byMunicipality')}
            shares={breakdown.byMunicipality}
            color={CONSUMPTION_HUE}
            format={f.kwh}
            empty={tc('noPlace')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Ranking
            title={tc('byCarrier')}
            shares={breakdown.byCarrier}
            color={CONSUMPTION_HUE}
            format={f.kwh}
            labelFor={(s) => t(`carriers.${s.key}` as 'carriers.OTHER')}
          />
        </Grid.Col>
      </Grid>

      <ForecastSection
        forecast={forecast}
        horizon={horizon}
        onHorizonChange={setHorizon}
        loading={isPending}
        historicalMonthly={totals.monthly}
        metric="consumption"
        color={CONSUMPTION_HUE}
        unit="kWh"
      />

      <ConsumptionRecordsTable
        initial={records}
        filters={{ assets: breakdown.byAsset.map((a) => ({ value: a.key, label: a.label })), months: totals.monthly.map((m) => m.month) }}
      />
    </Stack>
  );
}

export function CompanyEmissions({
  totals,
  forecast: initialForecast,
  breakdown,
  records,
}: {
  totals: EmissionTotals;
  forecast: EnergyForecast;
  breakdown: EmissionBreakdown;
  records: RecordsPage<EmissionRecordRow>;
}) {
  const t = useTranslations('energyHub');
  const tc = useTranslations('energyHub.company');
  const tScope = useTranslations('dashboard.scope');
  const f = useFormat();
  const { forecast, horizon, setHorizon, isPending } = useEnergyForecast(initialForecast);

  if (totals.records === 0) return <EmptyEnergy kind="emissions" />;

  const verifiedShare = (totals.verified / totals.records) * 100;

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="md">
        <StatTile
          icon={IconCloudFog}
          label={tc('totalEmissions')}
          value={f.co2e(totals.totalCo2eKg)}
          hint={tc('records', { count: totals.records })}
        />
        <StatTile
          icon={IconShieldCheck}
          label={tc('verified')}
          value={f.percent(verifiedShare)}
          hint={t('emissionsTab.verifiedOf', { verified: totals.verified, total: totals.records })}
        />
        <StatTile
          icon={IconBolt}
          label={tc('intensity')}
          value={
            breakdown.intensity != null
              ? breakdown.intensity.toLocaleString(f.locale, { maximumFractionDigits: 3 })
              : '—'
          }
          hint={tc('intensityHint')}
        />
        <LastMonth monthly={totals.monthly} format={f.co2e} />
      </SimpleGrid>

      <MonthlyBars title={t('emissionsTab.monthlyChart')} monthly={totals.monthly} color={EMISSIONS_HUE} format={f.co2e} />

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Ranking title={tc('byAsset')} shares={breakdown.byAsset} color={EMISSIONS_HUE} format={f.co2e} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Ranking
            title={tc('byScope')}
            shares={breakdown.byScope}
            color={EMISSIONS_HUE}
            format={f.co2e}
            labelFor={(s) => tScope(s.key as 'SCOPE_1')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper withBorder radius="md" p="md" h="100%">
            <Text fw={600} mb="sm">{tc('byStatus')}</Text>
            <Stack gap="sm">
              {breakdown.byStatus.map((s) => {
                const { color, icon: Icon } = STATUS[s.status as keyof typeof STATUS] ?? STATUS.PENDING;
                return (
                  <Group key={s.status} justify="space-between" wrap="nowrap">
                    <Group gap={8} wrap="nowrap">
                      <ThemeIcon color={color} variant="light" size={24} radius="xl">
                        <Icon size={13} stroke={1.8} />
                      </ThemeIcon>
                      <Stack gap={0}>
                        <Text size="sm">{t(`status.${s.status}` as 'status.PENDING')}</Text>
                        <Text size="xs" c="dimmed">{tc('records', { count: s.records })}</Text>
                      </Stack>
                    </Group>
                    <Text size="sm" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>{f.co2e(s.co2eKg)}</Text>
                  </Group>
                );
              })}
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>

      <ForecastSection
        forecast={forecast}
        horizon={horizon}
        onHorizonChange={setHorizon}
        loading={isPending}
        historicalMonthly={totals.monthly}
        metric="emissions"
        color={EMISSIONS_HUE}
        unit="kg CO₂e"
      />

      <EmissionRecordsTable
        initial={records}
        filters={{ assets: breakdown.byAsset.map((a) => ({ value: a.key, label: a.label })), months: totals.monthly.map((m) => m.month) }}
      />
    </Stack>
  );
}
